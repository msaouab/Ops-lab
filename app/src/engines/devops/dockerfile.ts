/**
 * A Dockerfile parser and a `docker build` preview: stages, the final
 * image's settings, and the lint warnings hadolint and Docker's own build
 * checks would print.
 */

export interface Instruction {
  /** Upper-case keyword: FROM, RUN, COPY… */
  op: string;
  /** Everything after the keyword, continuation lines joined. */
  args: string;
  /** JSON (exec) form, when the arguments are a JSON array. */
  json?: string[];
  /** --from=build, --chown=node… */
  flags: Record<string, string>;
  line: number;
  stage: number;
}

export interface Stage {
  index: number;
  name?: string;
  base: string;
  instructions: Instruction[];
}

export interface Dockerfile {
  instructions: Instruction[];
  stages: Stage[];
  errors: string[];
}

const KNOWN = new Set(['FROM', 'RUN', 'CMD', 'LABEL', 'EXPOSE', 'ENV', 'ADD', 'COPY', 'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD', 'STOPSIGNAL', 'HEALTHCHECK', 'SHELL', 'MAINTAINER']);

export function parseDockerfile(text: string): Dockerfile {
  const instructions: Instruction[] = [];
  const errors: string[] = [];
  const stages: Stage[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const start = i;
    let raw = lines[i]!;
    if (/^\s*#/.test(raw) || !raw.trim()) continue;
    while (/\\\s*$/.test(raw) && i + 1 < lines.length) {
      raw = raw.replace(/\\\s*$/, ' ') + lines[++i]!.replace(/^\s*#.*$/, '');
    }
    const m = /^\s*(\w+)\s*(.*)$/.exec(raw);
    if (!m) continue;
    const op = m[1]!.toUpperCase();
    let args = m[2]!.replace(/\s+/g, ' ').trim();
    if (!KNOWN.has(op)) {
      errors.push(`line ${start + 1}: unknown instruction: ${m[1]}`);
      continue;
    }
    const flags: Record<string, string> = {};
    while (/^--[\w-]+(=\S+)?\s/.test(`${args} `) && (op === 'COPY' || op === 'ADD' || op === 'RUN' || op === 'FROM' || op === 'HEALTHCHECK')) {
      const fm = /^--([\w-]+)(?:=(\S+))?\s*/.exec(args)!;
      flags[fm[1]!] = fm[2] ?? 'true';
      args = args.slice(fm[0].length);
    }
    let json: string[] | undefined;
    if (args.startsWith('[')) {
      try {
        const v = JSON.parse(args);
        if (Array.isArray(v)) json = v.map(String);
      } catch {
        errors.push(`line ${start + 1}: ${op} looks like JSON (exec) form but isn't valid JSON: use double quotes, e.g. ["node", "dist/main.js"]`);
      }
    }
    if (op === 'FROM') {
      const fm = /^(\S+)(?:\s+as\s+(\S+))?$/i.exec(args);
      if (!fm) errors.push(`line ${start + 1}: FROM needs an image, e.g. FROM node:22-alpine`);
      stages.push({ index: stages.length, base: fm?.[1] ?? args, name: fm?.[2], instructions: [] });
    } else if (!stages.length && op !== 'ARG') {
      errors.push(`line ${start + 1}: ${op} before the first FROM: every Dockerfile starts with FROM`);
    }
    const ins: Instruction = { op, args, json, flags, line: start + 1, stage: Math.max(0, stages.length - 1) };
    instructions.push(ins);
    stages[stages.length - 1]?.instructions.push(ins);
  }
  if (!stages.length && !errors.length) errors.push('no FROM instruction: a Dockerfile starts with FROM <image>');
  return { instructions, stages, errors };
}

export interface FinalImage {
  base: string;
  stage: Stage;
  user: string;
  workdir: string;
  expose: string[];
  env: Record<string, string>;
  cmd?: string;
  entrypoint?: string;
  healthcheck?: string;
}

/** Settings of the image `docker build` produces (the last stage). */
export function finalImage(df: Dockerfile): FinalImage | null {
  const stage = df.stages[df.stages.length - 1];
  if (!stage) return null;
  // A stage built FROM an earlier stage inherits its settings.
  const chain: Stage[] = [stage];
  let cur = stage;
  for (;;) {
    const parent = df.stages.find(s => s.name && s.name === cur.base && s.index < cur.index);
    if (!parent) break;
    chain.unshift(parent);
    cur = parent;
  }
  const out: FinalImage = { base: chain[0]!.base, stage, user: 'root', workdir: '/', expose: [], env: {} };
  for (const s of chain) {
    for (const ins of s.instructions) {
      if (ins.op === 'USER') out.user = ins.args;
      if (ins.op === 'WORKDIR') out.workdir = ins.args.startsWith('/') ? ins.args : `${out.workdir.replace(/\/$/, '')}/${ins.args}`;
      if (ins.op === 'EXPOSE') out.expose.push(...ins.args.split(/\s+/));
      if (ins.op === 'ENV') {
        const pairs = ins.args.includes('=') ? [...ins.args.matchAll(/(\w+)=("[^"]*"|\S+)/g)].map(m => [m[1]!, m[2]!.replace(/^"|"$/g, '')]) : [[ins.args.split(' ')[0]!, ins.args.split(' ').slice(1).join(' ')]];
        for (const [k, v] of pairs) out.env[k!] = v!;
      }
      if (ins.op === 'CMD') out.cmd = ins.json ? JSON.stringify(ins.json) : ins.args;
      if (ins.op === 'ENTRYPOINT') out.entrypoint = ins.json ? JSON.stringify(ins.json) : ins.args;
      if (ins.op === 'HEALTHCHECK') out.healthcheck = ins.args;
    }
  }
  // Official images that switch to a non-root user themselves.
  if (out.user === 'root' && /^(gcr\.io\/distroless\/.*:nonroot|cgr\.dev\/chainguard\/)/.test(out.base)) out.user = 'nonroot';
  return out;
}

/** A realistic pinned tag to suggest for common base images. */
const PIN_EXAMPLE: Record<string, string> = {
  node: 'node:22-alpine', python: 'python:3.13-slim', nginx: 'nginx:1.29-alpine', postgres: 'postgres:17-alpine',
  redis: 'redis:7.4-alpine', golang: 'golang:1.25-alpine', alpine: 'alpine:3.22', ubuntu: 'ubuntu:24.04', debian: 'debian:12-slim',
};
const pinExample = (base: string) => PIN_EXAMPLE[base.replace(/:.*$/, '').split('/').pop()!] ?? `${base.replace(/:.*$/, '')}:<version>`;

/** Warnings in the spirit of hadolint and Docker's build checks. */
export function lint(df: Dockerfile): string[] {
  const w: string[] = [];
  for (const s of df.stages) {
    if (!s.base.includes(':') && !s.base.includes('@') && !df.stages.some(x => x.name === s.base) && s.base !== 'scratch') {
      w.push(`line ${s.instructions[0]?.line}: FROM ${s.base} has no tag, so it means :latest and changes under you. Pin a version, e.g. ${pinExample(s.base)}`);
    } else if (/:latest$/.test(s.base)) w.push(`line ${s.instructions[0]?.line}: ${s.base} uses :latest. Pin a version so builds are repeatable`);
    if (s.name && s.name !== s.name.toLowerCase()) w.push(`line ${s.instructions[0]?.line}: stage name "${s.name}" should be lower case`);
  }
  for (const ins of df.instructions) {
    if (ins.op === 'ADD' && !/^https?:|\.tar(\.gz)?\b/.test(ins.args)) w.push(`line ${ins.line}: use COPY instead of ADD for local files (ADD also unpacks archives and fetches URLs)`);
    if (ins.op === 'RUN' && /apt-get install/.test(ins.args) && !/rm -rf \/var\/lib\/apt\/lists/.test(ins.args)) w.push(`line ${ins.line}: clean the apt cache in the same RUN (&& rm -rf /var/lib/apt/lists/*) or it stays in the layer`);
    if (ins.op === 'RUN' && /apt-get install/.test(ins.args) && !/--no-install-recommends/.test(ins.args)) w.push(`line ${ins.line}: apt-get install without --no-install-recommends pulls in extra packages`);
    if (ins.op === 'RUN' && /^cd\s/.test(ins.args)) w.push(`line ${ins.line}: use WORKDIR instead of RUN cd …`);
    if ((ins.op === 'CMD' || ins.op === 'ENTRYPOINT') && !ins.json) w.push(`line ${ins.line}: ${ins.op} in shell form runs under /bin/sh, so your process doesn't get SIGTERM. Use the JSON form: ${ins.op} ["node", "dist/main.js"]`);
    if (ins.op === 'ENV' && /(PASSWORD|SECRET|TOKEN|API_KEY)\s*=/i.test(ins.args)) w.push(`line ${ins.line}: a secret in ENV is baked into the image for anyone who pulls it. Pass it at runtime instead`);
    if (ins.op === 'RUN' && /npm install\b/.test(ins.args) && !/-g\b/.test(ins.args)) w.push(`line ${ins.line}: npm install can change the lock file; use npm ci for reproducible installs`);
  }
  const counts = new Map<string, number>();
  for (const s of df.stages) {
    counts.clear();
    for (const ins of s.instructions) counts.set(ins.op, (counts.get(ins.op) ?? 0) + 1);
    if ((counts.get('CMD') ?? 0) > 1) w.push(`stage ${s.name ?? s.index}: more than one CMD; only the last one counts`);
  }
  const fin = finalImage(df);
  if (fin && (fin.user === 'root' || fin.user === '0')) w.push('the final image runs as root. Add a USER (e.g. USER node) after installing packages');
  return w;
}

/** A `docker build` style preview of the build. */
export function buildPreview(df: Dockerfile, file = 'Dockerfile'): string {
  if (df.errors.length) return `ERROR: failed to solve: ${file}:\n${df.errors.map(e => `  ${e}`).join('\n')}`;
  const out: string[] = ['[+] Building (simulated: no layers are really built)'];
  for (const s of df.stages) {
    const label = s.name ?? `stage-${s.index}`;
    const steps = s.instructions.filter(i => !['ARG', 'LABEL', 'EXPOSE', 'CMD', 'ENTRYPOINT', 'USER', 'ENV', 'HEALTHCHECK', 'STOPSIGNAL'].includes(i.op));
    steps.forEach((ins, i) => {
      const from = ins.flags.from ? ` --from=${ins.flags.from}` : '';
      out.push(` => [${label} ${i + 1}/${steps.length}] ${ins.op}${from} ${ins.args}`);
    });
  }
  const fin = finalImage(df);
  if (fin) {
    const sizes: Record<string, number> = { alpine: 8, slim: 75, distroless: 25, chainguard: 30, bookworm: 330, node: 1100 };
    const kind = /alpine/.test(fin.base) ? 'alpine' : /slim/.test(fin.base) ? 'slim' : /distroless/.test(fin.base) ? 'distroless' : /chainguard/.test(fin.base) ? 'chainguard' : /^node:\d+$/.test(fin.base) ? 'node' : 'bookworm';
    const runtime = /^node/.test(fin.base) || /node/.test(fin.base) ? 120 : 20;
    const copiesAll = fin.stage.instructions.some(i => i.op === 'COPY' && /^\.\s/.test(i.args) && !i.flags.from);
    const size = sizes[kind]! + (kind === 'node' ? 0 : runtime) + (copiesAll ? 380 : 90);
    out.push(` => exporting to image`);
    out.push('');
    out.push(`final stage:   ${fin.stage.name ?? fin.stage.index} (FROM ${fin.base})`);
    out.push(`runs as:       ${fin.user}`);
    out.push(`workdir:       ${fin.workdir}`);
    out.push(`exposes:       ${fin.expose.join(', ') || '(nothing)'}`);
    out.push(`starts with:   ${[fin.entrypoint, fin.cmd].filter(Boolean).join(' ') || '(the base image default)'}`);
    if (fin.healthcheck) out.push(`healthcheck:   ${fin.healthcheck}`);
    out.push(`approx. size:  ${size} MB${df.stages.length > 1 ? ` (${df.stages.length} stages; only the last ships)` : ''}`);
  }
  const warnings = lint(df);
  if (warnings.length) out.push('', ...warnings.map(x => `WARN: ${x}`));
  return out.join('\n');
}
