/** Shapes returned by runner.py (as JSON) and by the worker client. */

export interface PyError {
  kind: string;
  message: string;
  /** Line in the learner's code (or the test file, for assertion failures). */
  line?: number;
  source?: string;
  /** For `assert left == right`: both sides, as repr(). */
  expected?: string;
  got?: string;
}

export interface TestResult {
  name: string;
  ok: boolean;
  ms?: number;
  failure?: PyError;
}

export interface SnippetResult {
  stdout: string;
  error: PyError | null;
}

export interface TestRunResult {
  stdout: string;
  /** The code (or the tests) could not even be imported. */
  error: PyError | null;
  tests: TestResult[];
}

/** What the worker client resolves with: a result, or a reason it did not finish. */
export type Outcome<T> = { status: 'done'; result: T } | { status: 'timeout'; limitMs: number } | { status: 'crash'; message: string };

export interface TestRequest {
  code: string;
  /** Module name the tests import from, e.g. "longest_unique_window". */
  module: string;
  tests: string;
  /** Test function names to run; omit for all. */
  only?: string[];
  /** Helper modules written next to the code: name -> source. */
  extra?: Record<string, string>;
}
