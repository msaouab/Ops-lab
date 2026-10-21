import type { ReactNode } from 'react';
import type { Difficulty } from '../content/types';
import type { TableInfo } from '../engines/sql/engine';
import { highlightSql } from '../lib/highlightSql';
import { highlightPython } from '../lib/highlightPython';
import type { CodeLanguage } from '../content/types';
import { highlightDockerfile, highlightShell, highlightYaml } from '../lib/highlightOps';

export function Pill({ kind, children }: { kind: Difficulty | 'Lesson' | 'Soon'; children?: ReactNode }) {
  return <span className={`pill ${kind}`}>{children ?? kind}</span>;
}

export function CheckDot({ on, label }: { on: boolean; label?: string }) {
  return <span className={`check${on ? ' on' : ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function Bar({ value, total, color }: { value: number; total: number; color?: string }) {
  const pct = total ? (100 * value) / total : 0;
  return (
    <span className="bar" aria-hidden="true">
      <i style={{ width: `${pct}%`, background: color }} />
    </span>
  );
}

/** "Lesson" / "Problems" progress line on a roadmap node. */
export function NodeProgress({ label, value, total, doneLabel }: { label: string; value: number; total: number; doneLabel?: string }) {
  return (
    <span className="node-prog">
      <span className="lab">{label}</span>
      <Bar value={value} total={total} />
      {doneLabel && value === total ? <span className="tick">{doneLabel}</span> : `${value}/${total}`}
    </span>
  );
}

/** Column list with primary-key columns highlighted. */
export function Columns({ table }: { table: TableInfo }) {
  return (
    <div className="cols">
      {table.columns.map((c, i) => (
        <span key={c.name}>
          {i > 0 && ', '}
          {c.pk ? <span className="k">{c.name}</span> : c.name}
        </span>
      ))}
    </div>
  );
}

/** Trusted HTML that ships with the app's own content files. */
export function Html({ html, as: Tag = 'span', className }: { html: string; as?: 'span' | 'p' | 'div' | 'li' | 'h1' | 'code'; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Read-only code, highlighted (lessons, check queries, solutions, tests). */
const HIGHLIGHT: Record<CodeLanguage, (src: string) => string> = {
  sql: highlightSql,
  python: highlightPython,
  yaml: highlightYaml,
  dockerfile: highlightDockerfile,
  shell: highlightShell,
};

export function CodeBlock({ code, language }: { code: string; language: CodeLanguage }) {
  const html = HIGHLIGHT[language](code);
  return <pre><code dangerouslySetInnerHTML={{ __html: html }} /></pre>;
}

export function SqlCode({ code }: { code: string }) {
  return <CodeBlock code={code} language="sql" />;
}
