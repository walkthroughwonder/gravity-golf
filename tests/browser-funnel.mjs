// Real game UI, inert analytics vendor. Never uses a live analytics property.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GG_QA_URL || 'http://127.0.0.1:8771/';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname));
const output = process.env.GG_QA_OUTPUT || '/tmp/gravitygolf-funnel-browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
async function fixture({ blocked = false, privacy = false, disabled = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  let tagRequests = 0;
  const errors = [], outgoing = [];
  await context.route('**/analytics-config.json', route => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify(disabled ? { mode: 'disabled' } : { mode: 'test', id: 'G-OFFLINE123', origin: new URL(base).origin }) }));
  await context.route('**/api/commerce/status', route => route.fulfill({ contentType: 'application/json', body: '{"available":false}' }));
  await context.route('**/manifest.json', route => route.fulfill({ contentType: 'application/manifest+json', body: '{}' }));
  await context.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
  await context.route('**/gtag/js?*', route => {
    tagRequests++;
    assert.equal(new URL(route.request().url()).searchParams.get('id'), 'G-OFFLINE123');
    return blocked ? route.abort() : route.fulfill({ contentType: 'text/javascript', body: '/* inert analytics fixture */' });
  });
  await context.route(/https:\/\/[^/]*(google-analytics\.com|analytics\.google\.com|firebaseio\.com)\//, route => {
    outgoing.push(route.request().url()); return route.abort();
  });
  if (privacy) await context.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('ERR_FAILED')) errors.push(message.text()); });
  await page.goto(base + '?utm_source=youtube&utm_campaign=founder_demo&email=private-fixture%40example.invalid#private-fixture');
  await page.waitForFunction(() => window.render_game_to_text);
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const events = () => page.evaluate(() => (window.dataLayer || []).filter(args => args[0] === 'event').map(args => [args[1], args[2]]));
  return { context, page, state, events, tagRequests: () => tagRequests,
    shot: name => page.screenshot({ path: `${output}/${name}.png` }),
    async finish(name) {
      assert.deepEqual(outgoing, []);
      assert.deepEqual(errors, []);
      const recorded = await events();
      assert.doesNotMatch(JSON.stringify(recorded), /private-fixture|checkout_session_id|uid|email/);
      report.push({ name, state: await state(), tagRequests, recorded });
      await context.close();
    } };
}
try {
  let h = await fixture();
  await h.page.locator('#pickerProBtn').click();
  assert.equal(h.tagRequests(), 0);
  assert.equal((await h.events()).length, 0);
  await h.page.locator('#unlockClose').click();
  await h.page.locator('#usageSettingsBtn').click();
  await h.page.waitForFunction(() => !document.getElementById('usageAllow').disabled);
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.shot('consent-mobile');
  assert.equal(await h.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await h.page.locator('#usageDeny').click();
  assert.equal(h.tagRequests(), 0);
  await h.page.locator('#usageAllow').click();
  await h.page.waitForFunction(() => JSON.parse(window.render_game_to_text()).usageData.active);
  assert.deepEqual((await h.events()).map(event => event[0]), ['gg_session_start']);
  await h.page.locator('#usageClose').click();
  await h.page.setViewportSize({ width: 1280, height: 720 });
  await h.page.locator('#playBtn').click();
  await h.page.locator('#skipBtn').click();
  await h.page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).introPlaying, null, { timeout: 20000 });
  const ball = (await h.state()).ball.screen;
  await h.page.mouse.click(ball.x, ball.y);
  await h.page.locator('#fireBtn').click();
  await h.page.waitForFunction(() => JSON.parse(window.render_game_to_text()).strokes > 0);
  await h.shot('first-shot');
  const names = (await h.events()).map(event => event[0]);
  assert.ok(names.includes('gg_trainer_skipped'));
  assert.ok(names.includes('gg_first_shot'));
  assert.ok(names.includes('gg_hole_started'));
  assert.ok(!names.includes('gg_pro_offer_viewed'), 'Pre-consent offer should not be replayed');
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.page.locator('#usageQuickOffBtn').click();
  await h.page.locator('#usageDeny').click();
  const count = (await h.events()).length;
  const hole = (await h.state()).hole;
  await h.shot('withdraw-during-game');
  await h.page.locator('#usageAllow').click();
  assert.equal((await h.state()).usageData.active, false);
  assert.equal((await h.state()).hole, hole);
  assert.equal((await h.events()).length, count);
  assert.equal(h.tagRequests(), 1);
  assert.equal(await h.page.evaluate(() => window['ga-disable-G-OFFLINE123']), true);
  await h.finish('consent, real first shot, in-game withdrawal, no replay');

  h = await fixture({ blocked: true });
  await h.page.locator('#usageSettingsBtn').click();
  await h.page.waitForFunction(() => !document.getElementById('usageAllow').disabled);
  await h.page.locator('#usageAllow').click();
  await h.page.waitForFunction(() => document.getElementById('usageStatus').textContent.includes('could not connect'));
  await h.page.locator('#usageClose').click();
  await h.page.locator('#playBtn').click();
  await h.page.locator('#skipBtn').click();
  assert.equal((await h.state()).commerce.proUnlocked, false);
  await h.finish('blocked analytics does not block free play');

  h = await fixture();
  await h.page.locator('#usageSettingsBtn').click();
  await h.page.waitForFunction(() => !document.getElementById('usageAllow').disabled);
  await h.page.locator('#usageAllow').click();
  const other = await h.context.newPage();
  await other.goto(base);
  await other.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).usageData.active);
  assert.equal(await other.evaluate(() => (window.dataLayer || []).some(args => args[0] === 'event' && args[1].startsWith('gg_hole_'))), false);
  await h.page.locator('#usageDeny').click();
  await other.waitForFunction(() => !JSON.parse(window.render_game_to_text()).usageData.active);
  assert.equal(await other.evaluate(() => window['ga-disable-G-OFFLINE123']), true);
  assert.equal(h.tagRequests(), 2);
  await h.finish('cross-tab withdrawal and no background hole-start event');

  for (const options of [{ privacy: true }, { disabled: true }]) {
    h = await fixture(options);
    await h.page.locator('#usageSettingsBtn').click();
    assert.equal(await h.page.locator('#usageAllow').isDisabled(), true);
    assert.equal(h.tagRequests(), 0);
    await h.finish(options.privacy ? 'browser privacy signal' : 'default-disabled property');
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(`Funnel browser fixtures passed: ${report.length} scenarios. ${output}. No real analytics delivery verified.`);
} finally { await browser.close(); }
