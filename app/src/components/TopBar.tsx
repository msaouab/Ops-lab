import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { getReadyTrack } from '../content/tracks';
import { actions, useStore, useTrackProgress } from '../state/store';
import { allExercises, solvedCount } from '../state/progress';
import { cycleTheme, useTheme, type ThemeChoice } from '../state/theme';
import type { ReadyTrack } from '../content/types';

function Learner() {
  const { profiles, current } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const me = profiles.find(p => p.id === current) ?? profiles[0]!;

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  if (editing) {
    const done = () => {
      actions.renameProfile(me.id, draft);
      setEditing(false);
    };
    return (
      <div className="who">
        <input
          ref={input}
          maxLength={24}
          value={draft}
          aria-label="Learner name"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') done();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <button className="btn small primary" type="button" onClick={done}>Save</button>
      </div>
    );
  }
  return (
    <div className="who">
      <label htmlFor="who-sel">Learning as</label>
      <select id="who-sel" value={current} onChange={e => actions.switchProfile(e.target.value)}>
        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="btn small ghost" type="button" onClick={() => { setDraft(me.name); setEditing(true); }}>
        Rename
      </button>
    </div>
  );
}

function Score({ track }: { track: ReadyTrack }) {
  const progress = useTrackProgress(track.id);
  const n = solvedCount(track, progress), total = allExercises(track).length;
  return (
    <div className="score" aria-label={`${n} of ${total} ${track.title} problems solved`}>
      <span><b>{n}</b> / {total} solved</span>
      <span className="meter" aria-hidden="true"><i style={{ width: `${((100 * n) / total).toFixed(1)}%` }} /></span>
    </div>
  );
}

const THEME_LABEL: Record<ThemeChoice, string> = { system: 'Theme: follows your system', light: 'Theme: light', dark: 'Theme: dark' };

function ThemeButton() {
  const theme = useTheme();
  return (
    <button type="button" className="icon-btn" onClick={cycleTheme} aria-label={`${THEME_LABEL[theme]}. Click to change.`} title={THEME_LABEL[theme]}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      ) : theme === 'light' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
      )}
    </button>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const track = getReadyTrack(pathname.split('/')[1]);
  const inPlayground = pathname.endsWith('/playground');
  return (
    <header className="top">
      <div className="top-in">
        <Link className="brand" to="/">
          <span className="brand-mark">{track?.mark ?? 'OL'}</span>
          Ops Lab
          {track && <><span className="sep">/</span>{track.title}</>}
        </Link>
        {track && (
          <nav className="nav" aria-label={`${track.title} sections`}>
            <NavLink to={`/${track.id}`} aria-current={!inPlayground ? 'page' : undefined}>Roadmap</NavLink>
            {track.playground && (
              <NavLink to={`/${track.id}/playground`} aria-current={inPlayground ? 'page' : undefined}>
                {track.language === 'python' ? 'Scratchpad' : 'Playground'}
              </NavLink>
            )}
          </nav>
        )}
        <div className="top-right">
          <Learner />
          {track && <Score track={track} />}
          <ThemeButton />
        </div>
      </div>
    </header>
  );
}
