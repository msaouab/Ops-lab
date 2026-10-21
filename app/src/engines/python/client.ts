import { SNIPPET_TIME_LIMIT_MS, TEST_TIME_LIMIT_MS } from './config';
import type { Outcome, SnippetResult, TestRequest, TestRunResult } from './types';

type Pending = { resolve: (o: Outcome<unknown>) => void; timer: ReturnType<typeof setTimeout>; limitMs: number };

/**
 * Talks to the Python worker. One run at a time; a run that exceeds its time
 * limit terminates the worker (the only way to stop running Python) and the
 * next run boots a fresh one.
 */
class PythonClient {
  private worker: Worker | null = null;
  private booting: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private queue: Promise<unknown> = Promise.resolve();

  /** Load Python (about 12 MB the first time, then cached by the browser). */
  boot(): Promise<void> {
    if (this.booting) return this.booting;
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    this.booting = new Promise<void>((resolve, reject) => {
      const onBoot = (e: MessageEvent) => {
        if (e.data?.op === 'ready') resolve();
        else if (e.data?.op === 'boot-failed') reject(new Error(e.data.message));
        else return;
        worker.removeEventListener('message', onBoot);
      };
      worker.addEventListener('message', onBoot);
      worker.addEventListener('error', e => reject(new Error(e.message || 'Python worker failed to start')));
    });
    worker.addEventListener('message', e => this.settle(e.data));
    worker.postMessage({ op: 'boot' });
    this.booting.catch(() => this.reset());
    return this.booting;
  }

  private settle(data: { id?: number; result?: unknown; crash?: string }) {
    if (data.id === undefined) return;
    const p = this.pending.get(data.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(data.id);
    p.resolve(data.crash !== undefined ? { status: 'crash', message: data.crash } : { status: 'done', result: data.result });
  }

  private reset() {
    this.worker?.terminate();
    this.worker = null;
    this.booting = null;
  }

  private send<T>(payload: object, limitMs: number): Promise<Outcome<T>> {
    // Serialize runs: a new run waits for the previous one (or its timeout).
    const run = this.queue.then(async () => {
      await this.boot();
      const id = this.nextId++;
      return new Promise<Outcome<T>>(resolve => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          this.reset();
          resolve({ status: 'timeout', limitMs });
        }, limitMs);
        this.pending.set(id, { resolve: resolve as (o: Outcome<unknown>) => void, timer, limitMs });
        this.worker!.postMessage({ id, ...payload });
      });
    });
    this.queue = run.catch(() => undefined);
    return run.catch((e: unknown) => ({ status: 'crash', message: e instanceof Error ? e.message : String(e) }) as Outcome<T>);
  }

  runSnippet(code: string): Promise<Outcome<SnippetResult>> {
    return this.send({ op: 'snippet', code }, SNIPPET_TIME_LIMIT_MS);
  }

  runTests(req: TestRequest): Promise<Outcome<TestRunResult>> {
    return this.send({ op: 'tests', ...req }, TEST_TIME_LIMIT_MS);
  }
}

export const python = new PythonClient();
