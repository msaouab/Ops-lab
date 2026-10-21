import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ReadyTrack } from '../content/types';
import type { TrackProgress } from '../state/store';
import { moduleDone, readIn, solvedIn } from '../state/progress';
import { NodeProgress } from './ui';

interface Edge {
  d: string;
  done: boolean;
}

/**
 * Modules laid out row by row; curves connect each module to the ones it
 * builds on. Edges are measured from the rendered nodes, so they follow
 * wrapping and resizing.
 */
export function Roadmap({ track, progress }: { track: ReadyTrack; progress: TrackProgress }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLAnchorElement>());
  const [edges, setEdges] = useState<Edge[]>([]);
  const number = new Map(track.modules.map((m, i) => [m.id, i + 1]));
  const byId = new Map(track.modules.map(m => [m.id, m]));

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      const box = map.getBoundingClientRect();
      const next: Edge[] = [];
      for (const m of track.modules) {
        for (const pid of m.parents) {
          const a = nodes.current.get(pid)?.getBoundingClientRect();
          const b = nodes.current.get(m.id)?.getBoundingClientRect();
          if (!a || !b) continue;
          const x1 = a.left + a.width / 2 - box.left, y1 = a.bottom - box.top;
          const x2 = b.left + b.width / 2 - box.left, y2 = b.top - box.top;
          const my = (y1 + y2) / 2;
          next.push({ d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, done: moduleDone(byId.get(pid)!, progress) });
        }
      }
      setEdges(next);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(map);
    return () => ro.disconnect();
    // byId is derived from track; progress changes recolour the edges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, progress]);

  return (
    <div className="map" ref={mapRef}>
      <svg className="edges" aria-hidden="true">
        {edges.map((e, i) => <path key={i} className={e.done ? 'done' : undefined} d={e.d} />)}
      </svg>
      {track.layout.map((row, r) => (
        <div className="map-row" key={r}>
          {row.map(id => {
            const m = byId.get(id)!;
            const s = solvedIn(m, progress), rd = readIn(m, progress);
            return (
              <Link
                key={id}
                to={`/${track.id}/${id}`}
                className={`node${moduleDone(m, progress) ? ' complete' : ''}`}
                ref={el => {
                  if (el) nodes.current.set(id, el);
                  else nodes.current.delete(id);
                }}
              >
                <span className="node-top">
                  <span className="node-num">{String(number.get(id)).padStart(2, '0')}</span>
                  <span className="node-title">{m.title}</span>
                </span>
                <span className="node-cmds">{m.tags}</span>
                <NodeProgress label="Lesson" value={rd} total={m.lesson.length} doneLabel="Read" />
                <NodeProgress label="Problems" value={s} total={m.exercises.length} />
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
