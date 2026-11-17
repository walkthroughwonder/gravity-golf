import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing source section: ${start}`);
  return html.slice(from, to);
}
const levels = section('const LEVELS = [', '// ===================== FUNNEL MEASUREMENT');
const commerce = section('// ===================== COURSE OFFER', '// ===================== TITLE PLANET');

// Run the actual inline commerce code with inert DOM, storage and network stubs.
function harness(url = 'http://127.0.0.1:8770/', savedPro = false) {
  const nodes = new Map();
  const opened = [];
  const storage = new Map(savedPro ? [['gg_pro', '1']] : []);
  const document = {
    activeElement: null,
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, element());
      return nodes.get(id);
    },
    querySelector(selector) { return this.getElementById(selector); },
    createElement() { return element(); },
  };
  function element() {
    const classes = new Set();
    return {
      textContent: '', value: '', className: '', style: {}, dataset: {}, hidden: false,
      disabled: false, isConnected: true, children: [], listeners: {},
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
      },
      focus() { document.activeElement = this; },
      getClientRects() { return this.hidden ? [] : [{}]; },
      remove() { this.className = ''; },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      appendChild(child) { this.children.push(child); },
      querySelector(selector) { return this.children.find(child => '.' + child.className === selector) || null; },
      querySelectorAll() {
        return ['buyBtn', 'playProBtn', 'restoreBtn', 'purchaseSignOut', 'unlockClose']
          .map(id => document.getElementById(id)).filter(node => !node.disabled);
      },
    };
  }
  const context = vm.createContext({
    document, window: { location: new URL(url), open: (...args) => opened.push(args) },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    URLSearchParams,
    ensureAudio() {}, sfxClick() {},
    trackFunnel() {},
    dailyMode: false, currentLevel: 0, gameWon: false,
    buildLevelSelect() {}, resetSessionStats() {}, hideGameComplete() {},
    loadLevel(index) { context.loadedLevel = index; },
  });
  vm.runInContext(levels + commerce, context);
  return { nodes, document, context, opened, storage, run: source => vm.runInContext(source, context) };
}

test('inline executable scripts parse without a build tool', () => {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (match[1].includes('importmap') || !match[2].trim()) continue;
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: match[2], encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('offer matches the authored course, not outdated marketing text', () => {
  const h = harness();
  assert.equal(h.run('FREE_HOLE_COUNT'), 8);
  assert.equal(h.run('PRO_HOLE_COUNT'), 11);
  assert.equal(h.run('PRO_HOLE_RANGE'), '9-19');
  assert.match(h.nodes.get('unlockDescription').textContent, /^11 more holes/);
  assert.equal(h.nodes.get('unlockPromptBtn').textContent, 'UNLOCK HOLES 9-19');
  assert.match(h.nodes.get('pickerProBtn').textContent, /11 MORE HOLES.*\$2\.99/);
  assert.doesNotMatch(html, /13 NEW HOLES ADDED|13 more holes|UNLOCK HOLES 6-18/);
});

test('counts remain stable after Pro unlock and repeated initialization', () => {
  const h = harness('http://127.0.0.1:8770/', true);
  h.run('applyVerifiedPro(true); applyVerifiedPro(true); updateTitleProBadge();');
  assert.equal(h.run('LEVELS.length'), 19);
  assert.equal(h.run('FREE_HOLE_COUNT'), 8);
  assert.match(h.nodes.get('pickerProBtn').textContent, /MANAGE ACCESS/);
});

test('localhost, files, deploy previews and lookalike hosts cannot open live checkout', () => {
  for (const url of [
    'http://127.0.0.1:8770/', 'http://localhost:8770/',
    'file:///tmp/index.html', 'https://preview.netlify.app/',
    'https://gravitygolf.xyz.evil.example/', 'http://gravitygolf.xyz/',
  ]) {
    const h = harness(url);
    h.nodes.get('buyBtn').listeners.click();
    assert.equal(h.opened.length, 0, url);
    assert.equal(h.nodes.get('buyBtn').disabled, true, url);
    assert.match(h.nodes.get('checkoutNote').textContent, /preview/);
  }
});

test('production never falls back to a Payment Link without the verified API', () => {
  for (const url of ['https://gravitygolf.xyz/', 'https://www.gravitygolf.xyz/']) {
    const h = harness(url);
    h.nodes.get('buyBtn').listeners.click();
    assert.equal(h.opened.length, 0);
    assert.equal(h.nodes.get('buyBtn').disabled, true);
  }
});

test('neither preview nor live URL flags grant Pro and the master key is removed', () => {
  for (const url of ['http://127.0.0.1:8770/?pro=1', 'https://gravitygolf.xyz/?pro=1']) {
    const h = harness(url);
    assert.equal(h.run('proUnlocked'), false);
    assert.equal(h.storage.get('gg_pro'), undefined);
  }
  assert.doesNotMatch(commerce, /GRAVITYGOLF-MASTER|buy\.stripe\.com|setItem\('gg_pro'/);
});

test('preview Firebase initialization returns before touching the SDK', () => {
  const h = harness();
  h.run(section('function initFirebase() {', 'function generateRoomCode()'));
  assert.equal(h.run('initFirebase()'), false);
});

test('offer opens, traps keyboard focus, closes and restores its trigger', () => {
  const h = harness();
  const trigger = h.nodes.get('pickerProBtn');
  trigger.focus();
  trigger.listeners.click();
  const modal = h.nodes.get('unlockModal');
  assert.equal(modal.classList.contains('visible'), true);
  assert.equal(h.document.activeElement, h.nodes.get('unlockClose'));
  let prevented = false;
  modal.listeners.keydown({ key: 'Tab', shiftKey: false, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.document.activeElement, h.nodes.get('unlockClose'));
  modal.listeners.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(modal.classList.contains('visible'), false);
  assert.equal(h.document.activeElement, trigger);
});

test('verified access updates the saved normal course without changing Daily Challenge', () => {
  const h = harness();
  h.run('window._originalLevels = [...LEVELS]; LEVELS.length = 5; dailyMode = true; applyVerifiedPro(true);');
  assert.equal(h.run('LEVELS.length'), 5);
  assert.equal(h.run('window._originalLevels.length'), 19);
  h.run('applyVerifiedPro(false)');
  assert.equal(h.run('LEVELS.length'), 5);
  assert.equal(h.run('window._originalLevels.length'), 8);
  assert.equal(h.context.loadedLevel, undefined);
});

test('losing verified access safely resets an active paid hole, not an active free hole', () => {
  const h = harness();
  h.run('applyVerifiedPro(true); currentLevel = 12; applyVerifiedPro(false)');
  assert.equal(h.run('LEVELS.length'), 8);
  assert.equal(h.context.loadedLevel, 0);
  assert.equal(h.run('currentLevel'), 0);
  h.context.loadedLevel = undefined;
  h.run('currentLevel = 3; applyVerifiedPro(true); applyVerifiedPro(false)');
  assert.equal(h.context.loadedLevel, undefined);
});

test('legacy access is preserved but never marked verified or persisted as a new purchase', () => {
  const h = harness('http://localhost/', true);
  h.run('applyVerifiedPro(false)');
  assert.equal(h.run('LEVELS.length'), 19);
  assert.equal(h.run('commerceState.proVerified'), false);
  assert.match(h.nodes.get('checkoutNote').textContent, /Legacy Pro/);
});

test('free-course completion preserves replay and home controls', () => {
  const h = harness();
  Object.assign(h.context, {
    totalScore: 0, levelScores: [], dailyMode: false, _currentRoundKey: null,
    currentUser: null, db: null, masterySymbols: () => '', saveGameHistory() {},
  });
  const card = h.document.getElementById('gameCompleteScreen');
  card.querySelector = selector => h.document.getElementById(selector);
  h.run(section('function showGameComplete(', 'function hideGameComplete('));
  h.run('showGameComplete("FREE COURSE COMPLETE", true)');
  assert.equal(h.nodes.get('gcPlayAgain').style.display, '');
  assert.equal(h.nodes.get('gcHome').style.display, '');
  assert.equal(card.classList.contains('visible'), true);
});

test('typing in the Pro dialog cannot trigger gameplay shortcuts', () => {
  const h = harness();
  const handlers = {};
  h.context.window.addEventListener = (name, callback) => { handlers[name] = callback; };
  h.run(section("window.addEventListener('keydown', (e) => {", "window.addEventListener('keyup'"));
  h.run('showUnlockModal()');
  for (const key of ['1', 'w', 'a', 'q', ' ']) {
    assert.doesNotThrow(() => handlers.keydown({ key }));
  }
});
