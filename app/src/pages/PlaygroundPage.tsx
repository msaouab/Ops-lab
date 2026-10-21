import { useMemo, useRef, useState, type ReactNode } from 'react';
import { CodeEditor, type CodeEditorHandle } from '../components/CodeEditor';
import { EngineGate } from '../components/EngineGate';
import { RunOutput } from '../components/ResultTable';
import { Columns } from '../components/ui';
import { runSql, schemaInfo, type SqlEngine } from '../engines/sql/engine';
import { playground, playgroundDb, resetPlaygroundDb } from '../engines/sql/playground';

function Playground({ engine }: { engine: SqlEngine }) {
  const [schema, setSchema] = useState(() => schemaInfo(playgroundDb(engine)));
  const [output, setOutput] = useState<ReactNode>(<div className="verdict info"><b>Output</b><span>Results appear here.</span></div>);
  const editor = useRef<CodeEditorHandle>(null);
  const completion = useMemo(() => Object.fromEntries(schema.map(t => [t.name, t.columns.map(c => c.name)])), [schema]);

  function run(sql = playground.code) {
    const r = runSql(playgroundDb(engine), sql);
    setOutput(<RunOutput result={r} />);
    // DDL changes the table list on the left and the completion schema.
    if (r.ok && /\b(CREATE|DROP|ALTER)\b/i.test(sql)) setSchema(schemaInfo(playgroundDb(engine)));
  }

  function reset() {
    setSchema(schemaInfo(resetPlaygroundDb(engine)));
    setOutput(<div className="verdict info"><b>Database reset</b><span>Every table is back to its original rows.</span></div>);
  }

  function preview(table: string) {
    const sql = `SELECT * FROM ${table} LIMIT 20;`;
    editor.current?.setValue(sql);
    run(sql);
  }

  return (
    <div className="play">
      <aside className="schema" aria-label="Schema">
        <div className="subh">Schema<button className="btn small ghost" type="button" onClick={reset}>Reset database</button></div>
        {schema.map(t => (
          <button type="button" className="tbl" key={t.name} onClick={() => preview(t.name)} aria-label={`Preview ${t.name}`}>
            <b>{t.name}</b>
            <Columns table={t} />
          </button>
        ))}
      </aside>
      <section className="ide">
        <div className="ide-box">
          <div className="ide-bar"><span className="label">playground.sql · SQLite</span></div>
          <CodeEditor
            ref={editor}
            value={playground.code}
            onChange={v => { playground.code = v; }}
            onRun={() => run()}
            schema={completion}
            label="Playground SQL editor"
          />
          <div className="ide-foot">
            <span className="hint"><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run</span>
            <button className="btn primary" type="button" onClick={() => run()}>Run</button>
          </div>
        </div>
        <div className="ide-box"><div className="results" aria-live="polite">{output}</div></div>
      </section>
    </div>
  );
}

export function PlaygroundPage() {
  return (
    <>
      <header className="topic-head">
        <div className="eyebrow">Free practice</div>
        <h1>Playground</h1>
        <p>A scratch copy of the course database. Run anything, including INSERT, DROP or CREATE. Click a table to preview it.</p>
      </header>
      <EngineGate>{engine => <Playground engine={engine} />}</EngineGate>
    </>
  );
}
