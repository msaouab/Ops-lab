import { lastSet, type ResultSet, type RunResult } from '../engines/sql/engine';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function cell(v: unknown, i: number) {
  if (v === null) return <td key={i} className="null">NULL</td>;
  if (typeof v === 'number') {
    return <td key={i} className="num">{Number.isInteger(v) ? v : Math.round(v * 10000) / 10000}</td>;
  }
  return <td key={i}>{String(v)}</td>;
}

export function ResultTable({ set, max = 200, badRow }: { set: ResultSet | null | undefined; max?: number; badRow?: number }) {
  if (!set) return <p className="muted" style={{ fontSize: 14 }}>No rows returned.</p>;
  const rows = set.values.slice(0, max);
  return (
    <>
      <div className="tscroll">
        <table className="rt">
          <thead>
            <tr>{set.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={badRow === i ? 'diff' : undefined}>{r.map(cell)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {set.values.length > max && <p className="meta">Showing {max} of {set.values.length} rows.</p>}
    </>
  );
}

/** Output of a plain run (not graded): error, statement summary or last result set. */
export function RunOutput({ result }: { result: RunResult }) {
  if (!result.ok) return <div className="err" role="alert">{result.error}</div>;
  const s = lastSet(result);
  if (!s) return <p className="meta">Statement ran. Rows changed by the last statement: {result.changed}.</p>;
  return (
    <>
      <p className="meta">
        {plural(s.values.length, 'row')}
        {result.sets.length > 1 && ` · showing the last of ${result.sets.length} results`}
      </p>
      <ResultTable set={s} />
    </>
  );
}
