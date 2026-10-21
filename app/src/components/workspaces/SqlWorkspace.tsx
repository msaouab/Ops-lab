import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Module, ReadyTrack, SqlExercise } from '../../content/types';
import { CodeEditor, type CodeEditorHandle } from '../CodeEditor';
import { Lesson } from '../Lesson';
import { ResultTable, RunOutput } from '../ResultTable';
import { Columns, Html, SqlCode } from '../ui';
import { lastSet, runSql, type SqlEngine } from '../../engines/sql/engine';
import { judge, reference, type Verdict } from '../../engines/sql/judge';
import { actions, useTrackProgress } from '../../state/store';
import { allExercises, exerciseKey, lessonDone, readIn } from '../../state/progress';
import { WorkspaceHeader, exerciseUrl } from './WorkspaceHeader';
import { useWorkspaceTab, type Tab } from './useWorkspaceTab';

const starterFor = (e: SqlExercise) => (e.mode === 'mutate' ? '-- write your statements here\n' : '-- write your query here\n');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

interface Props {
  track: ReadyTrack;
  module: Module;
  exercise: SqlExercise;
  engine: SqlEngine;
}

export function SqlWorkspace({ track, module, exercise, engine }: Props) {
  const key = exerciseKey(module, exercise);
  const progress = useTrackProgress(track.id);
  const [tab, showTab] = useWorkspaceTab();
  const [code, setCode] = useState(() => progress.code[key] ?? starterFor(exercise));
  const [output, setOutput] = useState<ReactNode>(
    <div className="verdict info"><b>Output</b><span>Run your SQL to see its result here, or submit it to be graded.</span></div>,
  );
  const editor = useRef<CodeEditorHandle>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const ordered = useMemo(() => allExercises(track), [track]);
  const pos = ordered.findIndex(r => r.key === key);
  const prev = ordered[pos - 1], next = ordered[pos + 1];
  const want = useMemo(() => lastSet(reference(engine, exercise)), [engine, exercise]);
  const tables = engine.schema.filter(t => exercise.tables.includes(t.name));
  const completion = useMemo(() => Object.fromEntries(engine.schema.map(t => [t.name, t.columns.map(c => c.name)])), [engine]);

  const onChange = (v: string) => {
    setCode(v);
    actions.saveCode(track.id, key, v);
  };

  function run() {
    const db = engine.fresh();
    try {
      const r = runSql(db, codeRef.current);
      const check = r.ok && exercise.mode === 'mutate' ? runSql(db, exercise.check ?? '') : null;
      setOutput(
        <>
          <div className="subh">Your output</div>
          <RunOutput result={r} />
          {check && <><div className="subh">Check query on your database</div><RunOutput result={check} /></>}
        </>,
      );
    } finally {
      db.close();
    }
  }

  function submit() {
    const v: Verdict = judge(engine, exercise, codeRef.current);
    if (v.pass) actions.markSolved(track.id, key);
    setOutput(
      <>
        <div className={`verdict ${v.pass ? 'ok' : 'bad'}`} role="status"><b>{v.title}</b><span>{v.msg}</span></div>
        {v.pass && next && (
          <div><Link className="btn small primary" to={exerciseUrl(track, next)}>Next problem: {next.exercise.title} →</Link></div>
        )}
        {!v.error && (
          <div className="compare">
            <div><div className="subh">Your output</div><ResultTable set={v.mine} max={50} badRow={v.badRow} /></div>
            <div><div className="subh">Expected</div><ResultTable set={v.want} max={50} /></div>
          </div>
        )}
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
            <p className="muted" style={{ fontSize: 14 }}>The lesson for this topic. Run any example, or copy it into the editor to adapt it.</p>
            <Lesson
              track={track}
              module={module}
              number={track.modules.indexOf(module) + 1}
              language="sql"
              run={sql => <RunOutput result={engine.runFresh(sql)} />}
              tryLabel="Copy to editor"
              onTry={load}
            />
          </div>
          <div id="pane-problem" role="tabpanel" aria-labelledby="tab-problem" className="pane" hidden={tab !== 'problem'}>
            <div className="stmt">
              <Html as="p" html={exercise.prompt} />
              <p className="muted" style={{ fontSize: 14 }}>
                {exercise.mode === 'mutate'
                  ? 'Your statements run on a fresh copy of the database, then the check query below is compared with the expected result.'
                  : exercise.ordered
                    ? 'Rows must come back in the order shown.'
                    : 'Any row order is accepted. Column names are not checked unless the problem says so.'}
              </p>
            </div>
            {tables.length > 0 && (
              <div className="tables">
                <div className="subh">Tables<small>key column highlighted</small></div>
                {tables.map(t => <div className="tbl" key={t.name}><b>{t.name}</b><Columns table={t} /></div>)}
              </div>
            )}
            {exercise.check && (
              <div className="tables">
                <div className="subh">Check query</div>
                <details open><summary>Runs after your SQL</summary><div><SqlCode code={exercise.check} /></div></details>
              </div>
            )}
            <div className="tables">
              <div className="subh">Expected output<small>{want ? plural(want.values.length, 'row') : ''}</small></div>
              <ResultTable set={want} max={50} />
            </div>
            <details><summary>Hint</summary><div><p>{exercise.hint}</p></div></details>
            <details>
              <summary>Solution</summary>
              <div>
                <SqlCode code={exercise.solution} />
                <div><button className="btn small" type="button" onClick={() => load(exercise.solution)}>Load into editor</button></div>
              </div>
            </details>
          </div>
        </section>
        <section className="ide">
          <div className="ide-box">
            <div className="ide-bar">
              <span className="label">{exercise.mode === 'mutate' ? 'statements' : 'query'}.sql · SQLite</span>
              <button className="btn small ghost" type="button" onClick={() => load(starterFor(exercise))}>Reset</button>
            </div>
            <CodeEditor ref={editor} value={code} onChange={onChange} onRun={run} onSubmit={submit} schema={completion} label="SQL editor" />
            <div className="ide-foot">
              <span className="hint"><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> run · add <kbd>Shift</kbd> to submit</span>
              <button className="btn" type="button" onClick={run}>Run</button>
              <button className="btn primary" type="button" onClick={submit}>Submit</button>
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

export function Tabs({ tab, showTab, module, lessonState }: { tab: Tab; showTab: (t: Tab) => void; module: Module; lessonState: string }) {
  return (
    <div className="tabs" role="tablist">
      <button type="button" role="tab" id="tab-problem" aria-controls="pane-problem" aria-selected={tab === 'problem'} onClick={() => showTab('problem')}>
        Problem
      </button>
      <button type="button" role="tab" id="tab-lesson" aria-controls="pane-lesson" aria-selected={tab === 'lesson'} onClick={() => showTab('lesson')}>
        Lesson · {module.title} <span className="tabstate">{lessonState}</span>
      </button>
    </div>
  );
}
