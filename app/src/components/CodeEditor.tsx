import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { EditorState, Prec, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder as placeholderExt } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { sql, SQLite } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';
import { yaml } from '@codemirror/lang-yaml';
import { StreamLanguage } from '@codemirror/language';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import type { CodeLanguage } from '../content/types';
import { tags as t } from '@lezer/highlight';

export interface CodeEditorHandle {
  /** Replace the whole document, e.g. "Load solution", and focus the editor. */
  setValue(value: string): void;
  focus(): void;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  onRun: () => void;
  /** ⇧⌘↵ submits; falls back to run when there is nothing to grade. */
  onSubmit?: () => void;
  /** Editor language; defaults to SQL. */
  language?: CodeLanguage;
  /** SQL only: table -> columns, for completion. */
  schema?: Record<string, string[]>;
  label: string;
  placeholder?: string;
  ref?: Ref<CodeEditorHandle>;
}

// Colours come from the CSS tokens, so the editor follows light/dark themes.
const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--code-bg)', color: 'var(--ink)', fontSize: '14px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--f-mono)', lineHeight: '1.6' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--ink)' },
  '.cm-cursor': { borderLeftColor: 'var(--ink)' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--com)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
  },
  '.cm-placeholder': { color: 'var(--com)' },
  '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent)' },
  '.cm-tooltip': { backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul > li': { fontFamily: 'var(--f-mono)', fontSize: '13px', padding: '2px 8px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.typeName, t.bool, t.null], color: 'var(--kw)', fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: 'var(--str)' },
  { tag: t.number, color: 'var(--num)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--com)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.standard(t.name), t.function(t.definition(t.variableName))], color: 'var(--fn)' },
  { tag: [t.definitionKeyword, t.controlKeyword, t.moduleKeyword, t.self], color: 'var(--kw)', fontWeight: '600' },
]);

function languageSupport(language: CodeLanguage, schema?: Record<string, string[]>) {
  switch (language) {
    case 'python': return [python(), indentUnit.of('    '), EditorState.tabSize.of(4)];
    // YAML is indented with spaces only; tab inserts two.
    case 'yaml': return [yaml(), indentUnit.of('  '), EditorState.tabSize.of(2)];
    case 'dockerfile': return [StreamLanguage.define(dockerFile), indentUnit.of('    '), EditorState.tabSize.of(4)];
    case 'shell': return [StreamLanguage.define(shell), EditorState.tabSize.of(2)];
    default: return [sql({ dialect: SQLite, schema, upperCaseKeywords: true }), EditorState.tabSize.of(2)];
  }
}

export function CodeEditor({ value, onChange, onRun, onSubmit, language = 'sql', schema, label, placeholder, ref }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const lang = useRef(new Compartment());
  // Latest callbacks without rebuilding the editor on every render.
  const cb = useRef({ onChange, onRun, onSubmit });
  cb.current = { onChange, onRun, onSubmit };

  useEffect(() => {
    const keys = Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => (cb.current.onRun(), true) },
      { key: 'Shift-Mod-Enter', run: () => ((cb.current.onSubmit ?? cb.current.onRun)(), true) },
    ]));
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          keys,
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ icons: false }),
          lang.current.of(languageSupport(language, schema)),
          syntaxHighlighting(highlight),
          theme,
          placeholder ? placeholderExt(placeholder) : [],
          EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false', autocapitalize: 'off' }),
          keymap.of([...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
          EditorView.updateListener.of(u => {
            if (u.docChanged) cb.current.onChange?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor is created once; value/schema changes are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep completion in sync with the schema (the playground can CREATE tables).
  useEffect(() => {
    view.current?.dispatch({ effects: lang.current.reconfigure(languageSupport(language, schema)) });
  }, [language, schema]);

  // Outside changes to `value` (reset, switching exercise) replace the document.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    setValue(next: string) {
      const v = view.current;
      if (!v) return;
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: next }, selection: { anchor: next.length } });
      v.focus();
    },
    focus() {
      view.current?.focus();
    },
  }), []);

  return <div className="editor" ref={host} />;
}
