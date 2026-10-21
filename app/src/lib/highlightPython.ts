import { escapeHtml } from './highlightSql';

/** Static Python highlighting for read-only code blocks (lessons, solutions, tests). */
const KEYWORDS = new Set(
  ('False None True and as assert async await break class continue def del elif else except finally for from global if ' +
    'import in is lambda nonlocal not or pass raise return try while with yield match case').split(' '),
);
const BUILTINS = new Set(
  ('print len range enumerate zip sorted reversed sum min max abs any all map filter set dict list tuple str int float bool ' +
    'isinstance super open iter next round divmod hash repr type object').split(' '),
);

export function highlightPython(src: string): string {
  return src.replace(
    /(#[^\n]*)|([rbfRBF]{0,2}("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?))|(\b\d[\d_]*(?:\.\d+)?\b)|(@\w+)|([A-Za-z_]\w*)|([&<>"])/g,
    (_m, com, str, _q, num, deco, word, ch) => {
      if (com) return `<span class="tk-com">${escapeHtml(com)}</span>`;
      if (str) return `<span class="tk-str">${escapeHtml(str)}</span>`;
      if (num) return `<span class="tk-num">${num}</span>`;
      if (deco) return `<span class="tk-fn">${escapeHtml(deco)}</span>`;
      if (word) {
        if (KEYWORDS.has(word)) return `<span class="tk-kw">${word}</span>`;
        if (BUILTINS.has(word)) return `<span class="tk-fn">${word}</span>`;
        return word;
      }
      return escapeHtml(ch);
    },
  );
}
