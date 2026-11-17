import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createCommerceHandler, readSettings, type Dependencies, type Settings } from './_shared/commerce-core.mts';

declare const Netlify: { env: { get(key: string): string | undefined } };

function dependencies(settings: Settings): Dependencies {
  const serviceAccount = JSON.parse(Netlify.env.get('GG_FIREBASE_SERVICE_ACCOUNT_JSON') || '{}');
  if (serviceAccount.project_id !== settings.projectId || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Missing Firebase server credentials');
  }
  const appName = `gravity-golf-commerce-${settings.mode}-${settings.projectId}`;
  const app = getApps().find(value => value.name === appName) || initializeApp({
    projectId: settings.projectId, credential: cert(serviceAccount),
  }, appName);
  const projectKey = createHash('sha256').update(settings.projectId).digest('hex').slice(0, 12);
  const store = getStore({ name: `gg-commerce-${settings.mode}-${projectKey}`, consistency: 'strong' });
  return {
    stripe: new Stripe(settings.secretKey, { maxNetworkRetries: 2, timeout: 10000 }),
    store: {
      read: key => store.get(key, { type: 'json' }),
      readVersion: async key => {
        const entry = await store.getWithMetadata(key, { type: 'json' });
        if (!entry) return null;
        if (!entry.etag) throw new Error('Storage version is unavailable');
        return { value: entry.data, etag: entry.etag };
      },
      compareSet: async (key, value, etag) => (await store.setJSON(key, value,
        etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag })).modified,
      writeOnce: async (key, value) => { await store.setJSON(key, value, { onlyIfNew: true }); },
      keys: async prefix => (await store.list({ prefix })).blobs.map(blob => blob.key),
    },
    verifyToken: async token => {
      const claims = await getAuth(app).verifyIdToken(token, true);
      return { uid: claims.uid, anonymous: claims.firebase.sign_in_provider === 'anonymous' };
    },
  };
}

export default async (request: Request) => {
  const settings = readSettings(key => Netlify.env.get(key));
  return createCommerceHandler(settings, () => dependencies(settings!))(request);
};

export const config = {
  path: ['/api/commerce/status', '/api/commerce/checkout', '/api/commerce/confirm', '/api/commerce/entitlement', '/api/commerce/webhook'],
};
