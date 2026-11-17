# Gravity Golf Funnel Measurement

Local implementation only. No analytics property was configured, no live tag was loaded, and no production event delivery or sales figures have been verified. Keep `GG_ANALYTICS_MODE=disabled` until the gates below are complete.

## What This Measures

The new `funnel-analytics.mjs` replaces the unused legacy bridge in the public build. It is called at real gameplay milestones, not on every frame. Loading a level behind the ball picker is not counted as starting a hole; a real non-training shot is required.

| Event | Meaning | Allowed event fields |
| --- | --- | --- |
| `gg_session_start` | This page began opted-in measurement, not a unique person | None |
| `gg_trainer_started` | The player started the interactive drill | None |
| `gg_trainer_completed` | The drill reached its completion handler | None |
| `gg_trainer_skipped` | The player exited without completing the drill | None |
| `gg_first_shot` | First actual shot in this page/mode, excluding training | `mode` |
| `gg_hole_started` | An actual shot was fired on this hole | `mode`, `hole` |
| `gg_hole_completed` | The game recorded completion after at least one stroke | `mode`, `hole`, `strokes`, `par` |
| `gg_free_course_completed` | All eight free holes have positive scores in the current single-player round | None |
| `gg_pro_offer_viewed` | The Pro dialog opened | `placement`: `picker`, `free_end`, `checkout_return` |
| `gg_checkout_redirect` | Authenticated checkout returned a validated Stripe URL and the browser was asked to navigate | None |
| `gg_access_verified` | The server returned access for the current account | `flow`: `restore`, `checkout_return`, `already_owned` |

Modes are `single`, `daily`, `local2p` and `online`. Training is excluded from hole/shot events. A milestone is counted once per page, mode, hole and flow/placement; retries and undo do not inflate it. Reloads create a new page measurement. Event counts are not unique-player counts, total rounds or proof that Stripe's page loaded.

Every event adds only two campaign labels: `gg_source` and `gg_campaign`. Recognized sources are `youtube`, `instagram`, `tiktok`, `reddit`, `x`, and `newsletter`. Recognized campaigns are `founder_demo`, `launch_lab`, and `pro_course`. Unknown values become `other`; absent source becomes `direct_or_unknown`. Raw UTM values, referrer URLs and arbitrary query fields are not forwarded by the event adapter.

Example campaign URL, not yet a published campaign:

`https://gravitygolf.xyz/?utm_source=youtube&utm_campaign=founder_demo`

## Consent And Data Boundaries

- Optional and off by default. A player can choose Usage Data in the ball picker; there is no forced consent dialog before playing. Do not interpret the resulting opt-in sample as all visitors.
- No Google tag, cookie or event queue is created by this integration before consent. Previously played shots/offers are not buffered for later replay. Browser Global Privacy Control and Do Not Track are respected as an off switch.
- The choice is stored locally for up to 180 days, scoped to analytics environment and measurement ID. The Google tag is configured for a non-refreshing 30-day analytics cookie expiry. These are implementation settings, not a legal compliance determination.
- No email, Firebase UID, purchase/session ID, card data, free-form text or user profile is accepted by the event schema. `page_location` is overridden to the root origin, the referrer is empty, and the tag script uses no-referrer loading. The Google vendor still receives normal connection/browser data and uses an analytics identifier after consent; this is not anonymous measurement.
- Ads consent stays denied. Google signals, ad personalization and default page views are disabled in code. Owner-reviewed property settings must also disable Enhanced Measurement, user-provided data and connected tags that could add events or expose URLs outside this schema.
- While active, a small Usage Data control remains accessible during play, including on mobile. Turning off sets Google's `ga-disable` switch, removes the tag element and expires this installation's GA cookies. Other game/auth storage is retained. Cross-tab consent withdrawal or cleared consent storage is honored.
- After withdrawal, allowing again takes effect on the next visit. The current game is not reloaded, and a delayed vendor queue is not re-enabled in the current document.
- Tag failures/ad blockers do not affect gameplay or purchases. `render_game_to_text().usageData.queuedEventsThisPage` is a diagnostic count of queued events, not evidence of receipt by Google.

## Configuration

Build-time variables are public configuration, never Stripe/Firebase private keys:

| Variable | Purpose |
| --- | --- |
| `GG_ANALYTICS_MODE` | Default `disabled`; explicit `test` or `live` only after review |
| `GG_ANALYTICS_REVIEWED` | Must be `yes` after reviewing the privacy copy and property settings below |
| `GG_ANALYTICS_ORIGIN` | Exact origin, no path/query/trailing slash |
| `GG_GA4_TEST_ID` | Public ID of a separate test GA4 property |
| `GG_GA4_LIVE_ID` | Public ID of the production GA4 property |

The build writes only `{mode, id, origin}` to `dist/analytics-config.json`; disabled builds contain only `{mode:"disabled"}`. Invalid enabled settings fail the build. Live mode requires Netlify `CONTEXT=production` and an exact production HTTPS origin. The browser also requires the built origin to match its current origin, so a production build copied into a local preview cannot send production analytics. Test/live IDs must differ when both are provided. Code cannot establish that the owner-designated test ID belongs to a genuinely separate property; verify that in the dashboard.

Never run the legacy `analytics-bridge.js` alongside this module. It remains in source as an unused historical file but is excluded from `dist`.

## How To Make Decisions

In a reviewed GA4 property, register event-scoped custom dimensions for `gg_source`, `gg_campaign`, `mode`, `hole`, `placement` and `flow`. Build an ordered funnel of opted-in measured pages: `gg_session_start` -> `gg_first_shot` -> `gg_pro_offer_viewed` -> `gg_checkout_redirect`. Add free-course completion and training outcomes as separate breakdowns, not mandatory steps: the Pro offer is intentionally available before completing the free course.

Use the same date window, source, environment and device filters when comparing stages. Inspect event sequences in a controlled test before relying on aggregate percentages. Consent timing, reloads, direct Pro visits, return visits, ad blockers and small samples bias comparisons. Do not infer zero traffic from missing analytics or claim a conversion uplift without a baseline.

`gg_access_verified` includes restores, repeat account checks and already-owned access. It is an access-delivery signal, not a sale. **No browser `purchase`, revenue or refund event is emitted.** Use Stripe's authenticated records, filtered to the exact Pro product/price and live mode, as the sales ledger. Reconcile paid amounts less refunds, disputes, fees and hosting/marketing costs. Avoid attributing individual revenue to a source until a reviewed server-side attribution design exists.

## Required Before Enabling

1. Owner chooses the separate test and production GA4 properties, verifies IDs and reviews privacy disclosures, retention, regional consent requirements and the support/contact path. This technical implementation is not a completed privacy policy or legal review.
2. Verify Enhanced Measurement, Google signals, ad personalization, connected tags and user-provided-data collection are disabled in the actual properties. Do not simply set `GG_ANALYTICS_REVIEWED=yes` to make a build pass.
3. In a separate test deployment, use Tag Assistant/DebugView and network inspection with the real Google tag. Confirm no vendor request before opt-in or after withdrawal, no raw checkout/query/account identifiers, and no duplicate manual/automatic events. Test denied/allowed/stored/expired consent, cross-tab withdrawal, blocked cookies and blocked scripts.
4. Exercise actual training, first shot, completion, early offer and real Stripe test checkout/access restore. Confirm UI events match gameplay and keep them out of the production property.
5. Obtain separate approval for the exact production release. No live changes, ad spend, marketing post or revenue claim is authorized by this document.

## Local Tests

`npm run check` covers schemas, consent, environment gating, deduplication, actual inline game hooks, safe Google configuration and purchase/restore event separation. `tests/browser-funnel.mjs` runs the actual local game against an inert Google-tag fixture; use `GG_QA_URL` for a loopback server serving `dist/`, and `PLAYWRIGHT_MODULE` if Playwright is installed outside this project. It does not demonstrate real Google delivery or vendor behavior.

Primary references: [Google basic consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode), [privacy switches and disabling measurement](https://developers.google.com/tag-platform/security/guides/privacy), [GA4 configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
