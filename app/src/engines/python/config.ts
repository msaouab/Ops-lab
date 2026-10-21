/** Pyodide (CPython 3.14 compiled to WebAssembly), loaded from the CDN in the worker.
 *  Keep in sync with the `pyodide` devDependency used by the Node tests. */
export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** A graded run that takes longer than this is too slow (or loops forever). */
export const TEST_TIME_LIMIT_MS = 8000;
/** Lesson examples and scratchpad runs. */
export const SNIPPET_TIME_LIMIT_MS = 5000;
