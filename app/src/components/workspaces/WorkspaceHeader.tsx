import { Link } from 'react-router';
import type { Exercise, ReadyTrack } from '../../content/types';
import type { ExerciseRef } from '../../state/progress';
import { CheckDot, Pill } from '../ui';

interface Props {
  track: ReadyTrack;
  exercise: Exercise;
  solved: boolean;
  prev?: ExerciseRef;
  next?: ExerciseRef;
}

export const exerciseUrl = (track: ReadyTrack, r: ExerciseRef) => `/${track.id}/${r.module.id}/${r.exercise.slug}`;

export function WorkspaceHeader({ track, exercise, solved, prev, next }: Props) {
  return (
    <div className="ws-head">
      <CheckDot on={solved} label={solved ? 'Solved' : 'Not solved'} />
      <h1>{exercise.title}</h1>
      <Pill kind={exercise.difficulty} />
      {exercise.kind === 'python' && (
        <>
          <span className="tag" title="Time to aim for in an interview">⏱ {exercise.targetMinutes} min</span>
          {exercise.mock && <span className="tag" title="Part of a timed mock test">{exercise.mock}</span>}
        </>
      )}
      {exercise.kind === 'manifest' && <span className="tag" title="You write this file">{exercise.filename}</span>}
      {exercise.kind === 'command' && <span className="tag" title="You work in a terminal">kubectl</span>}
      {exercise.kind === 'quiz' && <span className="tag">{exercise.questions.length} questions</span>}
      <span className="spacer" />
      <nav className="ws-nav" aria-label="Problems">
        {prev && <Link className="btn small" to={exerciseUrl(track, prev)} aria-label="Previous problem">← Prev</Link>}
        {next && <Link className="btn small" to={exerciseUrl(track, next)} aria-label="Next problem">Next →</Link>}
      </nav>
    </div>
  );
}
