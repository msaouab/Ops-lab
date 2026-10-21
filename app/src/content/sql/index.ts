import type { ReadyTrack } from '../types';
import seed from './seed.sql?raw';
import selectModule from './modules/select';
import filterModule from './modules/filter';
import sortModule from './modules/sort';
import exprModule from './modules/expr';
import aggModule from './modules/agg';
import joinModule from './modules/join';
import subModule from './modules/sub';
import setModule from './modules/set';
import cteModule from './modules/cte';
import windowModule from './modules/window';
import dmlModule from './modules/dml';
import ddlModule from './modules/ddl';
import txModule from './modules/tx';

/** The course database every lesson, exercise and the playground start from. */
export const SQL_SEED = seed;

export const sqlTrack: ReadyTrack = {
  id: 'sql',
  status: 'ready',
  title: 'SQL',
  mark: 'SQL',
  language: 'sql',
  tagline: 'From SELECT to COMMIT on a real sales database, graded in your browser.',
  headline: 'Learn SQL one command at a time, from <span class="q">SELECT</span> to <span class="q">COMMIT</span>.',
  lede: 'Follow the roadmap top to bottom. Each topic has a short lesson with queries you can run, then problems on an ERP-style sales database. Write a query, run it, submit it.',
  playground: true,
  modules: [
    selectModule, filterModule, sortModule, exprModule, aggModule, joinModule, subModule,
    setModule, cteModule, windowModule, dmlModule, ddlModule, txModule,
  ],
  layout: [
    ['select'],
    ['filter', 'sort'],
    ['expr'],
    ['agg', 'join'],
    ['sub', 'set'],
    ['window', 'cte'],
    ['ddl', 'dml'],
    ['tx'],
  ],
};
