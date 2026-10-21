import { Link } from 'react-router';
import type { Exercise, Module, ReadyTrack } from '../content/types';
import { EngineGate } from '../components/EngineGate';
import { PythonWorkspace } from '../components/workspaces/PythonWorkspace';
import { SqlWorkspace } from '../components/workspaces/SqlWorkspace';
import { CommandWorkspace } from '../components/workspaces/CommandWorkspace';
import { ManifestWorkspace } from '../components/workspaces/ManifestWorkspace';
import { QuizWorkspace } from '../components/workspaces/QuizWorkspace';

interface Props {
  track: ReadyTrack;
  module: Module;
  exercise: Exercise;
}

export function ExercisePage({ track, module, exercise }: Props) {
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`/${track.id}`}>Roadmap</Link><span>/</span>
        <Link to={`/${track.id}/${module.id}`}>{module.title}</Link><span>/</span>
        <span aria-current="page">{exercise.title}</span>
      </nav>
      {exercise.kind === 'sql' ? (
        <EngineGate>{engine => <SqlWorkspace track={track} module={module} exercise={exercise} engine={engine} />}</EngineGate>
      ) : exercise.kind === 'python' ? (
        // No gate: the statement and editor show at once; Python loads in the background.
        <PythonWorkspace track={track} module={module} exercise={exercise} />
      ) : exercise.kind === 'manifest' ? (
        <ManifestWorkspace track={track} module={module} exercise={exercise} />
      ) : exercise.kind === 'command' ? (
        <CommandWorkspace track={track} module={module} exercise={exercise} />
      ) : (
        <QuizWorkspace track={track} module={module} exercise={exercise} />
      )}
    </>
  );
}
