/** Static highlighting for YAML, Dockerfiles and shell commands in read-only code blocks. */

import { escapeHtml } from './highlightSql';

const span = (cls: string, s: string) => `<span class="tk-${cls}">${escapeHtml(s)}</span>`;

function scalar(v: string): string {
  if (!v) return '';
  const m = /^(\s*)(.*?)(\s+#.*)?$/.exec(v)!;
  const [, lead, body, com] = m;
  let html: string;
  if (/^(["']).*\1$/.test(body!)) html = span('str', body!);
  else if (/^-?\d+(\.\d+)?$/.test(body!)) html = span('num', body!);
  else if (/^(true|false|null|~|yes|no)$/i.test(body!)) html = span('kw', body!);
  else if (/^[|>][-+]?$/.test(body!)) html = span('kw', body!);
  else html = escapeHtml(body!).replace(/(\$\{\{.*?\}\})/g, '<span class="tk-fn">$1</span>');
  return escapeHtml(lead!) + html + (com ? span('com', com) : '');
}

export function highlightYaml(src: string): string {
  return src.split('\n').map(line => {
    if (/^\s*#/.test(line)) return span('com', line);
    if (/^\s*---\s*$/.test(line)) return span('kw', line);
    const m = /^(\s*(?:-\s+)*)([\w.\-/"'$]+)(:)(\s.*|)$/.exec(line);
    if (m) return `${escapeHtml(m[1]!)}${span('fn', m[2]!)}${m[3]}${scalar(m[4]!)}`;
    const item = /^(\s*-\s?)(.*)$/.exec(line);
    if (item) return escapeHtml(item[1]!) + scalar(item[2]!);
    return scalar(line);
  }).join('\n');
}

export function highlightDockerfile(src: string): string {
  return src.split('\n').map(line => {
    if (/^\s*#/.test(line)) return span('com', line);
    const m = /^(\s*)([A-Za-z]+)(\s.*|)$/.exec(line);
    if (m && /^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|HEALTHCHECK|SHELL|STOPSIGNAL|ONBUILD)$/i.test(m[2]!)) {
      const rest = escapeHtml(m[3]!)
        .replace(/(&quot;[^&]*?&quot;)/g, '<span class="tk-str">$1</span>')
        .replace(/(\s)(AS)(\s)/i, '$1<span class="tk-kw">$2</span>$3')
        .replace(/(--[\w-]+)(=\S+)?/g, '<span class="tk-fn">$1</span>$2');
      return `${m[1]}<span class="tk-kw">${m[2]}</span>${rest}`;
    }
    return escapeHtml(line);
  }).join('\n');
}

const SHELL_CMDS = /^(kubectl|k|docker|helm|git|argocd|kustomize|k3d|curl|grep|base64|echo|make|npm|npx|gh)$/;

export function highlightShell(src: string): string {
  return src.split('\n').map(line => {
    if (/^\s*#/.test(line)) return span('com', line);
    return line.replace(/(#.*$)|('[^']*'|"[^"]*")|(--?[\w-]+(?:=[^\s'"]*)?)|([\w./:-]+)|([&<>"])/g, (_m, com, str, flag, word, ch) => {
      if (com) return span('com', com);
      if (str) return span('str', str);
      if (flag) return span('fn', flag);
      if (word) return SHELL_CMDS.test(word) ? span('kw', word) : escapeHtml(word);
      return escapeHtml(ch);
    });
  }).join('\n');
}
