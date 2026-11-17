const MODES = ['single', 'daily', 'local2p', 'online'];
const SOURCES = ['youtube', 'instagram', 'tiktok', 'reddit', 'x', 'newsletter'];
const CAMPAIGNS = ['founder_demo', 'launch_lab', 'pro_course'];
const integer = (min, max) => value => Number.isInteger(value) && value >= min && value <= max;
const oneOf = values => value => values.includes(value);
const holeFields = { mode: oneOf(MODES), hole: integer(1, 19) };
const SCHEMAS = {
  gg_session_start: {},
  gg_trainer_started: {}, gg_trainer_completed: {}, gg_trainer_skipped: {},
  gg_first_shot: { mode: oneOf(MODES) },
  gg_hole_started: holeFields,
  gg_hole_completed: { ...holeFields, strokes: integer(1, 999), par: integer(1, 20) },
  gg_free_course_completed: {},
  gg_pro_offer_viewed: { placement: oneOf(['picker', 'free_end', 'checkout_return']) },
  gg_checkout_redirect: {},
  gg_access_verified: { flow: oneOf(['restore', 'checkout_return', 'already_owned']) },
};

export function sanitizeFunnelEvent(name, values = {}) {
  if (!Object.hasOwn(SCHEMAS, name) || !values || typeof values !== 'object') return null;
  const clean = {};
  for (const [key, valid] of Object.entries(SCHEMAS[name])) {
    if (!valid(values[key])) return null;
    clean[key] = values[key];
  }
  return clean;
}

export function analyticsAvailable(config, href) {
  try {
    const url = new URL(href);
    const production = ['https://gravitygolf.xyz', 'https://www.gravitygolf.xyz'].includes(url.origin);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return /^G-[A-Z0-9]{6,20}$/.test(config?.id) && config.origin === url.origin &&
      (config.mode === 'live' ? production : config.mode === 'test' && !production &&
        (url.protocol === 'https:' || (url.protocol === 'http:' && loopback)));
  } catch { return false; }
}

export function campaignFields(href) {
  const params = new URL(href).searchParams;
  const source = params.get('utm_source');
  const campaign = params.get('utm_campaign');
  return { gg_source: SOURCES.includes(source) ? source : source ? 'other' : 'direct_or_unknown',
    gg_campaign: CAMPAIGNS.includes(campaign) ? campaign : campaign ? 'other' : 'none' };
}

export function createFunnelAnalytics({ config, href, storage, privacyRequested = false,
  loadTag, onState = () => {}, now = Date.now }) {
  const available = Boolean(analyticsAvailable(config, href)) && !privacyRequested;
  const key = `gg_usage_consent_v1_${config?.mode || 'disabled'}_${config?.id || 'none'}`;
  const seen = new Set();
  const campaign = campaignFields(href);
  let consent = 'unknown', sink = null, withdrawn = false, failed = false, count = 0;
  try {
    const saved = JSON.parse(storage?.getItem(key) || 'null');
    if (saved && saved.expires > now() && ['granted', 'denied'].includes(saved.choice)) consent = saved.choice;
  } catch {}
  const getState = () => ({ available, consent, active: Boolean(sink) && !failed && !withdrawn,
    privacyRequested, failed, withdrawn, count });
  const emit = () => onState(getState());

  function track(name, values = {}) {
    if (!sink || failed || withdrawn || consent !== 'granted') return false;
    const clean = sanitizeFunnelEvent(name, values);
    if (!clean) return false;
    // One stage per page, mode and hole; retries/undo cannot inflate completions.
    const eventKey = [name, clean.mode, clean.hole, clean.placement, clean.flow].join(':');
    if (seen.has(eventKey) || seen.size >= 128) return false;
    try {
      sink.send(name, { ...clean, ...campaign });
      seen.add(eventKey);
      count++;
      emit();
      return true;
    } catch { return false; }
  }

  function activate() {
    if (!available || consent !== 'granted' || sink || withdrawn || failed) return;
    try {
      sink = loadTag(config, () => {
        failed = true;
        sink?.disable();
        emit();
      });
      track('gg_session_start');
    } catch { failed = true; }
  }

  function applyChoice(choice, persist = true) {
    if (!['granted', 'denied', 'unknown'].includes(choice)) return;
    consent = choice;
    if (persist) {
      try { storage?.setItem(key, JSON.stringify({ choice, expires: now() + 180 * 86400000 })); } catch {}
    }
    if (choice !== 'granted' && sink) {
      withdrawn = true;
      sink.disable();
    }
    // After withdrawal, re-enabling takes effect on the next visit. Never replay
    // a tag's delayed queue or reload an in-progress game to change consent.
    if (choice === 'granted') activate();
    emit();
  }
  activate();
  emit();
  return { track, choose: choice => {
    if (['granted', 'denied'].includes(choice)) applyChoice(choice);
  }, getState, consentKey: key, refreshConsent() {
    let choice = 'unknown';
    try {
      const saved = JSON.parse(storage?.getItem(key) || 'null');
      if (saved?.expires > now() && ['granted', 'denied'].includes(saved.choice)) choice = saved.choice;
    } catch {}
    applyChoice(choice, false);
  } };
}

export function loadGoogleTag(config, onFailure, win = window, doc = document) {
  const disabledKey = `ga-disable-${config.id}`;
  win[disabledKey] = false;
  win.dataLayer = win.dataLayer || [];
  function gtag() { win.dataLayer.push(arguments); }
  const deniedAds = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  gtag('consent', 'default', { analytics_storage: 'denied', ...deniedAds });
  gtag('consent', 'update', { analytics_storage: 'granted', ...deniedAds });
  gtag('js', new Date());
  const safePage = { page_location: config.origin + '/', page_referrer: '', page_title: 'Gravity Golf' };
  gtag('set', { ...safePage, allow_google_signals: false, allow_ad_personalization_signals: false });
  gtag('config', config.id, { ...safePage, send_page_view: false, cookie_expires: 30 * 86400,
    cookie_update: false, cookie_flags: 'SameSite=Lax;Secure',
    allow_google_signals: false, allow_ad_personalization_signals: false,
    ...(config.mode === 'test' ? { debug_mode: true } : {}) });
  const script = doc.createElement('script');
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${config.id}`;
  script.onerror = onFailure;
  doc.head.appendChild(script);
  return {
    send(name, values) { if (!win[disabledKey]) gtag('event', name, { ...values, ...safePage, send_to: config.id }); },
    disable() {
      win[disabledKey] = true;
      script.remove();
      // Only cookies belonging to this GA4 installation, not game/auth storage.
      for (const name of ['_ga', `_ga_${config.id.slice(2)}`]) {
        const host = new URL(config.origin).hostname;
        for (const domain of ['', host, host.replace(/^www\./, '')]) {
          doc.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ''} SameSite=Lax`;
        }
      }
    },
  };
}
