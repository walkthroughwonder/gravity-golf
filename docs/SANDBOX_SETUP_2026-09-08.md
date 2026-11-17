# Gravity Golf: Isolated Test Services

Initial service setup was observed on 2026-09-08, approximately 19:11-19:17 UTC.
Credential configuration and real provider preflight were completed later that
day; the preflight observation is 2026-09-08T20:11:07.526Z.
This records service setup, not a successful purchase or revenue.

**September 9 update:** The old standard key disappeared from a freshly loaded
sandbox key list; the expiration handoff is resolved. A synthetic Firebase test
account and one Stripe test checkout now exist. Cancellation and checkout reuse
pass, but no test payment has been submitted. Server and webhook listener are
stopped. See `SANDBOX_ACCEPTANCE_2026-09-09.md` for current evidence and next steps.
The dated initial-setup observations below are retained as history, not current
claims that key expiration or test-account creation is still pending.

## Authorized Scope

The owner approved creating separate Stripe and Firebase test environments to
verify purchase, unlock, and restore, without paid services, live charges, or
production customer data. This does not authorize production deployment,
marketing publication, paid hosting, or access to production Firebase Analytics.

## Created And Verified

### Stripe

- Sandbox: `Gravity Golf Test`, under the verified Epoch6 account.
- Sandbox account ID: `acct_1UDUPw3tK4pzHLhn`.
- Creation used **Create new sandbox**, not **Copy account**. No live settings
  or customer data were copied.
- The resulting dashboard explicitly identifies a sandbox that does not affect
  real customers or payments.
- Test product: `Gravity Golf Pro - TEST ONLY`.
- Product ID: `prod_VDwLEDq7ALvvCz`.
- Price ID: `price_1UDUSP3tK4pzHLhnhd9bvxSN`.
- Price: USD 2.99, **One-off**, not recurring.
- Description: "Sandbox purchase only. Unlock 11 additional holes (Holes 9-19),
  for 19 total. One-time purchase, no subscription. No real payment or live access."
- Saved product and price are visible in the sandbox product catalog.
- Stripe generated its standard sandbox API keys automatically. During the later
  credential setup, the API-key page unexpectedly exposed the standard sandbox
  secret in an accessibility tool response. It was not installed or used. The
  owner was notified and rotation requested. A later check shows a replacement
  standard key, but the old key remains valid with "Expires in 7 days". Immediate
  revocation is still unconfirmed.
- Created `Gravity Golf local test checkout`, a restricted test key, after
  explicit scope approval. Before saving, the full visible permission table
  showed only Payment Intents Read, Prices Read, and Checkout Sessions Write.
  All other individual permissions initially remained None. Following the later
  explicit approval, added only Debugging Tools Write (`stripecli_session_write`)
  to the existing key. The UI selection audit showed exactly those four grants.
  Stripe accepted the save and the real CLI webhook preflight succeeded.
  Key values are omitted here.

[Sandbox product](https://dashboard.stripe.com/acct_1UDUPw3tK4pzHLhn/test/products/prod_VDwLEDq7ALvvCz)

### Firebase

- Signed-in account verified as Edwin Rosero before creation.
- Project: `Gravity Golf Test`, project ID `gravity-golf-test`.
- Project number: `831657946166`.
- Console confirms **Spark, No-cost ($0/month)**. No billing account was linked.
- Gemini and Google Analytics switches were turned off during creation.
- Registered web app: `Gravity Golf Local Test`.
- Web app ID: `1:831657946166:web:19af2e76afe81c0fa63c97`.
- No Firebase Hosting setup, database provisioning, or production project edits.
- Initialized Authentication; Email/Password is visibly **Enabled**. No other
  sign-in provider, passwordless email, or Identity Platform upgrade was enabled.
- Authorized-domain list already includes `localhost`,
  `gravity-golf-test.firebaseapp.com`, and `gravity-golf-test.web.app`; unchanged.
- The default Firebase Admin SDK service agent was not modified or used.
- Created the dedicated `Gravity Golf Test Auth Reader` service account:
  `gg-commerce-test-reader@gravity-golf-test.iam.gserviceaccount.com`.
  Its numeric ID is `116724283821671828522`. Assigned only Firebase
  Authentication Viewer (`roles/firebaseauth.viewer`) in this test project.
  The policy-updated receipt and reopened role editor confirmed the saved role.
- Generated its JSON key after approval. Validated the project, dedicated email,
  and RSA private-key format locally without logging contents. Imported it into
  the ignored mode-0600 `.env` and removed the generated Downloads duplicate.
- No test users or purchases created yet. The provider preflight read a
  deliberately nonexistent test UID and received `auth/user-not-found`, proving
  that the dedicated credential is accepted for Authentication user reads.

[Test project](https://console.firebase.google.com/u/0/project/gravity-golf-test/overview)

## Local Configuration

An ignored mode-0600 `.env` now holds the public web-app configuration, test
price ID, dedicated Firebase credential, and Stripe restricted test key.
Firebase's public web API key is not an Admin credential. The Stripe key was
transferred through a temporary loopback-only form directly into `.env`, without
printing it or passing it through shell arguments. The initial form submission
was rejected before writing because of its referrer/origin handling; changing
Referrer-Policy to same-origin retained the strict Host/Origin checks and the
second submission succeeded. The import helper is no longer needed.

Real Stripe SDK price retrieval succeeded and confirmed an active, one-time,
test-only USD 2.99 price belonging to the expected test product. Real Firebase
Admin SDK user-read authorization also passed. These checks are not a purchase
or end-to-end token verification test. The real CLI webhook preflight now passes
after approval of Debugging Tools Write, and its signing secret is stored only
in `.env`. No listener is running. `GG_COMMERCE_MODE=disabled`, and analytics
remains disabled.

The public build uses an explicit allowlist, excluding `.env` and this document.
The existing Netlify CLI supports local `dev --offline`; no CLI login, site link,
public tunnel, or deployment was started. A later credential-free Netlify dev
preflight ran in a temporary source copy with Node listeners constrained to
loopback, no provider credentials, and checkout disabled. The exact function
first failed with `ERR_REQUIRE_ESM`; AWS's documented require-module opt-in
resolved that failure locally. Security headers, game delivery, private-file
exclusion and listener addresses were verified. See `PAYMENT_SETUP.md` for the
required future Functions-scoped setting and remaining hosted acceptance. A temporary
loopback-only secret import server was used. Local Netlify Blobs
emulation would not establish hosted Blobs concurrency/durability acceptance.

The initial clone checks confirmed `.env` was Git-ignored and excluded from
`dist`, and push was disabled. The later credential preflight confirmed its
owner-only permissions and test scopes. After the webhook permission approval,
`npm run check` passed type checking, all 82 offline tests, and the allowlisted
public build. These are not real purchase-flow acceptance or income evidence.

## Original Setup Gates (Resolved Or Superseded)

The owner approved the above scoped credentials; that gate is resolved.

- Rotate the unused standard sandbox secret exposed by the unredacted provider
  page read. Do not reproduce its value or use it as a shortcut. Do not modify
  production keys. Subsequent key-page reads are redacted before output.
  A replacement standard key is now visible, but the old key still says "Expires
  in 7 days". Its Expire API key dialog is open in Chrome; the logs link identifies
  the original key ID `mk_1UDUQD3tK4pzHLhnyDuFUbXl`. The owner must perform the final
  Expire click to revoke it immediately. No standard key value was installed or
  used, and no expiration was submitted by the agent.
- The official Stripe CLI 1.50.10 is installed only under
  `/tmp/gravitygolf-stripe-cli`, not globally. No CLI login or new sandbox was
  performed. `listen --print-secret --skip-update`, using the existing restricted
  key through an environment variable, failed with HTTP 403 and
  `more_permissions_required`. Stripe specifically requested Debugging Tools
  Write (`stripecli_session_write`) for account `acct_1UDUPw3tK4pzHLhn`.
- The owner subsequently answered "approve" to adding that exact permission.
  The existing key was updated without any other grant, and `listen
  --print-secret --skip-update` then succeeded. Its signing secret was validated
  and stored directly in mode-0600 `.env`, never printed. No active listener or
  public destination was created. Recheck any later provider-requested scope
  instead of assuming this addition is sufficient for all acceptance tests.

Then configure test webhook forwarding and execute actual test checkout,
confirmation, restore, negative cases, and refund/revocation tests. Do not claim
the providers are integrated until those results exist. Real hosted storage,
deployment routing, old-buyer migration, and release still need their own checks
and appropriate approvals. No income is generated by sandbox transactions.

The September 9 acceptance report supersedes this original next-step list.

References:

- [Stripe sandbox isolation](https://docs.stripe.com/sandboxes)
- [Firebase no-cost Spark plan](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firebase Authentication Viewer permissions](https://firebase.google.com/docs/projects/iam/roles-predefined-product#auth)
- [Stripe local webhook testing](https://docs.stripe.com/webhooks)
- [Official Stripe CLI](https://github.com/stripe/stripe-cli)
