import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import Stripe from 'stripe';
import { createCommerceHandler, readSettings } from '../netlify/functions/_shared/commerce-core.mts';

const ORIGIN = 'http://localhost:8888';
const UID = 'buyer-one';
const ID = 'cs_test_fixture1';
const PI = 'pi_fixture1';
const KEY = 'attempt_fixture_123456';
const uidKey = uid => createHash('sha256').update(uid).digest('hex');
const env = {
  GG_COMMERCE_MODE: 'test', GG_SITE_ORIGIN: ORIGIN,
  GG_FIREBASE_PROJECT_ID: 'gravity-golf-sandbox', GG_STRIPE_PRICE_ID: 'price_fixture1',
  GG_FIREBASE_WEB_API_KEY: 'public-fixture-key', GG_FIREBASE_WEB_APP_ID: 'public-fixture-app',
  GG_STRIPE_SECRET_KEY: 'sk_test_OFFLINE_FIXTURE', GG_STRIPE_WEBHOOK_SECRET: 'whsec_OFFLINE_FIXTURE',
  GG_FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'gravity-golf-sandbox',
    private_key: '-----BEGIN PRIVATE KEY-----OFFLINE_FIXTURE', client_email: 'test@example.invalid' }),
};
const settings = readSettings(key => env[key]);
const signatures = new Stripe('sk_test_OFFLINE_FIXTURE').webhooks;
function fixture() {
  return {
    session: {
      id: ID, created: 1700000000, livemode: false, mode: 'payment', status: 'complete', payment_status: 'paid',
      client_reference_id: UID, metadata: { gg_uid: UID, gg_product: 'gravity-golf-pro-v1' },
      currency: 'usd', amount_total: 299, payment_intent: PI,
      line_items: { has_more: false, data: [{ quantity: 1, amount_total: 299, price: { id: 'price_fixture1' } }] },
    },
    payment: { status: 'succeeded', amount_received: 299, currency: 'usd', livemode: false,
      latest_charge: { id: 'ch_fixture1', payment_intent: PI, amount: 299, currency: 'usd', paid: true, refunded: false, disputed: false } },
  };
}

function harness() {
  const data = fixture();
  const records = new Map();
  const calls = [];
  const creates = new Map();
  let storageDown = false;
  let version = 0;
  const versions = new Map();
  const stripe = {
    webhooks: signatures,
    prices: { retrieve: async () => ({ active: true, type: 'one_time', unit_amount: 299, currency: 'usd', livemode: false }) },
    checkout: { sessions: {
      retrieve: async id => { calls.push(['retrieve', id]); return structuredClone(data.session); },
      create: async (params, options) => {
        calls.push(['create', params, options]);
        if (!creates.has(options.idempotencyKey)) creates.set(options.idempotencyKey, { id: ID, url: 'https://checkout.stripe.com/c/pay/fixture' });
        return creates.get(options.idempotencyKey);
      },
    } },
    paymentIntents: { retrieve: async id => { calls.push(['payment', id]); return structuredClone(data.payment); } },
  };
  const store = {
    read: async key => { if (storageDown) throw new Error('storage failed'); return records.get(key) || null; },
    readVersion: async key => {
      if (storageDown) throw new Error('storage failed');
      return records.has(key) ? { value: structuredClone(records.get(key)), etag: versions.get(key) } : null;
    },
    compareSet: async (key, value, etag) => {
      if (storageDown) throw new Error('storage failed');
      if (etag === null ? records.has(key) : versions.get(key) !== etag) return false;
      records.set(key, structuredClone(value));
      versions.set(key, String(++version));
      return true;
    },
    writeOnce: async (key, value) => {
      if (storageDown) throw new Error('storage failed');
      if (!records.has(key)) records.set(key, structuredClone(value));
    },
    keys: async prefix => { if (storageDown) throw new Error('storage failed'); return [...records.keys()].filter(key => key.startsWith(prefix)); },
  };
  const handler = createCommerceHandler(settings, () => ({ stripe, store,
    verifyToken: async token => {
      if (token === 'buyer-token') return { uid: UID, anonymous: false };
      if (token === 'other-token') return { uid: 'another-buyer', anonymous: false };
      if (token === 'guest-token') return { uid: UID, anonymous: true };
      throw new Error('invalid token');
    },
  }));
  function request(route, { method = ['status', 'entitlement'].includes(route) ? 'GET' : 'POST',
    body, token = 'buyer-token', origin = ORIGIN, headers = {} } = {}) {
    return new Request(`${ORIGIN}/api/commerce/${route}`, { method,
      headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Idempotency-Key': KEY, ...headers },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
  }
  function webhook(type = 'checkout.session.completed', object = data.session, options = {}) {
    const payload = JSON.stringify({ id: 'evt_fixture1', type, livemode: false, data: { object }, ...options.event });
    const signature = signatures.generateTestHeaderString({ payload, secret: settings.webhookSecret,
      ...(options.timestamp === undefined ? {} : { timestamp: options.timestamp }) });
    return handler(request('webhook', { body: payload, headers: { 'stripe-signature': signature }, token: '' }));
  }
  return { ...data, records, calls, creates, stripe, store, handler, request, webhook,
    setStorageDown: value => { storageDown = value; },
    confirm: () => handler(request('confirm', { body: { sessionId: ID } })),
    access: async () => (await (await handler(request('entitlement'))).json()).pro,
  };
}

test('payments are disabled by default without loading any providers', async () => {
  assert.equal(readSettings(() => undefined), null);
  const handler = createCommerceHandler(null, () => { throw new Error('Providers must not be loaded'); });
  assert.equal((await handler(new Request(`${ORIGIN}/api/commerce/status`))).status, 503);
});

test('configuration separates live payments from test hosts and Firebase data', () => {
  assert.equal(settings.mode, 'test');
  for (const change of [
    { GG_COMMERCE_MODE: 'live' }, { GG_STRIPE_SECRET_KEY: 'sk_live_fixture' },
    { GG_FIREBASE_PROJECT_ID: 'gravity-golf-6ec4f' }, { GG_SITE_ORIGIN: 'https://gravitygolf.xyz' },
    { GG_SITE_ORIGIN: 'http://public.example.com' }, { GG_SITE_ORIGIN: 'ftp://localhost' },
    { GG_SITE_ORIGIN: 'https://user:secret@preview.example.com' },
    { GG_SITE_ORIGIN: `${ORIGIN}/other` }, { GG_SITE_ORIGIN: `${ORIGIN}?redirect=evil` },
    { GG_STRIPE_PRICE_ID: '' }, { GG_FIREBASE_SERVICE_ACCOUNT_JSON: '' },
    { GG_FIREBASE_WEB_API_KEY: '' }, { GG_FIREBASE_WEB_APP_ID: '' },
    { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' },
    { GG_FIREBASE_SERVICE_ACCOUNT_JSON: '{invalid' },
  ]) {
    assert.equal(readSettings(key => ({ ...env, ...change })[key]), null, JSON.stringify(change));
  }
  const live = { ...env, GG_COMMERCE_MODE: 'live', GG_SITE_ORIGIN: 'https://gravitygolf.xyz',
    GG_STRIPE_SECRET_KEY: 'sk_live_fixture', GG_FIREBASE_PROJECT_ID: 'gravity-golf-6ec4f', CONTEXT: 'production',
    GG_FIREBASE_SERVICE_ACCOUNT_JSON: env.GG_FIREBASE_SERVICE_ACCOUNT_JSON.replace('gravity-golf-sandbox', 'gravity-golf-6ec4f') };
  assert.equal(readSettings(key => live[key]).mode, 'live');
  assert.equal(readSettings(key => ({ ...live, CONTEXT: 'deploy-preview' })[key]), null);
});

test('status discloses only public Firebase config, not server credentials, and cannot be cached', async () => {
  const h = harness();
  const result = await h.handler(h.request('status'));
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await result.json(), { available: true, mode: 'test', amount: 299,
    currency: 'usd', firebase: settings.firebase });
});

test('checkout rejects wrong origins, unauthenticated users and anonymous accounts', async () => {
  for (const options of [{ origin: 'https://untrusted.example' }, { token: 'invalid' }, { token: '' }, { token: 'guest-token' }]) {
    const h = harness();
    assert.ok([401, 403].includes((await h.handler(h.request('checkout', options))).status));
    assert.equal(h.calls.length, 0);
  }
});

test('checkout uses the fixed server price, bound account and deterministic retry key', async () => {
  const h = harness();
  h.session.status = 'open';
  h.session.url = 'https://checkout.stripe.com/c/pay/fixture';
  for (let i = 0; i < 2; i++) {
    assert.equal((await h.handler(h.request('checkout', { headers: { 'Idempotency-Key': i ? '' : KEY } }))).status, 200);
  }
  const [, params, options] = h.calls[0];
  assert.deepEqual(params.line_items, [{ price: 'price_fixture1', quantity: 1 }]);
  assert.equal(params.client_reference_id, UID);
  assert.equal(params.metadata.gg_uid, UID);
  assert.equal(params.success_url, `${ORIGIN}/?checkout_session_id={CHECKOUT_SESSION_ID}`);
  assert.equal(params.allow_promotion_codes, false);
  assert.match(options.idempotencyKey, new RegExp(`^gg-${uidKey(UID)}-`));
  assert.equal(h.calls.filter(call => call[0] === 'create').length, 1);
  assert.equal(h.creates.size, 1);
});

test('different tabs share one reserved checkout instead of duplicating charges', async () => {
  const h = harness();
  h.session.status = 'open';
  h.session.url = 'https://checkout.stripe.com/c/pay/fixture';
  const results = await Promise.all(['first_attempt_123456', 'second_attempt_123456'].map(key =>
    h.handler(h.request('checkout', { headers: { 'Idempotency-Key': key } }))));
  assert.ok(results.every(result => result.status === 200));
  assert.equal(h.creates.size, 1);
  const keys = h.calls.filter(call => call[0] === 'create').map(call => call[2].idempotencyKey);
  assert.equal(new Set(keys).size, 1);
});

test('an expired checkout can be replaced, but a completed unpaid checkout cannot', async () => {
  const h = harness();
  await h.handler(h.request('checkout'));
  h.session.status = 'expired';
  assert.equal((await h.handler(h.request('checkout'))).status, 200);
  assert.equal(h.creates.size, 2);
  h.session.status = 'complete';
  h.session.payment_status = 'unpaid';
  const pending = await h.handler(h.request('checkout'));
  assert.equal((await pending.json()).status, 'pending');
  assert.equal(h.creates.size, 2);
});

test('an old attempt without a recorded Stripe result cannot create a second payment', async () => {
  const h = harness();
  await h.store.compareSet(`users/${uidKey(UID)}/pending/price_fixture1`,
    { attempt: 'old-attempt', created: Date.now() - 24 * 60 * 60 * 1000 }, null);
  const result = await h.handler(h.request('checkout'));
  assert.equal(result.status, 409);
  assert.equal(h.creates.size, 0);
});

test('a timed-out create is retried using the same reserved Stripe key', async () => {
  const h = harness();
  const create = h.stripe.checkout.sessions.create;
  const attemptedKeys = [];
  h.stripe.checkout.sessions.create = async (params, options) => {
    attemptedKeys.push(options.idempotencyKey);
    const result = await create(params, options);
    if (attemptedKeys.length === 1) throw new Error('response lost');
    return result;
  };
  assert.equal((await h.handler(h.request('checkout'))).status, 503);
  assert.equal((await h.handler(h.request('checkout'))).status, 200);
  assert.equal(h.creates.size, 1);
  assert.equal(attemptedKeys[0], attemptedKeys[1]);
});

test('the actual Netlify entrypoint imports and fails closed with no configuration', async () => {
  const previous = globalThis.Netlify;
  globalThis.Netlify = { env: { get: () => undefined } };
  try {
    const { default: entrypoint, config } = await import('../netlify/functions/commerce.mts');
    assert.ok(config.path.includes('/api/commerce/webhook'));
    assert.equal((await entrypoint(new Request(`${ORIGIN}/api/commerce/status`))).status, 503);
  } finally { globalThis.Netlify = previous; }
});

test('client-supplied pricing and unsafe redirect URLs are rejected', async () => {
  const h = harness();
  assert.equal((await h.handler(h.request('checkout', { body: { price: 1, uid: 'someone-else' } }))).status, 400);
  assert.equal(h.calls.length, 0);
  h.stripe.checkout.sessions.create = async () => ({ url: 'https://checkout.stripe.com.evil.example/pay' });
  assert.equal((await h.handler(h.request('checkout'))).status, 502);
});

test('wrong backend price configuration never creates checkout', async () => {
  for (const mutation of [{ unit_amount: 100 }, { currency: 'eur' }, { type: 'recurring' }, { active: false }, { livemode: true }]) {
    const h = harness();
    h.stripe.prices.retrieve = async () => ({ active: true, type: 'one_time', unit_amount: 299, currency: 'usd', livemode: false, ...mutation });
    assert.equal((await h.handler(h.request('checkout'))).status, 503);
    assert.equal(h.calls.length, 0);
  }
});

test('verified purchase grants durable access and prevents another checkout', async () => {
  const h = harness();
  assert.deepEqual(await (await h.confirm()).json(), { pro: true, status: 'verified' });
  assert.equal(await h.access(), true);
  assert.equal(h.records.size, 1);
  assert.ok(h.records.has(`users/${uidKey(UID)}/grants/${ID}`));
  assert.deepEqual(await (await h.handler(h.request('checkout'))).json(), { pro: true, alreadyOwned: true });
  assert.equal(h.creates.size, 0);
});

test('another signed-in account cannot claim or restore someone else\'s purchase', async () => {
  const h = harness();
  assert.equal((await h.handler(h.request('confirm', { token: 'other-token', body: { sessionId: ID } }))).status, 403);
  assert.equal(h.records.size, 0);
  await h.confirm();
  assert.deepEqual(await (await h.handler(h.request('entitlement', { token: 'other-token' }))).json(), { pro: false });
});

test('wrong product, account binding, amount, currency, price or mode never grants Pro', async () => {
  for (const mutate of [
    s => { s.metadata.gg_product = 'another-product'; }, s => { s.client_reference_id = 'other-user'; },
    s => { s.amount_total = 0; }, s => { s.currency = 'eur'; }, s => { s.mode = 'subscription'; },
    s => { s.livemode = true; }, s => { s.line_items.data[0].price.id = 'price_another'; },
    s => { s.line_items.data[0].quantity = 2; }, s => { s.line_items.has_more = true; },
    s => { s.line_items.data.push(structuredClone(s.line_items.data[0])); },
  ]) {
    const h = harness();
    mutate(h.session);
    assert.ok([403, 422].includes((await h.confirm()).status));
    assert.equal(h.records.size, 0);
  }
});

test('unpaid, canceled and unsettled payments cannot grant access', async () => {
  for (const mutate of [
    h => { h.session.payment_status = 'unpaid'; }, h => { h.session.status = 'expired'; },
    h => { h.session.payment_status = 'no_payment_required'; }, h => { h.payment.status = 'processing'; },
    h => { h.payment.amount_received = 0; }, h => { h.payment.latest_charge.paid = false; },
  ]) {
    const h = harness();
    mutate(h);
    const result = await (await h.confirm()).json();
    assert.notEqual(result.pro, true);
    assert.equal(h.records.size, 0);
  }
});

test('webhook verifies the real Stripe signature, timestamp and payment environment', async () => {
  const h = harness();
  assert.equal((await h.handler(h.request('webhook', { body: '{}' }))).status, 400);
  assert.equal((await h.webhook(undefined, undefined, { timestamp: 100 })).status, 400);
  assert.equal((await h.webhook(undefined, undefined, { event: { livemode: true } })).status, 400);
  assert.equal(h.records.size, 0);
  assert.equal((await h.webhook()).status, 200);
  assert.equal(await h.access(), true);
});

test('duplicate and concurrent deliveries create one immutable grant', async () => {
  const h = harness();
  const results = await Promise.all([h.webhook(), h.confirm(), h.webhook()]);
  assert.ok(results.every(result => result.status === 200));
  assert.equal(h.records.size, 1);
  assert.equal(await h.access(), true);
});

test('delayed payment grants only when Stripe confirms that funds settled', async () => {
  const h = harness();
  h.session.payment_status = 'unpaid';
  await h.webhook();
  assert.equal(await h.access(), false);
  h.session.payment_status = 'paid';
  await h.webhook('checkout.session.async_payment_succeeded');
  assert.equal(await h.access(), true);
});

test('full refunds and disputes revoke access even before the paid event arrives', async () => {
  for (const type of ['charge.refunded', 'charge.dispute.created']) {
    const h = harness();
    assert.equal((await h.webhook(type, { payment_intent: PI, refunded: true })).status, 200);
    await h.webhook();
    assert.equal(await h.access(), false);
    assert.deepEqual(await (await h.confirm()).json(), { pro: false, status: 'revoked' });
  }
});

test('an older paid snapshot cannot overwrite a concurrent refund', async () => {
  const h = harness();
  await Promise.all([h.confirm(), h.webhook('charge.refunded', { payment_intent: PI, refunded: true })]);
  assert.equal(await h.access(), false);
  await h.webhook();
  assert.equal(await h.access(), false);
});

test('settlement lookup catches refunds even if the refund webhook was missed', async () => {
  const h = harness();
  h.payment.latest_charge.refunded = true;
  assert.deepEqual(await (await h.confirm()).json(), { pro: false, status: 'revoked' });
  assert.equal(await h.access(), false);
});

test('partial refunds do not remove the purchased course automatically', async () => {
  const h = harness();
  await h.confirm();
  await h.webhook('charge.refunded', { payment_intent: PI, refunded: false, amount_refunded: 100 });
  assert.equal(await h.access(), true);
});

test('storage failures are retryable and do not acknowledge a lost entitlement', async () => {
  const h = harness();
  h.setStorageDown(true);
  assert.equal((await h.webhook()).status, 503);
  assert.equal((await h.confirm()).status, 503);
  h.setStorageDown(false);
  assert.equal((await h.webhook()).status, 200);
  assert.equal(await h.access(), true);
});

test('malformed and oversized requests fail without revealing provider errors', async () => {
  const h = harness();
  assert.equal((await h.handler(h.request('confirm', { body: '{bad' }))).status, 400);
  assert.equal((await h.handler(h.request('confirm', { body: 'x'.repeat(2000) }))).status, 413);
  assert.equal((await h.handler(h.request('confirm', { body: { pro: true } }))).status, 400);
  h.stripe.checkout.sessions.retrieve = async () => { throw new Error('private-key-must-not-leak'); };
  const result = await h.confirm();
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /private-key/);
});

// Netlify runs functions with CommonJS/ESM interop detection off. Firebase Admin 14 then needs
// NODE_OPTIONS=--experimental-require-module in the Functions environment, or it fails with
// ERR_REQUIRE_ESM. This loads the real entrypoint under those settings.
test('the entrypoint loads under the Netlify Functions runtime options', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types', '--no-experimental-detect-module', '--experimental-require-module',
    '--input-type=module', '--eval', `
      globalThis.Netlify = { env: { get: () => undefined } };
      const { default: handler } = await import('./netlify/functions/commerce.mts');
      const response = await handler(new Request('http://localhost:8888/api/commerce/status'));
      if (response.status !== 503 || response.headers.get('cache-control') !== 'no-store') process.exit(2);
      console.log('loaded');
    `,
  ], { cwd: fileURLToPath(new URL('../', import.meta.url)), env: {}, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'loaded');
});
