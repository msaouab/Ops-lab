import { Link } from 'react-router';
import { TRACKS } from '../content/tracks';
import type { ReadyTrack } from '../content/types';
import { useTrackProgress } from '../state/store';
import { allExercises, solvedCount } from '../state/progress';
import { Bar, Pill } from '../components/ui';

function ReadyCard({ track }: { track: ReadyTrack }) {
  const progress = useTrackProgress(track.id);
  const n = solvedCount(track, progress), total = allExercises(track).length;
  return (
    <Link className="track-card" to={`/${track.id}`}>
      <div className="track-head">
        <span className="brand-mark">{track.mark}</span>
        <h2>{track.title}</h2>
      </div>
      <p>{track.tagline}</p>
      <div className="track-meta">
        <span>{track.modules.length} topics</span>
        <Bar value={n} total={total} />
        <span>{n} / {total} solved</span>
      </div>
    </Link>
  );
}

export function HomePage() {
  const ready = TRACKS.filter((t): t is ReadyTrack => t.status === 'ready');
  const exercises = ready.reduce((a, t) => a + allExercises(t).length, 0);
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">{TRACKS.length} tracks · {exercises} graded problems · runs in your browser</div>
          <h1>Learn by doing: <span className="q">SQL</span>, <span className="q">Python</span> and <span className="q">DevOps</span>.</h1>
          <p className="lede">
            Each track is a roadmap of short lessons you can run, followed by problems that grade themselves.
            Pick a track and start at the top.
          </p>
          <div className="hero-actions">
            {ready[0] && <Link className="btn primary" to={`/${ready[0].id}`}>Open the {ready[0].title} track →</Link>}
          </div>
        </div>
      </section>
      <section aria-labelledby="tracks-h">
        <div className="section-head">
          <h2 id="tracks-h">Tracks</h2>
          <p>Ready tracks open; the others are on the way.</p>
        </div>
        <div className="tracks">
          {TRACKS.map(t =>
            t.status === 'ready' ? (
              <ReadyCard key={t.id} track={t} />
            ) : (
              <div key={t.id} className="track-card planned">
                <div className="track-head">
                  <span className="brand-mark">{t.mark}</span>
                  <h2>{t.title}</h2>
                  <Pill kind="Soon">Coming next</Pill>
                </div>
                <p>{t.tagline}</p>
                <ul>{t.planned.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}
