import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const payload = '<img src=x onerror="window.__injected=1">';
const account = { uid: 'fixture-player', displayName: 'Fixture Player', email: 'private@example.invalid', photoURL: null };
const validGame = { date: 1775520000000, total: 12, diff: -1, mode: '1p', holes: 4, scores: [1, 3, 4, 4] };

function element(tagName = 'div') {
  const node = { tagName, children: [], parentNode: null, style: {}, listeners: {}, value: '', classes: new Set(), className: '' };
  let text = '';
  node.replaceChildren = (...children) => {
    node.children.forEach(child => { child.parentNode = null; });
    node.children = [];
    text = '';
    children.forEach(child => node.appendChild(child));
  };
  node.appendChild = child => { node.children.push(child); child.parentNode = node; return child; };
  node.addEventListener = (name, fn) => { node.listeners[name] = fn; };
  node.classList = { add: name => node.classes.add(name), remove: name => node.classes.delete(name) };
  Object.defineProperty(node, 'textContent', {
    get: () => text + node.children.map(child => child.textContent).join(''),
    set: value => { node.replaceChildren(); text = String(value ?? ''); },
  });
  Object.defineProperty(node, 'innerHTML', {
    set: value => {
      // Only existing, fixed empty-state messages may enter the HTML parser.
      if (value === '') { node.replaceChildren(); return; }
      assert.match(value, /^<div class="(?:empty|stats-none|lb-empty)">[^<>]*<\/div>$/);
      node.textContent = value;
    },
  });
  return node;
}

function harness(page = 'index.html') {
  const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], element()]));
  const pending = [], observers = [], updates = [];
  const auth = {
    currentUser: null,
    getRedirectResult: async () => ({}),
    onAuthStateChanged(fn) { observers.push(fn); },
    signOut: async () => {},
    async createUserWithEmailAndPassword() {
      return { user: { uid: account.uid, updateProfile: async data => updates.push(data) } };
    },
  };
  const db = { ref(path) {
    return {
      orderByChild() { return this; }, limitToLast() { return this; },
      once() { return new Promise((resolve, reject) => pending.push({ path, reject, resolve(games) {
        resolve({ forEach(fn) { games.forEach((g, i) => fn({ key: String(i), val: () => g })); } });
      } })); },
    };
  } };
  const context = vm.createContext({
    console: { log() {}, error() {} }, URL, setTimeout() {}, sfxClick() {}, initFirebase: () => true,
    getDailyDateString: () => 'Fixture day', getDailySeed: () => 1, db,
    document: { createElement: element, getElementById(id) { assert.ok(nodes.has(id), id); return nodes.get(id); } },
    window: { location: new URL('https://gravitygolf.xyz/' + page) },
    firebase: { initializeApp() {}, auth: () => auth, database: () => db },
  });
  function section(start, end) {
    const from = html.indexOf(start), to = html.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return html.slice(from, to);
  }
  if (page === 'index.html') {
    vm.runInContext(section('// ===================== AUTH SYSTEM', '// ===================== DAILY CHALLENGE SYSTEM') +
      section('// ===================== LEADERBOARD', '// ===================== HOLE VISUALS'), context);
    vm.runInContext('initAuth()', context);
  } else {
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      if (match[1].trim()) vm.runInContext(match[1], context);
    }
  }
  return { nodes, pending, updates, context, run: script => vm.runInContext(script, context),
    user(user) { auth.currentUser = user; return observers[0](user); } };
}

test('leaderboard renders names literally, validates scores, and preserves rank/tie order', () => {
  const h = harness();
  h.user(account);
  h.context.entries = [
    { uid: 'other', name: payload, strokes: 12, par: 13, timestamp: 2 },
    { uid: account.uid, name: 'Fixture Player', strokes: 12, par: 13, timestamp: 1 },
    { name: payload, strokes: payload, par: 13 }, null,
  ];
  h.run('renderLeaderboard(entries)');
  const rows = h.nodes.get('lbBody').children;
  assert.equal(rows.length, 3);
  assert.match(rows[1].className, /me gold/);
  assert.equal(rows[2].children[1].textContent, payload);
  assert.equal(rows[2].children[1].children.length, 0);
  assert.equal(h.nodes.get('lbYourRankNum').textContent, '#1 of 2');
  h.run('renderLeaderboard([])');
  assert.equal(h.nodes.get('lbYourRank').style.display, 'none');
});

for (const page of ['index.html', 'profile.html']) {
  test(`${page}: avatar attributes cannot become HTML; unsafe URL schemes fall back`, async () => {
    const h = harness(page);
    const avatarID = page === 'index.html' ? 'ubAvatar' : 'avatar';
    const setUser = async user => {
      const task = h.user(user);
      if (page === 'profile.html') h.pending.at(-1)?.resolve([]);
      await task;
    };
    for (const photoURL of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://example.invalid/x', 'https://user:pass@example.invalid/x']) {
      await setUser({ ...account, photoURL });
      assert.equal(h.nodes.get(avatarID).children.length, 0);
    }
    await setUser({ ...account, photoURL: 'https://example.invalid/x" onerror="window.__injected=1' });
    const avatar = h.nodes.get(avatarID), img = avatar.children[0];
    assert.equal(img.tagName, 'img');
    assert.equal(img.referrerPolicy, 'no-referrer');
    assert.equal(img.onerror, undefined);
    assert.equal(img.children.length, 0);
    await setUser({ ...account, displayName: 'Second', photoURL: null });
    img.listeners.error();
    assert.equal(avatar.textContent, 'S', 'stale image error must not replace a new avatar');
  });

  test(`${page}: history treats markup as text and ignores corrupt numeric records`, async () => {
    const h = harness(page);
    let task = h.user(account);
    if (page === 'index.html') task = h.run('showStatsPanel()');
    h.pending[0].resolve([{ ...validGame, mode: payload }, { ...validGame, total: payload }, null]);
    await task;
    const hist = h.nodes.get(page === 'index.html' ? 'statsHistory' : 'history');
    assert.equal(hist.children.length, 1);
    assert.ok(hist.children[0].children[1].textContent.startsWith(payload.toUpperCase()));
    assert.equal(hist.children[0].children[1].children.length, 0);
    assert.equal(h.nodes.get(page === 'index.html' ? 'stTotalStrokes' : 'sTotal').textContent, '12');
  });

  test(`${page}: sign-out clears identity and ignores an in-flight history response`, async () => {
    const h = harness(page);
    let task = h.user(account);
    if (page === 'index.html') task = h.run('showStatsPanel()');
    await h.user(null);
    h.pending[0].resolve([validGame]);
    await task;
    assert.equal(h.nodes.get(page === 'index.html' ? 'statsHistory' : 'history').children.length, 0);
    assert.equal(h.nodes.get(page === 'index.html' ? 'tpEmail' : 'email').textContent, '');
    if (page === 'index.html') assert.equal(h.nodes.get('statsPanel').classes.has('visible'), false);
    else assert.equal(h.nodes.get('content').style.display, 'none');
  });
}

test('profile account switches discard stale failures and do not duplicate rows on refresh', async () => {
  const h = harness('profile.html');
  const first = h.user(account);
  const second = h.user({ ...account, uid: 'second', displayName: 'Second' });
  h.pending[1].resolve([validGame]);
  await second;
  h.pending[0].reject(new Error('Old request failed'));
  await first;
  assert.equal(h.nodes.get('history').children.length, 1);
  assert.equal(h.nodes.get('name').textContent, 'Second');
  const third = h.user({ ...account, uid: 'second', displayName: 'Second' });
  h.pending[2].resolve([validGame]);
  await third;
  assert.equal(h.nodes.get('history').children.length, 1);
});

for (const page of ['index.html', 'profile.html']) {
  test(`${page}: late history from account A cannot replace account B's history`, async () => {
    const h = harness(page);
    let first = h.user(account);
    if (page === 'index.html') first = h.run('showStatsPanel()');
    let second = h.user({ ...account, uid: 'second', displayName: 'Second' });
    if (page === 'index.html') second = h.run('showStatsPanel()');
    h.pending[1].resolve([{ ...validGame, total: 6 }]);
    await second;
    h.pending[0].resolve([validGame]);
    await first;
    assert.equal(h.nodes.get(page === 'index.html' ? 'stTotalStrokes' : 'sTotal').textContent, '6');
    assert.equal(h.nodes.get(page === 'index.html' ? 'tpName' : 'name').textContent, 'Second');
  });
}

test('closing game stats prevents a pending load from reopening the panel', async () => {
  const h = harness();
  h.user(account);
  const task = h.run('showStatsPanel()');
  h.nodes.get('statsClose').listeners.click();
  h.pending[0].resolve([validGame]);
  await task;
  assert.equal(h.nodes.get('statsPanel').classes.has('visible'), false);
});

for (const page of ['index.html', 'login.html']) {
  test(`${page}: new public handle does not derive from the email address`, async () => {
    const h = harness(page);
    if (page === 'index.html') await h.run('signUpWithEmail("private@example.invalid", "fixture-password")');
    else {
      h.nodes.get('email').value = 'private@example.invalid';
      h.nodes.get('pass').value = 'fixture-password';
      await h.nodes.get('signUpBtn').onclick();
    }
    assert.equal(h.updates[0].displayName, 'Cosmonaut-fixtu');
  });
}
