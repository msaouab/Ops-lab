/**
 * The content model shared by every track.
 *
 *   Track ─┬─ Module (a node on the roadmap, with prerequisites)
 *          │    ├─ LessonSection[]   read, run the example, mark as read
 *          │    └─ Exercise[]        solved when its checker accepts the answer
 *          └─ layout                 which modules sit on each roadmap row
 *
 * Exercises are a discriminated union on `kind`: each kind brings its own
 * editor language and checker: `sql`, `python`, and for DevOps `manifest`
 * (a file graded by rules), `command` (kubectl on a simulated cluster) and
 * `quiz`.
 */

import type { Cluster } from '../engines/devops/cluster';
import type { CommandResult } from '../engines/devops/kubectl';
import type { ClusterId } from '../engines/devops/fixtures';
import type { Flavor, ManifestInput } from '../engines/devops/manifest';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'];

/** Languages of code blocks and editors. */
export type CodeLanguage = 'sql' | 'python' | 'yaml' | 'dockerfile' | 'shell';

export interface LessonSection {
  heading: string;
  /** Trusted HTML from this repo (inline <code>, <b>, entities). */
  body: string;
  /** Optional bullet list, each item trusted HTML. */
  list?: string[];
  /** Runnable example in the track's language. */
  code?: string;
  /** DevOps: the example's language when it isn't the track's (shell). */
  lang?: CodeLanguage;
  /** DevOps shell examples: the cluster they run on (default "shop"). */
  cluster?: ClusterId;
  /** DevOps YAML examples: what kind of file it is, for the Run preview. */
  flavor?: Flavor;
  /** DevOps: the example's file name (shown in the preview). */
  filename?: string;
  /** DevOps: read-only files the example refers to (kustomize bases). */
  files?: Record<string, string>;
  /** A side note, e.g. how PostgreSQL differs from the in-browser SQLite. */
  note?: { label: string; body: string };
}

interface ExerciseBase {
  /** URL segment, unique within its module. */
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Trusted HTML. */
  prompt: string;
  hint: string;
  solution: string;
}

export interface SqlExercise extends ExerciseBase {
  kind: 'sql';
  /**
   * `query`: the learner's last result set is compared with the solution's.
   * `mutate`: both run on a fresh database, then `check` is compared.
   */
  mode: 'query' | 'mutate';
  /** Tables to show next to the statement. */
  tables: string[];
  /** Row order must match (otherwise rows are compared as a multiset). */
  ordered?: boolean;
  /** Column names must match too (case-insensitive). */
  checkColumns?: boolean;
  /** Query run after a `mutate` answer; required when mode is `mutate`. */
  check?: string;
  /** Keywords the answer must use, e.g. ['BEGIN', 'COMMIT']. */
  mustInclude?: string[];
}

export interface PythonExercise extends ExerciseBase {
  kind: 'python';
  /** Module name the tests import from, e.g. "longest_unique_window". */
  module: string;
  /** Code the editor starts with: imports and signatures. */
  starter: string;
  /** pytest-style test file (test_* functions with plain asserts). */
  tests: string;
  /** Test functions run by "Run"; "Submit" runs them all. */
  sampleTests: string[];
  /** Shown once solved, e.g. "O(n) time · O(k) space". */
  complexity: string;
  targetMinutes: number;
  /** Helper modules the code may import (e.g. structures for ListNode). */
  helpers?: Record<string, string>;
  /** A similar public problem for extra practice. */
  similar?: string;
  /** Where the problem lives in this repo. */
  source?: string;
  /** Timed mock test it belongs to, e.g. "Mock 2". */
  mock?: string;
}

/** One requirement of a manifest exercise: true when met, or why not. */
export interface Rule {
  label: string;
  check: (m: ManifestInput) => true | string;
}

/** A file (Dockerfile, Kubernetes YAML, workflow…) graded by rules. */
export interface ManifestExercise extends ExerciseBase {
  kind: 'manifest';
  flavor: Flavor;
  /** Shown in the editor bar, e.g. "deployment.yaml", ".github/workflows/ci.yml". */
  filename: string;
  starter: string;
  rules: Rule[];
  /** Read-only files next to it (a kustomize base, the app's package.json). */
  files?: Record<string, string>;
  /** Kubernetes manifests: the cluster Run applies them to (default "empty"). */
  cluster?: ClusterId;
}

/** kubectl in a terminal on a simulated cluster. */
export interface CommandExercise extends ExerciseBase {
  kind: 'command';
  cluster: ClusterId;
  /**
   * `output`: the last command's output must equal the solution's (read tasks).
   * `state`: after the commands, `check` must accept the cluster (change and fix tasks).
   */
  mode: 'output' | 'state';
  check?: (c: Cluster, results: CommandResult[]) => true | string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Why, shown after submitting. */
  why: string;
}

export interface QuizExercise extends ExerciseBase {
  kind: 'quiz';
  questions: QuizQuestion[];
}

export type Exercise = SqlExercise | PythonExercise | ManifestExercise | CommandExercise | QuizExercise;
export type ExerciseKind = Exercise['kind'];

export interface Module<E extends Exercise = Exercise> {
  id: string;
  title: string;
  /** Short list of the commands or ideas covered, shown on the roadmap node. */
  tags: string;
  summary: string;
  /** Modules this one builds on: drawn as roadmap edges. */
  parents: string[];
  lesson: LessonSection[];
  exercises: E[];
}

export type TrackId = 'sql' | 'python' | 'algorithms' | 'devops' | 'interview';

interface TrackBase {
  id: TrackId;
  title: string;
  /** 2–4 characters for the track badge. */
  mark: string;
  tagline: string;
}

export interface ReadyTrack extends TrackBase {
  status: 'ready';
  /** Language of runnable examples and the editor. */
  language: CodeLanguage;
  /** Hero headline and lede on the track page (trusted HTML). */
  headline: string;
  lede: string;
  modules: Module[];
  /** Roadmap rows, top to bottom, by module id. */
  layout: string[][];
  playground: boolean;
}

export interface PlannedTrack extends TrackBase {
  status: 'planned';
  /** What the track will contain, shown on its card. */
  planned: string[];
}

export type Track = ReadyTrack | PlannedTrack;
