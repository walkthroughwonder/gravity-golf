const PRODUCTION_PROJECT = 'gravity-golf-6ec4f';
const PRODUCTION_HOSTS = ['gravitygolf.xyz', 'www.gravitygolf.xyz'];

export function validCommerceConfig(config, href) {
  const url = new URL(href);
  const production = PRODUCTION_HOSTS.includes(url.hostname);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const firebase = config?.firebase;
  if (config?.available !== true || config.amount !== 299 || config.currency !== 'usd' ||
      !firebase?.apiKey || !firebase.appId || !/^[a-z][a-z0-9-]{4,62}$/.test(firebase.projectId) ||
      firebase.authDomain !== `${firebase.projectId}.firebaseapp.com`) return false;
  if (config.mode === 'live') return production && url.protocol === 'https:' && firebase.projectId === PRODUCTION_PROJECT;
  return config.mode === 'test' && !production && firebase.projectId !== PRODUCTION_PROJECT &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && loopback));
}

// This controller has no storage or game-loop dependency. Only authenticated API
// responses grant new access; legacy browser access is handled separately by the game.
export function createCommerceClient({ href, request = fetch, configureAuth, onState,
  onAccess, navigate, replaceUrl, legacyAccess = false, onEvent = () => {} }) {
  const url = new URL(href);
  let sessionId = url.searchParams.get('checkout_session_id');
  const legacyReturn = url.searchParams.get('pro') === '1';
  const canceled = url.searchParams.get('checkout') === 'canceled';
  let auth, user, generation = 0, started = false;
  let unsubscribe;
  const state = { available: false, mode: null, busy: false, signedIn: false, accountLabel: '',
    authRequired: false, proVerified: false, phase: 'checking', message: 'Checking purchase availability...' };
  const emit = patch => { Object.assign(state, patch); onState({ ...state }); };
  const access = pro => { state.proVerified = pro; onAccess(pro); };
  const event = (name, values) => { try { onEvent(name, values); } catch {} };
  const legacyMessage = 'Earlier purchase? Keep your receipt. Legacy purchases need owner verification before account restore; do not buy again.';

  async function api(route, method = 'GET', body, account = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = {};
      if (account) headers.Authorization = `Bearer ${await account.getIdToken()}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await request(`/api/commerce/${route}`, { method, headers,
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (!response.ok) {
        const error = new Error('Purchase service request failed');
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  function needAccount() {
    if (!state.available || state.busy) return false;
    if (!user || user.isAnonymous) {
      emit({ authRequired: true, phase: 'signin',
        message: 'Sign in or create an account to keep your purchase and restore it on another device.' });
      return false;
    }
    return true;
  }

  async function perform(action) {
    if (!needAccount()) return;
    const stamp = generation;
    const account = user;
    emit({ busy: true, authRequired: false, phase: 'verifying', message: 'Checking your account...' });
    try {
      await action(account, () => generation === stamp);
    } catch (error) {
      if (generation !== stamp) return;
      if (error.status === 401) access(false);
      emit({ phase: 'error', authRequired: error.status === 401,
        message: error.status === 401 ? 'Your session expired. Sign in again, then restore your purchase.' :
          error.status === 403 ? 'This purchase could not be verified for this account. Sign in with the account used at checkout. Do not buy again.' :
          'We could not verify your purchase. Use Restore / Check Purchase to retry before buying again.' });
    } finally {
      if (generation === stamp) emit({ busy: false });
    }
  }

  function applyResult(result, flow) {
    if (result.pro === true) {
      access(true);
      if (sessionId) {
        url.searchParams.delete('checkout_session_id');
        url.searchParams.delete('checkout');
        sessionId = null;
        replaceUrl(url.pathname + url.search + url.hash);
      }
      emit({ phase: 'owned', message: 'Pro course verified for this account. All 19 holes are ready.' });
      event('gg_access_verified', { flow });
    } else if (result.status === 'pending') {
      emit({ phase: 'pending', message: 'Payment is not confirmed yet. Use Restore / Check Purchase to check again. Do not pay a second time.' });
    } else {
      access(false);
      emit({ phase: result.status === 'revoked' ? 'revoked' : 'ready',
        message: result.status === 'revoked' ? 'This payment was refunded or disputed. Access needs owner review.' :
          legacyAccess || legacyReturn ? legacyMessage : canceled ?
            'Checkout was canceled. No Pro access was added. You can return to the free course or try checkout again.' :
            'No Pro purchase found for this account. Already paid? Check you are using the same account before buying again.' });
    }
  }

  const restore = () => perform(async (account, current) => {
    const flow = sessionId ? 'checkout_return' : 'restore';
    const result = sessionId ? await api('confirm', 'POST', { sessionId }, account) :
      await api('entitlement', 'GET', undefined, account);
    if (current()) applyResult(result, flow);
  });

  async function buy() {
    if (sessionId) return restore();
    if (legacyAccess || legacyReturn) {
      emit({ message: legacyMessage });
      return;
    }
    await perform(async (account, current) => {
      const result = await api('checkout', 'POST', {}, account);
      if (!current()) return;
      if (result.pro === true || result.status) return applyResult(result, 'already_owned');
      const destination = new URL(result.url);
      if (destination.origin !== 'https://checkout.stripe.com' || destination.username || destination.password) {
        throw new Error('Invalid checkout destination');
      }
      emit({ phase: 'redirecting', message: state.mode === 'test' ? 'Opening Stripe test checkout. No real payment.' : 'Opening secure Stripe checkout...' });
      event('gg_checkout_redirect', {});
      navigate(destination.href);
    });
  }

  async function start() {
    if (started) return;
    started = true;
    if (!['http:', 'https:'].includes(url.protocol)) {
      emit({ phase: 'disabled', message: 'Local file preview: purchases are disabled. Open the HTTP preview to test the game.' });
      return;
    }
    try {
      const config = await api('status');
      if (!validCommerceConfig(config, href)) throw new Error('Wrong purchase environment');
      auth = configureAuth(config);
      let first = true;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Authentication unavailable')), 15000);
        unsubscribe = auth.onAuthStateChanged(account => {
          generation++;
          user = account;
          access(false);
          emit({ available: true, mode: config.mode, signedIn: Boolean(account && !account.isAnonymous),
            accountLabel: account && !account.isAnonymous ? account.email || 'Signed-in account' : '',
            busy: false, authRequired: Boolean(sessionId && (!account || account.isAnonymous)), phase: 'ready',
            message: legacyAccess || legacyReturn ? legacyMessage : sessionId ?
              'Sign in with your checkout account to verify this payment.' : canceled ?
              'Checkout was canceled. You can keep playing the free course.' :
              config.mode === 'test' ? 'Sandbox only. Stripe test checkout cannot charge real money.' :
              'Sign in before checkout so your purchase can be restored.' });
          if (first) { first = false; clearTimeout(timeout); resolve(); }
          else if (account && !account.isAnonymous) void restore();
        }, error => { clearTimeout(timeout); reject(error); });
      });
      if (user && !user.isAnonymous) await restore();
    } catch {
      generation++;
      unsubscribe?.();
      emit({ available: false, busy: false, phase: 'disabled',
        message: 'Purchases are unavailable in this preview. No money will be charged. The free course is ready to play.' });
    }
  }

  async function signIn(email, password, create = false) {
    if (!auth || !state.available || state.busy) return;
    const stamp = generation;
    emit({ busy: true, message: create ? 'Creating your account...' : 'Signing in...' });
    try {
      if (create) await auth.createUserWithEmailAndPassword(email.trim(), password);
      else await auth.signInWithEmailAndPassword(email.trim(), password);
    } catch {
      if (generation === stamp) emit({ phase: 'error', authRequired: true,
        message: 'Unable to sign in or create this account. Check your email and password, or use Reset Password.' });
    } finally { if (generation === stamp) emit({ busy: false }); }
  }

  async function resetPassword(email) {
    if (!auth || !state.available || state.busy) return;
    emit({ busy: true, message: 'Requesting password reset...' });
    try {
      await auth.sendPasswordResetEmail(email.trim());
      emit({ message: 'If this account is eligible, a reset email will arrive. Check your inbox and spam folder.' });
    } catch { emit({ message: 'Could not request a password reset. Check your email and try again later.' }); }
    finally { emit({ busy: false }); }
  }

  async function signOut() {
    if (!auth || state.busy) return;
    generation++;
    access(false);
    emit({ busy: true });
    try { await auth.signOut(); }
    catch { emit({ message: 'Sign-out did not finish. Please try again.' }); }
    finally { emit({ busy: false }); }
  }

  return { start, buy, restore, signIn, signOut, resetPassword,
    getState: () => ({ ...state }), dispose: () => { generation++; unsubscribe?.(); } };
}
