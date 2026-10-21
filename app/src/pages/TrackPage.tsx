import { Link } from 'react-router';
import { DIFFICULTIES, type ReadyTrack } from '../content/types';
import { useTrackProgress } from '../state/store';
import { allExercises, byDifficulty, lessonDone, nextReading, nextUnsolved, readIn, solvedCount } from '../state/progress';
import { Roadmap } from '../components/Roadmap';
import { Bar, Html, Pill } from '../components/ui';

const COLOR = { Easy: 'var(--easy)', Medium: 'var(--med)', Hard: 'var(--hard)' } as const;

function ReadingButton({ track }: { track: ReadyTrack }) {
  const progress = useTrackProgress(track.id);
  const next = nextReading(track, progress);
  if (!next) {
    return <Link className="btn" to={`/${track.id}/${track.modules[0]!.id}`}>All lessons read. Review them</Link>;
  }
  const { module, section, started } = next;
  const n = track.modules.indexOf(module) + 1;
  const label = started
    ? `Continue reading: ${module.title}${readIn(module, progress) ? ` (${n}.${section + 1})` : ''}`
    : `Read the first lesson: ${module.title}`;
  return <Link className="btn" to={`/${track.id}/${module.id}${section > 0 ? `?s=${section}` : ''}`}>{label} →</Link>;
}

export function TrackPage({ track }: { track: ReadyTrack }) {
  const progress = useTrackProgress(track.id);
  const total = allExercises(track).length;
  const solved = solvedCount(track, progress);
  const next = nextUnsolved(track, progress);
  const lessons = track.modules.filter(m => lessonDone(m, progress)).length;

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">{track.modules.length} topics · {total} graded problems · runs in your browser</div>
          <Html as="h1" html={track.headline} />
          <p className="lede">{track.lede}</p>
          <div className="hero-actions">
            {next ? (
              <Link className="btn primary" to={`/${track.id}/${next.module.id}/${next.exercise.slug}`}>
                {solved ? 'Continue' : 'Start'}: {next.exercise.title} →
              </Link>
            ) : (
              track.playground && <Link className="btn primary" to={`/${track.id}/playground`}>Every problem solved. Open the playground</Link>
            )}
            <ReadingButton track={track} />
          </div>
        </div>
        <div className="stats" aria-label="Progress">
          <div className="stats-total"><b>{solved}</b><span>of {total} problems solved</span></div>
          <div className="stat-row">
            <Pill kind="Lesson">Lessons</Pill>
            <Bar value={lessons} total={track.modules.length} color="var(--accent)" />
            <span>{lessons} / {track.modules.length}</span>
          </div>
          {DIFFICULTIES.map(d => {
            const [a, b] = byDifficulty(track, progress, d);
            return (
              <div className="stat-row" key={d}>
                <Pill kind={d} />
                <Bar value={a} total={b} color={COLOR[d]} />
                <span>{a} / {b}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="roadmap-h">
        <div className="section-head">
          <h2 id="roadmap-h">Roadmap</h2>
          <p>Topics unlock nothing; the lines show what each one builds on.</p>
        </div>
        <Roadmap track={track} progress={progress} />
      </section>
    </>
  );
}
