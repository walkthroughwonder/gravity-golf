import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createFunnelAnalytics, analyticsAvailable, campaignFields, sanitizeFunnelEvent, loadGoogleTag } from '../funnel-analytics.mjs';
import { buildAnalyticsConfig } from '../scripts/analytics-config.mjs';

const config = { mode: 'test', id: 'G-OFFLINE123', origin: 'http://localhost:8888' };
function harness(options = {}) {
  const calls = [], states = [], storage = new Map();
  let loads = 0, disabled = 0, fail;
  const controller = createFunnelAnalytics({ config, href: config.origin + '/',
    storage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    loadTag(value, onFailure) {
      loads++; fail = onFailure;
      return { send: (...args) => calls.push(args), disable: () => disabled++ };
    }, onState: state => states.push(state), ...options });
  return { controller, calls, states, storage, loads: () => loads, disabled: () => disabled, fail: () => fail() };
}

test('default build contains no analytics ID and enabled builds require reviewed matching environments', () => {
  assert.deepEqual(buildAnalyticsConfig({}), { mode: 'disabled' });
  const env = { GG_ANALYTICS_MODE: 'test', GG_ANALYTICS_REVIEWED: 'yes',
    GG_GA4_TEST_ID: config.id, GG_ANALYTICS_ORIGIN: config.origin };
  assert.deepEqual(buildAnalyticsConfig(env), config);
  for (const change of [{ GG_ANALYTICS_REVIEWED: 'no' }, { GG_ANALYTICS_MODE: 'mystery' },
    { GG_GA4_TEST_ID: 'sk_live_never_publish' }, { GG_ANALYTICS_ORIGIN: 'https://gravitygolf.xyz' },
    { GG_ANALYTICS_ORIGIN: 'http://remote.example' }, { GG_ANALYTICS_ORIGIN: config.origin + '/private' },
    { GG_ANALYTICS_ORIGIN: 'https://user:pass@example.com' }, { GG_GA4_LIVE_ID: config.id }]) {
    assert.throws(() => buildAnalyticsConfig({ ...env, ...change }));
  }
  const live = { ...env, GG_ANALYTICS_MODE: 'live', GG_GA4_LIVE_ID: 'G-PUBLIC1234',
    GG_ANALYTICS_ORIGIN: 'https://gravitygolf.xyz', CONTEXT: 'production' };
  assert.equal(buildAnalyticsConfig(live).mode, 'live');
  assert.throws(() => buildAnalyticsConfig({ ...live, CONTEXT: 'deploy-preview' }));
});

test('a copied production config cannot initialize analytics in a local or preview build', () => {
  const live = { mode: 'live', id: 'G-PUBLIC1234', origin: 'https://gravitygolf.xyz' };
  assert.equal(analyticsAvailable(live, 'https://gravitygolf.xyz/?pro=1'), true);
  for (const url of [config.origin, 'https://preview.netlify.app/', 'file:///tmp/index.html',
    'http://gravitygolf.xyz/', 'https://gravitygolf.xyz.evil.example/']) assert.equal(analyticsAvailable(live, url), false);
  assert.equal(analyticsAvailable(config, config.origin), true);
  assert.equal(analyticsAvailable(config, 'http://localhost:9999/'), false);
});

test('no tag, events or queue before consent; declining never loads the vendor', () => {
  const h = harness();
  h.controller.track('gg_first_shot', { mode: 'single' });
  h.controller.choose('denied');
  h.controller.track('gg_pro_offer_viewed', { placement: 'picker' });
  assert.equal(h.loads(), 0);
  assert.deepEqual(h.calls, []);
  assert.equal(h.controller.getState().active, false);
});

test('accepting starts a measured page once without replaying earlier gameplay', () => {
  const h = harness();
  h.controller.track('gg_trainer_started');
  h.controller.choose('granted');
  h.controller.choose('granted');
  assert.equal(h.loads(), 1);
  assert.deepEqual(h.calls.map(call => call[0]), ['gg_session_start']);
  h.controller.track('gg_first_shot', { mode: 'single' });
  assert.equal(h.calls.length, 2);
});

test('expired, malformed and wrong-property consent never silently opts a user in', () => {
  for (const saved of ['broken', JSON.stringify({ choice: 'granted', expires: 1 }),
    JSON.stringify({ choice: 'mystery', expires: Date.now() + 99999 })]) {
    const h = harness({ storage: { getItem: () => saved } });
    assert.equal(h.loads(), 0);
  }
  const h = harness({ storage: { getItem: key => key.includes('G-ANOTHER123') ?
    JSON.stringify({ choice: 'granted', expires: Date.now() + 99999 }) : null } });
  assert.equal(h.loads(), 0);
});

test('remembered consent is bounded and privacy signals override it', () => {
  const storage = { getItem: () => JSON.stringify({ choice: 'granted', expires: Date.now() + 99999 }) };
  assert.equal(harness({ storage }).loads(), 1);
  const h = harness({ storage, privacyRequested: true });
  h.controller.choose('granted');
  assert.equal(h.loads(), 0);
  assert.equal(h.controller.getState().privacyRequested, true);
});

test('storage restrictions cannot break consent or the game', () => {
  const h = harness({ storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } });
  assert.doesNotThrow(() => h.controller.choose('granted'));
  assert.equal(h.controller.getState().active, true);
  assert.doesNotThrow(() => h.controller.choose('denied'));
});

test('withdrawal stops immediately and enabling again waits for another visit', () => {
  const h = harness();
  h.controller.choose('granted');
  h.controller.choose('denied');
  const count = h.calls.length;
  assert.equal(h.disabled(), 1);
  assert.equal(h.controller.track('gg_checkout_redirect'), false);
  h.controller.choose('granted');
  assert.equal(h.loads(), 1);
  assert.equal(h.controller.getState().active, false);
  assert.equal(h.controller.getState().consent, 'granted');
  assert.equal(h.calls.length, count);
});

test('another tab withdrawing consent or clearing storage stops collection without rewriting its choice', () => {
  const h = harness();
  h.controller.choose('granted');
  const value = JSON.stringify({ choice: 'denied', expires: Date.now() + 5000 });
  h.storage.set(h.controller.consentKey, value);
  h.controller.refreshConsent();
  assert.equal(h.controller.getState().active, false);
  assert.equal(h.storage.get(h.controller.consentKey), value);
  h.storage.clear();
  h.controller.refreshConsent();
  assert.equal(h.storage.size, 0);
  assert.equal(h.controller.getState().consent, 'unknown');
});

test('ad blockers, failed scripts and event transports cannot break callers', () => {
  const h = harness();
  h.controller.choose('granted');
  h.fail();
  assert.equal(h.controller.getState().failed, true);
  assert.equal(h.controller.track('gg_first_shot', { mode: 'single' }), false);
  const bad = harness({ loadTag() { throw new Error('unavailable'); } });
  assert.doesNotThrow(() => bad.controller.choose('granted'));
  assert.equal(bad.controller.getState().active, false);
});

test('event schema excludes identity, transaction IDs, arbitrary text and false revenue events', () => {
  const clean = sanitizeFunnelEvent('gg_hole_completed', { mode: 'single', hole: 9, strokes: 3, par: 4,
    email: 'private@example.invalid', uid: 'private-uid', checkout_session_id: 'cs_test_secret',
    page_location: 'https://example.com/private', arbitrary: '<script>never</script>' });
  assert.deepEqual(clean, { mode: 'single', hole: 9, strokes: 3, par: 4 });
  for (const name of ['purchase', 'pro_unlocked', 'refund', '__proto__', 'constructor', 'private@example.invalid']) {
    assert.equal(sanitizeFunnelEvent(name), null);
  }
  for (const hole of [0, 20, 1.5, '9', Infinity]) assert.equal(sanitizeFunnelEvent('gg_hole_started', { mode: 'single', hole }), null);
  assert.equal(sanitizeFunnelEvent('gg_first_shot', { mode: 'trainer' }), null);
});

test('campaign labels are allowlisted rather than forwarding raw queries or referral URLs', () => {
  assert.deepEqual(campaignFields('https://gravitygolf.xyz/?utm_source=youtube&utm_campaign=founder_demo&checkout_session_id=cs_private'),
    { gg_source: 'youtube', gg_campaign: 'founder_demo' });
  assert.deepEqual(campaignFields('https://gravitygolf.xyz/?utm_source=private@example.invalid&utm_campaign=secret'),
    { gg_source: 'other', gg_campaign: 'other' });
});

test('retries and undo do not inflate unique tab/hole/mode completion stages', () => {
  const h = harness(); h.controller.choose('granted');
  h.controller.track('gg_hole_completed', { mode: 'single', hole: 1, strokes: 2, par: 1 });
  h.controller.track('gg_hole_completed', { mode: 'single', hole: 1, strokes: 1, par: 1 });
  h.controller.track('gg_hole_completed', { mode: 'daily', hole: 1, strokes: 1, par: 1 });
  assert.equal(h.calls.filter(call => call[0] === 'gg_hole_completed').length, 2);
});

test('Google tag adapter disables ads, page views and raw URLs, and uses the opt-out switch', () => {
  const win = {}, scripts = [], cookies = [];
  const doc = { head: { appendChild: script => scripts.push(script) },
    createElement: () => ({ remove() { this.removed = true; } }),
    set cookie(value) { cookies.push(value); } };
  const tag = loadGoogleTag(config, () => {}, win, doc);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].referrerPolicy, 'no-referrer');
  const commands = win.dataLayer.map(args => [...args]);
  const settings = commands.find(call => call[0] === 'config')[2];
  assert.equal(settings.send_page_view, false);
  assert.equal(settings.allow_google_signals, false);
  assert.equal(settings.allow_ad_personalization_signals, false);
  assert.equal(settings.page_location, config.origin + '/');
  assert.equal(settings.page_referrer, '');
  assert.equal(commands[0][2].analytics_storage, 'denied');
  assert.equal(commands[1][2].analytics_storage, 'granted');
  assert.equal(commands[1][2].ad_user_data, 'denied');
  tag.send('gg_first_shot', { mode: 'single' });
  const count = win.dataLayer.length;
  tag.disable();
  tag.send('gg_checkout_redirect', {});
  assert.equal(win[`ga-disable-${config.id}`], true);
  assert.equal(win.dataLayer.length, count);
  assert.equal(scripts[0].removed, true);
  assert.ok(cookies.every(value => value.startsWith('_ga')));
});

test('actual game hooks exclude training/background initialization and require all free holes for completion', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('function funnelGameMode()');
  const end = html.indexOf('// ===================== COURSE OFFER', start);
  const events = [];
  const context = vm.createContext({ onlineMode: false, dailyMode: false, gameMode: '1p', trainerActive: true,
    currentLevel: 0, strokes: 1, LEVELS: Array.from({ length: 19 }, () => ({ par: 2 })),
    FREE_HOLE_COUNT: 8, levelScores: [], trackFunnel: (...args) => events.push(args) });
  vm.runInContext(html.slice(start, end), context);
  vm.runInContext('trackGameplayShot(); trackGameplayCompletion()', context);
  assert.equal(events.length, 0);
  vm.runInContext('trainerActive = false; trackGameplayShot(); currentLevel = 7; trackGameplayCompletion()', context);
  assert.deepEqual(events.map(event => event[0]), ['gg_first_shot', 'gg_hole_started', 'gg_hole_completed']);
  vm.runInContext('levelScores = [1,2,3,4,5,6,7]; trackGameplayCompletion()', context);
  assert.equal(events.at(-1)[0], 'gg_free_course_completed');
  events.length = 0;
  vm.runInContext('dailyMode = true; currentLevel = 0; trackGameplayShot(); trackGameplayCompletion()', context);
  assert.equal(events[0][1].mode, 'daily');
  assert.equal(events.some(event => event[0] === 'gg_free_course_completed'), false);
  assert.match(html, /strokes\+\+;[\s\S]{0,170}trackGameplayShot\(\)/);
  assert.match(html, /holeScored = true;\s*\/\/ Record hole completion time\s*trackGameplayCompletion\(\)/);
});
