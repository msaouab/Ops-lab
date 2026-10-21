/**
 * The JSONPath dialect kubectl uses for `-o jsonpath=` and `--sort-by`:
 *
 *   {.items[*].metadata.name}        fields, [n], [*], ['key'], escaped dots (kubernetes\.io)
 *   {..namespace}                    recursive descent
 *   {.items[?(@.status.phase=="Running")].metadata.name}   filters (==, !=)
 *   {range .items[*]}{.metadata.name}{"\n"}{end}            loops with string literals
 */

type Json = unknown;

type Segment =
  | { t: 'key'; key: string }
  | { t: 'deep'; key: string }
  | { t: 'index'; i: number }
  | { t: 'all' }
  | { t: 'filter'; path: Segment[]; op: '==' | '!=' | 'exists'; value?: string };

export class JsonPathError extends Error {}

function readKey(src: string, i: number): [string, number] {
  let key = '';
  while (i < src.length && !/[.[\]]/.test(src[i]!)) {
    if (src[i] === '\\' && src[i + 1] === '.') {
      key += '.';
      i += 2;
      continue;
    }
    key += src[i++];
  }
  return [key, i];
}

export function parsePath(src: string): Segment[] {
  const s = src.trim().replace(/^\$/, '');
  const out: Segment[] = [];
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('..', i)) {
      const [key, j] = readKey(s, i + 2);
      out.push({ t: 'deep', key });
      i = j;
    } else if (s[i] === '.') {
      const [key, j] = readKey(s, i + 1);
      if (key) out.push({ t: 'key', key });
      i = j;
    } else if (s[i] === '[') {
      const close = s.indexOf(']', s[i + 1] === '?' ? s.indexOf(')', i) : i);
      if (close < 0) throw new JsonPathError(`unterminated [ in "${src}"`);
      const inner = s.slice(i + 1, close).trim();
      if (inner === '*') out.push({ t: 'all' });
      else if (/^-?\d+$/.test(inner)) out.push({ t: 'index', i: Number(inner) });
      else if (/^'.*'$|^".*"$/.test(inner)) out.push({ t: 'key', key: inner.slice(1, -1) });
      else if (inner.startsWith('?(') && inner.endsWith(')')) {
        const body = inner.slice(2, -1).trim();
        const m = /^@(\S*?)\s*(==|!=)\s*(?:"([^"]*)"|'([^']*)'|(\S+))$/.exec(body);
        if (m) out.push({ t: 'filter', path: parsePath(m[1]!), op: m[2] as '==' | '!=', value: m[3] ?? m[4] ?? m[5] });
        else if (/^@\S+$/.test(body)) out.push({ t: 'filter', path: parsePath(body.slice(1)), op: 'exists' });
        else throw new JsonPathError(`unsupported filter "${body}"`);
      } else throw new JsonPathError(`unsupported index "[${inner}]"`);
      i = close + 1;
    } else {
      // A bare word at the start, e.g. "items[*]" without the leading dot.
      const [key, j] = readKey(s, i);
      if (!key) throw new JsonPathError(`unexpected "${s[i]}" in "${src}"`);
      out.push({ t: 'key', key });
      i = j;
    }
  }
  return out;
}

function deep(node: Json, key: string, acc: Json[]) {
  if (Array.isArray(node)) for (const x of node) deep(x, key, acc);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key) acc.push(v);
      deep(v, key, acc);
    }
  }
}

export function evaluate(root: Json, path: Segment[]): Json[] {
  let cur: Json[] = [root];
  for (const seg of path) {
    const next: Json[] = [];
    for (const node of cur) {
      if (seg.t === 'key') {
        if (node && typeof node === 'object' && !Array.isArray(node) && seg.key in node) next.push((node as Record<string, Json>)[seg.key]);
      } else if (seg.t === 'deep') deep(node, seg.key, next);
      else if (seg.t === 'index') {
        if (Array.isArray(node)) {
          const v = node[seg.i < 0 ? node.length + seg.i : seg.i];
          if (v !== undefined) next.push(v);
        }
      } else if (seg.t === 'all') {
        if (Array.isArray(node)) next.push(...node);
        else if (node && typeof node === 'object') next.push(...Object.values(node));
      } else {
        const items = Array.isArray(node) ? node : [node];
        for (const item of items) {
          const got = evaluate(item, seg.path);
          if (seg.op === 'exists' ? got.length > 0 : seg.op === '==' ? got.some(g => String(g) === seg.value) : got.every(g => String(g) !== seg.value)) next.push(item);
        }
      }
    }
    cur = next;
  }
  return cur;
}

const show = (v: Json) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

type Node = { t: 'text'; s: string } | { t: 'path'; path: Segment[] } | { t: 'range'; path: Segment[]; body: Node[] };

function parseTemplate(tpl: string): Node[] {
  const tokens: (string | { block: string })[] = [];
  let i = 0;
  while (i < tpl.length) {
    const open = tpl.indexOf('{', i);
    if (open < 0) {
      tokens.push(tpl.slice(i));
      break;
    }
    if (open > i) tokens.push(tpl.slice(i, open));
    // Find the matching close, skipping quoted strings.
    let j = open + 1, quote = '';
    for (; j < tpl.length; j++) {
      const ch = tpl[j]!;
      if (quote) {
        if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '}') break;
    }
    if (j >= tpl.length) throw new JsonPathError(`unclosed action in "${tpl}"`);
    tokens.push({ block: tpl.slice(open + 1, j).trim() });
    i = j + 1;
  }
  const stack: Node[][] = [[]];
  const ranges: Node[] = [];
  for (const tok of tokens) {
    const top = stack[stack.length - 1]!;
    if (typeof tok === 'string') {
      top.push({ t: 'text', s: tok });
      continue;
    }
    const b = tok.block;
    if (/^range\s/.test(b)) {
      const node: Node = { t: 'range', path: parsePath(b.slice(5)), body: [] };
      top.push(node);
      ranges.push(node);
      stack.push(node.body);
    } else if (b === 'end') {
      if (stack.length === 1) throw new JsonPathError('{end} without {range}');
      stack.pop();
      ranges.pop();
    } else if (/^".*"$|^'.*'$/.test(b)) {
      top.push({ t: 'text', s: b.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t') });
    } else top.push({ t: 'path', path: parsePath(b) });
  }
  if (stack.length > 1) throw new JsonPathError('{range} without {end}');
  return stack[0]!;
}

function render(nodes: Node[], ctx: Json): string {
  let out = '';
  for (const n of nodes) {
    if (n.t === 'text') out += n.s;
    else if (n.t === 'path') out += evaluate(ctx, n.path).map(show).join(' ');
    else for (const item of evaluate(ctx, n.path)) out += render(n.body, item);
  }
  return out;
}

/** Renders a kubectl JSONPath template against an object (or a List). */
export function jsonpath(root: Json, template: string): string {
  const tpl = template.trim();
  return render(parseTemplate(tpl.includes('{') ? tpl : `{${tpl}}`), root);
}

/** The first value at a path, for --sort-by. */
export function valueAt(root: Json, path: string): Json {
  const p = path.trim().replace(/^\{|\}$/g, '');
  return evaluate(root, parsePath(p))[0];
}
