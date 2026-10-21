import type { PythonExercise } from '../types';
import { PROBLEM_SOURCES } from './problems.generated';

// The tests are read from the repo itself at build time, so the app and
// `pytest` always grade with exactly the same file.
const TEST_FILES = import.meta.glob('../../../../A2-online-test/**/test_*.py', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const STRUCTURES = Object.values(
  import.meta.glob('../../../../A2-online-test/03-lists-trees-heaps/structures.py', { query: '?raw', import: 'default', eager: true }),
)[0] as string;

const testsFor = (module: string) => {
  const hit = Object.entries(TEST_FILES).find(([p]) => p.endsWith(`/test_${module}.py`));
  if (!hit) throw new Error(`No test file for ${module}`);
  return hit[1];
};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Authored {
  /** A nudge toward the pattern, not the answer. */
  hint: string;
  complexity: string;
}

/** One problem from A2-online-test, with the hand-written hint and complexity. */
export function problem(module: string, authored: Authored): PythonExercise {
  const src = PROBLEM_SOURCES[module];
  if (!src) throw new Error(`Unknown problem ${module}`);
  const tests = testsFor(module);
  const names = [...tests.matchAll(/^def (test_\w+)/gm)].map(m => m[1]!);
  const uses = (name: string) => tests.includes(name) || src.starter.includes(name);
  return {
    kind: 'python',
    slug: slugify(src.title),
    module,
    title: src.title,
    difficulty: src.difficulty,
    prompt: src.prompt,
    hint: authored.hint,
    complexity: authored.complexity,
    starter: src.starter,
    solution: src.solution,
    tests,
    sampleTests: names.includes('test_examples') ? ['test_examples'] : names.slice(0, 1),
    targetMinutes: src.targetMinutes,
    helpers: uses('structures') ? { structures: STRUCTURES } : undefined,
    similar: src.similar,
    source: src.source,
    mock: src.mock,
  };
}
