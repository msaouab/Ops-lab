"""Ops Lab Python runner: executes learner code and pytest-style tests inside Pyodide.

Loaded once per interpreter. JavaScript calls `run_snippet` and `run_tests` and
receives JSON strings. Shared by the browser worker and the Node test suite, so
both grade exactly the same way.
"""
import ast
import contextlib
import importlib
import io
import json
import os
import sys
import time
import types

WORKDIR = '/home/pyodide/opslab'
os.makedirs(WORKDIR, exist_ok=True)
if WORKDIR not in sys.path:
    sys.path.insert(0, WORKDIR)

MAX_OUTPUT = 20_000
# Pyodide runs CPython compiled to WebAssembly, several times slower than native.
# Timing assertions in the tests were written for native Python, so the clock the
# tests see runs this many times slower than wall time.
CLOCK_SCALE = 4.0


# ---------------------------------------------------------------- pytest shim
class _Raises:
    def __init__(self, expected, match=None):
        self.expected = expected
        self.match = match

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            raise AssertionError(f'expected {self.expected.__name__} to be raised, but nothing was raised')
        if not issubclass(exc_type, self.expected):
            return False  # a different exception: let it propagate
        if self.match is not None:
            import re
            if not re.search(self.match, str(exc)):
                raise AssertionError(f'{self.expected.__name__} message {str(exc)!r} does not match {self.match!r}')
        return True


_pytest = types.ModuleType('pytest')
_pytest.raises = lambda expected, match=None: _Raises(expected, match)
sys.modules['pytest'] = _pytest


class _ScaledTime(types.ModuleType):
    """`time` for test modules: perf_counter ticks CLOCK_SCALE times slower."""

    def __init__(self):
        super().__init__('time')
        self.__dict__.update({k: getattr(time, k) for k in dir(time) if not k.startswith('__')})
        self.perf_counter = lambda: time.perf_counter() / CLOCK_SCALE


# ---------------------------------------------------------------- helpers
def _write(name, source):
    with open(os.path.join(WORKDIR, name + '.py'), 'w') as f:
        f.write(source)


def _forget(*names):
    for name in names:
        sys.modules.pop(name, None)
    # The import system caches directory listings; files written a moment ago
    # may be invisible to it without this (flaky ModuleNotFoundError).
    importlib.invalidate_caches()


def _clip(text):
    return text if len(text) <= MAX_OUTPUT else text[:MAX_OUTPUT] + '\n… output truncated'


def _user_frame(tb, filename):
    """Deepest traceback frame inside `filename`, as (lineno, source line)."""
    found = None
    while tb is not None:
        if os.path.basename(tb.tb_frame.f_code.co_filename) == filename:
            found = tb
        tb = tb.tb_next
    if found is None:
        return None
    lineno = found.tb_lineno
    try:
        with open(os.path.join(WORKDIR, filename)) as f:
            line = f.read().splitlines()[lineno - 1].strip()
    except Exception:
        line = ''
    return lineno, line, found.tb_frame


def _describe_assert(frame, line):
    """For `assert left == right`, evaluate both sides to say what was expected."""
    try:
        node = ast.parse(line).body[0]
    except Exception:
        return None
    if not isinstance(node, ast.Assert) or not isinstance(node.test, ast.Compare):
        return None
    cmp = node.test
    if len(cmp.ops) != 1 or not isinstance(cmp.ops[0], (ast.Eq, ast.Is)):
        return None
    scope = dict(frame.f_globals)
    scope.update(frame.f_locals)
    try:
        got = eval(compile(ast.Expression(cmp.left), '<assert>', 'eval'), scope)
        want = eval(compile(ast.Expression(cmp.comparators[0]), '<assert>', 'eval'), scope)
    except Exception:
        return None
    return {'expected': repr(want)[:500], 'got': repr(got)[:500]}


def _error_payload(exc, tb, code_file):
    kind = type(exc).__name__
    message = str(exc)
    if isinstance(exc, NotImplementedError):
        return {'kind': 'NotImplementedError', 'message': 'Not implemented yet: replace `raise NotImplementedError` with your code.'}
    if isinstance(exc, RecursionError):
        message = 'maximum recursion depth exceeded. Is there a base case?'
    where = _user_frame(tb, code_file) if code_file else None
    payload = {'kind': kind, 'message': message}
    if where:
        payload['line'] = where[0]
        payload['source'] = where[1]
    return payload


# ---------------------------------------------------------------- entry points
def run_snippet(code):
    """Run a lesson example or scratchpad code as __main__. Returns JSON."""
    out = io.StringIO()
    error = None
    _write('snippet', code)
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            exec(compile(code, os.path.join(WORKDIR, 'snippet.py'), 'exec'), {'__name__': '__main__'})
        except SyntaxError as e:
            error = {'kind': 'SyntaxError', 'message': e.msg, 'line': e.lineno, 'source': (e.text or '').strip()}
        except BaseException as e:  # noqa: BLE001 — report anything the learner's code raises
            error = _error_payload(e, e.__traceback__, 'snippet.py')
    return json.dumps({'stdout': _clip(out.getvalue()), 'error': error})


def run_tests(code, module, tests, only_json='null', extra_json='{}'):
    """Write the learner's module and its test file, then run test_* functions.

    only_json: JSON list of test names to run (None = all).
    extra_json: JSON {module_name: source} of helper modules (e.g. structures).
    """
    only = json.loads(only_json)
    extra = json.loads(extra_json)
    test_name = 'test_' + module
    for name, source in extra.items():
        _write(name, source)
    _write(module, code)
    _write(test_name, tests)
    _forget(module, test_name, *extra)

    out = io.StringIO()
    results = []
    load_error = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            test_mod = __import__(test_name)
        except SyntaxError as e:
            load_error = {'kind': 'SyntaxError', 'message': e.msg, 'line': e.lineno, 'source': (e.text or '').strip()}
        except BaseException as e:  # noqa: BLE001
            load_error = _error_payload(e, e.__traceback__, module + '.py')
        if load_error is None:
            if hasattr(test_mod, 'time'):
                test_mod.time = _ScaledTime()
            names = [n for n, v in vars(test_mod).items() if n.startswith('test_') and callable(v)]
            if only is not None:
                names = [n for n in names if n in only]
            for name in names:
                started = time.perf_counter()
                try:
                    getattr(test_mod, name)()
                    results.append({'name': name, 'ok': True})
                except AssertionError as e:
                    where = _user_frame(e.__traceback__, test_name + '.py')
                    failure = {'kind': 'AssertionError', 'message': str(e)}
                    if where:
                        failure['line'] = where[0]
                        failure['source'] = where[1]
                        detail = _describe_assert(where[2], where[1])
                        if detail:
                            failure.update(detail)
                    results.append({'name': name, 'ok': False, 'failure': failure})
                except BaseException as e:  # noqa: BLE001
                    results.append({'name': name, 'ok': False, 'failure': _error_payload(e, e.__traceback__, module + '.py')})
                results[-1]['ms'] = round((time.perf_counter() - started) * 1000)
    return json.dumps({
        'stdout': _clip(out.getvalue()),
        'error': load_error,
        'tests': results,
    })

