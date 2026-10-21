import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { SnippetOutput } from '../components/PythonOutput';
import { python } from '../engines/python/client';
import { scratchpad } from '../engines/python/scratchpad';
import { usePython } from '../engines/python/usePython';

/** Free Python: run anything, see what it prints. */
export function ScratchpadPage() {
  const py = usePython();
  const [output, setOutput] = useState<ReactNode>(<div className="verdict info"><b>Output</b><span>What your code prints appears here.</span></div>);
  const [busy, setBusy] = useState(false);
  // Ignore a result that arrives after leaving the page. Set in the effect
  // body too, so StrictMode's mount → unmount → mount leaves it true.
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  async function run() {
    if (busy) return;
    setBusy(true);
    const outcome = await python.runSnippet(scratchpad.code);
    if (!live.current) return;
    setBusy(false);
    setOutput(<SnippetOutput outcome={outcome} />);
  }

  return (
    <>
      <header className="topic-head">
        <div className="eyebrow">Free practice</div>
        <h1>Python scratchpad</h1>
        <p>Real Python 3.14 in your browser. Try an idea, test a snippet from a lesson, or time two approaches against each other.</p>
      </header>
      <section className="ide scratch">
        <div className="ide-box">
          <div className="ide-bar"><span className="label">scratchpad.py · Python 3.14</span></div>
          <CodeEditor value={scratchpad.code} onChange={v => { scratchpad.code = v; }} onRun={run} language="python" label="Python scratchpad editor" />
          <div className="ide-foot">
            <span className="hint">
              {py.error ? <span className="py-status bad">Python could not load: {py.error}</span>
                : !py.ready ? <span className="py-status">Loading Python (about 12 MB the first time)…</span>
                : <><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run</>}
            </span>
            <button className="btn primary" type="button" disabled={busy} onClick={run}>{busy ? 'Running…' : 'Run'}</button>
          </div>
        </div>
        <div className="ide-box"><div className="results" aria-live="polite">{output}</div></div>
      </section>
    </>
  );
}
