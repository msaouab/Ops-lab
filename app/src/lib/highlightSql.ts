/** Static SQL highlighting for read-only code blocks (lessons, solutions). */

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const KEYWORDS = new Set(
  ('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN LEFT RIGHT INNER OUTER FULL CROSS GROUP BY ORDER HAVING LIMIT OFFSET ' +
    'DISTINCT UNION ALL INTERSECT EXCEPT WITH RECURSIVE CASE WHEN THEN ELSE END INSERT INTO VALUES UPDATE SET DELETE CREATE ' +
    'TABLE VIEW INDEX DROP ALTER ADD COLUMN RENAME TO PRIMARY KEY FOREIGN REFERENCES UNIQUE DEFAULT CHECK CONSTRAINT BETWEEN ' +
    'LIKE ILIKE EXISTS ASC DESC OVER PARTITION BEGIN COMMIT ROLLBACK SAVEPOINT RELEASE TRANSACTION RETURNING CONFLICT DO ' +
    'NOTHING IF INTEGER TEXT REAL NUMERIC BOOLEAN DATE VARCHAR ROWS RANGE PRECEDING FOLLOWING UNBOUNDED CURRENT ROW NULLS ' +
    'FIRST LAST TRUE FALSE EXPLAIN QUERY PLAN EXCLUDED').split(' '),
);
const FUNCTIONS = new Set(
  ('COUNT SUM AVG MIN MAX ROUND ABS UPPER LOWER LENGTH SUBSTR TRIM REPLACE COALESCE NULLIF CAST STRFTIME JULIANDAY ' +
    'ROW_NUMBER RANK DENSE_RANK LAG LEAD FIRST_VALUE LAST_VALUE NTILE GROUP_CONCAT IFNULL PRAGMA_TABLE_INFO PRAGMA_INDEX_INFO').split(' '),
);

/** Returns HTML: comments, strings, numbers, keywords and functions wrapped in token spans. */
export function highlightSql(src: string): string {
  return src.replace(/(--[^\n]*)|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|([&<>"])/g, (_m, com, str, num, word, ch) => {
    if (com) return `<span class="tk-com">${escapeHtml(com)}</span>`;
    if (str) return `<span class="tk-str">${escapeHtml(str)}</span>`;
    if (num) return `<span class="tk-num">${num}</span>`;
    if (word) {
      const up = word.toUpperCase();
      if (KEYWORDS.has(up)) return `<span class="tk-kw">${word}</span>`;
      if (FUNCTIONS.has(up)) return `<span class="tk-fn">${word}</span>`;
      return word;
    }
    return escapeHtml(ch);
  });
}
