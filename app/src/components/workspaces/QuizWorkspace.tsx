import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Module, QuizExercise, ReadyTrack } from '../../content/types';
import { judgeQuiz, runExample, type QuizVerdict } from '../../engines/devops/judge';
import { Lesson } from '../Lesson';
import { devopsPlayground } from '../../engines/devops/playground';
import { scriptLines } from '../../engines/devops/kubectl';
import { Html } from '../ui';
import { actions, useTrackProgress } from '../../state/store';
import { allExercises, exerciseKey, lessonDone, readIn } from '../../state/progress';
import { WorkspaceHeader, exerciseUrl } from './WorkspaceHeader';
import { Tabs } from './SqlWorkspace';
import { useWorkspaceTab } from './useWorkspaceTab';

interface Props {
  track: ReadyTrack;
  module: Module;
  exercise: QuizExercise;
}

function load(saved: string | undefined, n: number): (number | null)[] {
  try {
    const v = JSON.parse(saved ?? '[]');
    if (Array.isArray(v)) return Array.from({ length: n }, (_, i) => (typeof v[i] === 'number' ? v[i] : null));
  } catch { /* not saved yet */ }
  return Array(n).fill(null);
}

export function QuizWorkspace({ track, module, exercise }: Props) {
  const key = exerciseKey(module, exercise);
  const progress = useTrackProgress(track.id);
  const [tab, showTab] = useWorkspaceTab();
  const [answers, setAnswers] = useState(() => load(progress.code[key], exercise.questions.length));
  const [verdict, setVerdict] = useState<QuizVerdict | null>(null);
  const navigate = useNavigate();
  const ordered = useMemo(() => allExercises(track), [track]);
  const pos = ordered.findIndex(r => r.key === key);
  const prev = ordered[pos - 1], next = ordered[pos + 1];

  function choose(q: number, option: number) {
    const a = answers.map((x, i) => (i === q ? option : x));
    setAnswers(a);
    setVerdict(null);
    actions.saveCode(track.id, key, JSON.stringify(a));
  }

  function submit() {
    const v = judgeQuiz(exercise, answers);
    if (v.pass) actions.markSolved(track.id, key);
    setVerdict(v);
  }

  return (
    <>
      <WorkspaceHeader track={track} exercise={exercise} solved={Boolean(progress.solved[key])} prev={prev} next={next} />
      <div className="ws">
        <section className="panel">
          <Tabs tab={tab} showTab={showTab} module={module} lessonState={lessonDone(module, progress) ? 'Read' : `${readIn(module, progress)}/${module.lesson.length}`} />
          <div id="pane-lesson" role="tabpanel" aria-labelledby="tab-lesson" className="lesson-pane" hidden={tab !== 'lesson'}>
            <Lesson
              track={track}
              module={module}
              number={track.modules.indexOf(module) + 1}
              language={track.language}
              run={(c, s) => { const r = runExample(c, s); return <pre className={`io${r.ok ? '' : ' bad'}`}>{r.output}</pre>; }}
              tryLabel="Try in playground"
              onTry={(code, s) => {
                if ((s.lang ?? 'shell') === 'shell') devopsPlayground.pending = scriptLines(code);
                else if ((s.flavor ?? 'kubernetes') === 'kubernetes' && s.lang === 'yaml') devopsPlayground.yaml = code;
                else return;
                navigate(`/${track.id}/playground`);
              }}
            />
          </div>
          <div id="pane-problem" role="tabpanel" aria-labelledby="tab-problem" className="pane" hidden={tab !== 'problem'}>
            <Html as="div" className="stmt" html={exercise.prompt} />
            <details><summary>Hint</summary><div><p>{exercise.hint}</p></div></details>
          </div>
        </section>
        <section className="ide">
          <div className="ide-box quiz">
            {exercise.questions.map((q, i) => {
              const judged = verdict && answers[i] !== null;
              const right = verdict?.right[i];
              return (
                <fieldset key={i} className={`quiz-q${judged ? (right ? ' ok' : ' bad') : ''}`}>
                  <legend><span className="n">{i + 1}</span><Html html={q.q} /></legend>
                  {q.options.map((opt, j) => (
                    <label key={j} className={`quiz-opt${answers[i] === j ? ' on' : ''}`}>
                      <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => choose(i, j)} />
                      <Html html={opt} />
                    </label>
                  ))}
                  {judged && <p className="quiz-why"><b>{right ? 'Right.' : 'Not quite.'}</b> <Html html={q.why} /></p>}
                </fieldset>
              );
            })}
            <div className="ide-foot">
              <span className="hint">{answers.filter(a => a !== null).length} / {exercise.questions.length} answered</span>
              <button className="btn primary" type="button" onClick={submit}>Submit</button>
            </div>
          </div>
          {verdict && (
            <div className="ide-box">
              <div className="results" aria-live="polite">
                <div className={`verdict ${verdict.pass ? 'ok' : 'bad'}`} role="status"><b>{verdict.title}</b><span>{verdict.msg}</span></div>
                {verdict.pass && next && (
                  <div><Link className="btn small primary" to={exerciseUrl(track, next)}>Next problem: {next.exercise.title} →</Link></div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
