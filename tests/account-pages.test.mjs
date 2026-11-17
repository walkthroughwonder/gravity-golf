import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const pages = ['login.html', 'profile.html'];
const blockedOrigins = [
  'http://localhost:8770/', 'http://127.0.0.1:8770/',
  'file:///tmp/gravity-golf/', 'https://deploy-preview-1.netlify.app/',
  'http://gravitygolf.xyz/', 'https://gravitygolf.xyz:444/',
  'https://gravitygolf.xyz.evil.example/', 'https://preview.gravitygolf.xyz/',
  'https://preview.example/?live=1&pro=1&host=gravitygolf.xyz',
];

function harness(page, url, { sdkMissing = false } = {}) {
  const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
  const nodes = new Map();
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    const classes = new Set();
    nodes.set(match[1], {
      textContent: '', value: '', style: {}, disabled: false, hidden: false,
      classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
    });
  }
  const calls = [];
  const callbacks = [];
  const auth = {
    getRedirectResult() { calls.push('redirect'); return Promise.resolve(null); },
    onAuthStateChanged(callback) { calls.push('watch'); callbacks.push(callback); },
    signInWithEmailAndPassword() { calls.push('signIn'); return Promise.resolve(); },
    signInAnonymously() { calls.push('anonymous'); return Promise.resolve(); },
    signOut() { calls.push('signOut'); return Promise.resolve(); },
  };
  const firebase = {
    initializeApp(config) { calls.push(['initialize', config.projectId]); },
    auth: () => auth,
    database() { calls.push('database'); return {}; },
  };
  let currentURL = new URL(url);
  const location = {
    get origin() { return currentURL.origin; },
    get href() { return currentURL.href; },
    set href(value) { currentURL = new URL(value, currentURL); },
  };
  const context = vm.createContext({
    window: { location },
    document: { getElementById: id => {
      assert.ok(nodes.has(id), `Unknown DOM id ${id} in ${page}`);
      return nodes.get(id);
    } },
    ...(sdkMissing ? {} : { firebase }),
  });
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) vm.runInContext(match[1], context, { filename: page });
  }
  return { nodes, calls, callbacks, location: context.window.location, html };
}

for (const page of pages) {
  test(`${page}: previews never initialize, restore or observe production accounts`, () => {
    for (const url of blockedOrigins) {
      const h = harness(page, url);
      assert.deepEqual(h.calls, [], url);
      assert.equal(h.nodes.get('signOutBtn').onclick, undefined, url);
      assert.match(h.nodes.get('previewNotice').textContent, /preview/i, url);
      assert.equal(h.nodes.get('previewNotice').hidden, false, url);
      if (page === 'login.html') {
        for (const id of ['googleBtn', 'email', 'pass', 'signInBtn', 'signUpBtn']) {
          assert.equal(h.nodes.get(id).disabled, true, `${url} ${id}`);
          assert.equal(h.nodes.get(id).onclick, undefined, `${url} ${id}`);
        }
      } else {
        assert.equal(h.nodes.get('loading').style.display, 'none', url);
        assert.equal(h.nodes.get('content').style.display, 'none', url);
        assert.equal(h.nodes.get('notSignedIn').style.display, 'none', url);
      }
    }
  });

  test(`${page}: only exact production HTTPS origins preserve account initialization`, () => {
    for (const url of ['https://gravitygolf.xyz/', 'https://www.gravitygolf.xyz/']) {
      const h = harness(page, url);
      assert.deepEqual(h.calls, [
        ['initialize', 'gravity-golf-6ec4f'],
        ...(page === 'profile.html' ? ['database'] : []), 'redirect', 'watch',
      ]);
      assert.equal(typeof h.nodes.get('signOutBtn').onclick, 'function');
      assert.equal(h.callbacks.length, 1);
    }
  });

  test(`${page}: a missing Firebase SDK leaves a usable explanation and game link`, () => {
    for (const url of ['https://gravitygolf.xyz/', 'file:///tmp/gravity-golf/']) {
      const h = harness(page, url, { sdkMissing: true });
      assert.deepEqual(h.calls, []);
      assert.match(h.nodes.get('previewNotice').textContent, /unavailable|preview/i);
      assert.match(h.html, /href="\.\/index\.html"/);
    }
  });
}

test('local guest navigation stays in the same game folder without creating an anonymous account', () => {
  for (const base of ['http://localhost:8770/subfolder/', 'file:///tmp/gravity-golf/']) {
    const h = harness('login.html', base + 'login.html');
    h.nodes.get('guestBtn').onclick();
    assert.equal(h.location.href, base + 'index.html');
    assert.deepEqual(h.calls, []);
  }
});

test('production login still signs in and renders its existing account state using inert fixtures', async () => {
  const h = harness('login.html', 'https://gravitygolf.xyz/login.html');
  await h.nodes.get('signInBtn').onclick();
  assert.ok(h.calls.includes('signIn'));
  h.callbacks[0]({ uid: 'fixture-user', displayName: 'Fixture Player', email: 'fixture@example.invalid' });
  assert.equal(h.nodes.get('loginCard').style.display, 'none');
  assert.equal(h.nodes.get('userName').textContent, 'Fixture Player');
  h.callbacks[0](null);
  assert.equal(h.nodes.get('loginCard').style.display, 'block');
});
