import type { ReactNode } from 'react';
import { useSqlEngine } from '../engines/sql/useSqlEngine';
import type { SqlEngine } from '../engines/sql/engine';

/** Renders its children once the in-browser SQL engine is ready. */
export function EngineGate({ children }: { children: (engine: SqlEngine) => ReactNode }) {
  const { engine, error } = useSqlEngine();
  if (error) {
    return <div className="loading" role="alert">The SQL engine could not load: {error}. Check your connection and reload.</div>;
  }
  if (!engine) return <div className="loading" aria-live="polite">Loading the SQL engine…</div>;
  return <>{children(engine)}</>;
}
