# Gravity Golf: Revenue Readiness

Last public recheck: 2026-09-08. Authenticated read-only review: 2026-09-08 15:44 UTC. This is an evidence-based release checklist, not a profit claim.

Local sandbox acceptance update, 2026-09-09: the owner-approved Stripe test
sandbox, USD 2.99 one-time product and separate Firebase Spark project
`gravity-golf-test` are configured with restricted backend credentials in an
ignored mode-0600 `.env`. Saved commerce remains disabled. Actual test payment,
signed webhook fulfillment and paid Hole 9 entry passed. Fresh-browser sign-in,
sign-out/re-sign-in and reload then restored the existing purchase without
another checkout; the first sign-in failed generically for an unknown reason
before successful retry. These checks used local Netlify Blobs emulation with
a process-only compatibility layer, not hosted storage. Runtime and listener
are stopped. See `docs/SANDBOX_ACCEPTANCE_2026-09-09.md` and its structured
`docs/RESTORE_ACCEPTANCE_2026-09-09.json` receipt. Test money is not revenue.

## Verified Baseline

- Repo: https://github.com/walkthroughwonder/gravity-golf
- Live site: https://gravitygolf.xyz
- Local base: `74f29f63efd2d88d81c1b58400f523861346b2bb`.
- Main page and soundtrack matched live before local edits. No deployment was made.
- Authored level arrays contain 8 free and 11 Pro holes (19 total).
- Public Stripe checkout displays Gravity Golf Pro, merchant Epoch6, $2.99 one-time. Its description says 18 total and 13 additional holes, which does not match this build. No payment information was entered and no purchase was made.
- The inspected production main page contains a direct Stripe Payment Link. The isolated branch now replaces it with the default-disabled account-bound API. A subsequent owner-authorized Stripe review inspected the live link and payment record; see below. Site-wide traffic and new independent-customer revenue are not established by this review.

## Release Blockers

### Public Check: September 8 Snapshot

- The public game loads in Chrome. A credential-free HTTPS download on
  2026-09-08 has SHA-256
  `c2e7e19c395692b7b3709c238589ee4dc19fa0c1fb6a54934987bcbd4480847e`,
  the same production HTML baseline identified before local edits.
- Both authored level arrays exactly match the isolated capture source:
  8 free holes plus 11 additional holes, 19 total. This verifies the course
  data, not a fresh guest gameplay or end-to-end purchase test. Evidence:
  `docs/public-preflight-2026-09-08.json`.
- The live Pro modal still says 13 additional holes while listing Holes 9-19.
  Public Stripe Checkout shows Epoch6 / Gravity Golf Pro / $2.99 and still
  describes 18 total and 13 additional holes. This mismatch was observed publicly
  on September 8, not merely in an old local copy. This document update did not
  repeat that public inspection.
- Chrome's game tab was already signed into the owner's player account, so
  no gameplay inputs or progress changes were made. The public Stripe page
  automatically presented Link verification; no code, email, card or payment
  was entered, no resend was requested, and the inspection tab was closed.
- The initial Stripe sign-in gate was resolved later on 2026-09-08. The
  authenticated review below supersedes the earlier access blocker. Private
  Firebase Analytics was not revisited.

### Authenticated Read-Only Review

- The owner completed Stripe sign-in and confirmed the requested read-only
  review. Verified the live Epoch6 account and the exact Gravity Golf Pro
  Payment Link used by the public site.
- Inspected the link's full payment list, selected payment status, processing
  fee, net amount and linked payout status. No customer export was downloaded.
  Financial amounts, personal details, account/payment identifiers and raw
  dashboard snapshots are intentionally not copied into this repository.
- The historical payment evidence does not establish new independent-customer
  revenue or verified application delivery. Detailed findings were reported
  privately in the conversation; the money-making goal is not established as
  achieved by an owner-associated checkout.
- The live link's confirmation destination remains the URL-based Pro unlock.
  The configured destination list showed no Gravity Golf-specific webhook;
  the other application's destination was left untouched. Stripe completion
  and payout records do not prove the game granted durable, restorable access.
- The historical checkout event has limited retained data because it is older
  than 30 days. No event was replayed, receipt sent, refund initiated, secret
  revealed, account created or configuration changed.

Stripe read access, isolated service creation and scoped test credentials are
resolved setup steps, not current blockers. The previously exposed unused
standard test key was absent after a fresh Stripe key-list load on September 9;
do not request its expiration again. The restricted test key and local webhook
signing secret were configured with explicit owner approval. Actual payment,
signed fulfillment and restoration now pass against the local entitlement store.
No listener is running and saved commerce stays disabled.

Hosted persistence/concurrency and adverse payment acceptance remain open.
The local Firebase module-loading issue requires the documented runtime option;
a future hosted deployment needs explicit Functions-scoped configuration and
acceptance. A September 9 read-only Netlify review verified the owner's existing
Pro team and identified the production project. It did not establish billing
headroom or authorize a new site, credentials upload, plan change or deployment.
Browser billing review stopped at sign-in. See `docs/PAYMENT_SETUP.md`.
Product-copy changes, production release and public marketing still require
their own exact approvals. Do not push this branch blindly: commerce defaults
to disabled until properly configured, and existing buyers need safe migration.

### Open Gates

1. Payment verification: production unlock trusts `?pro=1`, `gg_pro` local storage and a shipped test master key. These are not payment proof. Do not count any of them as a sale. A client-delivered game is not tamper-proof DRM, but legitimate payment and entitlement delivery must be verifiable.
2. Fulfillment and recovery: real Stripe test payment, signed fulfillment and fresh-browser/reload restoration pass locally, following one initial unexplained sign-in error. Saved checkout remains disabled; nothing is deployed. Hosted storage, refunds/disputes, adverse cases and physical-device testing remain open. A paying customer of the old flow may still lose access with browser storage or miss the redirect. Existing device access is preserved locally, but old purchases still need a verified account-migration process, not a forced repurchase. See `docs/PAYMENT_SETUP.md` for implementation, test coverage and remaining gates.
3. Offer accuracy: align Stripe's description with the actual course, using the owner's approval before changing the live product. Proposed copy: "Unlock 11 additional holes, from Deep Space Odyssey to The Final Frontier. Includes black hole gauntlets, Neutron Alley and more. Holes 9-19. One-time purchase, no subscription."
4. Measurement: production's legacy `analytics-bridge.js` was not included or called by the main game at inspection. The isolated branch now has opt-in, default-disabled funnel instrumentation with strict event fields, but no configured property or verified real event delivery. Do not interpret source code or local fixtures as active production analytics. Actual sales still require the Stripe ledger; restored access is not counted as revenue. See `docs/MEASUREMENT.md`.
5. Sharing/install validation: the isolated branch now includes a description, canonical/Open Graph/card metadata, an actual manifest, and 192/512/180-pixel icons exported from existing Gravity Golf artwork. Chrome's local manifest and installability diagnostics passed; desktop and phone-size smoke checks passed. Nothing has been deployed, and real-device installation/relaunch plus actual public social-card rendering remain unverified. Do not promote app-store availability or offline play. See `docs/SHARING_ASSETS_2026-09-09.md`.

## Local Improvements

- Correct counts derive from the actual level arrays; price remains $2.99.
- Pro offer is discoverable from the ball picker without completing the entire free course.
- Players may replay or return home after finishing the free course instead of being forced into the upgrade path.
- Offer has keyboard focus handling and a scrollable narrow/short-screen layout.
- Main game's production Firebase initialization is allowed only on the exact production HTTPS hostnames. Purchases default to disabled. A separately configured test environment may use only its own named Firebase auth app and Stripe test mode. Ordinary localhost/file previews cannot charge money or use production customer data.
- The standalone `login.html` and `profile.html` now stop before Firebase initialization outside the two exact production HTTPS origins. Preview credentials are disabled, guest navigation stays local, and profiles are not loaded. They intentionally do not support test accounts; use the main game's separately configured Pro panel for sandbox purchase tests. The older excluded `index_codex.html` is not covered by these changes.
- A default-disabled server API now provides account-bound checkout, signed webhook fulfillment, immutable purchase records, account restoration and refund/dispute revocation. Offline tests are not evidence of real payments or an integrated release.
- The game now uses that API, displays the signed-in account, and supports sign-in/create/reset/sign-out, pending/canceled payment checks and restored Pro play. The old master code and URL flag no longer grant new access in this branch. Browser fixtures cover the actual UI, including mobile sign-in and playable Hole 9; hosted integration remains a release gate.
- Real test providers now also confirm payment, signed fulfillment and restoration
  of the existing purchase. This is local acceptance only: the temporary storage
  compatibility layer, synthetic account and test payment do not prove hosted
  delivery, production restoration or independent customer revenue.
- The build now allowlists public files into `dist/`; server code, credentials, tests and the old alternate `index_codex.html` are excluded. No deployment is performed by the build.
- A static third-party notices page and four upstream license texts now ship in
  the web allowlist, linked from the starting-screen credits. They add no runtime
  library or script changes and are not fetched until opened. This is a web
  attribution improvement, not complete native, asset, brand or legal clearance.
- Optional usage-data settings and funnel hooks now distinguish training, actual first shots, hole completion, offer exposure, Stripe redirect attempts and verified account access. The old analytics bridge is excluded from the public build. Collection is disabled until the owner reviews/configures a property and the player opts in; local tests use an inert vendor.

## Revenue Path

Keep the current one-time offer as the initial hypothesis; do not add ads or subscriptions without evidence. First establish successful purchase -> access -> restore, then measure:

- Qualified visitors -> first shot -> free holes completed -> Pro offer viewed -> checkout opened -> Stripe-verified payment -> entitlement delivered.
- Compare offer exposure and purchase conversion by source and device; do not mix sandbox or developer runs into real sales.
- Reconcile gross receipts, refunds, payment fees and marketing costs. A browser unlock is not revenue, and gross receipts are not profit.
- Example only: 100 purchases at the current $2.99 price equal $299 gross before fees/refunds/taxes. This is arithmetic, not a forecast or a claimed conversion rate.

After the release blockers pass, prepare one short video of real gameplay with transparent founder framing: "I'm building Gravity Golf. Can you land this shot? Try the free course at gravitygolf.xyz." Post only with owner approval; test organic acquisition before spending money.

## Payment Acceptance Scope

Some cases below pass locally or in offline regression tests; this remains the
required hosted/release acceptance scope, not a claim that every case is untested.
Use the dated acceptance report to distinguish actual providers from fixtures.

- Use Stripe test mode; never enter test cards into the current live Payment Link.
- Verify the correct product/price, currency, mode, payment status and authenticated customer ownership on the server.
- Verify signed webhooks, handle duplicates idempotently and delayed-payment success/failure, and store a durable entitlement.
- Paid sessions grant the purchased course; unpaid/canceled/forged sessions do not.
- Refreshes and retries do not duplicate fulfillment. Closing checkout before redirect does not lose the purchase.
- Recovery restores an existing purchase without charging again. Local previews never use production customer data.
- Define refund/revocation handling and safe migration for existing legitimate purchasers.

Stripe documents why redirects alone are insufficient and why fulfillment needs webhooks: https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted

Stripe Payment Link fulfillment, redirect session IDs and dashboard revenue metrics: https://docs.stripe.com/payment-links/post-payment

## Release Boundary

No live configuration, product copy, credentials, deployment, marketing post or ad spend is authorized by this checklist. The current goal is not achieved until real revenue is verified. Code tests, test-mode purchases and marketing drafts cannot establish that outcome.
