import type { ReadyTrack, Track, TrackId } from './types';
import { sqlTrack } from './sql';
import { algorithmsTrack } from './algorithms';
import { devopsTrack } from './devops';

/** Every track, in the order shown on the home page. */
export const TRACKS: Track[] = [
  sqlTrack,
  {
    id: 'python',
    status: 'planned',
    title: 'Python',
    mark: 'PY',
    tagline: 'Idioms, collections, OOP and the standard library, run with real Python in the browser.',
    planned: ['5 fluency drills from A1', 'Pyodide runs your code and the repo’s own tests', 'Lessons with runnable examples'],
  },
  algorithmsTrack,
  devopsTrack,
  {
    id: 'interview',
    status: 'planned',
    title: 'Interview',
    mark: 'INT',
    tagline: 'Aptitude, English and technical interview practice.',
    planned: ['28-question aptitude sets', 'Client email writing', 'HR and technical question banks'],
  },
];

export const READY_TRACKS = TRACKS.filter((t): t is ReadyTrack => t.status === 'ready');

export function getReadyTrack(id: string | undefined): ReadyTrack | undefined {
  return READY_TRACKS.find(t => t.id === id);
}

export function isTrackId(id: string): id is TrackId {
  return TRACKS.some(t => t.id === id);
}
