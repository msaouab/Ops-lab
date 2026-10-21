import { useEffect, useRef, useState } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { Terminal, type TerminalEntry, type TerminalHandle } from '../components/Terminal';
import { applyYaml } from '../engines/devops/apply';
import { list, nameOf, nsOf, podState, type Cluster } from '../engines/devops/cluster';
import { completions } from '../engines/devops/complete';
import { CLUSTERS, type ClusterId } from '../engines/devops/fixtures';
import { runLine } from '../engines/devops/kubectl';
import { devopsPlayground, playgroundCluster, resetPlayground } from '../engines/devops/playground';

const STATUS_CLASS = (s: string) => (s === 'Running' ? 'ok' : s === 'Pending' ? 'warn' : 'bad');

/** Pods per namespace, coloured by status: a live view of the cluster. */
function Overview({ cluster, onPick }: { cluster: Cluster; onPick: (cmd: string) => void }) {
  const namespaces = list(cluster, 'Namespace').map(nameOf).filter(n => !['kube-public', 'kube-node-lease'].includes(n));
  return (
    <div className="cluster-view">
      {namespaces.map(ns => {
        const pods = list(cluster, 'Pod', ns).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
        return (
          <div className="tbl" key={ns}>
            <button type="button" className="ns-name" onClick={() => onPick(`kubectl get all -n ${ns}`)}>{ns}</button>
            {pods.length === 0 ? <div className="cols">no pods</div> : (
              <ul className="pod-dots">
                {pods.map(p => {
                  const s = podState(cluster, p).status;
                  return (
                    <li key={nameOf(p)}>
                      <button type="button" className={`pod-dot ${STATUS_CLASS(s)}`} title={`${nameOf(p)}: ${s}`} onClick={() => onPick(`kubectl describe pod ${nameOf(p)} -n ${nsOf(p)}`)}>
                        <span className="dot" aria-hidden="true" />{nameOf(p)}<small>{s === 'Running' ? '' : ` ${s}`}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ClusterPlaygroundPage() {
  const [, force] = useState(0);
  const [entries, setEntries] = useState<TerminalEntry[]>(devopsPlayground.entries);
  const [from, setFrom] = useState(0);
  const [clusterId, setClusterId] = useState<ClusterId>(devopsPlayground.clusterId);
  const term = useRef<TerminalHandle>(null);
  const cluster = playgroundCluster();

  const push = (e: TerminalEntry[]) => {
    devopsPlayground.entries = [...devopsPlayground.entries, ...e];
    setEntries(devopsPlayground.entries);
  };

  const files = () => ({ [devopsPlayground.filename]: devopsPlayground.yaml });

  function onCommand(cmd: string) {
    if (!cmd) return push([{ cmd: '', output: '', ok: true }]);
    const r = runLine(playgroundCluster(), cmd, files());
    push([{ cmd, output: r.output, ok: r.ok }]);
  }

  // Commands sent from a lesson ("Edit in playground") run once on arrival.
  useEffect(() => {
    if (!devopsPlayground.pending.length) return;
    const cmds = devopsPlayground.pending;
    devopsPlayground.pending = [];
    push(cmds.map(cmd => {
      const r = runLine(playgroundCluster(), cmd, files());
      return { cmd, output: r.output, ok: r.ok };
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function apply() {
    const c = playgroundCluster();
    const r = applyYaml(c, devopsPlayground.yaml, devopsPlayground.filename);
    push([{ cmd: `kubectl apply -f ${devopsPlayground.filename}`, output: r.output, ok: r.ok }]);
    force(n => n + 1);
  }

  function switchCluster(id: ClusterId) {
    setClusterId(id);
    resetPlayground(id);
    setEntries([]);
    setFrom(0);
  }

  return (
    <>
      <header className="topic-head">
        <div className="eyebrow">Free practice</div>
        <h1>Cluster playground</h1>
        <p>A simulated k3d cluster all to yourself. Run any kubectl command, write a manifest and apply it, break things and fix them. Pick a broken scenario to practise debugging.</p>
      </header>
      <div className="play">
        <aside className="schema" aria-label="Cluster">
          <div className="subh">
            Cluster
            <button className="btn small ghost" type="button" onClick={() => switchCluster(clusterId)}>Reset</button>
          </div>
          <label className="field">
            <span>Start from</span>
            <select value={clusterId} onChange={e => switchCluster(e.target.value as ClusterId)}>
              {(Object.keys(CLUSTERS) as ClusterId[]).map(id => <option key={id} value={id}>{id}: {CLUSTERS[id]}</option>)}
            </select>
          </label>
          <Overview cluster={cluster} onPick={cmd => term.current?.fill(cmd)} />
        </aside>
        <section className="ide">
          <div className="ide-box">
            <div className="ide-bar"><span className="label">zsh · kubectl → k3d-lab · namespace {cluster.namespace}</span></div>
            <Terminal
              ref={term}
              entries={entries.slice(from)}
              onCommand={cmd => { onCommand(cmd); force(n => n + 1); }}
              onClear={() => setFrom(entries.length)}
              complete={line => completions(playgroundCluster(), line)}
              label="Playground terminal"
              placeholder="kubectl get pods -A"
            />
          </div>
          <div className="ide-box">
            <div className="ide-bar">
              <span className="label">
                <input
                  className="filename"
                  defaultValue={devopsPlayground.filename}
                  aria-label="File name"
                  onChange={e => { devopsPlayground.filename = e.target.value.trim() || 'manifest.yaml'; }}
                />
              </span>
            </div>
            <CodeEditor
              value={devopsPlayground.yaml}
              onChange={v => { devopsPlayground.yaml = v; }}
              onRun={apply}
              language="yaml"
              label="Manifest editor"
            />
            <div className="ide-foot">
              <span className="hint">Or type <code>kubectl apply -f {devopsPlayground.filename}</code> in the terminal · <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> applies</span>
              <button className="btn primary" type="button" onClick={apply}>Apply</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
