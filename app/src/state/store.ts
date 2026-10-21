import { useSyncExternalStore } from 'react';
import type { TrackId } from '../content/types';

/**
 * Learner profiles and their progress, persisted in localStorage.
 * Several people can share one browser: each profile has its own progress.
 * Storage can be unavailable (private mode, blocked site data), so every
 * read and write is guarded and the app keeps working in memory.
 */

export interface TrackProgress {
  /** exercise key ("module/slug") -> time it was first solved */
  solved: Record<string, number>;
  /** exercise key -> the learner's latest code */
  code: Record<string, string>;
  /** section key ("module:index") -> time it was marked read */
  read: Record<string, number>;
}

export interface Profile {
  id: string;
  name: string;
}

export interface StoreState {
  profiles: Profile[];
  current: string;
  /** Progress of the current profile, by track. */
  progress: Partial<Record<TrackId, TrackProgress>>;
}

const PROFILES_KEY = 'opslab:profiles';
const progressKey = (id: string) => `opslab:progress:${id}`;
const DEFAULT_PROFILES: Profile[] = [{ id: 'p1', name: 'Med' }, { id: 'p2', name: 'Manar' }];

export const EMPTY_PROGRESS: TrackProgress = Object.freeze({ solved: {}, code: {}, read: {} }) as TrackProgress;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep going in memory */
  }
}

const memory = new Map<string, StoreState['progress']>();

function loadProgress(profileId: string): StoreState['progress'] {
  return memory.get(profileId) ?? readJson<StoreState['progress']>(progressKey(profileId)) ?? {};
}

function initialState(): StoreState {
  const saved = readJson<{ current: string; profiles: Profile[] }>(PROFILES_KEY);
  const profiles = saved?.profiles?.length ? saved.profiles : DEFAULT_PROFILES;
  const current = profiles.some(p => p.id === saved?.current) ? saved!.current : profiles[0]!.id;
  return { profiles, current, progress: loadProgress(current) };
}

let state: StoreState = initialState();
const listeners = new Set<() => void>();

function setState(next: StoreState) {
  state = next;
  listeners.forEach(l => l());
}

function saveProfiles() {
  writeJson(PROFILES_KEY, { current: state.current, profiles: state.profiles });
}

function updateTrack(track: TrackId, fn: (p: TrackProgress) => TrackProgress) {
  const progress = { ...state.progress, [track]: fn(state.progress[track] ?? EMPTY_PROGRESS) };
  memory.set(state.current, progress);
  writeJson(progressKey(state.current), progress);
  setState({ ...state, progress });
}

export const actions = {
  switchProfile(id: string) {
    if (!state.profiles.some(p => p.id === id)) return;
    setState({ ...state, current: id, progress: loadProgress(id) });
    saveProfiles();
  },
  renameProfile(id: string, name: string) {
    const clean = name.trim().slice(0, 24);
    if (!clean) return;
    setState({ ...state, profiles: state.profiles.map(p => (p.id === id ? { ...p, name: clean } : p)) });
    saveProfiles();
  },
  markSolved(track: TrackId, key: string) {
    if (state.progress[track]?.solved[key]) return;
    updateTrack(track, p => ({ ...p, solved: { ...p.solved, [key]: Date.now() } }));
  },
  saveCode(track: TrackId, key: string, code: string) {
    updateTrack(track, p => ({ ...p, code: { ...p.code, [key]: code } }));
  },
  toggleRead(track: TrackId, key: string) {
    updateTrack(track, p => {
      const read = { ...p.read };
      if (read[key]) delete read[key];
      else read[key] = Date.now();
      return { ...p, read };
    });
  },
  markRead(track: TrackId, keys: string[]) {
    updateTrack(track, p => {
      const read = { ...p.read };
      for (const k of keys) read[k] ??= Date.now();
      return { ...p, read };
    });
  },
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useTrackProgress(track: TrackId): TrackProgress {
  return useStore().progress[track] ?? EMPTY_PROGRESS;
}

/** Test hook: start from a clean slate. */
export function resetStoreForTests() {
  memory.clear();
  setState(initialState());
}
