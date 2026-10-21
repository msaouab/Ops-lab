import type { Outcome, PyError, SnippetResult, TestRunResult } from '../engines/python/types';

/** "KeyError: 'x' · line 3: return seen["x"]" */
export function ErrorBox({ error, where = 'your code' }: { error: PyError; where?: string }) {
  return (
    <div className="err" role="alert">
      <b>{error.kind}</b>
      {error.message && `: ${error.message}`}
      {error.line !== undefined && (
        <div className="err-where">
          {where}, line {error.line}{error.source ? <>: <code>{error.source}</code></> : null}
        </div>
      )}
    </div>
  );
}

export function Stdout({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="stdout">
      <div className="subh">Printed output</div>
      <pre>{text}</pre>
    </div>
  );
}

/** When the run did not finish: time limit or a worker crash. */
export function NotFinished({ outcome }: { outcome: Exclude<Outcome<unknown>, { status: 'done' }> }) {
  if (outcome.status === 'timeout') {
    return (
      <div className="verdict bad" role="status">
        <b>Time limit exceeded</b>
        <span>Stopped after {outcome.limitMs / 1000} s. The solution is too slow for the input size, or loops forever.</span>
      </div>
    );
  }
  return <div className="verdict bad" role="status"><b>Python stopped</b><span>{outcome.message}</span></div>;
}

export function SnippetOutput({ outcome }: { outcome: Outcome<SnippetResult> }) {
  if (outcome.status !== 'done') return <NotFinished outcome={outcome} />;
  const { stdout, error } = outcome.result;
  return (
    <>
      {stdout ? <pre className="py-out">{stdout}</pre> : !error && <p className="meta">Ran with no output. Add print() to see values.</p>}
      {error && <ErrorBox error={error} where="line" />}
    </>
  );
}

const pretty = (name: string) => name.replace(/^test_/, '').replace(/_/g, ' ');

/** One line per test, with the failure explained under the first failing one. */
export function TestReport({ result }: { result: TestRunResult }) {
  if (result.error) {
    return (
      <>
        <div className="verdict bad" role="status"><b>Your code could not run</b><span>Fix this first, then run again.</span></div>
        <ErrorBox error={result.error} />
        <Stdout text={result.stdout} />
      </>
    );
  }
  return (
    <>
      <ul className="tests">
        {result.tests.map(t => (
          <li key={t.name} className={t.ok ? 'ok' : 'bad'}>
            <span className="mark" aria-hidden="true">{t.ok ? '✓' : '✗'}</span>
            <span className="name">{pretty(t.name)}</span>
            {t.ms !== undefined && <span className="ms">{t.ms} ms</span>}
            {t.failure && <TestFailure failure={t.failure} />}
          </li>
        ))}
      </ul>
      <Stdout text={result.stdout} />
    </>
  );
}

function TestFailure({ failure }: { failure: PyError }) {
  if (failure.kind === 'AssertionError') {
    return (
      <div className="failure">
        {failure.source && <div>Check: <code>{failure.source}</code></div>}
        {failure.expected !== undefined && (
          <div className="exp-got">
            <span>Expected <code>{failure.expected}</code></span>
            <span>got <code>{failure.got}</code></span>
          </div>
        )}
        {failure.message && <div className="muted">{failure.message}</div>}
      </div>
    );
  }
  return (
    <div className="failure">
      <ErrorBox error={failure} />
    </div>
  );
}
