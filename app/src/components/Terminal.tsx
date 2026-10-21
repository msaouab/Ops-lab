import { useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from 'react';

export interface TerminalEntry {
  cmd: string;
  output: string;
  ok: boolean;
}

export interface TerminalHandle {
  focus(): void;
  /** Types a command into the prompt (without running it). */
  fill(cmd: string): void;
}

interface Props {
  entries: TerminalEntry[];
  /** Runs a command and returns what to print. */
  onCommand: (cmd: string) => void;
  /** "clear" or Ctrl+L: hides the scrollback (the session keeps its state). */
  onClear: () => void;
  /** Words for Tab completion. */
  complete?: (line: string) => string[];
  label: string;
  placeholder?: string;
  ref?: Ref<TerminalHandle>;
}

/** A one-line prompt with scrollback, history (↑/↓) and Tab completion. */
export function Terminal({ entries, onCommand, onClear, complete, label, placeholder, ref }: Props) {
  const [line, setLine] = useState('');
  const [hint, setHint] = useState<string[]>([]);
  const history = useRef<number | null>(null);
  const draft = useRef('');
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus(),
    fill: (cmd: string) => {
      setLine(cmd);
      input.current?.focus();
    },
  }), []);

  const past = entries.map(e => e.cmd).filter(Boolean);

  function submit() {
    const cmd = line.trim();
    setLine('');
    setHint([]);
    history.current = null;
    if (cmd === 'clear') return onClear();
    onCommand(cmd);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!past.length) return;
      e.preventDefault();
      if (history.current === null) draft.current = line;
      const at = history.current ?? past.length;
      const next = e.key === 'ArrowUp' ? Math.max(0, at - 1) : at + 1;
      if (next >= past.length) {
        history.current = null;
        setLine(draft.current);
      } else {
        history.current = next;
        setLine(past[next]!);
      }
    } else if (e.key === 'Tab' && complete) {
      e.preventDefault();
      const options = complete(line);
      if (options.length === 1) {
        setLine(line.replace(/\S*$/, options[0]!) + ' ');
        setHint([]);
      } else if (options.length > 1) {
        // Fill the common prefix, list the rest.
        const word = /\S*$/.exec(line)![0];
        let common = options[0]!;
        for (const o of options) while (!o.startsWith(common)) common = common.slice(0, -1);
        if (common.length > word.length) setLine(line.slice(0, line.length - word.length) + common);
        setHint(options.slice(0, 24));
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onClear();
    } else if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault();
      setLine('');
      setHint([]);
    }
  }

  return (
    <div className="term" onClick={() => !window.getSelection()?.toString() && input.current?.focus()}>
      <div className="term-scroll" ref={scroller} aria-live="polite">
        {entries.map((e, i) => (
          <div className="term-entry" key={i}>
            {e.cmd && <div className="term-cmd"><span className="term-ps" aria-hidden="true">$</span>{e.cmd}</div>}
            {e.output && <pre className={`term-out${e.ok ? '' : ' bad'}`}>{e.output}</pre>}
          </div>
        ))}
        {hint.length > 0 && <pre className="term-out term-hint">{hint.join('   ')}</pre>}
        <div className="term-line">
          <span className="term-ps" aria-hidden="true">$</span>
          <input
            ref={input}
            value={line}
            onChange={e => setLine(e.target.value)}
            onKeyDown={onKey}
            aria-label={label}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}
