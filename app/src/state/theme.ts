import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'opslab:theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

let choice = read();
const listeners = new Set<() => void>();

/** `system` follows prefers-color-scheme via CSS; light/dark pin data-theme. */
export function applyTheme() {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function cycleTheme() {
  choice = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]!;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage unavailable */
  }
  applyTheme();
  listeners.forEach(l => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => choice,
  );
}
