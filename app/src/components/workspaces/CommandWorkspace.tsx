import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { CommandExercise, Module, ReadyTrack } from '../../content/types';
import type { Cluster } from '../../engines/devops/cluster';
import { completions } from '../../engines/devops/complete';
import { CLUSTERS, makeCluster } from '../../engines/devops/fixtures';
import { expectedOutput, judgeCommand, replay, runExample } from '../../engines/devops/judge';
import { runLine, scriptLines } from '../../engines/devops/kubectl';
import { Lesson } from '../Lesson';
import { Terminal, type TerminalEntry, type TerminalHandle } from '../Terminal';
import { CodeBlock, Html } from '../ui';
import { actions, useTrackProgress } from '../../state/store';
import { allExercises, exerciseKey, lessonDone, readIn } from '../../state/progress';
import { WorkspaceHeader, exerciseUrl } from './WorkspaceHeader';
import { Tabs } from './SqlWorkspace';
import { useWorkspaceTab } from './useWorkspaceTab';

interface Props {
  track: ReadyTrack;
  module: Module;
  exercise: CommandExercise;
}

const WELCOME = (ex: CommandExercise): TerminalEntry => ({
  cmd: '',
  ok: true,
  output: `Connected to k3d-lab (simulated). ${CLUSTERS[ex.cluster]}\nType kubectl commands. Tab completes, ↑/↓ recall, "help" lists what works.`,
});

/** Rebuilds the session from the saved commands, so progress survives a reload. */
function restore(ex: CommandExercise, saved: string | undefined) {
  const commands = saved ? saved.split('\n').filter(Boolean) : [];
  const s = replay(ex.cluster, commands);
  return {
    cluster: s.cluster,
    commands,
    entries: [WELCOME(ex), ...s.results.map(r => ({ cmd: r.cmd, output: r.result.output, ok: r.result.ok }))],
  };
}

export function CommandWorkspace({ track, module, exercise }: Props) {
  const key = exerciseKey(module, exercise);
  const progress = useTrackProgress(track.id);
  const [tab, showTab] = useWorkspaceTab();
  const initial = useMemo(() => restore(exercise, progress.code[key]), []); // eslint-disable-line react-hooks/exhaustive-deps
  const cluster = useRef<Cluster>(initial.cluster);
  const [commands, setCommands] = useState<string[]>(initial.commands);
  const [entries, setEntries] = useState<TerminalEntry[]>(initial.entries);
  const [from, setFrom] = useState(0);
  const [output, setOutput] = useState<ReactNode>(
    <div className="verdict info">
      <b>Result</b>
      <span>{exercise.mode === 'output' ? 'Run commands in the terminal. Submit grades the output of your last command.' : 'Change the cluster with kubectl until the task is done, then submit. Your whole session is replayed and the cluster checked.'}</span>
    </div>,
  );
  const term = useRef<TerminalHandle>(null);

  const ordered = useMemo(() => allExercises(track), [track]);
  const pos = ordered.findIndex(r => r.key === key);
  const prev = ordered[pos - 1], next = ordered[pos + 1];
  const want = useMemo(() => (exercise.mode === 'output' ? expectedOutput(exercise) : null), [exercise]);

  const save = (cmds: string[]) => actions.saveCode(track.id, key, cmds.join('\n'));

  function onCommand(cmd: string) {
    if (!cmd) {
      setEntries(e => [...e, { cmd: '', output: '', ok: true }]);
      return;
    }
    const r = runLine(cluster.current, cmd);
    const cmds = [...commands, cmd];
    setCommands(cmds);
    setEntries(e => [...e, { cmd, output: r.output, ok: r.ok }]);
    save(cmds);
  }

  function reset(note = 'Cluster reset to its starting state.') {
    cluster.current = makeCluster(exercise.cluster);
    setCommands([]);
    setEntries([WELCOME(exercise), { cmd: '', ok: true, output: note }]);
    setFrom(0);
    save([]);
  }

  function runScript(script: string) {
    cluster.current = makeCluster(exercise.cluster);
    const cmds = scriptLines(script);
    const out: TerminalEntry[] = [WELCOME(exercise)];
    for (const cmd of cmds) {
      const r = runLine(cluster.current, cmd);
      out.push({ cmd, output: r.output, ok: r.ok });
    }
    setCommands(cmds);
    setEntries(out);
    setFrom(0);
    save(cmds);
    term.current?.focus();
  }

  function submit() {
    const v = judgeCommand(exercise, commands);
    if (v.pass) actions.markSolved(track.id, key);
    setOutput(
      <>
        <div className={`verdict ${v.pass ? 'ok' : 'bad'}`} role="status"><b>{v.title}</b><span>{v.msg}</span></div>
        {v.pass && next && (
          <div><Link className="btn small primary" to={exerciseUrl(track, next)}>Next problem: {next.exercise.title} →</Link></div>
        )}
        {v.mine !== undefined && !v.pass && (
          <div className="compare">
            <div><div className="subh">Your last output</div><pre className="io">{v.mine || '(empty)'}</pre></div>
            <div><div className="subh">Expected</div><pre className="io">{v.want}</pre></div>
          </div>
        )}
      </>,
    );
  }

  return (
    <>
      <WorkspaceHeader track={track} exercise={exercise} solved={Boolean(progress.solved[key])} prev={prev} next={next} />
      <div className="ws">
        <section className="panel">
          <Tabs tab={tab} showTab={showTab} module={module} lessonState={lessonDone(module, progress) ? 'Read' : `${readIn(module, progress)}/${module.lesson.length}`} />
          <div id="pane-lesson" role="tabpanel" aria-labelledby="tab-lesson" className="lesson-pane" hidden={tab !== 'lesson'}>
            <p className="muted" style={{ fontSize: 14 }}>The lesson for this topic. Examples run on their own fresh cluster; copy a command to your prompt to try it here.</p>
            <Lesson
              track={track}
              module={module}
              number={track.modules.indexOf(module) + 1}
              language="shell"
              run={(code, s) => { const r = runExample(code, s); return <pre className={`io${r.ok ? '' : ' bad'}`}>{r.output}</pre>; }}
              tryLabel="Copy to prompt"
              onTry={code => { term.current?.fill(scriptLines(code)[0] ?? ''); showTab('problem'); }}
            />
          </div>
          <div id="pane-problem" role="tabpanel" aria-labelledby="tab-problem" className="pane" hidden={tab !== 'problem'}>
            <Html as="div" className="stmt" html={exercise.prompt} />
            <div className="facts">
              <span><b>Cluster</b> {CLUSTERS[exercise.cluster]}</span>
              <span><b>Graded on</b> {exercise.mode === 'output' ? 'the output of your last command' : 'the state of the cluster after your commands'}</span>
            </div>
            {want !== null && (
              <details>
                <summary>Expected output</summary>
                <div><pre className="io">{want}</pre></div>
              </details>
            )}
            <details><summary>Hint</summary><div><p>{exercise.hint}</p></div></details>
            <details>
              <summary>Solution</summary>
              <div>
                <CodeBlock code={exercise.solution} language="shell" />
                <div><button className="btn small" type="button" onClick={() => runScript(exercise.solution)}>Run it in the terminal (resets the cluster)</button></div>
              </div>
            </details>
          </div>
        </section>
        <section className="ide">
          <div className="ide-box">
            <div className="ide-bar">
              <span className="label">zsh · kubectl → k3d-lab · namespace {cluster.current.namespace}</span>
              <button className="btn small ghost" type="button" onClick={() => reset()}>Reset cluster</button>
            </div>
            <Terminal
              ref={term}
              entries={entries.slice(from)}
              onCommand={onCommand}
              onClear={() => setFrom(entries.length)}
              complete={line => completions(cluster.current, line)}
              label="Terminal: type a kubectl command and press Enter"
              placeholder="kubectl get pods -n shop"
            />
            <div className="ide-foot">
              <span className="hint">{commands.length} command{commands.length === 1 ? '' : 's'} in this session · <kbd>Tab</kbd> completes · <kbd>↑</kbd> history</span>
              <button className="btn primary" type="button" onClick={submit}>Submit</button>
            </div>
          </div>
          <div className="ide-box">
            <div className="results" aria-live="polite">{output}</div>
          </div>
        </section>
      </div>
    </>
  );
}
