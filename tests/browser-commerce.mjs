// Optional browser QA using the actual public build and inert payment/auth fixtures.
// No Stripe or Firebase calls, real accounts, or payment navigation are permitted.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../dist/', import.meta.url);
const output = process.env.GG_QA_OUTPUT || '/tmp/gravitygolf-commerce-browser';
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) { res.writeHead(404).end(); return; }
  try {
    const body = await readFile(new URL(name, root));
    const type = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.mp3': 'audio/mpeg' }[extname(name)];
    res.writeHead(200, { 'Content-Type': type || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
const fixtureConfig = { available: true, mode: 'test', amount: 299, currency: 'usd', firebase: {
  apiKey: 'public-offline-fixture', appId: 'fixture', projectId: 'gravity-golf-sandbox', authDomain: 'gravity-golf-sandbox.firebaseapp.com' } };

async function fixture({ signedIn = false, owned = false, legacy = false, disabled = false, query = '', pending = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [], calls = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/firebasejs/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route(/https:\/\/[^/]*(firebaseio\.com|googleapis\.com|stripe\.com)\//, route => {
    // Google Fonts is unrelated to authentication and remains an ordinary asset.
    if (route.request().url().startsWith('https://fonts.googleapis.com/')) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  // The source already references a missing manifest; isolate that existing issue.
  await page.route('**/manifest.json', route => route.fulfill({ contentType: 'application/manifest+json', body: '{}' }));
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
  await page.route('**/api/commerce/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    calls.push(name);
    assert.ok(['status', 'entitlement', 'confirm', 'checkout'].includes(name));
    if (name !== 'status') assert.equal(route.request().headers().authorization, 'Bearer offline-fixture-token');
    const body = name === 'status' ? (disabled ? { available: false } : fixtureConfig) :
      name === 'confirm' ? { pro: !pending, status: pending ? 'pending' : 'verified' } :
      name === 'checkout' ? { pro: true, alreadyOwned: true } : { pro: owned };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(({ signedIn, legacy }) => {
    if (legacy) localStorage.setItem('gg_pro', '1');
    const account = { uid: 'offline-fixture-buyer', email: 'buyer@example.invalid', isAnonymous: false, getIdToken: async () => 'offline-fixture-token' };
    let observer, user = signedIn ? account : null;
    const auth = {
      onAuthStateChanged(callback) { observer = callback; queueMicrotask(() => callback(user)); return () => {}; },
      async signInWithEmailAndPassword() { user = account; observer(user); },
      async createUserWithEmailAndPassword() { user = account; observer(user); },
      async signOut() { user = null; observer(user); },
      async sendPasswordResetEmail() {},
    };
    window.firebase = { initializeApp(config, name) {
      if (name !== 'gg-commerce-sandbox' || config.projectId !== 'gravity-golf-sandbox') throw new Error('Production auth attempted');
      return { auth: () => auth };
    } };
  }, { signedIn, legacy });
  await page.goto(origin + '/' + query);
  await page.waitForFunction(() => window.render_game_to_text &&
    JSON.parse(window.render_game_to_text()).commerce.purchasePhase !== 'checking');
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const shot = name => page.screenshot({ path: `${output}/${name}.png` });
  return { page, calls, state, shot, confirm: () => { pending = false; },
    async finish(name) {
      assert.deepEqual(external, [], 'A production provider request was attempted');
      assert.deepEqual(errors, [], 'Unexpected browser errors');
      report.push({ name, state: await state(), calls });
      await context.close();
    } };
}

try {
  let h = await fixture({ disabled: true });
  await h.page.locator('#pickerProBtn').click();
  assert.equal(await h.page.locator('#buyBtn').isDisabled(), true);
  await h.shot('disabled-desktop');
  await h.page.keyboard.press('Escape');
  assert.equal(await h.page.locator('#unlockModal').isVisible(), false);
  await h.finish('disabled and free return');

  h = await fixture({ owned: true });
  await h.page.locator('#pickerProBtn').click();
  await h.page.locator('#restoreBtn').click();
  await h.page.locator('#purchaseEmail').waitFor({ state: 'visible' });
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.shot('signin-mobile-top');
  await h.page.locator('#purchasePassword').scrollIntoViewIfNeeded();
  await h.shot('signin-mobile-form');
  await h.page.locator('#unlockClose').scrollIntoViewIfNeeded();
  await h.shot('signin-mobile-back');
  assert.equal(await h.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await h.page.locator('#purchaseEmail').fill('buyer@example.invalid');
  await h.page.locator('#purchasePassword').fill('offline-fixture-password');
  await h.page.locator('#purchaseSignIn').click();
  await h.page.waitForFunction(() => JSON.parse(window.render_game_to_text()).commerce.accessSource === 'verified-account');
  await h.page.locator('#playProBtn').scrollIntoViewIfNeeded();
  await h.shot('owned-mobile');
  assert.equal(await h.page.locator('#purchasePassword').inputValue(), '');
  await h.page.locator('#playProBtn').click();
  await h.page.setViewportSize({ width: 1280, height: 720 });
  await h.page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.hole === 9 && !state.introPlaying;
  }, null, { timeout: 20000 });
  await h.shot('pro-hole-nine');
  assert.equal((await h.state()).trainer.visible, false);
  assert.equal((await h.state()).commerce.offerVisible, false);
  await h.finish('sign in and restore to playable Hole 9');

  h = await fixture({ signedIn: true, query: '?checkout_session_id=cs_test_fixture&utm_source=qa#course' });
  await h.page.locator('#playProBtn').waitFor({ state: 'visible' });
  assert.equal(new URL(h.page.url()).search, '?utm_source=qa');
  await h.shot('confirmed-return');
  await h.finish('confirmed return opens offer after URL cleanup');

  h = await fixture({ signedIn: true, pending: true, query: '?checkout_session_id=cs_test_fixture' });
  await h.page.waitForFunction(() => JSON.parse(window.render_game_to_text()).commerce.purchasePhase === 'pending');
  assert.equal(await h.page.locator('#buyBtn').innerText(), 'CHECK PAYMENT STATUS');
  await h.shot('pending');
  assert.equal((await h.state()).commerce.proUnlocked, false);
  h.confirm();
  await h.page.locator('#restoreBtn').click();
  await h.page.locator('#playProBtn').waitFor({ state: 'visible' });
  assert.equal(h.calls.includes('checkout'), false);
  await h.finish('pending recheck does not start another checkout');

  h = await fixture({ query: '?checkout=canceled' });
  await h.page.locator('#unlockModal').waitFor({ state: 'visible' });
  assert.match(await h.page.locator('#purchaseStatus').innerText(), /canceled/);
  assert.equal((await h.state()).commerce.proUnlocked, false);
  await h.finish('canceled return');

  h = await fixture({ legacy: true });
  await h.page.locator('#pickerProBtn').click();
  assert.equal((await h.state()).commerce.accessSource, 'legacy-device');
  assert.equal(await h.page.locator('#buyBtn').isVisible(), false);
  await h.shot('legacy-preserved');
  await h.finish('legacy preserved without account proof');
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(`Browser fixture QA passed: ${report.length} scenarios. Artifacts: ${output}. No real payment/auth tested.`);
} finally {
  await browser.close();
  server.close();
}
