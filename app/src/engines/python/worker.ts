/// <reference lib="webworker" />
/**
 * Runs Python in a Web Worker so a slow or endless loop never freezes the page:
 * the main thread can terminate this worker and start a fresh one.
 */
import type { PyodideInterface } from 'pyodide';
import runnerSource from './runner.py?raw';
import { PYODIDE_INDEX_URL } from './config';

type Request =
  | { id: number; op: 'snippet'; code: string }
  | { id: number; op: 'tests'; code: string; module: string; tests: string; only?: string[]; extra?: Record<string, string> };

declare const self: DedicatedWorkerGlobalScope;

let ready: Promise<PyodideInterface> | null = null;

function boot(): Promise<PyodideInterface> {
  ready ??= (async () => {
    const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)) as typeof import('pyodide');
    const py = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    py.runPython(runnerSource);
    return py;
  })();
  return ready;
}

self.onmessage = async (e: MessageEvent<Request | { op: 'boot' }>) => {
  const msg = e.data;
  try {
    const py = await boot();
    if (msg.op === 'boot') {
      self.postMessage({ op: 'ready' });
      return;
    }
    const json =
      msg.op === 'snippet'
        ? (py.globals.get('run_snippet') as (c: string) => string)(msg.code)
        : (py.globals.get('run_tests') as (...a: string[]) => string)(
            msg.code,
            msg.module,
            msg.tests,
            JSON.stringify(msg.only ?? null),
            JSON.stringify(msg.extra ?? {}),
          );
    self.postMessage({ id: msg.id, result: JSON.parse(json) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (msg.op === 'boot') self.postMessage({ op: 'boot-failed', message });
    else self.postMessage({ id: msg.id, crash: message });
  }
};
