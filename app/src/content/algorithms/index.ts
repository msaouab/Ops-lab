import type { ReadyTrack } from '../types';
import thinkModule from './modules/think';
import hashingModule from './modules/hashing';
import prefixModule from './modules/prefix';
import twoPointersModule from './modules/two-pointers';
import stackModule from './modules/stack';
import slidingWindowModule from './modules/sliding-window';
import binarySearchModule from './modules/binary-search';
import linkedListModule from './modules/linked-list';
import treesModule from './modules/trees';
import heapsModule from './modules/heaps';
import intervalsModule from './modules/intervals';
import backtrackingModule from './modules/backtracking';
import graphsModule from './modules/graphs';
import dp1dModule from './modules/dp-1d';
import dp2dModule from './modules/dp-2d';

export const algorithmsTrack: ReadyTrack = {
  id: 'algorithms',
  status: 'ready',
  title: 'Algorithms',
  mark: 'ALG',
  language: 'python',
  tagline: 'Learn the patterns behind interview problems, then solve them in real Python in your browser.',
  headline: 'Stop memorising problems. Learn the <span class="q">patterns</span>.',
  lede: 'Each topic teaches one pattern: the words that signal it, the idea behind it, a template you can adapt, and the traps. Then you solve problems with it, graded by the same tests as the repo.',
  playground: true,
  modules: [
    thinkModule, hashingModule, prefixModule, twoPointersModule, stackModule, slidingWindowModule,
    binarySearchModule, linkedListModule, treesModule, heapsModule, intervalsModule, backtrackingModule,
    graphsModule, dp1dModule, dp2dModule,
  ],
  layout: [
    ['think'],
    ['hashing'],
    ['prefix', 'two-pointers', 'stack'],
    ['sliding-window', 'binary-search', 'linked-list'],
    ['trees'],
    ['heaps', 'backtracking'],
    ['intervals', 'graphs', 'dp-1d'],
    ['dp-2d'],
  ],
};
