import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Module, PythonExercise, ReadyTrack } from '../../content/types';
import { python } from '../../engines/python/client';
import { usePython } from '../../engines/python/usePython';
import { CodeEditor, type CodeEditorHandle } from '../CodeEditor';
import { Lesson } from '../Lesson';
import { NotFinished, SnippetOutput, TestReport } from '../PythonOutput';
import { CodeBlock, Html } from '../ui';
import { actions, useTrackProgress } from '../../state/store';
import { allExercises, exerciseKey, lessonDone, readIn } from '../../state/progress';
import { WorkspaceHeader, exerciseUrl } from './WorkspaceHeader';
import { Tabs } from './SqlWorkspace';
import { useWorkspaceTab } from './useWorkspaceTab';

interface Props {
  track: ReadyTrack;
  module: Module;
  exercise: PythonExercise;
}

export function PythonWorkspace({ track, module, exercise }: Props) {
  const key = exerciseKey(module, exercise);
  const progress = useTrackProgress(track.id);
  const [tab, showTab] = useWorkspaceTab();
  const py = usePython(); // starts loading Python in the background
  const [code, setCode] = useState(() => progress.code[key] ?? exercise.starter);
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [output, setOutput] = useState<ReactNode>(
    <div className="verdict info">
      <b>Output</b>
      <span>Run checks your code against the examples. Submit runs every test, including edge cases and big inputs.</span>
    </div>,
  );
  const editor = useRef<CodeEditorHandle>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const ordered = useMemo(() => allExercises(track), [track]);
  const pos = ordered.findIndex(r => r.key === key);
  const prev = ordered[pos - 1], next = ordered[pos + 1];

  const onChange = (v: string) => {
    setCode(v);
    actions.saveCode(track.id, key, v);
  };

  async function execute(mode: 'run' | 'submit') {
    if (busy) return;
    setBusy(mode);
    setOutput(<div className="verdict info" aria-busy="true"><b>{mode === 'run' ? 'Running the examples…' : 'Running all tests…'}</b></div>);
    const outcome = await python.runTests({
      code: codeRef.current,
      module: exercise.module,
      tests: exercise.tests,
      only: mode === 'run' ? exercise.sampleTests : undefined,
      extra: exercise.helpers,
    });
    setBusy(null);
    if (outcome.status !== 'done') {
      setOutput(<NotFinished outcome={outcome} />);
      return;
    }
    const r = outcome.result;
    const failed = r.tests.filter(t => !t.ok).length;
    const total = r.tests.length;
    const pass = !r.error && failed === 0 && total > 0;
    if (mode === 'submit' && pass) actions.markSolved(track.id, key);

    let verdict: ReactNode = null;
    if (!r.error) {
      if (mode === 'run') {
        verdict = (
          <div className={`verdict ${pass ? 'ok' : 'bad'}`} role="status">
            <b>{pass ? 'Examples pass' : `${failed} of ${total} example tests failed`}</b>
            <span>{pass ? 'Now submit to run every test, including edge cases and large inputs.' : 'Read the first failure below, fix it, and run again.'}</span>
          </div>
        );
      } else if (pass) {
        verdict = (
          <div className="verdict ok" role="status">
            <b>Accepted</b>
            <span>{total === 1 ? 'The test passes' : `All ${total} tests pass`}. Reference complexity: <b className="cx">{exercise.complexity}</b>. Can you explain yours out loud?</span>
          </div>
        );
      } else {
        verdict = (
          <div className="verdict bad" role="status">
            <b>Wrong answer</b>
            <span>{failed} of {total} tests failed.</span>
          </div>
        );
      }
    }
    setOutput(
      <>
        {verdict}
        {mode === 'submit' && pass && next && (
          <div><Link className="btn small primary" to={exerciseUrl(track, next)}>Next problem: {next.exercise.title} →</Link></div>
        )}
        <TestReport result={r} />
      </>,
    );
  }

  const load = (text: string) => editor.current?.setValue(text);

  return (
    <>
      <WorkspaceHeader track={track} exercise={exercise} solved={Boolean(progress.solved[key])} prev={prev} next={next} />
      <div className="ws">
        <section className="panel">
          <Tabs tab={tab} showTab={showTab} module={module} lessonState={lessonDone(module, progress) ? 'Read' : `${readIn(module, progress)}/${module.lesson.length}`} />
          <div id="pane-lesson" role="tabpanel" aria-labelledby="tab-lesson" className="lesson-pane" hidden={tab !== 'lesson'}>
            <p className="muted" style={{ fontSize: 14 }}>The pattern behind this problem. Run any example, or copy it into the editor to adapt it.</p>
            <Lesson
              track={track}
              module={module}
              number={track.modules.indexOf(module) + 1}
              language="python"
              run={async snippet => <SnippetOutput outcome={await python.runSnippet(snippet)} />}
              tryLabel="Copy to editor"
              onTry={load}
            />
          </div>
          <div id="pane-problem" role="tabpanel" aria-labelledby="tab-problem" className="pane" hidden={tab !== 'problem'}>
            <Html as="div" className="stmt" html={exercise.prompt} />
            <div className="facts">
              <span><b>Pattern</b> {module.title}</span>
              {exercise.source && <span><b>In the repo</b> <code>{exercise.source}</code></span>}
            </div>
            <details>
              <summary>Tests</summary>
              <div>
                <p className="muted" style={{ fontSize: 14 }}>
                  The same file <code>pytest</code> runs in the repo. <b>Run</b> uses {exercise.sampleTests.map(n => <code key={n}>{n}</code>)}; <b>Submit</b> runs them all.
                </p>
                <CodeBlock code={exercise.tests} language="python" />
              </div>
            </details>
            <details><summary>Hint</summary><div><p>{exercise.hint}</p></div></details>
            <details>
              <summary>Solution</summary>
              <div>
                <p className="muted" style={{ fontSize: 14 }}>Complexity: <b className="cx">{exercise.complexity}</b></p>
                <CodeBlock code={exercise.solution} language="python" />
                <div><button className="btn small" type="button" onClick={() => load(exercise.solution)}>Load into editor</button></div>
              </div>
            </details>
            {exercise.similar && (
              <p className="muted" style={{ fontSize: 14 }}>
                Solved it? Practise the same pattern on <a href={exercise.similar} target="_blank" rel="noreferrer">a similar public problem ↗</a>
              </p>
            )}
          </div>
        </section>
        <section className="ide">
          <div className="ide-box">
            <div className="ide-bar">
              <span className="label">{exercise.module}.py · Python 3.14</span>
              <button className="btn small ghost" type="button" onClick={() => load(exercise.starter)}>Reset</button>
            </div>
            <CodeEditor
              ref={editor}
              value={code}
              onChange={onChange}
              onRun={() => execute('run')}
              onSubmit={() => execute('submit')}
              language="python"
              label="Python editor"
            />
            <div className="ide-foot">
              <span className="hint">
                {py.error ? <span className="py-status bad">Python could not load: {py.error}</span>
                  : !py.ready ? <span className="py-status">Loading Python (about 12 MB the first time)…</span>
                  : <><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> run · add <kbd>Shift</kbd> to submit</>}
              </span>
              <button className="btn" type="button" disabled={busy !== null} onClick={() => execute('run')}>{busy === 'run' ? 'Running…' : 'Run'}</button>
              <button className="btn primary" type="button" disabled={busy !== null} onClick={() => execute('submit')}>{busy === 'submit' ? 'Testing…' : 'Submit'}</button>
            </div>
          </div>
          <div className="ide-box">
            <div className="results" aria-live="polite">{output}</div>
          </div>
        </section>
      </div>
    </>
  );
}
