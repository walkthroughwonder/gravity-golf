import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.env.GG_SOURCE_ROOT || resolve(import.meta.dirname, '../..');
const source = await readFile(join(root, 'index.html'), 'utf8');
const start = source.indexOf('function showGameComplete(title, isFreeEnd)');
const end = source.indexOf('function hideGameComplete()', start);
assert(start > 0 && end > start);
const section = source.slice(start, end);

function element() {
  const classes = new Set();
  return { style: {}, children: [], textContent: '', innerHTML: '',
    classList: { add: value => classes.add(value), contains: value => classes.has(value) },
    appendChild(child) { this.children.push(child); }, addEventListener() {} };
}

function render(scores, { free = false, daily = false, title = 'COURSE COMPLETE' } = {}) {
  const levels = (daily ? [6] : [4, 6, 6]).map((par, index) => ({ par, name: `HOLE ${index + 1}` }));
  const nodes = Object.fromEntries(['gameCompleteScreen', 'gcPlayAgain', 'gcHome', 'gcScore', 'gcScorecardBody', 'gcTotal'].map(id => [id, element()]));
  const heading = element();
  const buttons = element();
  nodes.gameCompleteScreen.querySelector = selector => selector === '.gc-title' ? heading : buttons;
  const saves = [];
  const context = {
    LEVELS: levels, FREE_HOLE_COUNT: 2, levelScores: scores,
    totalScore: scores.reduce((sum, value) => sum + (value ?? 0), 0),
    document: { getElementById: id => nodes[id] || null, createElement: element },
    masterySymbols: () => '', dailyMode: daily, _currentRoundKey: null, currentUser: null, db: null,
    PRO_UNLOCK_LABEL: 'UNLOCK PRO', saveGameHistory: (...args) => saves.push(args),
    title, isFreeEnd: free,
  };
  runInNewContext(`${section}\nshowGameComplete(title, isFreeEnd);`, context);
  return { nodes, heading, buttons, saves };
}

test('partial round uses played-hole par and does not claim full course completion', () => {
  const { nodes, heading, saves } = render([undefined, 3, 5]);
  assert.equal(nodes.gcTotal.textContent, '8 (-4)');
  assert.equal(nodes.gcScore.textContent, '8 STROKES \u00b7 -4 UNDER PAR \u00b7 2/3 HOLES PLAYED');
  assert.equal(heading.textContent, 'ROUND SUMMARY');
  assert.equal(saves[0][3], 12);
  assert.equal(nodes.gcScorecardBody.children.length, 4);
});

test('full-course totals, over-par result and completion heading are preserved', () => {
  const { nodes, heading, saves } = render([5, 7, 7]);
  assert.equal(nodes.gcTotal.textContent, '19 (+3)');
  assert.equal(nodes.gcScore.textContent, '19 STROKES \u00b7 +3 OVER PAR');
  assert.equal(heading.textContent, 'COURSE COMPLETE');
  assert.equal(saves[0][3], 16);
});

test('free-course completion uses the played par and preserves its upgrade action', () => {
  const { nodes, heading, buttons, saves } = render([4, 6], { free: true, title: 'FREE COURSE COMPLETE' });
  assert.equal(nodes.gcTotal.textContent, '10 (+0)');
  assert.equal(heading.textContent, 'FREE COURSE COMPLETE');
  assert.equal(buttons.children[0].id, 'gcUnlockBtn');
  assert.equal(buttons.children[0].style.display, 'inline-block');
  assert.equal(saves[0][3], 10);
});

test('Daily Challenge retains its one-hole completion and par', () => {
  const { nodes, heading, saves } = render([3], { daily: true, title: 'DAILY COMPLETE' });
  assert.equal(nodes.gcTotal.textContent, '3 (-3)');
  assert.equal(heading.textContent, 'DAILY COMPLETE');
  assert.equal(saves[0][0], 'daily');
  assert.equal(saves[0][3], 6);
});

test('an empty result cannot claim course completion or unearned under-par credit', () => {
  const { nodes, heading, saves } = render([]);
  assert.equal(nodes.gcTotal.textContent, '0 (+0)');
  assert.equal(heading.textContent, 'ROUND SUMMARY');
  assert.equal(saves[0][3], 0);
});
