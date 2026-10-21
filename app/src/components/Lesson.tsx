import { useState, type ReactNode } from 'react';
import type { CodeLanguage, LessonSection, Module, ReadyTrack } from '../content/types';
import { actions, useTrackProgress } from '../state/store';
import { readIn, sectionKey } from '../state/progress';
import { CheckDot, CodeBlock, Html } from './ui';

/** Runs a lesson example and returns what to show under it. */
export type ExampleRunner = (code: string, section: LessonSection) => ReactNode | Promise<ReactNode>;

interface Props {
  track: ReadyTrack;
  module: Module;
  /** Module number on the roadmap, for "3.2"-style section numbers. */
  number: number;
  language: CodeLanguage;
  run: ExampleRunner;
  tryLabel: string;
  onTry: (code: string, section: LessonSection) => void;
}

/** Lesson sections with runnable examples. Used on the module page and in the exercise's Lesson tab. */
export function Lesson({ track, module, number, language, run, tryLabel, onTry }: Props) {
  const progress = useTrackProgress(track.id);
  const [outputs, setOutputs] = useState<Record<number, ReactNode>>({});
  const [running, setRunning] = useState<number | null>(null);
  const read = readIn(module, progress);

  async function runExample(i: number, code: string, section: LessonSection) {
    setRunning(i);
    try {
      const out = await run(code, section);
      setOutputs(o => ({ ...o, [i]: out }));
    } finally {
      setRunning(r => (r === i ? null : r));
    }
  }

  return (
    <article className="lesson">
      {module.lesson.map((s, i) => {
        const key = sectionKey(module, i);
        const on = Boolean(progress.read[key]);
        return (
          <section className="sec" id={`sec-${i}`} key={i}>
            <div className="sec-head">
              <h3>
                <span className="n">{number}.{i + 1}</span>
                <Html html={s.heading} />
              </h3>
              <button type="button" className={`readbtn${on ? ' on' : ''}`} aria-pressed={on} onClick={() => actions.toggleRead(track.id, key)}>
                <CheckDot on={on} />
                {on ? 'Read' : 'Mark as read'}
              </button>
            </div>
            <Html as="p" html={s.body} />
            {s.list && (
              <ul>
                {s.list.map((item, j) => <Html as="li" key={j} html={item} />)}
              </ul>
            )}
            {s.code && (
              <div className="example">
                <CodeBlock code={s.code} language={s.lang ?? language} />
                <div className="example-bar">
                  <button className="btn small primary" type="button" disabled={running === i} onClick={() => runExample(i, s.code!, s)}>
                    {running === i ? 'Running…' : 'Run'}
                  </button>
                  <button className="btn small ghost" type="button" onClick={() => onTry(s.code!, s)}>
                    {tryLabel}
                  </button>
                </div>
                {outputs[i] !== undefined && (
                  <div className="out">
                    <div className="results" aria-live="polite">{outputs[i]}</div>
                  </div>
                )}
              </div>
            )}
            {s.note && (
              <div className="note">
                <b className="label">{s.note.label}</b>
                <Html html={s.note.body} />
              </div>
            )}
          </section>
        );
      })}
      <div className="lesson-end">
        <span>{read} / {module.lesson.length} sections read</span>
        <button
          type="button"
          className="btn small"
          onClick={() => actions.markRead(track.id, module.lesson.map((_, i) => sectionKey(module, i)))}
        >
          Mark whole lesson as read
        </button>
      </div>
    </article>
  );
}
