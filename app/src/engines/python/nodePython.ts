/**
 * Test-only: the same runner.py the browser worker uses, run in Node's Pyodide
 * (no worker, no CDN). Lets the test suite grade content exactly like the app.
 */
import { loadPyodide, type PyodideInterface } from 'pyodide';
import runnerSource from './runner.py?raw';
import type { SnippetResult, TestRequest, TestRunResult } from './types';

export interface NodePython {
  runSnippet(code: string): SnippetResult;
  runTests(req: TestRequest): TestRunResult;
}

export async function createNodePython(): Promise<NodePython> {
  const py: PyodideInterface = await loadPyodide();
  py.runPython(runnerSource);
  const snippet = py.globals.get('run_snippet') as (c: string) => string;
  const tests = py.globals.get('run_tests') as (...a: string[]) => string;
  return {
    runSnippet: code => JSON.parse(snippet(code)) as SnippetResult,
    runTests: r =>
      JSON.parse(tests(r.code, r.module, r.tests, JSON.stringify(r.only ?? null), JSON.stringify(r.extra ?? {}))) as TestRunResult,
  };
}
