import type { Difficulty, Exercise, Module, ReadyTrack } from '../content/types';
import type { TrackProgress } from './store';

/** Stable keys used in the progress store. */
export const exerciseKey = (m: Module, e: Exercise) => `${m.id}/${e.slug}`;
export const sectionKey = (m: Module, i: number) => `${m.id}:${i}`;

export const solvedIn = (m: Module, p: TrackProgress) => m.exercises.filter(e => p.solved[exerciseKey(m, e)]).length;
export const readIn = (m: Module, p: TrackProgress) => m.lesson.filter((_, i) => p.read[sectionKey(m, i)]).length;
export const lessonDone = (m: Module, p: TrackProgress) => readIn(m, p) === m.lesson.length;
export const moduleDone = (m: Module, p: TrackProgress) => lessonDone(m, p) && solvedIn(m, p) === m.exercises.length;

export interface ExerciseRef {
  module: Module;
  exercise: Exercise;
  key: string;
}

/** Every exercise of a track, in roadmap reading order. */
export function allExercises(track: ReadyTrack): ExerciseRef[] {
  return track.modules.flatMap(module => module.exercises.map(exercise => ({ module, exercise, key: exerciseKey(module, exercise) })));
}

export function solvedCount(track: ReadyTrack, p: TrackProgress) {
  return allExercises(track).filter(r => p.solved[r.key]).length;
}

export function nextUnsolved(track: ReadyTrack, p: TrackProgress): ExerciseRef | undefined {
  return allExercises(track).find(r => !p.solved[r.key]);
}

export function byDifficulty(track: ReadyTrack, p: TrackProgress, d: Difficulty): [solved: number, total: number] {
  const all = allExercises(track).filter(r => r.exercise.difficulty === d);
  return [all.filter(r => p.solved[r.key]).length, all.length];
}

/** The next lesson to read and the section to resume at. */
export function nextReading(track: ReadyTrack, p: TrackProgress): { module: Module; section: number; started: boolean } | undefined {
  const module = track.modules.find(m => !lessonDone(m, p));
  if (!module) return undefined;
  const section = module.lesson.findIndex((_, i) => !p.read[sectionKey(module, i)]);
  return { module, section, started: track.modules.some(m => readIn(m, p) > 0) };
}

export function findModule(track: ReadyTrack, id: string | undefined) {
  return track.modules.find(m => m.id === id);
}
