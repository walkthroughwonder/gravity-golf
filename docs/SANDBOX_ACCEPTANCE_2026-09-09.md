# Gravity Golf Sandbox Acceptance: Partial

No production deployment, real charge, public post, or independent revenue.
This report records actual provider integration results, not a release sign-off.

## Verified This Run

- A fresh Stripe sandbox key-list load shows the replacement standard key and
  restricted test key; the old key scheduled for expiration is absent. The
  owner-performed expiration handoff is resolved. No standard key was used.
- The restricted Stripe credential can read the active USD 2.99 one-time price
  `price_1UDUSP3tK4pzHLhnhd9bvxSN` for `prod_VDwLEDq7ALvvCz` in test mode.
- The dedicated Firebase Authentication Viewer credential still has user-read
  access in `gravity-golf-test`.
- A synthetic account, `gravitygolf-qa-1788993682152@example.com`, was created
  through the actual game's Create Account UI in that test project. Its generated
  password was kept only in browser-automation memory, not printed or saved.
- The actual function verified the account's Firebase token, including the
  revocation check, and returned HTTP 200 with no Pro entitlement.
- The actual function created a Stripe-hosted test Checkout Session showing
  USD 2.99, 11 additional holes (9-19), and 19 total. The browser visibly identifies
  `Gravity Golf Test`, `Sandbox`, and `Gravity Golf Pro - TEST ONLY`.
- Cancel returned to the game with an explicit no-access-added message and no
  Play Pro button. Starting checkout again returned the identical Checkout URL,
  demonstrating reuse of that account's existing session rather than another
  checkout. This is a serial real-provider check, not hosted concurrency proof.
- Stripe CLI connected with the existing restricted key. Its signing secret
  matched the stored secret. No new key, permission, or webhook secret was saved.
- Local status: 200, test mode, expected amount/project; unauthenticated
  entitlement: 401; `.env` and backend source URLs: 404. API responses retained
  `no-store` and `nosniff`. Node listeners were restricted to loopback.
- After explicit owner approval to proceed without Link CLI, the existing test
  checkout completed using only synthetic billing details and Stripe's test card.
  Saving payment information remained unchecked; agent disclosure was acknowledged.
- Stripe CLI delivered actual `checkout.session.completed` event
  `evt_1UDxtM3tK4pzHLhnZ3Uf9EUn`; the signed webhook returned HTTP 200. The success
  return's `/api/commerce/confirm` also returned 200.
- The game displayed PRO READY, LINKED TO YOUR ACCOUNT and verification of all
  19 holes for the same synthetic account. Checkout URL parameters were cleared.
  PLAY PRO COURSE launched HOLE 9 / DEEP SPACE ODYSSEY, par 5, strokes 0.
  This proves paid-level entry, not completion of the course or performance QA.

## Real-Provider Restore Follow-Up

Verified September 9 local time, completed by September 10 at 03:45:47 UTC.
The current public build and unchanged backend were copied to the temporary
runtime without replacing its existing local Blobs records. The core now matches
the actual clone exactly; the earlier temporary error diagnostic was removed.
The process-only emulator compatibility layer remains required and is still not
hosted-storage acceptance.

- The earlier Chrome checkout/game tab was no longer present. A new in-app
  browser tab at `http://localhost:8888/` initially showed free access and no
  signed-in purchase account. No checkout return/session URL was supplied.
- The existing synthetic email/password remained available in automation memory.
  They were not printed or saved. The first sign-in displayed the generic
  account error; its cause was not captured and remains unknown. Do not describe
  this run as entirely failure-free or assume a bad password or provider outage.
- After inspecting the form and enabling passive network observation, one
  diagnostic retry using the same test credentials succeeded. Firebase
  `accounts:signInWithPassword` and `accounts:lookup` returned 200. The actual
  server's entitlement lookup returned 200, and the UI showed PRO READY,
  LINKED TO YOUR ACCOUNT and all 19 holes available for that synthetic account.
- SIGN OUT removed the account label and Play Pro action. A signed-out reload
  stayed on the free offer. Re-signing into the same paid test account succeeded
  and restored Pro; a subsequent signed-in reload restored it again from the
  server. Three authenticated entitlement responses were observed, all 200.
- PLAY PRO COURSE then opened Hole 9 / Deep Space Odyssey, par 5, strokes 0,
  artifacts 0/19. The paid-level scene was visually inspected. This is course
  entry, not completion of the paid course or a performance benchmark.
- No new checkout, payment, account, reset email or credential change occurred.
  The captured commerce responses were only status and entitlement; there was
  no checkout/confirmation response in this follow-up. An anonymous entitlement
  request returned 401; `.env` and backend source URLs returned 404.

This closes fresh-browser sign-in, sign-out/re-sign-in and reload restoration
against real Firebase authentication and the previously Stripe-fulfilled local
entitlement. It does not prove a second physical device, hosted persistence,
refund/dispute handling, production restore or existing-buyer migration. A
redacted structured receipt is in `RESTORE_ACCEPTANCE_2026-09-09.json`.

## Local Storage Limitation And Repair

The first checkout attempts failed with HTTP 503 before a Stripe session was
created. A temporary, redacted server diagnostic identified
`Storage version is unavailable` in the unchanged production adapter.

Inspection of the installed CLI's `@netlify/blobs@10.7.0` emulator showed that
GET and HEAD omit the ETag expected by `getWithMetadata`. The app's installed
`@netlify/blobs@11.0.3` server implementation also omits those read headers.
The CLI emulator's writes check conditions before asynchronous filesystem writes,
so its implementation should not be mistaken for hosted atomic-write acceptance.

`/tmp/gravitygolf-blobs-contract.mjs` reproduced the missing ETag using the real
SDK and emulator with synthetic data and no provider credentials. A process-only
repair in `/tmp/gravitygolf-blobs-local-compat.mjs` supplies content-based ETags,
conditional reads, and per-key serialization of local reads/writes. The contract
check then passed read/metadata versions, conditional reads, stale-write rejection,
and one winner each among 12 concurrent conditional creates and updates.

This is repaired local emulation, not hosted Netlify storage. No installed package,
system networking setting, production function, or payment-verification rule was
changed. Do not count these checks as cloud durability or multi-instance concurrency
acceptance. Those remain release gates. The official contract is described in
[Netlify Blobs documentation](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).

## Completed Payment And Runtime Handoff

The earlier Pay safety rejection was resolved by the owner's explicit approval
and fresh visible verification of the synthetic form and agent acknowledgment.
No Link CLI was installed or enrolled. No real charge occurred.

A fresh checkout snapshot unexpectedly contained a declined non-test-card entry
and personal billing values. Their origin was not established. They were not
submitted by this agent or used for acceptance; they were replaced with synthetic
information before the approved action. An initial refill retained the previous
card format, so the fake Visa was refilled and verified after the form rerendered.
No payment credentials or personal billing values are retained in this report.
See [Stripe's test-card guidance](https://docs.stripe.com/testing).

The owner initially redirected work to legal/launch clearance after paid Hole 9
opened. The subsequent restore follow-up above now verifies reauthentication and
reload against local storage. Continue with the existing paid test account when
resuming; do not blindly repay or reuse the completed checkout.

The local test server and Stripe listener were stopped again with exit 0 after
the restore follow-up. `lsof` found no listeners on 8888/8889/8890. The in-app
game tab is retained as a handoff, not as evidence that the server is running.
Resume the reviewed local runner for further testing:

```sh
/usr/local/bin/node /tmp/gravitygolf-sandbox-run.mjs
```

That runner reads the ignored owner-only `.env`, validates exact test scopes,
uses `GG_COMMERCE_MODE=test` only in child processes, confines listeners to
loopback, runs Netlify offline/unlinked, compares webhook signing secrets, and
redacts process output. It enables the temporary Blobs repair only for this
isolated local test and stops its process groups on interruption or after
45 minutes. Its temporary runtime copy is `/tmp/gravitygolf-runtime-preview`.
Do not overwrite the real `.env` from an older staging directory.

## Still Unverified

- The initial generic sign-in failure's cause and clearer safe diagnostics.
- Interruption before success redirect and second-physical-device acceptance.
- Real refund/dispute handling, account mismatch, token revocation, checkout
  expiration, and provider/storage failure recovery beyond existing offline tests.
- Hosted functions/routing/Blobs consistency and concurrency; the local repair
  deliberately does not prove these.
- Existing-buyer migration, approved refund/support/privacy policies, exact
  production configuration/release approval, and customer acquisition/revenue.

The actual clone's saved commerce mode is still disabled. The secret audit passed
with 12 allowlisted public files, no provider secrets in them, and `.env` ignored
and mode 0600, rechecked after stopping the restore runtime. This follow-up changed
acceptance documentation only in the working clone;
the temporary diagnostic and emulator repair are outside its deployable source.
