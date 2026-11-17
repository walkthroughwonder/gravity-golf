import { createHash, randomUUID } from 'node:crypto';
import type Stripe from 'stripe';

const PRODUCT = 'gravity-golf-pro-v1';
const AMOUNT = 299;
const CURRENCY = 'usd';
const PRODUCTION_PROJECT = 'gravity-golf-6ec4f';
const PRODUCTION_ORIGINS = ['https://gravitygolf.xyz', 'https://www.gravitygolf.xyz'];

export interface Settings {
  mode: 'test' | 'live';
  origin: string;
  projectId: string;
  priceId: string;
  secretKey: string;
  webhookSecret: string;
  firebase: { apiKey: string; appId: string; projectId: string; authDomain: string };
}

export function readSettings(env: (key: string) => string | undefined): Settings | null {
  const mode = env('GG_COMMERCE_MODE');
  if (mode !== 'test' && mode !== 'live') return null;
  if (env('FIREBASE_AUTH_EMULATOR_HOST')) return null;
  const origin = env('GG_SITE_ORIGIN') || '';
  const projectId = env('GG_FIREBASE_PROJECT_ID') || '';
  const priceId = env('GG_STRIPE_PRICE_ID') || '';
  const secretKey = env('GG_STRIPE_SECRET_KEY') || '';
  const webhookSecret = env('GG_STRIPE_WEBHOOK_SECRET') || '';
  const apiKey = env('GG_FIREBASE_WEB_API_KEY') || '';
  const appId = env('GG_FIREBASE_WEB_APP_ID') || '';
  if (!apiKey || !appId) return null;
  try {
    const url = new URL(origin);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.origin !== origin || (url.protocol !== 'https:' && !(mode === 'test' && url.protocol === 'http:' && loopback))) return null;
  } catch { return null; }
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(projectId) || !/^price_[a-zA-Z0-9]+$/.test(priceId)) return null;
  if (!secretKey.startsWith(`sk_${mode}_`) && !secretKey.startsWith(`rk_${mode}_`)) return null;
  if (!webhookSecret.startsWith('whsec_')) return null;
  try {
    const account = JSON.parse(env('GG_FIREBASE_SERVICE_ACCOUNT_JSON') || '{}');
    if (account.project_id !== projectId || typeof account.private_key !== 'string' ||
        !account.private_key.startsWith('-----BEGIN PRIVATE KEY-----') || !account.client_email) return null;
  } catch { return null; }
  if (mode === 'live' && (env('CONTEXT') !== 'production' || !PRODUCTION_ORIGINS.includes(origin) || projectId !== PRODUCTION_PROJECT)) return null;
  if (mode === 'test' && (PRODUCTION_ORIGINS.includes(origin) || projectId === PRODUCTION_PROJECT)) return null;
  return { mode, origin, projectId, priceId, secretKey, webhookSecret,
    firebase: { apiKey, appId, projectId, authDomain: `${projectId}.firebaseapp.com` } };
}

export interface Storage {
  read(key: string): Promise<Record<string, unknown> | null>;
  readVersion(key: string): Promise<{ value: Record<string, unknown>; etag: string } | null>;
  compareSet(key: string, value: Record<string, unknown>, etag: string | null): Promise<boolean>;
  writeOnce(key: string, value: Record<string, unknown>): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}

export interface Dependencies {
  stripe: Stripe;
  store: Storage;
  verifyToken(token: string): Promise<{ uid: string; anonymous: boolean }>;
}

class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function userKey(uid: string) { return createHash('sha256').update(uid).digest('hex'); }
function objectId(value: string | { id: string } | null) { return typeof value === 'string' ? value : value?.id; }
function validUid(uid: unknown): uid is string { return typeof uid === 'string' && uid.length > 0 && uid.length <= 128; }

async function readBody(request: Request, maxBytes: number) {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new RequestError(413, 'Request too large');
  return Buffer.from(bytes).toString('utf8');
}

export function createCommerceHandler(settings: Settings | null, dependencies: () => Dependencies) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    const route = path.replace(/^\/api\/commerce\//, '');
    const methods: Record<string, string> = { status: 'GET', checkout: 'POST', confirm: 'POST', entitlement: 'GET', webhook: 'POST' };
    if (!path.startsWith('/api/commerce/') || !(route in methods)) return json({ error: 'Not found' }, 404);
    if (request.method !== methods[route]) return json({ error: 'Method not allowed' }, 405);
    if (!settings) return json({ available: false, error: 'Purchases are not configured' }, 503);

    try {
      if (new URL(request.url).origin !== settings.origin) throw new RequestError(403, 'Wrong environment');
      if (route !== 'webhook' && request.method === 'POST' && request.headers.get('Origin') !== settings.origin) {
        throw new RequestError(403, 'Wrong origin');
      }
      if (route === 'status') return json({ available: true, mode: settings.mode, amount: AMOUNT,
        currency: CURRENCY, firebase: settings.firebase });
      const { stripe, store, verifyToken } = dependencies();

      async function hasAccess(uid: string) {
        for (const key of await store.keys(`users/${userKey(uid)}/grants/`)) {
          const grant = await store.read(key);
          if (typeof grant?.paymentIntent === 'string' && !(await store.read(`revoked/${grant.paymentIntent}`))) return true;
        }
        return false;
      }

      async function fulfill(sessionId: string, expectedUid?: string) {
        if (!/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(sessionId) || sessionId.length > 255) throw new RequestError(400, 'Invalid checkout session');
        const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
        const uid = session.metadata?.gg_uid;
        if (session.metadata?.gg_product !== PRODUCT) throw new RequestError(422, 'Unrecognized purchase');
        if (!validUid(uid) || session.client_reference_id !== uid || (expectedUid && uid !== expectedUid)) {
          throw new RequestError(403, 'Purchase belongs to another account');
        }
        const items = session.line_items;
        const item = items?.data[0];
        if (session.livemode !== (settings!.mode === 'live') || session.mode !== 'payment' ||
            session.currency !== CURRENCY || session.amount_total !== AMOUNT || items?.has_more ||
            items?.data.length !== 1 || item?.quantity !== 1 || item.price?.id !== settings!.priceId ||
            item.amount_total !== AMOUNT) throw new RequestError(422, 'Purchase does not match the Pro course');
        if (session.status !== 'complete' || session.payment_status !== 'paid') return { pro: false, status: 'pending' };

        const paymentIntentId = objectId(session.payment_intent);
        if (!paymentIntentId) throw new RequestError(422, 'Missing payment');
        const payment = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
        const charge = payment.latest_charge;
        if (payment.status !== 'succeeded' || payment.amount_received !== AMOUNT || payment.currency !== CURRENCY ||
            payment.livemode !== (settings!.mode === 'live') || !charge || typeof charge === 'string' ||
            !charge.paid || charge.amount !== AMOUNT || charge.currency !== CURRENCY) {
          throw new RequestError(422, 'Payment is not settled');
        }
        if (charge.refunded || charge.disputed) {
          await store.writeOnce(`revoked/${paymentIntentId}`, { reason: charge.disputed ? 'dispute' : 'refund' });
        }
        // Revocation is independent and permanent pending review, so a delayed paid event
        // cannot overwrite a refund/dispute. Grants are immutable and safe to retry.
        if (await store.read(`revoked/${paymentIntentId}`)) return { pro: false, status: 'revoked' };
        await store.writeOnce(`users/${userKey(uid)}/grants/${session.id}`, {
          session: session.id, paymentIntent: paymentIntentId, amount: AMOUNT, currency: CURRENCY, created: session.created,
        });
        return { pro: !(await store.read(`revoked/${paymentIntentId}`)), status: 'verified' };
      }

      if (route === 'webhook') {
        const raw = await readBody(request, 256 * 1024);
        let event: Stripe.Event;
        try { event = stripe.webhooks.constructEvent(raw, request.headers.get('stripe-signature') || '', settings.webhookSecret); }
        catch { throw new RequestError(400, 'Invalid webhook signature'); }
        if (event.livemode !== (settings.mode === 'live')) throw new RequestError(400, 'Wrong payment environment');
        if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type)) {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.metadata?.gg_product === PRODUCT) await fulfill(session.id);
        } else if (event.type === 'charge.refunded') {
          const charge = event.data.object as Stripe.Charge;
          const id = objectId(charge.payment_intent);
          if (id && charge.refunded) await store.writeOnce(`revoked/${id}`, { reason: 'refund' });
        } else if (event.type === 'charge.dispute.created') {
          const id = objectId((event.data.object as Stripe.Dispute).payment_intent);
          if (id) await store.writeOnce(`revoked/${id}`, { reason: 'dispute' });
        }
        return json({ received: true });
      }

      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ') || auth.length > 8192) throw new RequestError(401, 'Sign in to continue');
      let user: Awaited<ReturnType<Dependencies['verifyToken']>>;
      try { user = await verifyToken(auth.slice(7)); }
      catch { throw new RequestError(401, 'Sign in again to continue'); }
      if (!validUid(user.uid) || user.anonymous) throw new RequestError(403, 'Use a permanent account so purchases can be restored');

      if (route === 'entitlement') return json({ pro: await hasAccess(user.uid) });
      if (route === 'confirm') {
        let body;
        try { body = JSON.parse(await readBody(request, 1024)); }
        catch (error) {
          if (error instanceof RequestError) throw error;
          throw new RequestError(400, 'Invalid request');
        }
        if (!body || typeof body.sessionId !== 'string') throw new RequestError(400, 'Missing checkout session');
        return json(await fulfill(body.sessionId, user.uid));
      }

      if (await hasAccess(user.uid)) return json({ pro: true, alreadyOwned: true });
      const body = await readBody(request, 1024);
      if (body && body.trim() !== '{}') throw new RequestError(400, 'Checkout does not accept client prices or account IDs');
      const price = await stripe.prices.retrieve(settings.priceId);
      if (!price.active || price.type !== 'one_time' || price.unit_amount !== AMOUNT ||
          price.currency !== CURRENCY || price.livemode !== (settings.mode === 'live')) {
        throw new RequestError(503, 'Pro course price is not configured correctly');
      }

      const pendingKey = `users/${userKey(user.uid)}/pending/${settings.priceId}`;
      let reservation: { value: Record<string, unknown>; etag: string } | null = null;
      for (let tries = 0; tries < 3; tries++) {
        reservation = await store.readVersion(pendingKey);
        if (!reservation) {
          await store.compareSet(pendingKey, { attempt: randomUUID(), created: Date.now() }, null);
          continue;
        }
        const previous = await store.read(`checkouts/${reservation.value.attempt}`);
        if (!previous) break;
        const priorSession = await stripe.checkout.sessions.retrieve(String(previous.session));
        if (priorSession.status === 'open') {
          if (!priorSession.url || new URL(priorSession.url).origin !== 'https://checkout.stripe.com') throw new RequestError(502, 'Checkout is temporarily unavailable');
          return json({ url: priorSession.url });
        }
        if (priorSession.status === 'complete') {
          const result = await fulfill(priorSession.id, user.uid);
          return json({ ...result, alreadyOwned: result.pro });
        }
        if (priorSession.status !== 'expired') throw new RequestError(409, 'A previous purchase needs verification before retrying');
        // Rotate only a confirmed expired session, never an unknown payment attempt.
        await store.compareSet(pendingKey, { attempt: randomUUID(), created: Date.now() }, reservation.etag);
        reservation = null;
      }
      if (!reservation) throw new RequestError(409, 'Checkout is busy. Please retry.');
      if (typeof reservation.value.created !== 'number' || Date.now() - reservation.value.created > 23 * 60 * 60 * 1000) {
        throw new RequestError(409, 'An earlier purchase attempt needs verification before starting another');
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', line_items: [{ price: settings.priceId, quantity: 1 }],
        client_reference_id: user.uid, metadata: { gg_uid: user.uid, gg_product: PRODUCT },
        // Limit v1 to immediate card payments; still handle delayed notifications safely.
        payment_method_types: ['card'], allow_promotion_codes: false,
        success_url: `${settings.origin}/?checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${settings.origin}/?checkout=canceled`,
      }, { idempotencyKey: `gg-${userKey(user.uid)}-${reservation.value.attempt}` });
      if (!session.url || new URL(session.url).origin !== 'https://checkout.stripe.com') {
        throw new RequestError(502, 'Checkout is temporarily unavailable');
      }
      await store.writeOnce(`checkouts/${reservation.value.attempt}`, { session: session.id });
      return json({ url: session.url });
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      // Provider/storage failures stay retryable; never acknowledge a lost grant.
      return json({ error: 'Purchase service is temporarily unavailable. Please retry.' }, 503);
    }
  };
}
