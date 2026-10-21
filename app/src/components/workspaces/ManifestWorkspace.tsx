import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ManifestExercise, Module, ReadyTrack } from '../../content/types';
import { judgeManifest, runExample } from '../../engines/devops/judge';
import { preview } from '../../engines/devops/manifest';
import { CodeEditor, type CodeEditorHandle } from '../CodeEditor';
import { Lesson } from '../Lesson';
import { CodeBlock, Html } from '../ui';
import { actions, useTrackProgress } from '../../state/store';
import { allExercises, exerciseKey, lessonDone, readIn } from '../../state/progress';
import { WorkspaceHeader, exerciseUrl } from './WorkspaceHeader';
import { Tabs } from './SqlWorkspace';
import { useWorkspaceTab } from './useWorkspaceTab';

interface Props {
  track: ReadyTrack;
  module: Module;
  exercise: ManifestExercise;
}

/** What "Run" does, per kind of file. */
export const RUN_LABEL: Record<ManifestExercise['flavor'], string> = {
  dockerfile: 'docker build',
  kubernetes: 'kubectl apply',
  compose: 'docker compose up',
  workflow: 'simulate a run',
  argocd: 'argocd app get',
  kustomize: 'kustomize build',
};

export function ManifestWorkspace({ track, module, exercise }: Props) {
  const key = exerciseKey(module, exercise);
  const progress = useTrackProgress(track.id);
  const [tab, showTab] = useWorkspaceTab();
  const [code, setCode] = useState(() => progress.code[key] ?? exercise.starter);
  const [output, setOutput] = useState<ReactNode>(
    <div className="verdict info">
      <b>Output</b>
      <span>Run shows what <code>{RUN_LABEL[exercise.flavor]}</code> would do with your file. Submit checks it against the list on the left.</span>
    </div>,
  );
  const editor = useRef<CodeEditorHandle>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const ordered = useMemo(() => allExercises(track), [track]);
  const pos = ordered.findIndex(r => r.key === key);
  const prev = ordered[pos - 1], next = ordered[pos + 1];
  const lang = exercise.flavor === 'dockerfile' ? 'dockerfile' : 'yaml';

  const onChange = (v: string) => {
    setCode(v);
    actions.saveCode(track.id, key, v);
  };

  function run() {
    const r = preview(codeRef.current, exercise.flavor, { files: exercise.files, cluster: exercise.cluster, filename: exercise.filename });
    setOutput(
      <>
        <div className="subh">{RUN_LABEL[exercise.flavor]}<small>simulated</small></div>
        <pre className={`io${r.ok ? '' : ' bad'}`}>{r.output}</pre>
      </>,
    );
  }

  function submit() {
    const v = judgeManifest(exercise, codeRef.current);
    if (v.pass) actions.markSolved(track.id, key);
    setOutput(
      <>
        <div className={`verdict ${v.pass ? 'ok' : 'bad'}`} role="status"><b>{v.title}</b><span>{v.msg}</span></div>
        {v.pass && next && (
          <div><Link className="btn small primary" to={exerciseUrl(track, next)}>Next problem: {next.exercise.title} →</Link></div>
        )}
        {v.rules.length > 0 && (
          <ul className="tests">
            {v.rules.map(r => (
              <li key={r.label} className={r.ok ? 'ok' : 'bad'}>
                <span className="mark" aria-hidden="true">{r.ok ? '✓' : '✗'}</span>
                <span className="name">{r.label}</span>
                <span />
                {r.msg && <span className="rule-why">{r.msg}</span>}
              </li>
            ))}
          </ul>
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
            <p className="muted" style={{ fontSize: 14 }}>The lesson for this topic. Run any example, or copy a file into the editor to adapt it.</p>
            <Lesson
              track={track}
              module={module}
              number={track.modules.indexOf(module) + 1}
              language={lang}
              run={(c, s) => { const r = runExample(c, s); return <pre className={`io${r.ok ? '' : ' bad'}`}>{r.output}</pre>; }}
              tryLabel="Copy to editor"
              onTry={(c, s) => { if ((s.lang ?? lang) !== 'shell') { load(c); showTab('problem'); } }}
            />
          </div>
          <div id="pane-problem" role="tabpanel" aria-labelledby="tab-problem" className="pane" hidden={tab !== 'problem'}>
            <Html as="div" className="stmt" html={exercise.prompt} />
            <div className="tables">
              <div className="subh">What Submit checks<small>{exercise.rules.length} checks</small></div>
              <ul className="checklist">{exercise.rules.map(r => <li key={r.label}>{r.label}</li>)}</ul>
            </div>
            {exercise.files && Object.keys(exercise.files).length > 0 && (
              <div className="tables">
                <div className="subh">Files next to yours<small>read-only</small></div>
                {Object.entries(exercise.files).map(([name, text]) => (
                  <details key={name}>
                    <summary><code>{name}</code></summary>
                    <div><CodeBlock code={text} language={/Dockerfile$/.test(name) ? 'dockerfile' : /\.(ya?ml)$/.test(name) ? 'yaml' : 'shell'} /></div>
                  </details>
                ))}
              </div>
            )}
            <details><summary>Hint</summary><div><p>{exercise.hint}</p></div></details>
            <details>
              <summary>Solution</summary>
              <div>
                <CodeBlock code={exercise.solution} language={lang} />
                <div><button className="btn small" type="button" onClick={() => load(exercise.solution)}>Load into editor</button></div>
              </div>
            </details>
          </div>
        </section>
        <section className="ide">
          <div className="ide-box">
            <div className="ide-bar">
              <span className="label">{exercise.filename}</span>
              <button className="btn small ghost" type="button" onClick={() => load(exercise.starter)}>Reset</button>
            </div>
            <CodeEditor ref={editor} value={code} onChange={onChange} onRun={run} onSubmit={submit} language={lang} label={`${exercise.filename} editor`} />
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
