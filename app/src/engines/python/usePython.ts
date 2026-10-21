import { useEffect, useState } from 'react';
import { python } from './client';

let loaded = false;

/** Boots the Python worker on first use; `ready` flips once Python can run. */
export function usePython(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(loaded);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (loaded) return;
    let live = true;
    python.boot().then(
      () => {
        loaded = true;
        if (live) setReady(true);
      },
      e => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, []);
  return { ready, error };
}
