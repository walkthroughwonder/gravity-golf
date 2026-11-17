# Payment Service: Local Implementation, Not Yet Released

The server API and game UI are connected locally, but are not deployed. The owner-approved Stripe sandbox, test price, Firebase Spark project, and email/password web app were provisioned on 2026-09-08; see `SANDBOX_SETUP_2026-09-08.md`. Dedicated Firebase Authentication Viewer and restricted Stripe TEST credentials are configured in ignored mode-0600 `.env`. The exposed standard test key was absent after a fresh Stripe key-list load on September 9; that handoff is resolved. Real Firebase account creation, authenticated entitlement lookup, Stripe Checkout creation, cancellation without access, and reuse of the same checkout pass. After explicit owner approval, a real Stripe test payment, signed webhook, server-confirmed account entitlement and launch into paid Hole 9 also passed. A later fresh-browser sign-in, sign-out/re-sign-in, reload and paid Hole 9 entry restored the existing purchase without another checkout. That follow-up had one initial generic sign-in failure of unknown cause before successful retry. Adverse payment cases, second-physical-device testing and hosted storage acceptance remain incomplete. See `SANDBOX_ACCEPTANCE_2026-09-09.md` for the local storage-emulator repair and precise evidence boundaries. The test server and webhook listener are stopped, and saved commerce configuration remains disabled. The old direct Payment Link, master code and URL-based unlock are removed from this branch. Existing browser-only Pro access remains playable, explicitly labeled legacy, without being promoted into a verified account entitlement. Do not publish this branch yet or tell existing buyers that account-based restoration is available on the live site.

## Architecture

- `POST /api/commerce/checkout`: requires an authenticated permanent Firebase account and exact origin. Accepts no client price/account data. Checks an existing entitlement before creating a Stripe Checkout Session for the configured $2.99 USD one-time price. The session records the verified Firebase UID. The server reserves one pending checkout per account/price with conditional writes and generates its own stable Stripe idempotency key.
- `POST /api/commerce/confirm`: requires the same signed-in account and JSON `{ "sessionId": "cs_..." }`. Retrieves the actual Stripe session, exact line item and settled payment before granting access. A URL flag or browser storage value is never accepted by this API.
- `GET /api/commerce/entitlement`: restores that account's recorded access. No customer emails, receipts or full Stripe payloads are returned to the client.
- `POST /api/commerce/webhook`: verifies Stripe's signature on the raw body. Reuses fulfillment for checkout completion and delayed success/failure; handles full refund and dispute notifications. Unrelated checkout products are ignored.
- `GET /api/commerce/status`: exposes configuration availability, test/live mode, offer amount/currency and public Firebase web-app configuration. It never returns server credentials. This is not an end-to-end health or revenue check.

Grants are immutable, conditional-create records in strongly consistent, site-scoped Netlify Blobs, partitioned by mode and Firebase project. User keys are SHA-256 hashes of Firebase UIDs. Refund/dispute records are separate, so delayed or repeated paid events cannot overwrite them. Stripe or storage failures return a retryable error rather than acknowledging lost fulfillment. Concurrent checkout attempts reuse a reserved session; only a confirmed expired session may be replaced. An attempt older than 23 hours without a recorded Stripe response is held for reconciliation, not retried beyond the safe idempotency window.

Automatic revocation policy in this draft: full refunds and any dispute revoke access; partial refunds retain access. A resolved dispute requires owner review before restoring access. Confirm this policy before launch. The API is purchase verification, not tamper-proof DRM for a client-delivered game.

## Configuration Gates

Default: `GG_COMMERCE_MODE=disabled`. The service returns 503 and does not initialize providers when configuration is absent or inconsistent.

Test mode requires a separate Firebase project (not `gravity-golf-6ec4f`), test-mode Stripe keys/price/webhook secret, and a non-production origin. HTTP is accepted only for loopback hosts. Live mode is rejected unless Netlify's `CONTEXT` is `production`, the exact origin is an approved Gravity Golf production domain, and the Firebase project matches production. There is no browser flag that bypasses these gates.

Set these only in an untracked local `.env` for a sandbox, or in Netlify's server-only Functions environment scope after explicit approval:

| Variable | Value |
| --- | --- |
| `GG_COMMERCE_MODE` | `disabled`, then `test` in a sandbox |
| `GG_SITE_ORIGIN` | Exact origin, such as `http://localhost:8888`; no trailing slash, path or query |
| `GG_FIREBASE_PROJECT_ID` | Separate test project ID |
| `GG_FIREBASE_WEB_API_KEY` | Public web-app API key for that same test project |
| `GG_FIREBASE_WEB_APP_ID` | Public web-app ID for that same test project |
| `GG_FIREBASE_SERVICE_ACCOUNT_JSON` | Server credentials for that same project, entered by the owner outside chat |
| `GG_STRIPE_PRICE_ID` | Price for the correct Pro product, one-time 299 cents USD |
| `GG_STRIPE_SECRET_KEY` | Restricted test key: Checkout Sessions Write, Prices Read, Payment Intents Read; owner-approved Debugging Tools Write for local webhook testing |
| `GG_STRIPE_WEBHOOK_SECRET` | Signing secret from the sandbox webhook endpoint/Stripe CLI |
| `NODE_OPTIONS` | `--experimental-require-module`; required by Firebase Admin 14's `jwks-rsa` dependency in the current Netlify Node Functions runtime. A future deployment needs this in Functions scope, not just build scope. No production setting has been changed. |

Firebase Admin verifies ID tokens with revocation/disabled-user checking. Configuration is rejected when `FIREBASE_AUTH_EMULATOR_HOST` is set, preventing an accidental emulator authentication bypass. Credentials must belong to the configured project. Test credentials and local webhook initialization were configured only after separate owner approval, as recorded above. Live credentials, live webhooks and live mode remain unapproved and unchanged.

### Runtime Compatibility

On September 8, the actual Netlify CLI commerce endpoint returned HTTP 500 with
`ERR_REQUIRE_ESM`: `jwks-rsa@4.1.0` uses CommonJS `require('jose')`, while
`jose@6` is ESM-only. Netlify reproduces Lambda's disabled module-interop default.
The existing 82 offline tests included an adapter import, but used Node's local
default module settings rather than Netlify/Lambda's disabled-interop setting.

The documented `NODE_OPTIONS=--experimental-require-module` opt-in corrected the
local runtime failure without downgrading authentication libraries or weakening
token verification. The exact endpoint then returned the expected disabled-mode
503 JSON with `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
The new `tests/commerce-runtime.test.mjs` imports the actual adapter with this
option, no credentials, and the remaining Lambda module-detection restriction.
It does not prove hosted-runtime or real provider acceptance.

AWS identifies this as an experimental-feature opt-in with stability/support
tradeoffs. Review that tradeoff and explicitly configure Functions-scoped runtime
settings before a future release; setting only `build.environment` is not enough.
See [AWS Node runtime options](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
and the [matching Firebase upstream report](https://github.com/firebase/firebase-admin-node/issues/3181).

The local-only `scripts/local-loopback.cjs` preload restricts Node TCP listeners
to loopback and rejects explicit non-loopback/inherited-socket binds. It is not
a firewall or a production dependency. With the standard CLI and no Edge Functions,
`lsof` verified the proxy, static, function and Blobs listeners on `127.0.0.1` or
`::1`; repeat that check when changing runtimes. Do not use an unguarded CLI with
credentials. No Node installation or system networking setting was modified.

September 9 real-provider testing exposed another local runtime issue: the
installed CLI's Blobs emulator omits ETags from object reads. The unchanged
commerce adapter correctly rejects that missing version rather than weakening
checkout reservation safety. A credential-free reproduction and process-only
emulator repair are recorded in `SANDBOX_ACCEPTANCE_2026-09-09.md`. This repair is
not part of the production application or a substitute for hosted storage tests.

Enable email/password authentication and authorize the sandbox domain in that separate Firebase project. The game initializes only a named sandbox auth app outside production; it never initializes the production database there. In live mode it reuses the game's existing default Firebase sign-in. Public web-app keys are not service-account secrets. Never put a Stripe key or private key in either public web-config variable.

Subscribe the sandbox webhook to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, and `charge.dispute.created`. Only card checkout is enabled in v1, but delayed notifications are handled defensively. Do not pay the old live Payment Link with a test card.

## Local Verification

```sh
npm ci --ignore-scripts --no-fund
npm run check
```

These tests use offline Stripe/Firebase/storage fixtures. Signature tests use the real Stripe SDK's signature generation and verification, including stale signatures. They are not a real checkout, authenticated Firebase integration test or Netlify storage concurrency test.

The build copies an explicit allowlist into `dist/`. Netlify must publish `dist`, never the repository root; the backend, tests, `.env`, service-account files and package dependencies must remain private. No deploy command is part of the build.

`tests/browser-commerce.mjs` is an optional browser check requiring an installed Playwright browser. Run it with `node tests/browser-commerce.mjs` after building; set `PLAYWRIGHT_MODULE` to an existing module path if it is not installed locally. It serves only the local `dist` folder on loopback, intercepts purchase requests with offline fixtures, substitutes an inert Firebase SDK, and fails if a production provider request occurs. Screenshots and its report go to `/tmp/gravitygolf-commerce-browser` (override with `GG_QA_OUTPUT`). This exercises the actual UI/controller and playable Hole 9, not real Firebase or Stripe integration.

The client shows the signed-in account before checkout, supports sign-in/create/reset/sign-out, and verifies `checkout_session_id` with the server before cleaning return parameters. Cancel and pending states never automatically start another purchase. Account changes invalidate in-flight access/redirect responses. Legacy `gg_pro=1` stays device-only; `?pro=1` grants nothing and advises keeping the receipt rather than buying again. Verified access is not cached as a browser unlock. If entitlement changes during Daily Challenge, the saved normal course is updated, not the active daily holes.

Firebase Admin currently brings optional Cloud Storage UUID dependencies with an advisory. A narrow override pins those dependencies to the vendor's patched CommonJS-compatible `uuid@11.1.1`; their inspected consumers use `v4()`. Keep the lockfile and re-run dependency audit after upgrades. See https://github.com/uuidjs/uuid/releases/tag/v11.1.1.

## Hosted Test Preflight: September 9, 2026

Read-only Netlify connector review verified Edwin Rosero as the current account
user and Owner of the existing `eds visualizer` team (`edwinrosero`), reported as
Pro. The team project response identifies `tiny-kheer-d0886e`, site ID
`a32924dc-982c-4d3c-b647-eb6c937146f3`, as serving `https://gravitygolf.xyz`.
Do not link this development checkout to that production site. Its push URL
remains `file:///dev/null`.

The connector's `gravity` name filter returned the broader team project list;
match the exact production URL, not the requested filter. No separately named
Gravity Golf test project was identified in that response; unrelated projects
were not inspected or modified. The connector did not expose current usage,
remaining allowance, auto-recharge/overage settings or precise pricing model.
Pro alone is not proof that another hosted test is free.

A background browser visit to the team's page stopped at Netlify sign-in. No
login, plan change, site creation, credentials upload or deploy was performed.
The next safe action is owner sign-in for a read-only usage/cost check. Then
obtain approval for the exact isolated test site, access controls, test-only
Functions credentials and webhook configuration before uploading anything.
Production DNS, site settings, Firebase data and Stripe live mode stay untouched.

A draft URL or `noindex` alone is not private access. Decide and verify access
controls before the first upload, and ensure the signed Stripe webhook remains
reachable without exposing unrelated routes. Do not disable site protection
merely to make webhook tests pass. Official references:
[password protection](https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/)
and [pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
Account-specific costs and hosted acceptance remain unverified.

## Remaining Launch Gates

1. Review the local account-bound checkout, confirmation and restore implementation with the owner. Real-provider payment and restoration now pass locally; finish hosted and adverse-case acceptance below, including diagnosis if the unexplained sign-in failure recurs. Do not count a browser unlock, test payment or fixture as revenue.
2. Complete a tested existing-buyer migration before releasing the new flow. The old Payment Link did not bind Firebase UIDs, so it cannot automatically use this new entitlement system. Review Stripe receipts in the owner's account and define a verified claim/support process; never force legitimate customers to pay again. Preserving old local storage avoids immediate lockout in the same browser, but does not solve old-buyer cross-device restore or a first-time return from the old link.
3. Exercise the entire flow using real Stripe test mode, a separate Firebase test project and sandbox Netlify storage. Include closing checkout before redirect, different-device restoration, revoked tokens, duplicate callbacks, refunds, expired sessions and storage failures.
4. Verify the per-account checkout reservation with real Netlify conditional writes and concurrent browsers. Define a reconciliation process for old unresolved attempts rather than clearing them blindly; inspect Stripe first to avoid charging twice.
5. Verify deployed function routing and bundle, configure webhook delivery, and ensure no secret appears in public output. A default-disabled import smoke test is not a configured runtime integration test.
6. Configure least-privilege credentials, owner-approved refund/support policy and accurate Stripe product copy. Check hosting/provider costs before enabling anything.
7. Obtain separate approval for the exact live release. Measure actual paid receipts less refunds/fees/costs, then test organic acquisition. No revenue is verified by these unit tests.

References: https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted ; https://firebase.google.com/docs/auth/admin/verify-id-tokens ; https://docs.netlify.com/build/data-and-storage/netlify-blobs/ ; https://docs.netlify.com/build/functions/api/
