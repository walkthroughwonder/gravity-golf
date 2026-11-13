import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommerceClient, validCommerceConfig } from '../commerce-client.mjs';

const config = { available: true, mode: 'test', amount: 299, currency: 'usd',
  firebase: { apiKey: 'public-fixture', appId: 'fixture', projectId: 'gravity-golf-sandbox',
    authDomain: 'gravity-golf-sandbox.firebaseapp.com' } };
const buyer = { uid: 'buyer', email: 'buyer@example.invalid', isAnonymous: false, getIdToken: async () => 'buyer-token' };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness({ href = 'http://localhost:8888/', initial = buyer, status = config, legacyAccess = false, onEvent } = {}) {
  const calls = [], states = [], access = [], navigations = [], replacements = [];
  let observer, configureCount = 0;
  const routes = { status: () => response(status), entitlement: () => response({ pro: false }),
    confirm: () => response({ pro: true, status: 'verified' }),
    checkout: () => response({ url: 'https://checkout.stripe.com/c/pay/fixture' }) };
  const auth = {
    onAuthStateChanged(callback) { observer = callback; queueMicrotask(() => callback(initial)); return () => { observer = () => {}; }; },
    async signInWithEmailAndPassword(email, password) { calls.push(['signin', email, password]); observer(buyer); },
    async createUserWithEmailAndPassword(email, password) { calls.push(['create', email, password]); observer(buyer); },
    async signOut() { observer(null); },
    async sendPasswordResetEmail(email) { calls.push(['reset', email]); },
  };
  const client = createCommerceClient({ href, legacyAccess,
    onEvent,
    request: async (path, options) => { calls.push([path, options]); return routes[path.split('/').pop()](options); },
    configureAuth(value) { configureCount++; assert.deepEqual(value, status); return auth; },
    onState: state => states.push(state), onAccess: value => access.push(value),
    navigate: url => navigations.push(url), replaceUrl: url => replacements.push(url),
  });
  return { client, calls, states, access, navigations, replacements, routes, auth,
    state: () => client.getState(), switchUser: user => observer(user), configured: () => configureCount };
}

test('test/live environments cannot cross projects, insecure remote origins or lookalike hosts', () => {
  assert.equal(validCommerceConfig(config, 'http://localhost:8888/'), true);
  for (const href of ['file:///tmp/index.html', 'https://gravitygolf.xyz/', 'http://preview.example/']) {
    assert.equal(validCommerceConfig(config, href), false);
  }
  const live = { ...config, mode: 'live', firebase: { ...config.firebase,
    projectId: 'gravity-golf-6ec4f', authDomain: 'gravity-golf-6ec4f.firebaseapp.com' } };
  assert.equal(validCommerceConfig(live, 'https://gravitygolf.xyz/'), true);
  for (const href of ['http://localhost/', 'https://preview.netlify.app/', 'https://gravitygolf.xyz.evil.example/', 'http://gravitygolf.xyz/']) {
    assert.equal(validCommerceConfig(live, href), false);
  }
  assert.equal(validCommerceConfig({ ...config, amount: 199 }, 'http://localhost/'), false);
  assert.equal(validCommerceConfig({ ...config, firebase: live.firebase }, 'http://localhost/'), false);
});

test('unconfigured API and file previews never initialize authentication or start checkout', async () => {
  for (const options of [{ status: { available: false } }, { href: 'file:///tmp/index.html' }]) {
    const h = harness(options);
    await h.client.start();
    await h.client.buy();
    assert.equal(h.state().phase, 'disabled');
    assert.equal(h.configured(), 0);
    assert.equal(h.navigations.length, 0);
    assert.equal(h.access.includes(true), false);
  }
});

test('anonymous and signed-out users are asked to sign in before any purchase request', async () => {
  for (const initial of [null, { ...buyer, isAnonymous: true }]) {
    const h = harness({ initial });
    await h.client.start();
    await h.client.buy();
    assert.equal(h.state().authRequired, true);
    assert.equal(h.calls.length, 1);
    assert.equal(h.navigations.length, 0);
  }
});

test('sign-in and account creation restore access but never automatically start a paid checkout', async () => {
  for (const create of [false, true]) {
    const h = harness({ initial: null });
    await h.client.start();
    await h.client.buy();
    await h.client.signIn(' buyer@example.invalid ', 'fixture-only-password', create);
    await flush();
    assert.equal(h.state().signedIn, true);
    assert.equal(h.state().accountLabel, 'buyer@example.invalid');
    assert.equal(h.state().busy, false);
    assert.equal(h.navigations.length, 0);
    assert.ok(h.calls.some(call => call[0] === '/api/commerce/entitlement'));
    assert.ok(h.calls.some(call => call[0] === (create ? 'create' : 'signin') && call[1] === 'buyer@example.invalid'));
  }
});

test('buy sends a token and no client-supplied price, then navigates only to Stripe Checkout', async () => {
  const h = harness();
  await h.client.start();
  await h.client.buy();
  const [path, options] = h.calls.find(call => call[0] === '/api/commerce/checkout');
  assert.equal(path, '/api/commerce/checkout');
  assert.equal(options.headers.Authorization, 'Bearer buyer-token');
  assert.equal(options.body, '{}');
  assert.equal(options.credentials, 'same-origin');
  assert.equal(options.cache, 'no-store');
  assert.deepEqual(h.navigations, ['https://checkout.stripe.com/c/pay/fixture']);
  assert.equal(h.access.includes(true), false);
});

test('checkout responses reject hostile and malformed redirect URLs', async () => {
  for (const url of ['https://evil.example/', 'https://checkout.stripe.com.evil.example/', 'javascript:alert(1)',
    'https://user@checkout.stripe.com/c/pay/foo', undefined]) {
    const h = harness();
    h.routes.checkout = () => response({ url });
    await h.client.start();
    await h.client.buy();
    assert.equal(h.state().phase, 'error');
    assert.equal(h.navigations.length, 0);
  }
});

test('verified return uses confirm and cleans only checkout parameters after success', async () => {
  const h = harness({ href: 'http://localhost:8888/?utm_source=demo&checkout_session_id=cs_test_fixture#course' });
  await h.client.start();
  assert.equal(h.state().proVerified, true);
  assert.equal(h.state().phase, 'owned');
  assert.deepEqual(h.replacements, ['/?utm_source=demo#course']);
  assert.equal(h.calls.find(call => call[0].endsWith('/confirm'))[1].body, '{"sessionId":"cs_test_fixture"}');
});

test('a return URL cannot unlock until its account is authenticated and server verification succeeds', async () => {
  const h = harness({ initial: null, href: 'http://localhost:8888/?checkout_session_id=cs_test_fixture' });
  await h.client.start();
  assert.equal(h.state().authRequired, true);
  assert.equal(h.access.includes(true), false);
  h.routes.confirm = () => response({ error: 'Wrong account' }, 403);
  await h.client.signIn('buyer@example.invalid', 'fixture');
  await flush();
  assert.equal(h.state().phase, 'error');
  assert.equal(h.state().proVerified, false);
  assert.equal(h.replacements.length, 0);
  assert.match(h.state().message, /account used at checkout/);
});

test('pending payment preserves its session and retry checks it instead of creating another checkout', async () => {
  const h = harness({ href: 'http://localhost:8888/?checkout_session_id=cs_test_fixture' });
  h.routes.confirm = () => response({ pro: false, status: 'pending' });
  await h.client.start();
  await h.client.buy();
  assert.equal(h.state().phase, 'pending');
  assert.equal(h.replacements.length, 0);
  assert.equal(h.calls.filter(call => call[0].endsWith('/checkout')).length, 0);
  h.routes.confirm = () => response({ pro: true, status: 'verified' });
  await h.client.restore();
  assert.equal(h.state().phase, 'owned');
});

test('canceled checkout is not silently retried and grants nothing', async () => {
  const h = harness({ href: 'http://localhost:8888/?checkout=canceled' });
  await h.client.start();
  assert.match(h.state().message, /canceled/);
  assert.equal(h.access.includes(true), false);
  assert.equal(h.calls.filter(call => call[0].endsWith('/checkout')).length, 0);
});

test('legacy storage and pro=1 are not payment proof and prevent accidental repeat buying', async () => {
  for (const options of [{ legacyAccess: true }, { href: 'http://localhost:8888/?pro=1' }]) {
    const h = harness(options);
    await h.client.start();
    await h.client.buy();
    assert.equal(h.access.includes(true), false);
    assert.equal(h.navigations.length, 0);
    assert.match(h.state().message, /owner verification/);
    assert.equal(h.calls.some(call => call[0].endsWith('/checkout')), false);
  }
});

test('existing entitlement and already-owned checkout grant without opening Stripe', async () => {
  const h = harness();
  h.routes.entitlement = () => response({ pro: true });
  h.routes.checkout = () => response({ pro: true, alreadyOwned: true });
  await h.client.start();
  assert.equal(h.state().phase, 'owned');
  await h.client.buy();
  assert.equal(h.navigations.length, 0);
});

test('in-flight account A confirmations cannot grant to account B or a signed-out browser', async () => {
  for (const account of [null, { ...buyer, uid: 'another', getIdToken: async () => 'other-token' }]) {
    const h = harness();
    await h.client.start();
    let resolve;
    h.routes.entitlement = options => options.headers.Authorization === 'Bearer buyer-token' ?
      new Promise(done => { resolve = done; }) : response({ pro: false });
    const oldRequest = h.client.restore();
    await flush();
    h.switchUser(account);
    resolve(response({ pro: true }));
    await oldRequest;
    await flush();
    assert.equal(h.state().proVerified, false);
    assert.equal(h.access.includes(true), false);
  }
});

test('account switching during checkout cannot redirect the new account to the old purchase', async () => {
  const h = harness();
  await h.client.start();
  let resolve;
  h.routes.checkout = () => new Promise(done => { resolve = done; });
  const pending = h.client.buy();
  await flush();
  h.switchUser(null);
  resolve(response({ url: 'https://checkout.stripe.com/c/pay/fixture' }));
  await pending;
  assert.equal(h.navigations.length, 0);
});

test('double clicks issue only one in-flight checkout request', async () => {
  const h = harness();
  await h.client.start();
  let resolve;
  h.routes.checkout = () => new Promise(done => { resolve = done; });
  const first = h.client.buy();
  await flush();
  await h.client.buy();
  resolve(response({ url: 'https://checkout.stripe.com/c/pay/fixture' }));
  await first;
  assert.equal(h.calls.filter(call => call[0].endsWith('/checkout')).length, 1);
});

test('network errors and expired tokens never grant; an expired token clears verified access', async () => {
  const h = harness();
  h.routes.entitlement = () => response({ pro: true });
  await h.client.start();
  h.routes.entitlement = () => response({}, 401);
  await h.client.restore();
  assert.equal(h.state().proVerified, false);
  assert.equal(h.state().authRequired, true);
  h.routes.entitlement = () => { throw new Error('offline'); };
  await h.client.restore();
  assert.equal(h.state().phase, 'error');
  assert.equal(h.state().busy, false);
});

test('revocation removes verified access; sign-out removes it without erasing legacy storage', async () => {
  const h = harness({ href: 'http://localhost:8888/?checkout_session_id=cs_test_fixture' });
  h.routes.confirm = () => response({ pro: false, status: 'revoked' });
  await h.client.start();
  assert.equal(h.state().phase, 'revoked');
  assert.equal(h.state().proVerified, false);
  const other = harness();
  other.routes.entitlement = () => response({ pro: true });
  await other.client.start();
  await other.client.signOut();
  assert.equal(other.state().signedIn, false);
  assert.equal(other.state().proVerified, false);
});

test('password reset and failed sign-in show bounded copy without echoing sensitive exceptions', async () => {
  const h = harness({ initial: null });
  await h.client.start();
  h.auth.signInWithEmailAndPassword = async () => { throw new Error('sensitive-server-details'); };
  await h.client.signIn('buyer@example.invalid', 'fixture');
  assert.doesNotMatch(h.state().message, /sensitive-server/);
  assert.equal(h.state().busy, false);
  await h.client.resetPassword('buyer@example.invalid');
  assert.match(h.state().message, /If this account is eligible/);
});

test('analytics labels restored access separately and never emits a browser purchase/revenue event', async () => {
  const events = [];
  const h = harness({ onEvent: (...args) => events.push(args) });
  h.routes.entitlement = () => response({ pro: true });
  await h.client.start();
  assert.deepEqual(events, [['gg_access_verified', { flow: 'restore' }]]);
  events.length = 0;
  h.routes.entitlement = () => response({ pro: false });
  await h.client.restore();
  await h.client.buy();
  assert.deepEqual(events, [['gg_checkout_redirect', {}]]);
  assert.ok(events.every(event => !/purchase|revenue/.test(event[0])));
});

test('analytics failure cannot break checkout navigation or grant access', async () => {
  const h = harness({ onEvent() { throw new Error('analytics unavailable'); } });
  await h.client.start();
  await h.client.buy();
  assert.equal(h.navigations.length, 1);
  assert.equal(h.state().proVerified, false);
});
