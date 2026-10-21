import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Module, ReadyTrack } from '../content/types';
import { EngineGate } from '../components/EngineGate';
import { Lesson, type ExampleRunner } from '../components/Lesson';
import { RunOutput } from '../components/ResultTable';
import { SnippetOutput } from '../components/PythonOutput';
import { CheckDot, Pill } from '../components/ui';
import { playground } from '../engines/sql/playground';
import { python } from '../engines/python/client';
import { scratchpad } from '../engines/python/scratchpad';
import { runExample } from '../engines/devops/judge';
import { devopsPlayground } from '../engines/devops/playground';
import { scriptLines } from '../engines/devops/kubectl';
import { useTrackProgress } from '../state/store';
import { exerciseKey, readIn, solvedIn } from '../state/progress';

/**
 * Scroll to the lesson section named in `?s=` ("Continue reading").
 * Rendered after the lesson, so the section exists in the page.
 */
function ScrollToSection() {
  const [params] = useSearchParams();
  const s = Number(params.get('s'));
  useEffect(() => {
    if (s > 0) document.getElementById(`sec-${s}`)?.scrollIntoView({ block: 'start' });
  }, [s]);
  return null;
}

const runPython: ExampleRunner = async code => <SnippetOutput outcome={await python.runSnippet(code)} />;

const runDevops: ExampleRunner = (code, section) => {
  const r = runExample(code, section);
  return <pre className={`io${r.ok ? '' : ' bad'}`}>{r.output}</pre>;
};

function ModuleBody({ track, module }: { track: ReadyTrack; module: Module }) {
  const navigate = useNavigate();
  const progress = useTrackProgress(track.id);
  const idx = track.modules.indexOf(module);
  const nextModule = track.modules[idx + 1];
  const read = readIn(module, progress);

  // Python is large: start loading it while the learner reads, so "Run" is quick.
  useEffect(() => {
    if (track.language === 'python') python.boot().catch(() => undefined);
  }, [track.language]);

  const lesson = (run: ExampleRunner) => (
    <>
      <Lesson
        track={track}
        module={module}
        number={idx + 1}
        language={track.language}
        run={run}
        tryLabel={track.language === 'python' ? 'Edit in scratchpad' : track.language === 'shell' ? 'Try in playground' : 'Edit in playground'}
        onTry={(code, section) => {
          if (track.language === 'python') scratchpad.code = code;
          else if (track.language === 'shell') {
            if ((section.lang ?? 'shell') === 'shell') devopsPlayground.pending = scriptLines(code);
            else if ((section.lang ?? 'shell') === 'yaml' && (section.flavor ?? 'kubernetes') === 'kubernetes') {
              devopsPlayground.yaml = code;
              devopsPlayground.filename = section.filename ?? 'manifest.yaml';
            } else {
              // Dockerfiles, workflows and the like don't run on a cluster: copy them instead.
              void navigator.clipboard?.writeText(code);
              return;
            }
          } else playground.code = code;
          navigate(`/${track.id}/playground`);
        }}
      />
      <ScrollToSection />
    </>
  );

  return (
    <div className="topic-grid">
      {track.language === 'sql' ? (
        <EngineGate>{engine => lesson(code => <RunOutput result={engine.runFresh(code)} />)}</EngineGate>
      ) : (
        <div>{lesson(track.language === 'shell' ? runDevops : runPython)}</div>
      )}
      <aside className="side">
        <div className="card">
          <div className="card-head"><h2>Lesson</h2><span>{read} / {module.lesson.length} sections read</span></div>
          <div className="lesson-bar" aria-hidden="true"><i style={{ width: `${(100 * read) / module.lesson.length}%` }} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Practice</h2><span>{solvedIn(module, progress)} / {module.exercises.length} solved</span></div>
          <ul className="plist">
            {module.exercises.map(e => {
              const done = Boolean(progress.solved[exerciseKey(module, e)]);
              return (
                <li key={e.slug}>
                  <Link to={`/${track.id}/${module.id}/${e.slug}`}>
                    <CheckDot on={done} label={done ? 'Solved' : 'Not solved'} />
                    <span className="t">{e.title}</span>
                    <Pill kind={e.difficulty} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        {nextModule && (
          <Link className="btn next-topic" to={`/${track.id}/${nextModule.id}`}>Next topic: {nextModule.title} →</Link>
        )}
      </aside>
    </div>
  );
}

export function ModulePage({ track, module }: { track: ReadyTrack; module: Module }) {
  const number = track.modules.indexOf(module) + 1;
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`/${track.id}`}>Roadmap</Link><span>/</span>
        <span aria-current="page">{String(number).padStart(2, '0')} {module.title}</span>
      </nav>
      <header className="topic-head">
        <div className="eyebrow">Topic {number} of {track.modules.length} · {module.tags}</div>
        <h1>{module.title}</h1>
        <p>{module.summary}</p>
      </header>
      <ModuleBody track={track} module={module} />
    </>
  );
}
