# Gravity Golf: Steam And Epic Games Store Preparation

Private desktop prototype, updated September 11, 2026. **Not released, uploaded, approved,
or legally cleared.** The website and its commerce configuration are untouched.

## September 11 Aim-Worker Candidate

The working source now solves aim assistance off the UI thread. A separate
unsigned Mac candidate and matching Windows payload are saved under
`out/aim-worker-2026-09-11/`; the earlier
Mac and Windows prototypes directly under `out/` remain unchanged. See
[aim-worker QA](AIM_WORKER_QA.md) for exact pins, measurements, test results and
limitations. This candidate now passes a separate continuous 19-hole Mac course
smoke test: 62 strokes, correct full scorecard and replay reset. Windows was
packaged and integrity-checked, not executed. Marketing media still belong to
the earlier build and are not newly approved for this candidate.

## Product Direction

Prepare a one-time-purchase desktop edition with all 19 authored holes, the
existing interactive trainer, ball abilities, local mastery records and a local
Daily Challenge. No Stripe upsell, Firebase login, ads or analytics. This is a
proposed commercial model; the owner has not approved either storefront's price.

The owner also requested the "Unreal store," interpreted as the Epic Games
Store for selling the finished game, not Fab for licensing development assets.
Use a non-exclusive Steam + Epic release plan. Epic-specific preparation is in
[EPIC_RELEASE.md](./EPIC_RELEASE.md); shared private copy is in
[STORE_COPY_DRAFT.md](./STORE_COPY_DRAFT.md). Neither listing exists as a result
of this work, and no exclusivity program has been selected.

Keep the current Three.js game and original golden UI. Electron provides the
desktop executable; an Unreal rewrite is not needed for this prototype. The
packager currently targets Windows x64 and macOS arm64. Generating an artifact
does not establish support for that operating system or Steam Deck.

## Private Store Artwork

[Store key art](../marketing/store-art-2026-09-11/README.md) contains eight
Steam-sized PNG exports, editable SVG masters and a contact-sheet review.
These are illustrated capsules/library art, not gameplay screenshots. Owner
approval, name/rights/disclosure review and portal acceptance remain pending.
Epic field-specific exports are not yet verified. No artwork is loaded by the game.

[Private gameplay trailer](../marketing/desktop-trailer-2026-09-11/README.md)
contains a 30-second draft from the retained September 10 desktop build, raw takes and exact
edit/verification receipts. It uses real gameplay with the original HUD and an
editorial soundtrack bed. Human playback, rights and upload approval remain open.
The capture identified the aim-setup latency addressed by the separate candidate.

## Build Locally

Use Node 22.17 or newer, from this `desktop` directory:

```sh
npm ci --ignore-scripts
node node_modules/electron/install.js
npm run build
npm test
npm start
npm run package:mac
npm run package:windows
```

Installation downloads pinned public dependencies and the Electron runtime.
The separate package/lockfile does not add Electron to the web deployment.
Root and desktop npm commands use `scripts/run-node.cjs` in the repository root
to select npm's invoking Node without Unix-only shell variable expansion. Keep
that file when transferring source to BLD; the desktop folder is not standalone.
The launcher also avoids the previously observed ancestor-PATH Node mismatch.
This change is tested on macOS, not proof of Windows execution. The runtime QA
harnesses below still contain Mac-specific paths and need Windows adaptation.
Build reads `../index.html`, `../soundtrack.mp3` and `../licenses/`; it never
reads `.env`. An optional source-root argument is available for isolated staging:
`node scripts/build.mjs /absolute/path/to/Gravity-Golf-Updates`.

`app/` is generated and disposable. `out/` contains unsigned prototype bundles.
These paths and `node_modules/`, `qa/` are ignored. Packaging consumes only
`app/`, never the repository root, web server functions or credentials. No
store upload command, store product IDs, credentials, signing or notarization is configured.
Do not distribute these prototypes as release builds.

## Behavior And Security

- The source adapter makes counted, fail-closed replacements. Course data and
  gameplay physics are reused rather than rewritten. The original HTML is not
  edited. Build metadata records the actual source commit, dirty-state flag and
  SHA-256 of the source HTML and bundled assets; a commit alone is not the full
  provenance of this uncommitted prototype.
- Music, fonts and imported Three.js modules are bundled. Renderer requests are
  restricted to an allowlisted local custom protocol and data URLs. No loopback
  server is needed by the native app. CSP blocks network connections, remote
  scripts, inline JavaScript handlers and eval. Audio byte-range serving is tested.
- Renderer Node integration is off; isolation and sandboxing are on. There is no
  preload/IPC bridge. Permissions, downloads, navigation and new windows are
  denied except for an isolated local notices window. This is not a security
  certification or proof against all vulnerabilities.
- F11 toggles fullscreen; Escape exits fullscreen. Native Game menu can quit.
  CHOOSE HOLE opens the full course and local Daily Challenge. Existing online
  and purchase controls are hidden; their web SDKs/configuration are not bundled.
- Prototype local storage uses `GravityGolfSteamPrototype` within Electron's
  per-user app-data directory. QA uses a disposable profile. This is not Steam
  Cloud, a web purchase migration, a complete save/resume system or account-bound
  entitlement. A release save-path/migration decision is still required.
- The Electron runtime adds download and memory overhead. Physics/render-loop
  code is preserved, but performance parity is NOT established by unit tests.
  Benchmark native builds on intended minimum-spec PCs before setting requirements.
- No Steamworks API, achievements, cloud saves, DRM or controller integration is
  implemented. Do not select those storefront feature flags.

## Verification

`npm test` checks the adapter, unmodified course data, JavaScript syntax, CSP,
exact-origin asset allowlist, audio ranges and native security options.

`tests/runtime.mjs` uses Playwright's Electron API for real native UI checks.
Install/use a trusted Playwright separately, or set `PLAYWRIGHT_MODULE_PATH` to
its absolute `index.mjs`. Run `node tests/runtime.mjs` for the development app.
An optional executable path tests a packaged binary. Artifacts go to `qa/`.
It exercises training/skip, a shot, Hole 9, Daily Challenge, fullscreen, local
storage across process restart, notices and actual MP3 decoding/playback state.
Human listening and whole-course playtesting are separate gates.

`tests/aim-runtime.mjs` checks normal power-bar input against assisted headings
on three holes. `tests/course-runtime.mjs` plays a bounded course or segment
through normal UI controls and records each shot, completion and any failure.
Both use disposable profiles and require the packaged Mac app. Examples:

```sh
node tests/aim-runtime.mjs "$PWD" /absolute/path/to/fresh-aim-output
node tests/course-runtime.mjs "$PWD" /absolute/path/to/fresh-course-output 1 19 12
node tests/course-runtime.mjs "$PWD" /absolute/path/to/fresh-recovery-output 17 19 12 1500
node tests/course-runtime.mjs "$PWD" /absolute/path/to/fresh-selective-output 1 19 12 1500 90000 13,17,18,19
```

The course arguments are first hole, last hole, maximum shots per hole,
optional recovery-boost hold time in milliseconds (0-2000; default 0), and
optional settling timeout in milliseconds (1000-120000; default 45000). A boost
uses the normal Space key only when shooting from an obstacle. The test records
activation at the actual key event: later gravity-graze rewards can recharge
the spent charge, so a delayed counter comparison is not reliable.
An optional final comma-separated list restricts boost use to specific tested
holes; without it, every tested hole is eligible. Duplicate, invalid and
out-of-range entries fail before launching the app. The report records the list.
The selective example above completed the current Mac build's 19-hole course,
scorecard and replay checks; see `VERIFICATION.md` for its exact scope and the
preserved first strategy's Hole 16 shot-cap failure. This is not human balance,
Windows, or store-client acceptance.
The default course scope is 1,19,6 with a 45-second settling window. A shot-limit failure is not
proof of an impossible hole. A segment reaching Hole 19 also checks its partial
scorecard, played-hole par, completion heading, narrow viewport and replay reset,
without claiming a complete 19-hole round. Reports also pin the harness hash.

Private Steam/Epic screenshot candidates are in
[`output/playwright/storefront-2026-09-10-r3/review.html`](./output/playwright/storefront-2026-09-10-r3/review.html).
The shortlist contains five unretouched 1920x1080 gameplay images; 21 original
frames and build/input/state receipts are retained. Revision 3 matches the same
archive that passed the continuous 19-hole Mac test. The default verifier checks
this revision and passes; it still rejects an explicitly selected older archive.
Recheck matching before upload if the shipping build changes; never relabel old
receipts. These are not uploaded or release-approved. Revisions 1 and 2 remain
unchanged historical evidence. Selected PNGs were visually inspected; browser
policy blocked the HTML gallery preview, so its links/order were checked statically.
`scripts/capture-storefront.mjs` reproduces captures through normal game inputs
with a disposable native profile; it does not modify game source or saves. Its
default output now uses revision 3's `capture-main/` subdirectory, matching the
verifier's receipt layout. Existing capture receipts refuse overwriting; supply
a fresh explicit output directory for new captures.

`node scripts/preview.mjs` serves only the generated game payload on loopback
port 8783 for the standard web-game test client. This HTTP smoke test does not
substitute for the packaged native runtime test.

## Steam Publishing Gates

Read-only portal check, September 10: the in-app browser showed "Sign in to
Steamworks" and Epic Developer Portal's "Sign in" page. Publisher identity,
enrollment and product IDs remain unverified; signed-out pages do not prove
that accounts or paid app registrations do not exist. No credentials, account
setup, agreements, fees or submissions were entered. Owner sign-in is next.

1. Confirm the owner's Steamworks enrollment. Use the intended publisher's exact
   legal identity and confirm its right to publish the code, name and assets.
   If publishing as epoch6 LLC, verify the authorized signatory, matching bank
   account and tax records privately. Registry standing alone is not IP ownership.
   The owner must approve/complete agreements, tax/bank submissions and payment.
   [Valve onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding).
2. Steam Direct is $100 USD per product, subject to applicable taxes. It is not
   refundable, but is recoupable after $1,000 Adjusted Gross Revenue. First
   releases require at least 30 days between fee payment and launch; the Coming
   Soon page must also be public at least two weeks. These periods can overlap;
   this is not automatically a 44-day minimum. No fee has been paid by this work.
   [Fee](https://partner.steamgames.com/doc/gettingstarted/appfee),
   [Coming Soon](https://partner.steamgames.com/doc/store/coming_soon).
3. Resolve name/rights clearance and publisher licenses. Preserve the owner's
   AGI House soundtrack-authorship statement and earlier-code statement as
   evidence leads, not legal determinations. Complete the existing
   `docs/LAUNCH_COMPLIANCE.md` and `docs/RIGHTS_EVIDENCE_2026-09-09.md` gates.
   Confirm a working support contact; do not publish the unverified proposed
   support email. Obtain appropriate professional review; no release eliminates
   all liability.
4. Approve the commercial model, price, territories, supported languages and
   tested operating systems. Web/mobile/Steam purchases are separate unless an
   actual approved migration exists. Steam in-game transactions must use Steam
   Wallet; this prototype has none.
   [Review requirements](https://partner.steamgames.com/doc/store/review_process).
5. Build final target binaries, finish course/accessibility/security QA, measure
   minimum requirements, and test from the Steam client using a real assigned
   AppID/private depot. Do not ship a fabricated AppID or a development
   `steam_appid.txt`. Windows testing, Steam launch/overlay, suspend/resume,
   alt-tab, display/DPI, audio devices, uninstall/reinstall/save persistence and
   Steam refund behavior remain release acceptance work.
   [SteamPipe](https://partner.steamgames.com/doc/sdk/uploading).
6. Prepare genuine gameplay screenshots, a gameplay trailer, required capsule
   and library artwork, store copy, support information, pricing and the content
   survey. Describe only released features; don't use generated fake gameplay.
   Check current asset dimensions in Steamworks when producing the final set.
   [Store review](https://partner.steamgames.com/doc/store/review_process).
7. Answer content/age-rating and generative-AI questions accurately. Valve's
   current survey focuses on AI-created content shipped to and consumed by
   players, including art, sound, narrative and localization; it distinguishes
   this from development-tool efficiency. Audit actual asset provenance instead
   of guessing a blanket yes/no based solely on coding assistance. No live
   generative-AI service is configured in this desktop prototype.
   [Content survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey).
8. Submit the page and near-final build only with owner approval. Valve states
   that reviews typically take 3-5 business days; allow at least 7 business days
   for each review and possible changes. Public Coming Soon and final release
   are separate actions requiring approval, not automatic consequences of a
   successful build. [Review timing](https://partner.steamgames.com/doc/store/review_process).

## Epic Games Store

Reuse the existing offline desktop source and prototype artifacts as the starting
point, not as an Epic-approved release. No duplicate game fork, Unreal migration,
or new runtime dependency is needed merely to add this publishing target. Epic
accepts other engines. [Epic distribution FAQ](https://store.epicgames.com/distribution?lang=en-US).

Before any Epic upload, follow [EPIC_RELEASE.md](./EPIC_RELEASE.md) for company
onboarding, the separate submission fee, cross-store feature gates, final build
and Epic Launcher testing, disclosures and approval. The existing Mac smoke test
does not cover Epic installation, purchase delivery, launch or updates.

## Not Yet Promised

Windows/macOS store support, Steam Deck verification, full controller support,
Steam/Epic achievements, cloud saves, leaderboards, cross-store ownership, release date,
price, legal clearance and revenue remain unverified or undecided. The latest
local verification results are recorded in `VERIFICATION.md` and `qa/`, not
inferred from the existence of these scripts.
