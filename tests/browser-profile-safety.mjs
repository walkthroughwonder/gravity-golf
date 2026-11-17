// Browser DOM regression checks with synthetic accounts and deny-by-default routing.
// Even the production-looking origin is fulfilled from disk; nothing is deployed.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../dist/', import.meta.url);
const mobile = new URL('file:///Users/edwin/Downloads/Gravity%20Golf/mobile/');
const output = process.env.GG_QA_OUTPUT || '/tmp/gravitygolf-profile-browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
const payload = '<img src=x onerror="window.__injected=1">';
const game = { date: 1775520000000, total: 12, diff: -1, mode: payload, holes: 4, scores: [1, 3, 4, 4] };

async function fixture(file, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  const denied = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const fulfill = (body, contentType) => route.fulfill({ body, contentType });
    if (url.origin === 'https://gravitygolf.xyz') {
      if (url.pathname === '/api/commerce/status') return fulfill('{"available":false}', 'application/json');
      if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204 });
      if (/^\/(?:index\.html|profile\.html|commerce-client\.mjs|funnel-analytics\.mjs|analytics-config\.json|manifest\.json|soundtrack\.mp3|(?:icon-(?:192|512)|apple-touch-icon)\.png)$/.test(url.pathname)) {
        let body = await readFile(new URL(url.pathname.slice(1), root));
        if (url.pathname === '/index.html') {
          // Expose existing module functions solely in this inert browser fixture.
          body = body.toString().replace(/(<script type="module">)([\s\S]*?)(<\/script>)/,
            (_, open, code, close) => open + code + '\nwindow.__profileTest = { renderLeaderboard, showStatsPanel };\n' + close);
        }
        return fulfill(body, { '.html': 'text/html', '.mjs': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png' }[extname(url.pathname)]);
      }
    }
    if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/10.12.0/')) return fulfill('', 'text/javascript');
    if (url.origin === 'https://fonts.googleapis.com') return fulfill("@font-face{font-family:Orbitron;src:url(https://fixture.invalid/orbitron-latin-wght-normal.woff2)}@font-face{font-family:'Exo 2';src:url(https://fixture.invalid/exo-2-latin-wght-normal.woff2)}", 'text/css');
    if (url.origin === 'https://fixture.invalid' && /^\/(?:orbitron|exo-2)-latin-wght-normal\.woff2$/.test(url.pathname)) return fulfill(await readFile(new URL('www/fonts' + url.pathname, mobile)), 'font/woff2');
    if (url.origin === 'https://fixture.invalid' && url.pathname.startsWith('/avatar')) return route.fulfill({ status: 204 });
    const threePrefix = '/npm/three@0.172.0/';
    if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith(threePrefix)) {
      const relative = url.pathname.slice(threePrefix.length);
      if (/^(?:build|examples\/jsm)\/[a-zA-Z0-9_./-]+\.js$/.test(relative) && !relative.includes('..')) return fulfill(await readFile(new URL('node_modules/three/' + relative, mobile)), 'text/javascript');
    }
    denied.push(url.origin + url.pathname);
    return route.abort();
  });
  await page.addInitScript(() => {
    window.__injected = 0;
    const callbacks = [], requests = [];
    const auth = {
      currentUser: null,
      getRedirectResult: async () => ({}),
      onAuthStateChanged(fn) { callbacks.push(fn); queueMicrotask(() => fn(auth.currentUser)); return () => {}; },
      async signOut() { window.__accounts.set(null); },
    };
    const db = { ref(path) { return {
      orderByChild() { return this; }, limitToLast() { return this; },
      once() { return new Promise(resolve => requests.push({ path, resolve })); },
    }; } };
    window.firebase = { initializeApp() { return { auth: () => auth }; }, auth: () => auth, database: () => db };
    window.__accounts = {
      requests,
      set(user) { auth.currentUser = user; callbacks.forEach(fn => fn(user)); },
      resolve(index, games) { requests[index].resolve({ forEach(fn) { games.forEach((g, i) => fn({ key: String(i), val: () => g })); } }); },
    };
  });
  await page.goto('https://gravitygolf.xyz/' + file);
  if (file === 'index.html') await page.waitForFunction(() => window.__profileTest && window.render_game_to_text);
  const setUser = user => page.evaluate(user => window.__accounts.set(user), user);
  const settle = async (index, games) => {
    await page.waitForFunction(index => window.__accounts.requests.length > index, index);
    await page.evaluate(({ index, games }) => window.__accounts.resolve(index, games), { index, games });
  };
  return { page, setUser, settle, async finish(name) {
    assert.deepEqual(denied, [], 'Unrecognized external request attempted');
    assert.deepEqual(errors, [], 'Browser errors');
    assert.equal(await page.evaluate(() => window.__injected), 0);
    report.push({ name, viewport, errors, denied, injected: 0 });
    await context.close();
  } };
}

try {
  for (const file of ['profile.html', 'index.html']) {
    const h = await fixture(file, file === 'profile.html' ? { width: 390, height: 844 } : { width: 1280, height: 720 });
    const { page } = h;
    await h.setUser({ uid: 'fixture-first', displayName: 'Fixture Player', email: 'fixture@example.invalid', photoURL: 'https://fixture.invalid/avatar" onerror="window.__injected=1' });
    if (file === 'index.html') await page.evaluate(() => { void window.__profileTest.showStatsPanel(); });
    await h.settle(0, [game, { ...game, total: payload }]);
    const history = file === 'profile.html' ? '#history' : '#statsHistory';
    await page.locator(history + ' > div > span').first().waitFor();
    assert.equal(await page.evaluate(() => window.__injected), 0, 'Stored profile markup executed');
    assert.equal(await page.locator(history + ' > div').count(), 1);
    assert.equal(await page.locator(history + ' img, ' + history + ' script').count(), 0);
    assert.ok((await page.locator(history).innerText()).includes(payload.toUpperCase()));
    assert.equal(await page.locator('[onerror]').count(), 0);
    await page.screenshot({ path: `${output}/${file}-history.png` });
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width && (r.right > innerWidth + 1 || r.left < -1);
    }).map(el => ({ tag: el.tagName, id: el.id, className: el.getAttribute('class') })));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, JSON.stringify(overflow));
    if (file === 'index.html') {
      await page.evaluate(payload => {
        window.__profileTest.renderLeaderboard([{ uid: 'fixture-first', name: payload, strokes: 12, par: 13, timestamp: 1 }]);
        document.getElementById('leaderboard').classList.add('visible');
        document.getElementById('statsClose').click();
      }, payload);
      assert.equal(await page.locator('#lbBody img').count(), 0);
      assert.equal(await page.locator('#lbBody .lb-name').last().innerText(), payload);
      assert.equal(await page.locator('#lbYourRankNum').innerText(), '#1 of 1');
      await page.screenshot({ path: `${output}/leaderboard.png` });
      await page.locator('#lbClose').click();
      await page.evaluate(() => { void window.__profileTest.showStatsPanel(); });
    } else {
      await h.setUser({ uid: 'fixture-second', displayName: 'Second', email: 'second@example.invalid' });
    }
    await h.setUser(null);
    await h.settle(1, [game]);
    await page.waitForTimeout(100);
    assert.equal(await page.locator(history + ' > div').count(), 0);
    assert.equal(await page.locator(file === 'profile.html' ? '#email' : '#tpEmail').textContent(), '');
    assert.equal(await page.locator(file === 'profile.html' ? '#content' : '#statsPanel').isVisible(), false);
    await page.screenshot({ path: `${output}/${file}-signed-out.png` });
    await h.finish(file + ' literal DOM, numeric validation, avatars, sign-out race');
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
