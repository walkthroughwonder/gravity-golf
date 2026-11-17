export function buildAnalyticsConfig(env) {
  const mode = env.GG_ANALYTICS_MODE || 'disabled';
  if (mode === 'disabled') return { mode: 'disabled' };
  const id = mode === 'live' ? env.GG_GA4_LIVE_ID : env.GG_GA4_TEST_ID;
  const origin = env.GG_ANALYTICS_ORIGIN;
  if (!['live', 'test'].includes(mode) || !/^G-[A-Z0-9]{6,20}$/.test(id) || env.GG_ANALYTICS_REVIEWED !== 'yes') {
    throw new Error('Analytics requires an explicit mode, reviewed property settings and a valid public GA4 ID');
  }
  const url = new URL(origin);
  const production = ['https://gravitygolf.xyz', 'https://www.gravitygolf.xyz'].includes(origin);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (origin !== url.origin || (mode === 'live' ? !production || env.CONTEXT !== 'production' :
    production || id === env.GG_GA4_LIVE_ID || !(url.protocol === 'https:' || (loopback && url.protocol === 'http:')))) {
    throw new Error('Analytics environment does not match its host/property');
  }
  return { mode, id, origin };
}
