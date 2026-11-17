# Aim-Worker Candidate: September 11, 2026

Private engineering candidate, not a release or storefront approval. Live site,
original checkout, payment configuration and prior native packages are unchanged.

## Candidate

- App: `out/aim-worker-2026-09-11/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app`.
- Windows candidate: the entire `out/aim-worker-2026-09-11/Gravity Golf Prototype-win32-x64/` folder. Generated and integrity-checked, not executed on Windows.
- Source SHA-256: `28fa9b52e6c046715c4b8ddbe7106d31054525bd300d66f8b2d20d6d7adb2e01`.
- ASAR SHA-256: `dd0753e970b79ea92998563d17c1b42e3ae1e91b7584313f5a4cda67bf3a4ffd`.
- Manifest SHA-256: `1a3721d8a9e1910f4c02375434e9c2b4c1f42c19ba12ed1c468febe4c0746126`.
- Canonical solver block SHA-256: `edc4081d1a9458336adfd0df690a7ed7baca0538446a67d577b6f18a4e4a619a`.
- Electron remains 44.3.0; Three.js remains 0.172.0. All 25 packaged public asset hashes verified from the ASAR.

The exact existing search/simulation functions are embedded into a generated
same-origin module worker. No candidate counts, timesteps, scoring rules, power
constants or physics formulas were reduced. The worker receives a compact world
snapshot, not access to the DOM or native APIs. Desktop CSP adds only
`worker-src 'self'`; no blob/eval permission, network service, preload or IPC.

The previous synchronous search froze everything. The new search holds only
ball physics and planetary orbital positions while calculating, retaining the
same static planning model while UI/rendering/visual rotation/audio continue.
The orbital clock excludes this planning time so moons do not jump on resume.
The hole timer is not paused. Search ends immediately on manual input, Fire,
Cancel, new aim, Reset or level replacement. Revision, planet identity and ball
position guards discard obsolete results. Worker failure/timeout releases the
planning pause and leaves manual aim usable; a new request may retry.

## Measurements

Native Mac, 1920x1080, disposable profiles, normal UI inputs, no video recording.
RAF timing and long-task observation are diagnostic samples, not minimum-spec,
Windows, Steam Deck, or sustained-FPS certification. Moving world geometry makes
total search times variable, so do not interpret the elapsed-time differences
as an isolated algorithm speedup.

| Hole | Old Max Frame Gap | Candidate Max Frame Gap | Old Longest Task | Candidate Longest Task | Candidate Assist Wait |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 133.3 ms | 17.6 ms | 140 ms | none observed | 156.5 ms |
| 6 | 983.4 ms | 17.7 ms | 997 ms | none observed | 991.2 ms |
| 11 | 3983.4 ms | 17.6 ms | 3998 ms | none observed | 1471.8 ms |

Baseline source: `b56f1ef4c02dca125b97f6dfc728f8750da6feffb9dd9f8c1148d44675518cf5`.
Baseline ASAR: `1f5bc92bcdb81a9e8913b75f203cfd801440c11d258d1eeabe3822c80719ae04`.
Evidence: `output/playwright/aim-worker-2026-09-11/`, including baseline,
intermediate runs, final development run and packaged run. The measurement
harness only observes worker messages; it does not alter requested shots.

## Verification

- 30 desktop unit tests pass, including exact launch/power/all-path-point parity for authored Holes 1, 6 and 11, cancellation, superseding requests, late worker errors, timeouts, failure/retry, stale worlds and file-preview fallback.
- 102 web/backend fixture unit tests pass; TypeScript typecheck passes. No production provider traffic or purchase was used for these tests.
- Native UI checks pass for Cancel during compute (46 ms in the recorded run), manual power adjustment without overwrite, Reset discarding the request, Fire during compute, and an assisted Hole 1 completed in one stroke.
- Standard browser-game client passes picker, course selection and actual assisted-aim smoke checks against the generated offline desktop payload served on loopback. Screenshots and text states were inspected; no recorded browser console errors.
- Fresh native packaged checks pass on Holes 1, 6 and 11 with no observed console/page errors or external renderer requests. Prior Mac/Windows packages are retained separately.

## Continuous Course Acceptance

A fresh packaged Mac run completed all 19 holes continuously on the exact
candidate above, using normal mouse/keyboard input, built-in aim assistance and
selective obstacle-departure boosts. No score, win, ball position, physics or
camera state was injected. The game code and package did not change during QA.

- Scores: `1,2,2,4,2,3,2,2,5,4,4,10,2,3,3,2,3,4,4`.
- Final screen: `COURSE COMPLETE`, 62 strokes, par 87, difference -25. All 19 rows match the actual shot records; no desktop upsell. Play Again resets to Hole 1 with zero strokes and total.
- 62 recorded Fire inputs, 32 launches from intermediate obstacles and seven successful 1500 ms Space-held boosts, only on Holes 13,17,18,19. Actual boost activation and immediate charge spending were checked.
- Limits stayed at 12 shots per hole and 90 seconds per shot. Every shot settled; the longest recorded shot took 23.038 seconds. Hole 12 used ten attempts, so this is not a claim of ideal difficulty balance.
- All 62 aim requests completed. The longest observed aim wait was 3.666 seconds; this is elapsed wait, not a main-thread stall measurement. Separate frame-gap measurements remain in the earlier section.
- No observed page/console errors or external renderer requests. Native process exited normally and its disposable profile was removed.
- Desktop and 390x844 final scorecards were visually inspected. All rows and replay/home controls are visible; the narrow panel and scroll widths both measure 375 px with a 390 px page. This is not physical mobile-device acceptance or an accessibility audit.
- Run: `2026-09-11T18:51:43.312Z` to `2026-09-11T19:04:13.199Z`, about 12m30s including transitions/screenshots/replay. Not a player-time or target-hardware benchmark.

The exact harness, raw report, 19 completion PNGs, two scorecards and independent
receipt/hash verification are in
`output/playwright/continuous-aim-worker-2026-09-11/run-1/`.
Report SHA-256: `661fac9d67bf721160f5336e88cdc1349f50b5ba613046bbcf6304c66db859bc`.
Harness SHA-256: `c20cd57d83e9727b5a5dd1a768f3d18a91f93d1e99b5fa34099dd31ca4324f2a`.
The verifier checks package/source/asset hashes, input-to-stroke correspondence,
hole sequence, assisted states, score totals and all 21 PNG dimensions/hashes.

The separately generated Windows x64 candidate contains the identical `dd0753...`
ASAR. Its executable is PE32+ x86-64 and has SHA-256
`7347c2a37bcbf556286783a7f9c05bcd5ee0a7345aa90b8d6c231d4d4a23deb4`.
Matching game files do not establish Windows runtime, driver or store compatibility.
Keep the whole folder together, not just the executable. Prior packages remain
unchanged at their original paths.

An early intermediate development run timed out on Hole 6 without enough
diagnostics to determine the cause. It is retained as `worker-dev-1/`, not
relabeled successful. Later instrumented development and packaged runs passed.
An initial controls test tried to focus the hidden internal power input; the
corrected test uses the visible power bar and passes. These records are kept.

## Remaining Gates

One continuous Mac course smoke test now passes, including re-aiming/departures
from moving intermediate planets. This does not cover every landing position,
manual route, ball ability, random scene phase or repeated-session failure mode.
Human balance testing, a Windows run, minimum-hardware testing,
signing/notarization and store-client installation remain open. The previous
trailer/screenshot approvals cannot be transferred to a different build. Old
media remain genuine historical captures; their current-source verifiers should
report a mismatch until a new build-specific review is deliberately performed.

Standalone `file://` and environments without Worker retain the older blocking
solver as a compatibility fallback. HTTP web previews must serve the generated
root `dist/` after `node scripts/build-web.mjs`, including `aim-worker.mjs`;
serving raw repository HTML without its generated worker is not a valid build.
The remote-CDN web worker path and native mobile wrappers have not received
new end-to-end acceptance here. No web deployment is authorized by these tests.

Steamworks and Epic were checked this turn and still show sign-in forms. This
does not establish enrollment or fee status. Publisher access, owner review,
name/IP and soundtrack rights, support readiness, legal/rating decisions,
pricing, tax/bank setup and exact submission/payment/publication approval remain
separate launch gates. No verified independent-customer revenue was generated.

## Reproduce

From `desktop/`, use Node 22.17 or later:

```sh
node scripts/build.mjs
node --test tests/*.test.mjs
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node tests/aim-runtime.mjs "$PWD" /tmp/gg-new-controls
GG_PACKAGE_DIR="$PWD/out/aim-worker-2026-09-11/Gravity Golf Prototype-darwin-arm64" PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node tests/aim-latency.mjs "$PWD" /tmp/gg-new-timing 1,6,11
GG_PACKAGE_DIR="$PWD/out/aim-worker-2026-09-11/Gravity Golf Prototype-darwin-arm64" PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node tests/course-runtime.mjs "$PWD" /tmp/gg-new-course 1 19 12 1500 90000 13,17,18,19
```

Use fresh output directories. The latency harness checks the selected package's
manifest against the source before launching. Use `GG_DEV=1` for the generated
unpackaged app instead. The harnesses create and remove disposable save profiles.
