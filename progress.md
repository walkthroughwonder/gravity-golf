Original prompt: make money with this game.

# Progress

## 2026-09-07: Establish a truthful offer and safe local test flow

- Work only in `/Users/edwin/Downloads/Gravity Golf Updates`, branch `codex/updates-2026-09-07`.
- Base commit: `74f29f63efd2d88d81c1b58400f523861346b2bb`. Main HTML, soundtrack and analytics bridge matched live by SHA-256 before edits.
- Live site and old dirty checkout are untouched. Clone push URL remains disabled.
- Actual authored course: 8 free holes + 11 paid holes = 19. Stripe checkout is live at $2.99, but still advertises an older 18-hole/13-additional-hole offer.
- Local changes: derive offer counts from actual level arrays; expose Pro from ball picker; preserve free replay/home; keyboard-accessible offer; block live payments and Firebase initialization outside production domains in the main game.
- Do not confuse local safeguards with verified payment fulfillment. Production query/local-storage unlock trust, master key, cross-device restore and funnel measurement still need replacement or verification. See REVENUE_READINESS.md.
- Revenue and traffic remain unverified. Asked owner for existing sales and visitors; no answer yet.

# Verification

- `node --test tests/commerce.test.mjs`: 10 focused tests, including actual inline-script syntax, course counts, preview checkout/Firebase guards, dialog focus/hotkeys and free replay/home controls.
- Desktop 1280x720 and phone-sized 390x844 views inspected through the in-app browser: offer and picker fit; checkout visibly disabled locally; back returns to free play. Browser error/warning log was empty in this run.
- Game-client smoke tests exercised Tee Off -> Launch Lab -> Skip Training -> ready Hole 1. State reports 8 free/11 Pro, `liveServices: false`, `introPlaying: false`, trainer hidden. Screenshot artifacts: `/tmp/gravitygolf-revenue-smoke/` and `/tmp/gravitygolf-revenue-gameplay/`.
- `git diff --check` passed. No gameplay/physics/render-loop changes or new runtime dependencies. No performance benchmark or end-to-end payment test has been run.
- Final hotkey regression test passes; the offer prevents the game shortcut handler from acting on typed input.
- The frontend has no TypeScript/ESLint setup; inline JavaScript syntax is tested with Node. The payment backend added below is now type-checked separately.

# Next Work

1. Review existing Stripe sales/traffic read-only with the owner; do not infer zero sales.
2. Wire and sandbox-test the new default-disabled server payment API. Do not accept a URL flag as proof of payment; preserve a migration path for existing buyers. Follow `docs/PAYMENT_SETUP.md`, including its explicit unverified integration gates.
3. Connect consent-aware funnel measurement and verify events from real gameplay through verified purchase.
4. Obtain approval for precise Stripe copy/settings changes and a separately reviewed live deployment.
5. Prepare one genuine gameplay promotion, then obtain approval before posting. No ad spend until acquisition economics are measured.

The goal remains active. Local fixes are progress, not evidence of revenue.

## 2026-09-07: Server-Side Payment Foundation

- Previous goal turn classified as progress: local UI/source changes and regression evidence were present in the actual worktree.
- Added `netlify/functions/commerce.mts` and `_shared/commerce-core.mts`. Account-bound Stripe checkout, exact price/amount/currency/payment verification, signed webhook fulfillment, durable restoration records, permanent refund/dispute tombstones, and retry-safe immutable grants.
- Defaults disabled. Test/live keys, origins and Firebase projects must match. No production keys or account records were accessed; all new payment tests use offline fixtures.
- Added pinned server-only dependencies, TypeScript checking, a narrow patched-UUID dependency override, environment template, private-public build separation, and a setup/migration guide.
- The game UI still uses the previous payment flow. Do not deploy until the frontend is integrated, existing buyers have a migration/restore process, and real test-mode end-to-end coverage passes.
- Added atomic per-account pending-checkout reservations: concurrent tabs reuse one Stripe session; expired sessions may be replaced, unresolved old attempts are held rather than risking a duplicate charge. Tests cover concurrency, failed responses and safe retry keys.
- `npm run check` passed: TypeScript checks, 36 combined tests, and a clean public build. `npm audit --omit=dev` reported zero known vulnerabilities after the UUID patch. Both affected UUID v4 consumers passed a local compatibility smoke test. No game physics/rendering edits in this phase.
- Entry-point import/default-disabled behavior is tested with real SDK imports. Provider calls and storage concurrency otherwise use offline fixtures; real Stripe test checkout/Firebase authentication/Netlify deployment remain unverified.
- Verified the full `npm run check` again from the actual isolated clone after installation. An unrelated `/Users/edwin/node_modules/.bin/node` was overriding nested npm commands with Node 20; project scripts now use npm's invoking Node and a dedicated check runner. No system Node/configuration change was made.
- No actual receipts, income, customer conversions or profit have been verified. No deployment, payment, promotion or ad spend occurred.

## 2026-09-07: Purchase UI And Account Restore Integration

- Previous goal turn had concrete progress: the isolated clone contained the server payment API and 36 passing tests. This turn is further local progress, not a blocked turn or verified revenue.
- Replaced this branch's direct Stripe Payment Link, master-code redemption and URL-flag unlock with `commerce-client.mjs` and an account-bound UI adapter. Dynamic loading keeps a missing local module from stopping the free game's initialization in a file preview.
- Added signed-in account labeling, email sign-in/create/reset/sign-out, explicit restore/check, verified/pending/canceled/error states and direct restored Pro play starting at Hole 9. Checkout never auto-starts after sign-in; a user must explicitly continue.
- Legacy `gg_pro` device access remains playable and clearly separate from verified account ownership. It is not sent to the API or written for new purchases. Old `?pro=1` returns do not unlock or initiate another purchase; receipt-based migration is still required before release.
- API status includes only the public Firebase web app config for its environment. Local test auth uses a separate named app, not production auth/database. Server credentials remain server-only. Payment settings remain disabled and no providers were configured.
- Auth generation checks discard stale grants/redirects across account changes. Daily Challenge updates its saved normal course when entitlement changes; losing verified access on an active paid hole safely restarts the free course. Existing active free holes are not reset by initial verification.
- Fixed a discovered return-screen regression: capture the original checkout-return state before successful confirmation removes URL parameters, so the confirmation dialog still opens.
- `npm run check`: 57 passing tests plus TypeScript checking and allowlisted public build. New controller tests cover disabled environments, sign-in, exact request shape, bad redirects, pending/canceled/legacy returns, account-switch races, duplicate clicks, errors and revocation.
- Optional `tests/browser-commerce.mjs` exercises the actual built game/controller using inert Firebase/payment fixtures, with network guards against production provider calls. Six scenarios passed: disabled/free return; mobile sign-in/restore and playable Hole 9; verified return/URL cleanup; pending retry without another checkout; cancel; preserved legacy access. Artifacts: `/tmp/gravitygolf-commerce-browser/`. This is not real provider integration.
- Standard game-client smoke tests exercised the offer and Tee Off -> Launch Lab -> Skip Training -> ready Hole 1. Screenshots inspected at `/tmp/gravitygolf-client-smoke/` and `/tmp/gravitygolf-client-gameplay/`. The bare static server has expected missing-resource 404s, including the absent commerce API; fixture browser checks had no unexpected console or page errors.
- No physics, rendering-loop, soundtrack or artwork changes. The new controller is about 10 KB uncompressed and runs only at initialization/account/UI events. No frame-rate benchmark was run.
- Remaining: real sandbox authentication/checkout/webhooks/Blobs verification; existing-buyer migration and support policy; measurement; separately approved production release. Revenue and traffic remain unverified, and the revenue goal remains active.
- Synced exact changed files into the isolated clone, verified checksum agreement, re-ran all 57 tests/build there, and passed `git diff --check`. Old dirty checkout status and disabled clone push URL were rechecked. The local preview at `http://127.0.0.1:8770/` now serves only the clone's `dist/`, not the repository root; public client returns 200 and backend source returns 404. Final pending-state CTA is "CHECK PAYMENT STATUS", not a misleading new-checkout label.

## 2026-09-07: Opt-In Funnel Measurement

- Previous goal turn classified as progress after inspecting the actual clone: connected purchase UI/controller, updated payment tests and release documentation were present. No revenue evidence was present.
- Added `funnel-analytics.mjs`, build-time analytics config and real game milestone hooks. The public build excludes the obsolete unused analytics bridge. No analytics property or production collector was configured.
- The optional Usage Data dialog does not interrupt onboarding. Google-tag loading is blocked before explicit consent; browser GPC/DNT requests keep it off. Consent is property/environment-scoped, expires, and survives blocked storage safely. Turning off sets the vendor disable flag, expires GA cookies, stops other open tabs through storage events, and does not reload the current game. Re-enabling after withdrawal is deferred to the next visit to avoid replaying a delayed vendor queue.
- Added a small active-only usage-data control that remains reachable during mobile gameplay. Initial UI QA found the mobile Controls menu is hidden, so putting opt-out only there would have been insufficient; the original Controls layout was preserved.
- Event schemas allow only coarse campaign labels, modes, hole/stroke/par counts, offer placement and access flow. No email/UID/payment ID/raw campaign or URL is accepted by the event adapter. Google still receives connection/browser information after consent; this is not anonymous measurement or a completed privacy-policy review.
- Background level loading and trainer shots do not count as real hole starts. Retry/undo milestones are deduplicated per page/mode/hole. Checkout redirect and account restore are explicitly not `purchase`/revenue events. Actual revenue still requires the live Stripe ledger.
- `npm run check` passed with 74 tests, including schemas, consent/withdrawal, cross-tab choice synchronization, environment guards, exact Google config, actual inline game hooks, and payment-event separation. No new package dependency or per-frame analytics work was added; the analytics module is about 6.9 KB uncompressed. No real-vendor performance benchmark was run.
- Five real-browser/inert-vendor scenarios passed in `tests/browser-funnel.mjs`: consent -> actual ball-click/shot -> mobile withdrawal; blocked tag/free play; cross-tab withdrawal and no background hole event; GPC; default-disabled property. Screenshots/report: `/tmp/gravitygolf-funnel-browser/`. The browser test initially tried the hidden AIM panel toggle; it was corrected to exercise the actual ball-click aiming control rather than altering gameplay.
- Six existing purchase-browser fixtures also passed. Standard game-client tests covered the usage-data dialog and Tee Off -> Skip Training -> ready Hole 1. Screenshots/state inspected at `/tmp/gravitygolf-funnel-smoke/` and `/tmp/gravitygolf-funnel-gameplay/`; usage stayed off with zero queued events in the default preview. Static preview has expected missing commerce API/manifest resources; controlled fixture checks had no unexpected page/console errors.
- Added `docs/MEASUREMENT.md` with event semantics, opt-in sample limitations, GA4 review/setup gates, privacy boundaries, source labels and a decision workflow that uses Stripe rather than browser unlocks as the sales ledger.
- Read-only revenue access: Stripe opened at its login page and remained unauthenticated. Asked the owner to sign in, without sharing credentials, and retained that tab for handoff. Private Firebase Analytics navigation was rejected because authorization for that project was not established. Asked directly for permission to read `gravity-golf-6ec4f` traffic/events; do not retry that dashboard or use an indirect access route without the owner's approval.
- Remaining external gates are unchanged: owner-authorized account access; separate real payment/analytics sandboxes; verified old-buyer migration/support policy; property/privacy review; independently approved release. No deploy, charge, marketing post, ad spend or verified revenue occurred. Goal remains active; this turn made concrete local progress rather than reaching a no-progress impasse.
- Final sync to the isolated clone was checksum-verified; all 74 tests and the public build passed there, as did `git diff --check`. The existing safe preview at `http://127.0.0.1:8770/analytics-config.json` returns only `{ "mode": "disabled" }`. Original checkout status and disabled push URL were unchanged on reinspection.

## 2026-09-08: Genuine Gameplay Marketing Prototype

- Previous goal turn classified as progress from actual clone files: default-disabled funnel implementation, tests and documentation remained present. Revenue is still unverified, not assumed zero.
- Produced one concrete organic-acquisition asset rather than another infrastructure-only change: `marketing/first-shot/gravity-golf-first-shot.mp4`, a 10-second vertical draft with real local gameplay and the game's own audio mix.
- Captured only the game canvas and a tap of its final Web Audio output in a clean Chromium context. No desktop, microphone, private account, fabricated reaction or game-state injection was used. Original DOM HUD screenshots and raw capture/state logs are retained beside the export.
- The first attempt selected an inactive background canvas and produced no video. Corrected the capture selector; software capture then produced about 12 fps. A hardware/Metal take produced 281 frames over roughly 9.9 seconds and is the selected source. No renderer/physics changes were made to the game itself.
- Selected take: built-in assisted route, Hole 1 completed in one stroke before 3.9 seconds. The video explicitly labels local WIP and assisted route. The result is supported by the actual game state and UI screenshot. No simulated win, boost, ability, paid unlock or payment was used.
- Export: 1080x1920 upscaled from 720x1280, H.264, 30 fps/300 frames, 10 seconds, stereo AAC. Full shot is chronological with no speed change; text overlays and a dimmed four-second end card are edit-only. Raw and final file hashes are recorded. Audio is non-silent with headroom; subjective listening/phone review remains for the owner.
- Added an exact proposed founder caption, approval/live-availability/audio-rights gates and a single organic posting test in `marketing/first-shot/POST_DRAFT.md`. Nothing has been uploaded or posted. The failed public-page fetch is not live-feature verification; local WIP labels remain.
- No production source, checkout settings, accounts, analytics settings or original dirty checkout were changed. Main HTML still matches the capture's SHA-256. Push remains disabled and the public build allowlist excludes marketing files. Private analytics access was not retried after the prior authorization rejection.
- This is concrete marketing preparation, not revenue. Next consequential step needs owner review and exact channel/post approval; revenue/account and production-release gates remain open.
- Final verification: the saved package matches staging by checksum; both local capture/edit scripts pass Node syntax checks; the complete MP4 decodes without errors; sampled frames, title and end card were visually inspected. All 74 regression tests, type checking and public build passed with permission for local dist writes. The first sandboxed test attempt was 73/74 solely because the build test could not unlink a dist file; the approved rerun passed. Marketing files remain outside dist, `git diff --check` passes, original checkout status is unchanged, and no release action occurred.

## 2026-09-08: Public Offer Recheck And Owner-Action Gate

- Previous goal turn classified as progress: the actual saved MP4 exists and its SHA-256 is `82ba7ba59deac79ec8afa8f76961859b86b2bf09b2dc6f0699dc020edc1ae0c1`, matching the verified marketing export. Current clone/source files remain present. This is not a verified wait or a revenue result.
- The web extraction tool still failed on the public URL. Normal Chrome navigation successfully loaded the public game without a browser security warning; a separately approved credential-free HTTPS download verified the production HTML SHA-256 and both level arrays. Evidence is in `docs/public-preflight-2026-09-08.json`. No attempt was made to access the previously rejected private analytics project.
- Public source remains at the original baseline, with 8 free + 11 paid = 19 authored holes. The live game modal and public Stripe offer still overstate the additional count as 13, and Stripe still says 18 total. Public price remains $2.99. Updated revenue readiness and the promo's pre-posting checklist from this current evidence.
- The public browser already had the owner's player session, so no gameplay input or progress change was made there. Opening the public Stripe offer automatically presented Link verification; stopped without typing a code, requesting another code, entering billing details or purchasing. Both research tabs were closed. A fresh guest production playthrough and real fulfillment/restore remain unverified.
- Rechecked the existing Stripe dashboard handoff: it is still at the login page, with empty email/password fields. No authenticated sales/refund/fee evidence is available. Retained only that handoff tab for the owner.
- Recurrent blocker audit: owner sign-in/authorization has remained missing through three consecutive goal turns: funnel measurement, marketing capture, and this public recheck. Required production/provider and publication approvals have also not arrived. No live process is being awaited. Safe local payment/measurement foundations and a marketing prototype are prepared, but more unrelated local edits would not resolve the purchase/restore, revenue-verification or acquisition authorization gates.
- The goal is not achieved: no actual revenue has been verified. At this point meaningful commercial continuation requires owner input or an external-state change. Resume with owner-authorized read-only Stripe review, then address the exact verified fulfillment/copy issues and obtain separate sandbox, deployment and marketing approvals. Do not restart the computer or deploy/publish/charge while waiting.

## 2026-09-08 15:44 UTC: Owner-Authorized Stripe Review

- The owner replied "ok done" to the request to sign in and approve a read-only Gravity Golf sales/fulfillment review. Current browser state confirmed an authenticated live Epoch6 dashboard, so the previous sign-in blocker is resolved. This resumed run starts a fresh blocker audit; do not carry forward the previous three-turn blocked count.
- Inspected the exact live Gravity Golf Payment Link, its settings, performance tab, full payment list (both pagination directions disabled), an existing payment's status/fee/net/payout linkage, and current webhook destination inventory. No broad customer export, API credential extraction or unrelated account inspection was performed.
- The existing payment is owner-associated and predates this work; do not call it new independent-customer revenue or claim this agent generated it. Detailed financial/identity evidence remains in the private conversation and Stripe, not the repository. No receipt was sent and no payment, refund, replay or account/configuration change was made.
- Confirmed that the current link still uses the URL-based unlock redirect and retains the inaccurate course description. No Gravity Golf-specific destination appeared in the current webhook list; the different application's destination was left untouched. The historical checkout event has limited retention data. Stripe payment success does not verify durable game access or cross-device restore.
- Updated REVENUE_READINESS.md to remove the resolved sign-in gate and identify isolated provider setup plus an actual test-mode purchase/unlock/restore as the next implementation gate. Existing local fixture tests are not substituted for provider acceptance.
- The goal remains unproven. Separate sandbox configuration, production edits, deployment and publication are not authorized by this read-only review. Do not restart the computer, change the other application's webhook, alter the live offer or publish the promo without the appropriate exact approval.

## 2026-09-08: LLC Evidence And Preview Account Isolation

- Previous goal turn classified as progress: the requested mailbox review established historical LLC formation/amendment confirmations and current notices, changing the next entity check from possible new formation to current standing/EIN verification. Private financial, identity and message details remain outside this repository.
- Initially, the official California lookup returned 403 and Chrome showed a CAPTCHA. Requested the owner's human check; later the page became accessible without the agent solving it. Read-only search and the expanded entity drawer now verify epoch6 LLC (202464116233), Active, all four standing fields Good, formed October 8, 2024, Statement of Information due October 31, 2026. Public fields only are retained in docs/epoch6-public-status-2026-09-08.json. No login, filing, certificate order, payment or account change occurred. EIN, tax balances, game ownership and store enrollment remain separate unverified facts.
- Reproduced a launch-audit gap with offline fixtures: standalone login/profile scripts invoked production Firebase initialization on localhost; guest play called anonymous sign-in. The stubs never contacted Firebase or created real accounts. Main-game safeguards did not cover those pages.
- Added exact HTTPS-origin gates to both standalone pages, explicit preview/unavailable notices, disabled preview account controls and local guest/back links. No authentication, profile query, session restore or sign-out handler is initialized off the production origins. Test commerce continues through the main game's explicitly configured sandbox panel, not these legacy pages.
- Eight added tests cover localhost/file/deploy preview/lookalike/subdomain/alternate-port cases, missing SDKs, inert production initialization/sign-in, and guest navigation. They first failed on the original source and pass with the patch. Staging `npm run check` passed: 82 tests, TypeScript checks and public build. No dependencies or game/physics/render-loop code changed.
- Chrome desktop and 390x844 phone-size inspections confirmed visible notices, disabled credentials, no horizontal overflow, and usable guest/back navigation. Guest returned to the actual ball picker. Both account pages had `firebase.apps.length === 0`, no observed auth/database requests and no browser error/warning logs. Static Firebase SDKs and Google Fonts still download. No live account was used; this is not a real provider purchase/restore test. Temporary viewport override was reset.
- Final project-root verification also passed all 82 tests, type checks and dist build. Code/test hashes match the browser-tested staging files, and `git diff --check` passes. macOS openrsync placed the first relative-path copy in an unintended nested temporary folder; corrected with explicit destination directories, removed only those six self-created duplicates, then reran the actual project checks. The original checkout remains unchanged and clone push remains disabled.
- Remaining revenue gates: owner-approved isolated provider setup and real test checkout/unlock/restore, legitimate old-buyer migration, offer correction, LLC/policy/rights review, and independently approved release/promotion. Local checks do not establish independent-customer revenue. No deployment, post, charge, credential change or restart occurred.

## 2026-09-08: Owner-Approved Isolated Provider Setup

- The owner answered yes to creating separate Stripe/Firebase test environments
  with no paid services, live charges, or production customer data. The previous
  service-creation approval blocker is resolved; this is concrete provider-state
  progress, not a verified payment or revenue result.
- Verified Epoch6 identity in Stripe and created `Gravity Golf Test` using the
  blank-sandbox option, not Copy account. Created and verified a USD 2.99 one-off
  test product with accurate 11 additional / 19 total hole copy. Production offer,
  payments, other-app webhooks, and customer records were not modified.
- Verified the Google identity before creating Firebase `gravity-golf-test`.
  The project is visibly Spark / No-cost ($0/month), with Gemini and Analytics
  disabled during creation. Registered a web app without Hosting, initialized
  Authentication, and enabled email/password only. Localhost was already in the
  authorized-domain list, which was left unchanged. No test users created yet.
- Read only the new project's service-account inventory: the default Firebase
  service agent has no keys. No IAM grant or key creation was performed. Stripe
  automatically generated its standard sandbox keys; none was revealed or used.
- Prepared ignored local configuration with public Firebase values and the test
  price ID, commerce/analytics disabled, and server secrets blank. Saved a scoped
  setup receipt in `docs/SANDBOX_SETUP_2026-09-08.md` and updated readiness notes.
- Asked at action time for dedicated Authentication Viewer credentials in the
  test project and a restricted Stripe sandbox Checkout/Price/PaymentIntent key,
  stored only in the ignored local environment file. Do not substitute broad
  Firebase Admin/Editor or live credentials, or expose keys in chat/logs.
- The existing Netlify CLI supports local `dev --offline`; no login, site link,
  live tunnel, server, or deployment was started. Local Blobs emulation would not
  prove real hosted Blobs concurrency or durability. No computer restart occurred.
- Still needed: scoped test backend access, webhook forwarding, actual sandbox
  purchase/unlock/restore and negative-case results, then separately authorized
  release/marketing. Creating these services does not establish income.
- Actual-clone configuration assertions passed: test project/price IDs, blank
  server secrets, disabled real settings reader, ignored mode-0600 `.env`, and
  exclusion from current `dist`. `git diff --check` passed. Push remains disabled
  and the original dirty checkout status is unchanged. No full game regression
  suite rerun because this step changed provider setup/configuration/docs only.

## 2026-09-08: Approved Test Credentials And Provider Preflight

- The previous store-research turn yielded current Steam/Epic requirements and
  confirmed Epic is engine-agnostic. Desktop packaging remains a future path,
  not a reason to rewrite the game or delay the purchase-delivery gate. No store
  fees, account submissions, or desktop build were performed.
- Revalidated the dedicated Firebase test service account, saved only
  Authentication Viewer, reopened the editor to verify the persisted role, then
  generated and securely imported its JSON key into ignored mode-0600 `.env`.
  Removed only the generated Downloads duplicate. Default service agent unused.
- Created the approved Stripe restricted TEST key with exactly Checkout Sessions
  Write, Prices Read and Payment Intents Read. Imported through a same-origin,
  loopback-only, non-logging form into `.env`; no secret in shell arguments.
- Security incident: the Stripe key page automatically included its unused
  standard sandbox secret in an AX tool response. Owner notified and rotation
  requested, not yet confirmed. The standard secret was not installed or used.
  Later key-page outputs were redacted. No production secret was accessed.
- At 20:11:07 UTC, real provider SDK checks passed: exact expected active test
  price, one-time USD 2.99, and dedicated Firebase Authentication user-read
  authorization. No test user or purchase was created by those checks.
- Installed official Stripe CLI 1.50.10 in /tmp only. The existing restricted
  key's local-webhook preflight failed with 403 `more_permissions_required`,
  specifically requesting Debugging Tools Write (`stripecli_session_write`).
  No permission expansion was made. No webhook secret or listener is configured.
- Checkout and analytics remain disabled. No deployment, live charge, public
  post, or computer restart occurred. These provider checks are progress but do
  not establish purchase/unlock/restore acceptance or independent revenue.

## 2026-09-08: Webhook Permission Approved And Verified

- The owner explicitly approved the requested Debugging Tools Write permission.
  Revalidated the existing Gravity Golf Test restricted key in Stripe, inspected
  its three existing grants, and added only `stripecli_session_write`. The full
  selection audit showed Payment Intents Read, Prices Read, Checkout Sessions
  Write, and Debugging Tools Write. Stripe accepted Apply changes.
- Retried the real local webhook preflight with this restricted TEST key. It
  succeeded and saved a unique signing secret directly in ignored `.env`, with
  no secret output. The command exited; no webhook listener is running yet.
- Opened the unused standard sandbox key's rotation dialog for owner handoff.
  The owner was asked to choose expiration now and click Rotate API key. This
  final credential-change action has not been performed or verified.
- `npm run check` passed type checks, all 82 offline tests, and public build.
  No code changes, deploy, charge, public post, or computer restart occurred.
- Local dev safety note: the installed Netlify CLI proxy currently calls
  `listen({ port })` without a bind address. Do not assume its localhost URL
  implies loopback-only listening; confirm safe binding before a credentialed
  runtime is started. No Netlify dev server was started in this step.
- Actual sandbox purchase/unlock/restore and independent revenue are still
  unverified. Do not reopen the resolved Debugging Tools approval gate.

## 2026-09-08: Actual Runtime Preflight And Pending Key Expiration

- Previous goal turn was progress: exact approved webhook permission was saved,
  real CLI initialization succeeded, and local build/secret-safety checks passed.
- Current Stripe state shows a replacement standard test key, while the exposed
  original key remains valid for seven days. Opened its Expire API key dialog;
  the logs link matches the original key ID. Requested the owner's final Expire
  click. Did not submit it or use either standard secret. Key-page outputs were
  redacted before display.
- Built a credential-free temporary copy containing the actual compiled game
  and commerce function. No production link, test users, provider requests,
  credential copy, charge, public post, deployment or restart was involved.
- A process-local TCP bind guard passed nine bind/rejection checks. The initial
  unprivileged socket test returned EPERM; approved loopback execution passed.
  The guard does not modify installed Node/Netlify code or system networking.
- The experimental programmatic NetlifyDev 4.16.4 path dropped the function's
  response headers in this environment. Stopped it and did not use that path as
  an acceptance shortcut. Standard Netlify CLI reproduced the actual runtime
  and preserved the headers after the module-loading correction below.
- Actual CLI invocation initially returned HTTP 500: Firebase Admin 14's
  jwks-rsa 4 requires ESM-only jose 6, while Netlify/Lambda disables require-ESM
  interop. The existing adapter-import test used Node's permissive local default,
  so it did not cover that runtime difference. AWS's documented
  `--experimental-require-module` runtime opt-in fixed the local import. No
  authentication downgrade, alternate token verifier or production option change.
- With that opt-in, real HTTP checks passed: game 200, disabled status/checkout
  503 with JSON/no-store/nosniff headers, and 404 for .env, source and package.json.
  lsof showed every observed proxy/static/functions/Blobs listener on loopback.
  This is not purchase, unlock, restore or hosted Blobs durability acceptance.
- Added an actual-adapter import regression and the runtime requirement to the
  example config/setup notes. Any future release needs approved Functions-scoped
  runtime configuration, consideration of AWS's experimental-feature tradeoff,
  and hosted acceptance. Do not treat build-only environment values as sufficient.
- Final isolated-root check passed type checking, all 83 tests, and the public
  build. Both temporary preview runtime processes were stopped through their
  confirmed live tool handles. No credentialed preview or webhook listener is
  running. Immediate old-key expiration and actual purchase/unlock/restore remain
  unverified; no independent-customer revenue is established by these checks.

## 2026-09-09: Local Sharing And Install Assets

- Previous goal turn was no progress: the sandbox key expiration dialog still
  needed the owner's final click. This resumed run starts a fresh blocked audit.
  Rechecked the existing Stripe tab with redaction after a browser-session reset;
  the old-key Expire confirmation remains open. No key change or purchase made.
- Advanced a separate known pre-marketing gap locally: added truthful browser-game
  description and sharing metadata, a valid web manifest, and matching 192/512/180
  pixel PNG icons. Exported the unchanged existing mobile icon SVG; no paid media,
  fabricated gameplay, new logo redesign, third-party upload or public post.
- Added only those four public files to the build allowlist. The SVG source stays
  in private marketing/brand. The PNG exports total 186,673 bytes. No new game JS,
  tracking, service worker, install prompt logic or production runtime setting.
- Compared the prior public build: every script block, style block and the entire
  body markup are identical. Changes to index.html are confined to head metadata.
- Actual isolated-root check passed type checking, 86 tests and the public build.
  The added tests check asset dimensions, bounded payload, truthful metadata,
  same-origin manifest identity/start/scope, and the expanded public-file allowlist.
- CUA/Chrome inspected the real public build at 127.0.0.1:8793. Page.getAppManifest
  returned errors=[], and Page.getInstallabilityErrors returned an empty list.
  Desktop and 390x844 opening screens were visually checked. Tee Off opened the
  trainer, and Skip Training entered Hole 1 at phone size. Browser warning/error
  logs were empty at inspection. Restored the viewport and closed the preview tab.
- The static preview served no backend or credentials. Its confirmed live tool
  handle was stopped with exit 0; lsof confirmed port 8793 no longer listens.
  Secret audit passed: .env ignored/mode0600, commerce disabled, all twelve public
  files exclude provider secrets. Clone push remains file:///dev/null.
- Remaining: owner Expire click, actual sandbox purchase/unlock/restore, approved
  production release, real-device installation/relaunch, and public-card crawler
  validation. No offline/app-store availability or independent-revenue claim.

## 2026-09-09: Actual Sandbox Sign-In And Checkout

- Previous turn was no progress at the key-expiration handoff. This resumed turn
  found the dialog closed and confirmed the old key absent after a fresh load.
  That blocker is resolved; do not ask the owner to expire it again.
- Revalidated scoped test credentials, owner-only ignored `.env`, disabled saved
  commerce mode, and no secrets in the 12-file public build.
- Started a guarded, offline/unlinked Netlify runtime and matching Stripe webhook
  listener using test mode in child processes only. Actual test account creation,
  Firebase token verification, and no-purchase entitlement response passed.
- Found an actual local-emulator failure absent from the offline tests: missing
  ETags caused the unchanged commerce adapter to reject checkout with HTTP 503.
  Reproduced without credentials; a temporary process-only emulator repair passed
  version/conditional-write checks, including single-winner contention. No
  production payment safeguard or installed package was weakened/edited.
- With repaired local emulation, the real Stripe Checkout displayed the exact
  test offer. Cancel added no Pro access; retry reused the identical Checkout
  session. These are real-provider checks with local storage, not cloud acceptance.
- Payment itself is not submitted. The safety reviewer blocked Pay over the
  unverified email/agent acknowledgment. Asked whether the owner wants to continue
  using the fake test card without Link CLI. No workaround submission attempted.
- Stopped both runtime/listener groups; exit 0 and no 8888/8889/8890 listeners.
  Preserve the existing Chrome checkout for handoff. Resume the reviewed runner
  before any approved payment attempt so callbacks work. See
  `docs/SANDBOX_ACCEPTANCE_2026-09-09.md` for precise evidence and temporary paths.
- Next: resolve the payment handoff, complete actual paid unlock/restore and
  negative tests, then separately validate hosted storage and release readiness.
  No production changes, real charge, public marketing, or revenue this turn.

## 2026-09-09: Approved Test Payment And Launch-Clearance Review

- The owner approved continuing with the synthetic card and without Link CLI.
  Fresh UI verification and synthetic-data replacement resolved the prior Pay
  handoff. Actual Stripe test payment completed; signed checkout webhook and
  server confirmation both returned 200. The same synthetic account was shown
  as verified Pro and PLAY PRO COURSE launched paid Hole 9. No real charge or
  independent-customer revenue. See the updated sandbox acceptance report.
- The owner redirected to liability/clearance review before reauthentication,
  restore or refund/dispute testing. Those remain open, as does hosted storage
  acceptance. Stopped local runtime/listener with exit 0; saved commerce stays
  disabled. No production service permissions or app code changed in this step.
- Updated `docs/LAUNCH_COMPLIANCE.md` with actual public URL/source findings,
  outstanding privacy/account/security gaps, license packaging, rights review,
  liability/insurance questions and exact evidence limits. The earlier LLC
  standing result remains a September 8 snapshot, not current IP ownership proof.
- Under the owner's delegation, selected US-first / intended ages 13+ / no
  child-directed marketing / no ads or behavioral tracking as a planning baseline.
  No geographic/age enforcement or store ratings changed. Selected the proposed
  `support@gravitygolf.xyz` address; it is not provisioned, tested or published.
- Recorded the owner's AGI House soundtrack authorship statement and assertion
  that his code predates the other game. `docs/RIGHTS_EVIDENCE_2026-09-09.md`
  distinguishes owner statements, available Git metadata, similar-name public
  listings and unresolved first qualifying use. No copying/infringement finding,
  name change, legal filing or competitor contact was made.
- Documentation-only updates are excluded from the existing public build
  allowlist. No new unit/native test result is claimed; no legal clearance,
  insurance, policy publication, deployment or computer restart occurred.

## 2026-09-09: Profile And Leaderboard Rendering Hardening

- Previous goal turn was progress: actual sandbox payment/paid-level entry and
  evidence-backed rights/launch notes were saved. Neither test money nor local
  preparation establishes independent customer revenue; the full goal remains.
- Inspected the current isolated worktree and found direct HTML insertion of
  profile photo URLs, history fields and leaderboard names/scores. The browser
  regression test against a temporary pre-fix copy reproduced execution of a
  harmless fixture flag (`window.__injected` became 1). This did not access the
  live site, private database rules or customer data.
- Replaced those paths with DOM image properties/text nodes; reject non-HTTPS or
  credential-bearing avatar URLs and malformed numeric records. Preserve valid
  leaderboard sort/rank behavior and initials fallback, including stale image
  failure handling. No runtime dependency, renderer or physics change.
- New email signups in the main game and login page no longer derive the public
  display name from the email prefix. Existing user names were not migrated or
  changed. This is data minimization, not anonymity or complete privacy clearance.
- Account switches/sign-out clear old profile details, ignore stale history
  responses and avoid duplicate rows. Closing the stats dialog cancels pending
  reopening. History text is ellipsized without crowding out dates/scores; fixed
  the standalone profile container width discovered by phone-layout testing.
- Added 13 focused unit regressions and two full-page browser scenarios. Final
  local checks: 99 tests pass, TypeScript check passes, public build passes.
  The initial staged suite failed only because its `.env.example` fixture was
  absent; copied the non-secret template, not `.env`, and reran successfully.
- Browser profile scenarios use synthetic records and deny-by-default routing,
  including local copies of fonts/Three.js. The production-looking origin is
  intercepted from disk, never navigated on the network. Existing module functions
  are exposed only in the fixture response, not in shipped source. Both desktop
  and 390x844 profile checks pass with zero injected flags, page/console errors or
  unrecognized requests. Screenshots inspected in `/tmp/gravitygolf-profile-browser/`.
- Standard game-client screenshots/state confirm Tee Off -> Launch Lab -> Skip
  Training -> ready Hole 1, with live services/commerce/usage tracking disabled
  and no captured console/page errors. Artifacts: `/tmp/gravitygolf-profile-game-smoke/`
  and `/tmp/gravitygolf-profile-gameplay/`.
- Existing six commerce browser fixtures also pass, including sign-in/restore UI
  and entry to paid Hole 9. Screenshots inspected in
  `/tmp/gravitygolf-profile-commerce-browser/`. These are inert-provider regression
  results, not newly completed real-provider restore/refund tests.
- Remaining: real paid-account reauthentication/restore, hosted storage and
  adverse payment acceptance, legacy buyers, remaining multiplayer/stored-state
  validation, database authorization, working support/policies, asset notices,
  brand/ownership review and separately approved production release/marketing.
  No deployment, public posting, legal clearance, new charge or revenue claim.

## 2026-09-09: Real-Provider Restore Acceptance And Hosted Preflight

- Restored the previously Stripe-fulfilled synthetic purchase in a fresh in-app
  browser, without a checkout return/session parameter. The first sign-in failed
  generically for an unknown reason; a diagnostic retry with the same credentials
  returned Firebase sign-in/account lookup 200. Sign-out removed paid actions,
  signed-out reload stayed free, and re-sign-in plus signed-in reload restored Pro.
  Three authenticated entitlement requests returned 200. Restored Play Pro opened
  Hole 9 / Deep Space Odyssey and was visually inspected. No new checkout,
  payment, account, reset or credential change was made.
- Runtime public-index and commerce-core hashes match the actual clone and are
  recorded in `docs/RESTORE_ACCEPTANCE_2026-09-09.json`. The temporary runtime
  still uses the process-only local Blobs compatibility layer. These are real
  auth/payment-provider observations with local storage, not hosted durability,
  concurrency, second-physical-device or refund/dispute acceptance.
- Anonymous entitlement returned 401; `.env` and backend source URLs returned
  404. Runtime/listener stopped with exit 0 and no 8888/8889/8890 listeners.
  The post-run audit found saved commerce disabled, `.env` ignored/mode 0600
  and no provider secrets in the 12-file public build.
- The immediately preceding owner-response turn restated known rights/chronology
  evidence and requested the first public-use date. Classify it as no progress
  toward revenue, not a verified wait. This continuation saves the pending restore
  evidence and obtains new read-only hosting facts that determine the next action.
- Netlify connector verified the owner's existing Pro team and exact live-site
  project. No isolated test project was identified in the returned team list.
  Usage, remaining allowance and overage/auto-recharge settings were not exposed.
  Browser review stopped at Netlify sign-in; no auth/configuration change occurred.
  Owner sign-in is needed for cost review before requesting a separately approved
  hosted test. No site was created, linked or deployed, and push stays disabled.
- Corrected stale readiness entries that still requested revoked-key expiration
  or initial payment/restore. Docs/receipt-only changes; prior 99-test, TypeScript
  and browser regression results were not rerun or expanded by this update.
- Still required: hosted/adverse acceptance, legacy-buyer migration, support and
  policies, rights/license review, separately approved production release and
  genuine acquisition. No independent-customer revenue has been verified.

## 2026-09-09: Web Dependency Notices

- The preceding resumed turns made no revenue progress: Netlify remained at
  sign-in, with no approval to use the existing Google login. This turn rechecked
  that gate, then found a safe local release action rather than repeating it.
- Added a static third-party notices page with full Three.js 0.172.0, Firebase
  JS SDK 10.12.0 and upstream Orbitron/Exo 2 license texts. Preserve upstream
  bytes, including Orbitron's Reserved Font Name missing from the older local
  Fontsource notice. Provenance, source URLs and hashes are in the rights record.
- Both starting-screen credits expose a keyboard-focusable, separate-tab link
  with no opener. No game script block changed; the main page gained 691 bytes
  of markup/CSS. Notices have no scripts or external asset dependencies and are
  not fetched merely by starting the game. Native license packaging remains open.
- Extended the public allowlist and exact-inventory test rather than recursively
  publishing a source folder. Three new unit regressions check license hashes,
  pinned SDK versions, notice coverage and safe link attributes. All 102 tests,
  TypeScript and build passed in staging. Public output contains 17 files; old
  12-file receipts remain historical evidence for their earlier tested source.
- Two local browser scenarios (1280x720 and 390x844) passed visible-link/keyboard,
  opener isolation, full license bytes, overflow and error/network checks.
  Screenshots inspected in `/tmp/gravitygolf-notices-browser/`. Browser launch
  and loopback binding initially hit sandbox permission errors; approved retries
  succeeded, without weakening app code or touching the user's browser profile.
- The standard game client passed Tee Off -> Launch Lab and Skip Training ->
  ready Hole 1. Inspected screenshots/state in `/tmp/gravitygolf-notices-game-smoke/`
  and `/tmp/gravitygolf-notices-gameplay/`; commerce, live services and usage
  collection were disabled, with no captured page/console error artifact.
- No deployment, hosted test, live charge, account sign-in, legal clearance,
  native-source edit or revenue claim. Hosting-cost review still needs Netlify
  sign-in or explicit authorization; production release and marketing are held.
- Final verification after exact 14-file sync: the actual isolated clone passes
  all 102 tests, TypeScript and build. All 17 public files match the tested staging
  output. The existing secret audit passes with `.env` ignored/mode 0600, commerce
  disabled and no provider secrets in public output. `git diff --check` passes;
  old checkout status is unchanged. Stopped the preview with SIGINT (exit 130)
  and verified no 8782 listener. No ongoing test process is claimed.

## 2026-09-10: Steam Desktop Prototype

- Owner requested Steam distribution. Prepared a separate `desktop/` package in
  the isolated updates repository, not an Unreal rewrite or a live-site edit.
  The previous web-hosting login gate does not block this local Steam work.
- Reused the actual current HTML (SHA-256
  `2f6560cee9e3f1e11f1d7da70c17bf67153e1725a0c57a24f91abf1131c1c795`),
  existing physics/course data and original UI. Full 19-hole guest prototype
  bundles music, fonts and imported Three.js modules, with a course selector
  and local Daily Challenge. Web purchase/auth/analytics startup is disabled;
  their SDKs/configuration/backend/secrets are not packaged. No original source
  file or saved commerce setting was changed.
- Pinned separate Electron/packager dependencies and lockfile. Sandboxed,
  Node-free renderer; allowlisted local custom protocol, restrictive CSP,
  denied permissions/downloads/external navigation. No IPC/preload bridge or
  Steam SDK/DRM. Saves use a prototype-only profile, not web account ownership.
- Seven desktop tests and advisory audit pass. Development and actual packaged
  macOS arm64 native tests pass training/skip, shot, Hole 9, Daily Challenge,
  fullscreen/exit, notices, local storage across restart and bundled MP3
  decoding/playback. Zero observed page/console errors or remote renderer
  requests in those flows. Human listening, full-course QA and performance
  parity are not established. Windows x64 bundle generated but not run on a PC.
- Standard game-client captures for the course dialog and playable Hole 9 were
  inspected. Both target ASARs have identical verified game payloads; package
  hashes, initial QA issues/fixes and remaining gates are in desktop/VERIFICATION.md.
- Saved private Steam copy and owner onboarding/release checklist. Current Valve
  docs require the app fee, first-release wait, public Coming Soon interval and
  page/build reviews. Asked whether the owner already has Steamworks enrollment;
  no answer received in this turn. Publisher/legal identity, working support,
  rights review, commercial model/price and final platform acceptance remain open.
- No Steam login, agreement, bank/tax submission, fee, AppID, upload, publication,
  deployment, live charge or restart. No store acceptance or revenue claimed.
- Final actual-repository checks pass: seven desktop tests, identical validated
  Mac/Windows ASAR payloads, existing 102 web tests, TypeScript and the unchanged
  17-file public build. The loopback desktop preview was stopped. Desktop outputs
  and dependencies are ignored, and the clone's push URL remains disabled.

## 2026-09-10: Epic Games Store Added To Desktop Release Plan

- Owner also requested the "Unreal store," interpreted as Epic Games Store for
  finished-game distribution, not Fab/source-asset licensing. Extended the
  desktop README and shared store-copy draft; added desktop/EPIC_RELEASE.md.
- Keep one Three.js/Electron desktop codebase and a non-exclusive Steam + Epic
  plan. No Unreal migration, new SDK, duplicate binary or save-profile change.
- Checked Epic's official engine-agnostic policy, separate recoupable $100 fee,
  current revenue share, cross-PC-store multiplayer and achievement requirements.
  Documented the Epic First Run exclusivity conflict instead of enrolling.
- Detailed developer-doc responses were partly unavailable/rate-limited. Final
  portal artifact/upload configuration remains an explicit verification gate.
- Docs only; existing package hashes are revalidated separately. Prior Mac
  standalone runtime acceptance does not establish Epic Launcher acceptance;
  Windows device QA and both store integrations remain pending.
- No Epic login, organization/product creation, agreement, payout/tax submission,
  fee, upload, review request, public listing, deployment or restart occurred.

## 2026-09-10: Genuine Steam/Epic Screenshot Candidates

- Captured the actual packaged Mac desktop game using normal course selection,
  aiming and Fire controls, in disposable local profiles. Five selected PNGs
  span five authored holes; 21 source frames across seven holes are preserved.
- All images are unretouched 1920x1080 with the original HUD. Native macOS window
  size was display-clamped, so Playwright set a 1920x1080 renderer viewport at
  DPR 1; no post-capture resizing, score/position injection or compositing.
- Saved a private review gallery, shortlist manifest, reproduction/verification
  scripts and timestamped source/input/state/image-hash receipts under desktop/.
  The existing vertical first-shot promo was not overwritten.
- Verified both capture receipts, all 21 PNG hashes/dimensions and their match
  to game archive 6a0426f6e4648ad9264719e9594955234773c81238ad72dc594104b82b13c9ee.
  Seven real first shots were observed in flight; completion was not claimed.
  No observed page/console errors or external renderer requests in either run.
- Visual QA found square colored wormhole glow quads on Holes 8 and 10. Kept
  those images as diagnostics but excluded them from the shortlist. The current
  glow SpriteMaterial has no alpha texture, a likely cause not yet fixed/tested.
- Checked Valve's requirement for five genuine gameplay screenshots, minimum
  1920x1080 at 16:9. Epic portal acceptance and both stores' publication remain
  unverified. Private dimensions/hash checks are not store acceptance.
- No gameplay/render source, website, saved commerce setting, original checkout,
  storefront account or live deployment was changed. No payment, upload, public
  post, listing, fee, restart or independent-customer revenue was established.

## 2026-09-10: Portal Glow Corrected In Isolated Release Candidate

- Previous goal turn was progress: the saved screenshot set exposed a concrete
  visual flaw affecting portal-focused store promotion. Fixed that flaw rather
  than retouching it out of marketing images.
- Added one lazy shared 64x64 white radial alpha texture to the portal sprite
  material and disabled its depth writes. No extra meshes or draw passes, no
  per-frame canvas generation or texture updates. Course/physics/teleport code
  and animation loop are unchanged. No new dependency or downloaded art asset.
- Two focused tests use actual pinned Three.js materials to verify lazy/shared
  allocation, alpha-gradient setup, material cleanup and reuse across level
  changes. Nine desktop tests and all 102 web tests/type checks/build pass.
- Standard game-client Hole 8 screenshot was inspected: square backgrounds
  are gone. Rebuilt Mac and Windows prototypes share verified game archive
  fa0993ca459de311dce5364161480b366d4445787351f85461ed1b1ccf77fd49.
- New source HTML hash:
  3ea77ad782f6145d5ba3423914c8450f54a327672045dbef0f586af1abf4a00a.
  Native packaged Mac smoke checks passed again, including real shot, audio
  state, fullscreen, level selection, notices and persistence. Windows execution
  and measured performance parity are still unverified.
- Refreshed the private screenshot set as revision 2: 21 newly captured PNGs,
  five shortlisted images, current build/input/state receipts. Portal frames on
  Holes 8 and 10 show soft glows without square backgrounds. Revision 1 retains
  its unchanged image/receipt bytes with an archived banner linking to revision 2.
- The temporary loopback preview and all capture/test processes were stopped;
  temporary native profiles were removed. No game server was left running.
- Live site, original checkout, payment configuration and storefront accounts
  remain untouched. No purchase, upload, public release, restart or verified
  independent-customer revenue. Publisher/fees/rights/platform gates remain.

## 2026-09-10: Course QA And Assisted-Aim Power Correction

- Previous goal turn confirmed the storefront plan without moving release
  state. Resumed the incomplete course QA in the isolated clone instead of
  repeating account-status questions or claiming revenue.
- Historical portal-glow archive fa0993ca... completed Holes 1-12 continuously
  (43 strokes). The six-shot cap on Hole 13 was not a proven game failure:
  a separate normal course-picker run completed it in 12 assisted shots.
- Source review found a real input bug: snap-to-optimal wrote positive launch
  azimuth into a slingshot slider whose reader negates it. A power-only change
  could mirror heading. Three source-function regression cases failed before
  the fix (59.07, 115.86 and 38.25 degrees) and passed after negating the stored
  azimuth. Exactly one source line changed; reversing it reproduces the prior
  complete HTML hash. No course, physics, render loop or difficulty changes.
- Native visible-power-bar input reproduced the bug on Hole 1 (47.5 combined
  route deviation). The new build passes Holes 1,5,8 with 0.6,1.0,0.8 deviation
  after one-point power changes; all adjusted shots fire. This metric includes
  power and slider rounding, not only angle. Screenshots visually inspected.
- Rebuilt Mac and Windows archives are identical and verify all 24 public
  assets: 80eadf449ac29cd0ca4440e5ca9731127b8f7fa42ce99ef93ffe77969c45d709.
  New HTML: 233c7c610e79964e2857ff501a6bddfba98eaa24c3af8075f74b3d8de91bf3d9.
  All 12 desktop tests, 102 web tests, type checks and the local web build pass.
- Current-build native smoke also passes trainer, shot, Hole 9, Daily, native
  fullscreen, notices, local persistence and MP3 state. No observed script
  errors or external renderer requests. Windows runtime QA remains unverified.
- Current-build segment completed Holes 14-16 in 3,3,2 shots. Hole 17 reached
  its 12-shot cap, landing repeatedly on a moving obstacle without a crash or
  45-second timeout. Holes 18-19/final scorecard/replay were not reached.
  Follow up with real manual/boost strategy on Hole 17, not eased physics or
  injected wins, then finish whole-course and continuous-round testing.
- Added reproducible course and native aim tests. Two setup-selector mistakes
  in early harness attempts were corrected before successful evidence was
  recorded. Preserved per-run input/state/hash receipts in desktop output.
- Existing screenshot galleries retain original image/receipt bytes. Revision
  2 is now labeled as predating the control fix; exact-build verification rejects
  it as expected. Recapture final store assets before upload, not on every
  intermediate code change. Rights, publisher setup, fees and approvals remain.
- No live website/original checkout/payment configuration changes, store
  enrollment, fee, upload, publication, computer restart or verified revenue.
- The standard browser-game client also loaded playable Hole 8 from the current
  payload; screenshot/state inspected, no client error artifact. All local
  native test processes and the temporary loopback preview were stopped after
  terminal results; disposable profiles were removed by the test harnesses.

## 2026-09-10: Final-Hole Recovery And Accurate Round Summaries

- Previous goal turn was progress: a verified manual-aim correction. This turn
  continued the release QA without redefining success as tests or publication
  preparation; no independent-customer revenue is verified.
- Normal Space-held boost recovery completed Hole 17 in three shots on the
  prior aim-control build. Hole 18 completed in three and Hole 19 in five in
  another segment. This was normal UI play, not injected scores or positions.
- Two early boost-test assertions were invalid: they checked charges after a
  hold without accounting for gravity-graze recharge. Read-only event diagnostics
  proved one charge spent (6 to 5), then legitimately restored (back to 6).
  The corrected harness checks activation at the event and records later awards.
- Actual final-screen QA exposed unplayed-hole par credit: 8 strokes on the two
  par-6 final holes appeared as -79 by subtracting the full course's par of 87.
  Updated only showGameComplete() to count played-hole par and use ROUND SUMMARY
  plus a played count for partial runs. Full/free/Daily completion is preserved.
- Five actual-source-function regressions cover partial/full/free/Daily/empty
  summaries; three failed before the fix, all pass now. All 17 desktop tests,
  102 web tests, type checks and local web build pass. No physics, course,
  controls, renderer, animation loop or dependency changes in this turn.
- Rebuilt and verified the same 24-asset Mac/Windows archive:
  1f5bc92bcdb81a9e8913b75f203cfd801440c11d258d1eeabe3822c80719ae04.
  HTML: b56f1ef4c02dca125b97f6dfc728f8750da6feffb9dd9f8c1148d44675518cf5.
- Current-build segment completed Holes 17/18 in 4/2 shots, then stopped after
  a 45-second live orbit on Hole 19. A separate direct final-hole run, explicitly
  configured for a 90-second settling window, completed in five shots; none
  took more than 24.9 seconds in that run. Preserve both scoped results.
- Native final summary now correctly shows 5 strokes, par 6, difference -1,
  ROUND SUMMARY and 1/19 holes played. Desktop/narrow screenshots inspected,
  no horizontal overflow. Replay resets Hole 1 and total/strokes to zero.
  This is not a continuous 19-hole round or Windows/mobile-device acceptance.
- Native smoke passes again: trainer, actual shot, Hole 9, Daily, fullscreen,
  notices, local persistence and real MP3 state. Standard web-game client loaded
  playable Hole 8; screenshot/state inspected. No observed script errors or
  external renderer requests in the passing native runs.
- Saved reports, normal inputs, screenshots, archive hashes and the final
  harness source under desktop/output/playwright/recovery-2026-09-10. Earlier
  assertion/timeout reports stay identified, not relabeled as passes.
- Next release work: continuous current-build round and timing/balance QA;
  verify existing publisher status read-only, then stop before enrollment,
  agreements, tax/bank details, fees or submission without owner approval.
  Windows hardware, rights, store setup, final assets and publication are open.
- Local native test processes and the loopback preview reached terminal states
  and were stopped; disposable profiles were removed. Live site, original
  checkout, saved payments and store accounts remain untouched. No fee, upload,
  public release, computer restart or verified revenue.

## 2026-09-10: Continuous Desktop Course Acceptance

- Previous goal turn was progress: a read-only publisher-access check established
  specific sign-in gates. Both existing portal tabs still showed Sign in in this
  turn. Publisher enrollment/identity, fees and app IDs are unverified, not proven
  absent. No login, account creation, agreements, fees or submissions attempted.
- Verified unchanged source HTML b56f1ef4... and both 24-asset archives 1f5bc92b...
  before testing. The disabled push remote and isolated dirty worktree remain.
- First continuous run completed Holes 1-15, then stopped at the same 12-shot
  limit on Hole 16. Boosting after every obstacle landing sent the ball between
  hazards. All shots settled; no script errors/external renderer requests were
  observed. Preserve this failure, including the 54.548-second Hole 4 shot.
- Added only a QA strategy argument: comma-separated holes where normal boost
  may be used. Default behavior remains unchanged. Invalid/duplicate/out-of-scope
  values fail before launch; 12 actual-source option-validation cases passed.
  No game, physics, difficulty, assets, packages or live code were changed.
- A second full run used boost only on Holes 13,17,18,19, still at 1500ms holds,
  12 shots per hole and a 90-second settling limit. It completed all 19 holes in
  one uninterrupted round using normal UI and a disposable profile, with no
  injected gameplay state. Hole 16 completed in two unboosted shots.
- Scores were 1,2,2,4,3,2,3,2,9,4,8,8,3,5,4,2,3,3,6. Final UI correctly showed
  COURSE COMPLETE, all 19 rows, 74 strokes against par 87, difference -13.
  No native upsell appeared; replay reset Hole 1, strokes and total to zero.
  Desktop/narrow screenshots inspected; no horizontal overflow. No observed
  script errors or external renderer requests. Longest shot: 30.204 seconds.
- The passing run took 16m18s including QA transitions/screenshots/replay, not
  a performance or player-duration benchmark. Both runs and their exact harness
  sources are retained under desktop/output/playwright/continuous-2026-09-10/.
- Both test processes exited and their disposable profiles were cleaned up.
  The current continuous Mac smoke gap is closed; this does not close human
  timing/balance, Windows/hardware, final storefront assets, publisher, support,
  rights, fee or approval gates. Next commercial step remains owner sign-in to
  Steamworks and Epic, then read-only identity/enrollment verification.
- Live site, original checkout and saved commerce remain untouched. No payment,
  upload, public post, store release, computer restart or verified revenue.

## 2026-09-10: Current-Build Store Screenshot Candidates

- Previous goal turn was progress: the continuous 19-hole Mac test passed.
  The next artifact check failed for a valid reason: revision 2 belonged to the
  older portal-glow archive, not the currently tested round-summary build.
- Captured revision 3 from the unchanged current package: 21 original 1920x1080
  frames across seven authored holes, with normal course-picker/aim/Fire input,
  a disposable profile and the original HUD. No retouching, generated imagery,
  overlays, post-capture scaling or gameplay/camera/DOM state injection.
- Selected five images showing First Contact aiming, Twin Suns, The Slingshot
  in flight, Gravity Well aiming and Over the Moon in flight. Viewed all five
  directly, plus supplemental Hole 8/10 portal views. Wide-shot legibility on
  actual target displays remains a human-review item.
- The current verifier now targets revision 3 and passes: all 21 hashes and
  dimensions, five selected originals, both receipts and exact current archive
  match. The capture default now points to capture-main/ rather than depositing
  receipts at the gallery root. Explicit fresh output arguments remain supported.
  Original capture script used for these runs is preserved beside the receipts.
- Rechecked Valve's official screenshot requirements: five gameplay images,
  minimum 1920x1080, 16:9, no added marketing copy. No suitability flags, publisher
  fields or other store settings were changed. Epic portal acceptance is unverified.
- Browser policy blocked opening the local HTML review page. Did not bypass it.
  Static checks verified image order, local file references and no scripts;
  screenshot PNGs were visually inspected, but gallery layout was not browser-QA'd.
- New private review and provenance are under desktop/output/playwright/
  storefront-2026-09-10-r3/. Revisions 1/2 remain unchanged historical artifacts.
  No game source, packages, dependencies, live site, original checkout, payments,
  uploads, posts, listings, computer restart or verified revenue changed.
- Both capture processes exited normally and disposable profiles were removed.
  Next commercial work remains publisher access/approval, rights/support gates,
  Windows/hardware acceptance and final store artwork/trailer. Do not recapture
  this set again unless the build changes or human review calls for new views.

## 2026-09-11: Private Store Key Art

- Previous turn restored Steamworks/Epic sign-in handoffs after the Mac became
  accessible. This turn rechecked the actual tabs: both still show sign-in forms.
  Preserved both tabs; no account/enrollment/payment status inferred from them.
- Completed a missing store asset set instead of repeating the finished course
  test or gameplay screenshot captures. Eight native-size Steam PNG exports and
  matching editable, self-contained SVG masters are in
  marketing/store-art-2026-09-11/. Library header reuses the store header art.
- Artwork uses original AI-assisted procedural planetary illustration and the
  game's licensed Orbitron 900 font converted to paths. It is clearly separated
  from genuine gameplay screenshots. Title-only capsules, a text-free library
  hero, and a transparent library logo; no dates, prices, badges or feature claims.
- Rechecked Valve's official store/library dimensions. Independently verified
  expected sizes, all source/export hashes, outline-only title content, no
  external image/script links, opaque backgrounds and unclipped transparent logo.
  Two fresh renders produced identical source and PNG hashes for all eight files.
- Directly inspected the final contact sheet and actual 120x45/184x69 small
  capsule reductions. Title is legible at both sizes. Owner visual review and
  actual Steam library crop/logo placement remain pending; no portal acceptance.
- Temporary art tooling only: fontkit 2.0.4 and wawoff2 2.0.1 installed under
  /tmp; bundled sharp 0.35.4 used. The first Fontkit variable-WOFF2 attempts
  failed; decompression to TTF before outlining resolved the issue. The final
  renderer and verifier are retained; no game dependency changes.
- Original soundtrack/name/IP, publisher authority, support, AI disclosures,
  Windows/hardware QA and final gameplay trailer remain release gates. Epic
  field-specific artwork should follow the authenticated product portal, not
  an assumption that Steam dimensions apply there.
- No live game, original checkout, game source or packages changed. No purchase,
  upload, public post, account creation, listing, computer restart or verified
  independent-customer revenue occurred. Sign-in remains the next publisher step.

## 2026-09-11: Private Desktop Gameplay Trailer

- Previous goal turn was progress: eight editable store-art exports were saved
  and verified. This turn completed the remaining initial gameplay-video draft,
  rather than rerunning the completed course test or screenshot set.
- Recorded normal course-picker, mouse aim and Fire input from the unchanged
  packaged Mac app on Holes 1, 6 and 11, with disposable profiles and original
  HUD. Each take has one real Fire and observed flight. Hole 1 reached an actual
  one-stroke completion; neither of the other takes is presented as completed.
- Native capture source remains ASAR 1f5bc92bcdb81a9e8913b75f203cfd801440c11d258d1eeabe3822c80719ae04
  and source HTML b56f1ef4c02dca125b97f6dfc728f8750da6feffb9dd9f8c1148d44675518cf5.
  No observed page/console errors or external renderer requests. All capture
  processes exited and profiles were removed. No desktop/microphone capture.
- Saved a 30s private 1920x1080 H.264/AAC trailer: 27s of selected real gameplay,
  visible local-build/assisted-aim label, then a 3s gold title/WIP end card.
  Hard cuts only; no speed changes or generated gameplay. Raw video is silent
  25fps VP8, conformed to 30fps through duplicate frames, not frame interpolation
  or proof of 30fps game performance. No post-capture spatial upscaling.
- Existing soundtrack's first 30s is an editorial music bed with normalization
  and edge fades, not captured gameplay audio/SFX. Measured final AAC at -18.9
  LUFS integrated and -4.9 dBFS true peak; full human playback/listening and
  soundtrack rights/assignment clearance remain open.
- Directly reviewed three raw contact sheets, final contact sheet, opening
  frame and cut/title boundary frames. Independent verifier confirms current
  source/archive/music pins, raw/output hashes, actual one-shot receipts,
  900 frames, 30s, 1920x1080 H.264 at about 7.95Mbps, 48kHz stereo AAC, fast-start
  MP4 and full decode. Valve's official trailer guidance rechecked; no store
  upload or acceptance. Export bitrate does not improve the lower-rate source.
- New private artifact and reproducible scripts/receipts are in
  marketing/desktop-trailer-2026-09-11/. Final MP4 SHA-256:
  1c946515a809e52f3881a61dd31a53f1134067540fe9c5fedfa7415f51e04bb0.
- New performance follow-up: Twin Suns aim click to first aiming-state receipt
  was about four seconds during recording. Determine whether the aim solver or
  capture overhead is responsible without video recording before changing code
  or setting requirements. The montage omits most setup and is not a benchmark.
- Steamworks and Epic were rechecked and still show sign-in forms; kept both
  tabs for owner handoff. No account/enrollment/fee status inferred. No payments,
  uploads, listings, posts, live deployments, restart or verified customer revenue.
- Next: owner watch/listen/visual review and publisher sign-in; investigate the
  captured aim latency, then complete Windows/hardware and rights/support gates.
  Do not label this draft final or upload it without explicit approval.

## 2026-09-11: Nonblocking Aim-Worker Candidate

- Measured the captured aim delay without video: the original packaged build
  blocked the main thread for 140/997/3998 ms on Holes 1/6/11. Baseline receipts
  retained. This is a real synchronous solver pause, not only recording overhead.
- Kept the canonical solver/simulation block byte-identical and generated a
  same-origin module worker from it at web/desktop build time. No search quality,
  timesteps, scoring, power constants or physics formulas were reduced.
- Added cancellation and stale-world guards for new requests, manual input,
  Fire, Cancel, Reset and level changes; failure/timeout restores manual control.
  Stale errors from a terminated worker cannot cancel its replacement request.
- Corrected an initial assumption: several planets actually move their physics
  positions. The worker planning interval holds ball/planet physics, as the old
  synchronous solver did, but keeps rendering/input/visual effects active. The
  orbital clock excludes planning time; the hole timer does not pause.
- Native normal-input checks pass: Cancel while computing (46 ms), visible
  power-bar adjustment retained without late overwrite, Reset, Fire while
  computing, and an actual worker-assisted Hole 1 hole-in-one. Screens inspected.
- 30 desktop unit tests and 102 root fixture unit tests pass; typecheck and
  diff whitespace checks pass. Solver parity covers launch/power/all trajectory
  points on authored Holes 1/6/11. No production account/provider calls or purchases.
- Standard browser-game client passed original picker, course selection and
  assisted aim against the generated offline payload on loopback. Inspected
  screenshots and text states; no recorded browser console errors. This is not
  new acceptance of the remote-CDN web worker or mobile wrapper paths.
- Packaged Mac candidate frame gaps on Holes 1/6/11: 17.6/17.7/17.6 ms, with no
  observed long main-thread tasks. Assist waits: 156.5/991.2/1471.8 ms. Moving
  scene snapshots vary; these are diagnostic Mac samples, not a general speedup
  ratio, sustained-FPS benchmark or target hardware certification.
- New source SHA: 28fa9b52e6c046715c4b8ddbe7106d31054525bd300d66f8b2d20d6d7adb2e01.
  New candidate ASAR SHA: dd0753e970b79ea92998563d17c1b42e3ae1e91b7584313f5a4cda67bf3a4ffd.
  All 25 bundled asset hashes checked inside ASAR. No runtime dependency changes.
- Candidate kept separately in desktop/out/aim-worker-2026-09-11/; prior Mac and
  Windows packages remain unchanged at their original paths. Current source/app
  differs from that older build. Prior 19-hole acceptance and media receipts
  remain historical and must not be relabeled for this candidate.
- Retained early development Hole 6 timeout without claiming a known cause;
  subsequent instrumented and packaged three-hole runs passed. Retained initial
  controls-test failure on a hidden internal slider; actual visible-power-bar
  test passed. See desktop/AIM_WORKER_QA.md and output/playwright/aim-worker-2026-09-11/.
- Standalone file:// previews keep the old blocking fallback. HTTP web previews
  must serve built dist/ with its generated worker, not raw repo HTML. New
  full-course/moving-planet, Windows/hardware and store-client acceptance remain.
- Rechecked Steamworks and Epic: both still show sign-in forms; no enrollment or
  fee status inferred. No fee, agreement, upload, publication, live deployment,
  original-checkout edit, restart or verified independent-customer revenue.
- Next commercial step remains owner publisher sign-in and review/approval.
  Preserve existing rights, support, tax/bank, pricing and launch-clearance gates.

## 2026-09-11: Candidate Continuous Course And Windows Package

- Previous goal turn was progress: it saved a tested nonblocking aim-worker
  candidate. This turn closed its remaining continuous Mac course-smoke gap,
  rather than repeating start-position timing checks or recapturing store media.
- Rechecked current checkout, source and package pins before running. Updated
  the course harness to accept an explicit package directory, verify its source
  manifest and all packaged asset hashes, retain its exact source, and record
  aim wait times. Selected the candidate, not the retained earlier prototype.
- A normal-input native run completed all 19 holes continuously: scores
  1,2,2,4,2,3,2,2,5,4,4,10,2,3,3,2,3,4,4. Final screen showed COURSE COMPLETE,
  62 strokes, par 87, difference -25, with all 19 rows matching real shot records.
- Tested 62 aim/Fire sequences, 32 obstacle departures, including 27 launches
  from large orbiting obstacles across Holes 8-19. Seven 1500 ms Space-held
  boosts were used only on Holes 13,17,18,19; activation and immediate charge
  spending were verified. No game/physics/score/camera state was injected.
- Kept limits at 12 shots per hole and 90 seconds per shot. All shots settled;
  maximum shot duration was 23.038s. Hole 12 used ten attempts. These bounds and
  one successful route do not establish human difficulty balance or all routes.
- Every aim request completed; longest wait was 3.666s, not a frame-stall
  measurement. No observed script errors or external renderer requests.
  Run time was about 12m30s including QA overhead, not a gameplay benchmark.
- Inspected representative completion screenshots and both final scorecards.
  At 390x844 all rows and replay/home controls are visible, with 375px panel and
  scroll widths and no page overflow. Play Again reset Hole 1 strokes and total
  to zero. Native process exited normally and disposable profile was removed.
- Independent receipt checks match all 62 Fire inputs to strokes, the ordered
  19 holes and scorecard, source/archive/harness/asset hashes, and dimensions and
  hashes of 21 PNGs. Evidence is in
  desktop/output/playwright/continuous-aim-worker-2026-09-11/run-1/.
  Report SHA: 661fac9d67bf721160f5336e88cdc1349f50b5ba613046bbcf6304c66db859bc.
- Also packaged a separate unsigned Windows x64 candidate with the identical
  dd0753e970b79ea92998563d17c1b42e3ae1e91b7584313f5a4cda67bf3a4ffd ASAR.
  Confirmed PE32+ x86-64 executable format and saved its hashes/config receipt.
  Windows has NOT been executed, signed, store-installed or approved for release.
  The complete folder is under desktop/out/aim-worker-2026-09-11/.
- Game source remains 28fa9b52e6c046715c4b8ddbe7106d31054525bd300d66f8b2d20d6d7adb2e01;
  candidate Mac ASAR remains dd0753... and both earlier package ASARs remain
  1f5bc92b.... Only QA tooling, records, documentation and the new Windows
  candidate changed. No game-source or production changes this turn.
- Steamworks and Epic still show sign-in forms after fresh checks; preserved
  owner handoff tabs. No enrollment or fee status inferred. Publisher access,
  owner play/listen/review, Windows/hardware QA, name/rights/support decisions,
  tax/bank/pricing and exact fee/submission/publication approval remain open.
- No payment, agreement, upload, public marketing, site deployment, original
  checkout edit, restart or verified independent-customer revenue occurred.

## 2026-09-11: Owner-Input Blocked Audit

- Previous goal turn was progress: current-build continuous Mac acceptance and
  a matching Windows candidate were completed. Rechecked the saved report hash,
  19-hole result, replay reset and matching Windows/Mac archive evidence. No
  completed tests or native packages were rerun/rebuilt in this audit.
- Steamworks and Epic were freshly inspected again. Both remain at sign-in
  forms, and both tabs were retained for owner handoff. The same publisher-access
  blocker was present in the aim-worker turn, the continuous-course/Windows
  turn, and this audit: at least three consecutive goal turns. Those earlier
  turns made meaningful safe preparation progress despite the access gate.
- All test/build handles from those turns ended normally; there is no live
  pending job to treat as a verified wait. Usual system/user Applications
  directories exposed no Windows virtualization app; no usable Windows test
  target was established. This is not an exhaustive inventory of external PCs.
- Reviewed the current revenue, Epic and launch/rights records. Publisher
  access/authority, human media/gameplay review, Windows/device acceptance,
  confirmed support/operating facts and exact paid/public actions remain owner
  or external gates. Existing private drafts and local test success do not
  authorize deployment, account changes, fees, contracts, uploads or promotion.
- Corrected Epic's stale candidate paths/hash to the September 11 matching
  builds without refreshing or claiming a new policy/legal review. Added
  desktop/OWNER_NEXT_STEPS.md with the precise sign-in handoff, prepared assets
  and remaining decisions. No additional placeholder policies or repetitive
  technical work should substitute for resolving the owner gates.
- Automatic pursuit is now at an owner-input impasse. Mark the persistent goal
  blocked after this audit, not complete. Resume on publisher sign-in or another
  concrete owner-approved gate. No verified new customer revenue, publication,
  payment, live edit, original-checkout change or computer restart occurred.

## 2026-09-13: Authenticated Epic Review And Updated Owner Handoff

- Previous resumed goal turn was progress: the owner signed into Epic, and a
  read-only portal check verified GlitchP / Advanced Architects with 0 products.
  This changed the next action from Epic sign-in to publisher-organization
  confirmation. It did not establish the legal publisher, fee history, rights
  clearance, or permission to create or publish a product.
- The owner also requested Steam account creation. Its registration page still
  has blank email fields and unchecked CAPTCHA/agreement controls. The requested
  email has not been supplied. New-password entry and submission are owner-only;
  terms and CAPTCHA require action-time confirmation or owner completion.
- Rechecked both retained setup tabs in this continuation. Epic remains signed
  in under Advanced Architects. No publisher choice or Steam email has arrived.
  The portal navigation link had no rendered layout and was not followed; no
  inventory of other organizations or new product creation is claimed.
- Updated desktop/OWNER_NEXT_STEPS.md to remove the stale Epic sign-in gate and
  preserve the exact remaining decisions. Existing September 11 package/QA/media
  evidence is retained with its date, not rerun or claimed newly verified.
- The goal remains active and not achieved. This is the second resumed goal
  turn; no three-turn blocked threshold is claimed here. No pending process was
  polled, and these browser reads are not a verified wait.
- No account, organization, product, payment, contract, upload, public profile
  change, deployment, live-game edit, or independent-customer revenue occurred
  through this continuation. No credentials or private financial records were
  copied into the repository.

## 2026-09-13: Third Resumed Owner-Input Audit

- Previous goal turn was limited progress: the saved handoff was corrected to
  reflect authenticated Epic access and remove its stale sign-in instruction.
  No revenue, store enrollment, account creation or verified process wait was
  established by that documentation change.
- Rechecked the current isolated worktree and both account tabs. Steam still
  shows blank email fields and unchecked CAPTCHA/agreement controls. Epic is
  authenticated as GlitchP and the Advanced Architects dashboard has 0 products.
- Followed the previously observed Portal URL, which returned to the selected
  dashboard. Opened the visible organization navigation and its "Choose your
  organization" dialog. Only Advanced Architects was listed; no Epoch6
  organization was visible. Cancelled the dialog without changing the selected
  organization. This resolves the prior incomplete organization inventory, not
  the legal-publisher choice or authorization to create another organization.
- Publisher choice and Steam registration email were requested in the first
  resumed turn and remain unanswered in the second and third turns. The same
  owner-input blocker has now recurred for three consecutive resumed turns.
  Mark the existing goal blocked, not complete; resume on those inputs or a
  different concrete owner-authorized release gate.
- No additional test, build, marketing artifact or placeholder policy was
  generated to substitute for these decisions. No live job is being awaited.
  Both setup tabs are retained. No fee, agreement, account/product creation,
  upload, public change, deployment or verified customer revenue occurred.

## 2026-09-13: Steam Email Verified, Existing Account Found

- The preceding goal turn completed the Epic organization inventory and saved
  its owner-input handoff, then marked the goal blocked. A new continuation
  returned the goal to active; this is the first turn of a fresh resumed audit,
  not a fourth blocked turn. No goal completion or new blocked status is claimed.
- Fresh browser inspection found that Steam had advanced externally from blank
  registration fields to "Verify Your Email" for an owner-entered address. The
  old email-input blocker was therefore no longer current.
- Used a narrow recent Steam-email search in the matching Gmail account. Read
  only the relevant "New Steam Account Email Verification" message; sender
  DKIM, SPF and DMARC passed. Opened that message in a separate temporary tab
  and followed its verified official Steam email-confirmation link, as part of
  the requested non-binding account setup. Steam displayed "EMAIL VERIFIED".
- Returning to the original registration tab exposed "EMAIL IN USE": the
  verified address already belongs to another Steam account. Steam offers
  existing-account use, recovery, or a separate new account. No option was
  selected. Ask the owner before creating a duplicate; existing Steamworks
  enrollment, account identity and fee history are not established by this page.
- Epic remains signed in as GlitchP / Advanced Architects with 0 products.
  Its publisher-organization choice is still unresolved. Updated the handoff
  to replace the stale blank-email gate with the actual Steam account choice.
- No password was entered or changed, no CAPTCHA solved, and no binding terms
  accepted by the agent. No fee, new account/product, upload, public change,
  deployment or new independent-customer revenue was verified. Verification
  tokens, the email body and private contact details were not saved in the repo.

## 2026-09-14: Steam Store Signed In; Steamworks Login Still Needed

- The earlier resumed audit repeatedly found a blank Steamworks password and
  no running job to await. Before the planned blocked-status update, the owner
  reported new progress. Fresh UI inspection now verifies Steam Store sign-in
  as GlitchP; the earlier general Steam-login blocker is no longer accurate.
- Refreshed the retained Steamworks tab after Store login and selected its
  normal Sign in action. Steamworks still requires a separate login. Filled
  the established existing account name, left the password blank and Remember
  me unchecked, and retained the tab for owner sign-in. No duplicate account
  was created. Publisher enrollment and fee history remain unverified.
- Recovery verification previously reached the Remove Steam Guard Mobile
  Authenticator confirmation. The agent did not submit removal or change a
  password, and did not repeat the action after an unconfirmed owner update.
  The now-authenticated Store session does not prove any particular security
  setting changed. Recovery tokens and private contact details are not saved.
- Epic's September 14 session had expired; its normal sign-in route led to a
  blank login form. September 13's GlitchP / Advanced Architects / 0 products
  evidence is historical. Re-login and the legal-publisher decision remain.
- Updated the owner handoff to distinguish Store login from Steamworks access.
  No fee, agreement, new account/product, upload, publication, deployment or
  new independent-customer revenue was verified. The sales goal is not complete;
  fresh owner progress supersedes the earlier planned blocked-status update.

## 2026-09-15: Steamworks Signed In; Legal Publisher Form Reached

- The preceding goal turn found no progress through login and marked the goal
  blocked after the repeated owner-input gate. On this resumed turn, fresh UI
  inspection instead showed an authenticated Steamworks dashboard greeting
  crazyflashpie. The login blocker is resolved; do not reuse its audit count.
- The dashboard offered new-partner signup. Selected the developer/publisher
  route, read the introduction, and continued only to Legal Name & Address.
  All entity and contact fields remain untouched. No existing publisher
  workspace, completed enrollment or fee history was established.
- Asked the owner to confirm whether Epoch6 LLC is the intended publisher,
  has the rights to publish Gravity Golf and has a business bank account in
  its exact legal name. The current Steam form and public onboarding FAQ
  require a rights-owning/authorized entity and matching legal/bank/tax
  records. Formation alone is not publishing-rights evidence. Sensitive
  contact, banking and tax data have not been copied into the repository.
- Retained the legal-information form for owner input and updated the handoff
  to remove the stale Steamworks-login request. SDK terms, NDA, distribution
  agreement, fee and payment/tax submission remain separate approval gates.
- No agreement accepted, fee paid, product created, file uploaded, public
  change, deployment or new independent-customer revenue was verified. The
  broad sales goal remains incomplete; this turn made enrollment progress.

## 2026-09-15: Owner Entered Personal Publisher Details And Reached SDA

- The prior turn observed the owner actively entering personal-name / sole
  proprietorship details instead of the previously discussed LLC. Asked whether
  that choice was intentional; did not overwrite entries. Private address and
  contact values are not recorded here.
- Current UI now shows the Steam Distribution Agreement. At inspection, its
  agreement-acceptance and third-party-payment declarations were checked, while
  the distribution-rights declaration remained unchecked. All were owner-side
  changes; the agent neither toggled controls nor clicked Continue.
- Asked the owner to review and complete the rights declaration themselves only
  if accurate. No rights certification, SDA submission or acceptance by Valve
  is inferred from partially checked controls. Reaching SDA is not independent
  proof of all prior agreement actions. No contract text is stored here.
- Updated and retained the handoff at the actual agreement step. The prior
  blank-form blocker is obsolete; user activity changed the next action. No
  fee paid, completed enrollment, product creation, upload, public change or
  new independent-customer revenue was verified by this turn.

## 2026-09-15: Owner Paid Steam Fee; Possible BLD Continuation

- The owner reported done at checkout. The live Steam receipt displayed a
  successful $100.00 purchase for the current account. Followed only its
  Return to Steamworks Continue link; no payment was made by the agent.
- The returned portal is at Enter Payment & Tax Info under the personal
  publisher name. Bank information is required and no tax information is on
  file. Account completion remains gated. Do not repay the enrollment fee or
  infer developer revenue from this expense. Receipt identifiers and private
  financial/contact details are not saved in project records.
- The owner mentioned possibly continuing on BLD. Current project discovery
  exposed local projects only. BLD's host/OS/path is unverified; no machine,
  repository, session or credentials were transferred or restarted.
- Prepared a MAC-local BLD handoff identifying the isolated dirty worktree,
  exact source/candidate hashes, verification limits, payment checkpoint and
  transfer exclusions. GitHub alone lacks the uncommitted work. Root source
  SHA and both candidate ASAR hashes still match the September 11 pins.
- Updated the owner handoff. No complete store enrollment, released listing,
  code deployment, public marketing or new independent-customer revenue was
  verified. Private bank/tax completion and publisher identity remain owner
  responsibilities; the broad sales goal remains incomplete.

## 2026-09-15: Portable Npm Commands For BLD Preparation

- Found a concrete source-transfer blocker: root and desktop npm scripts used
  POSIX-only `$npm_node_execpath` shell expansion. Replaced it with a shared
  `scripts/run-node.cjs` launcher that reads npm's invoking runtime in JavaScript
  and spawns it directly with argument boundaries and failure status preserved.
  Test globs are quoted so Node, rather than the host shell, expands them.
- Preserved the earlier ancestor-PATH safeguard. The actual ancestor Node is
  v20.2.0; launching the new wrapper through that binary with npm's Node path
  selected v22.17.0. No system Node, shell configuration or dependency changed.
- Added seven regression tests for runtime selection, argument/cwd preservation,
  direct invocation, child failure, missing runtime, empty invocation and npm
  script wiring. The staged launcher tests passed before copy-back.
- In the isolated checkout, the first root test run passed 108 tests but the
  public-build fixture hit the filesystem sandbox while replacing generated
  `dist/` files. The scoped approved `npm run check` then passed TypeScript,
  all 109 root tests and the public allowlist build. Desktop `npm test` passed
  all 30 tests through the new launcher, including Node-expanded test globs.
- Updated desktop build guidance and the MAC-local BLD handoff. No game source,
  native app payload or retained package was changed. Rechecked source and both
  selected ASAR hashes against the prior checkpoint. No new visual/gameplay QA
  or Windows execution is claimed for this command-only change.
- Windows runtime harnesses still contain Mac-specific paths. BLD host access,
  OS and transfer destination are unverified; no transfer or restart occurred.
  Steam banking approval remains unanswered after the preceding live check.
  No banking/tax submission, deployment, store release or independent-customer
  revenue occurred. The money-making objective remains incomplete.
