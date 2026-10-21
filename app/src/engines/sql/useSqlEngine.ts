import { useEffect, useState } from 'react';
// Vite resolves `sql.js` to its browser build, which loads this wasm file.
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { SQL_SEED } from '../../content/sql';
import { createSqlEngine, type SqlEngine } from './engine';

// Loaded once per page load, and only when a SQL page first needs it.
let pending: Promise<SqlEngine> | null = null;
let loaded: SqlEngine | null = null;

function loadEngine(): Promise<SqlEngine> {
  pending ??= createSqlEngine(SQL_SEED, () => wasmUrl).then(e => (loaded = e));
  return pending;
}

export function useSqlEngine(): { engine: SqlEngine | null; error: string | null } {
  const [engine, setEngine] = useState<SqlEngine | null>(loaded);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (loaded) return;
    let live = true;
    loadEngine().then(
      e => live && setEngine(e),
      e => {
        pending = null; // allow a retry on the next visit
        if (live) setError(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return { engine, error };
}
