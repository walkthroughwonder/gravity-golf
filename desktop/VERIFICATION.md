# Desktop Prototype Verification

Updated September 11, 2026. **Private prototype only; Steam/Epic release is not cleared.**

## Aim-Worker Candidate: Continuous Course

The separate September 11 candidate has now completed all 19 holes continuously
in the packaged Mac app. Actual totals: 62 strokes, par 87, difference -25;
all scorecard rows and replay reset matched. The run used normal controls,
built-in assistance and seven selective obstacle-departure boosts. No script
errors, external renderer requests or unsettled shots were observed.

Source SHA-256: `28fa9b52e6c046715c4b8ddbe7106d31054525bd300d66f8b2d20d6d7adb2e01`.
Candidate ASAR: `dd0753e970b79ea92998563d17c1b42e3ae1e91b7584313f5a4cda67bf3a4ffd`.
The matching Windows candidate was generated and its game archive matches,
but it has not been executed on Windows. Previous packages remain unchanged.

See [candidate QA](AIM_WORKER_QA.md) for the complete method, bounds, exact
scores, screenshots, independent receipt verification and remaining gates.
This closes the candidate's continuous Mac course-smoke gap, not human balance,
Windows/hardware, signing, rights, publisher setup or store-release acceptance.

## September 10 Screenshot Set (Historical)

- Revision 3 is in `output/playwright/storefront-2026-09-10-r3/`: five selected
  1920x1080 genuine gameplay PNGs and all 21 source frames across seven holes.
  New captures match the unchanged 1f5bc92b... archive and b56f1ef4... HTML below,
  the same build used for the successful continuous-course test.
- Both capture runs used the packaged Mac app, disposable profiles and normal
  course-picker/aim/Fire inputs. All seven fired shots were observed in flight
  with one stroke. No injected gameplay/camera/DOM state, retouching or upscaling.
  macOS clamped the window to 1684x1000; renderer capture was 1920x1080 at DPR 1.
- Selected PNGs and supplemental portal frames were directly inspected. The
  verifier passes all 21 PNG hash/dimension checks, the five-file selection,
  both receipts and exact current archive matching. No observed page/console
  errors or external renderer requests. Both native processes exited normally.
- Browser policy blocked local HTML gallery rendering. Static checks confirmed
  the selected image order, file references and absence of scripts; gallery
  layout is not browser-verified. No alternate browser workaround was attempted.
- Only private assets, capture/check default paths and documentation changed.
  Revision 1/2 image and receipt bytes remain historical and unchanged. Current
  matching is not store acceptance: rights, publisher setup, Windows/hardware,
  human review, capsule/library art, trailer and exact publication approval remain.

## September 10 Continuous Course Check (Historical)

- On the unchanged round-summary archive below, a single native Mac run completed
  all 19 holes through normal UI controls, built-in aim assistance and selective
  Space-held boost recovery. No score, position, win or gameplay state was injected.
  The run used a disposable profile and lasted 16 minutes 18 seconds including
  transitions, screenshots and replay checks, not a player-time benchmark.
- Actual scores: 1,2,2,4,3,2,3,2,9,4,8,8,3,5,4,2,3,3,6. The final screen matched
  all 19 rows, 74 strokes, par 87, difference -13 and COURSE COMPLETE. No native
  upsell appeared. Play Again returned to Hole 1 with zero strokes and total.
- Desktop 1280x800 and narrow 390x844 final screens were visually inspected.
  All hole rows and replay/home controls are visible. The narrow panel width
  and scroll width both measured 375px; page width was 390px. This is not
  physical mobile-device acceptance or an accessibility audit.
- There were no observed page/console errors or external renderer requests.
  The longest shot was 30.204 seconds. Limits remained 12 shots per hole and
  90 seconds per shot. Boost holds were 1500ms, only when leaving an obstacle
  on Holes 13,17,18,19. The harness records this strategy explicitly.
- Preserve the first run: it completed Holes 1-15, then reached the 12-shot
  limit on Hole 16 while boosting after every obstacle landing. All shots
  settled, with no script errors; the longest was 54.548 seconds on Hole 4.
  The successful second run used no boost on Hole 16 and completed it in two
  shots. This is evidence for a playable route, not proof of balanced difficulty.
- Reports, input/state records, screenshots and the exact source of each
  harness are in `output/playwright/continuous-2026-09-10/run-1/` and `run-2/`.
  The passing run began 2026-09-10T18:29:20Z and completed at 18:45:38Z.
  Its harness SHA-256 is
  `a4fb9348d17d8707266e5e28ba4011270db26ea50b49e6154e92d0f2fde76f9c`.
  Twelve option-validation cases passed for default/selective/invalid inputs.
  All 17 existing desktop regression tests passed again.
- Only the QA harness and records changed. Source HTML and both package hashes
  remain those in the next section. This closes the continuous Mac course-smoke
  gap, not human timing/balance testing, Windows execution, store installation,
  support/rights clearance, publisher setup, release approval or verified revenue.

## September 10 Round-Summary Build (Historical)

- Completed real boost recovery on Hole 17 without changing physics or difficulty.
  The earlier aim-only shot cap was not a hard stop. Holes 18-19 also completed
  on the prior aim-control archive, followed by a working replay reset.
- The first boost test incorrectly expected the counter to stay decremented
  throughout a 1.5-second hold. Event-time diagnostics confirmed a charge was
  spent (6 to 5), then restored by an existing gravity-graze reward (back to 6).
  The harness now verifies actual activation and immediate charge use, while
  preserving the earlier failed assertions as test-development history.
- That real partial round exposed a summary bug: 8 strokes on the two par-6
  final holes were compared with the whole 87-par course, producing -79.
  `showGameComplete()` now uses par only from played holes and labels incomplete
  courses `ROUND SUMMARY` with their played count. Full-course, free-course and
  Daily completion headings remain intact when their target holes are played.
- Five source-function regressions cover partial, full, free, Daily and empty
  results. Three failed before the correction; all five pass afterward. All
  17 desktop tests and 102 web tests/type checks/build pass. Only the summary
  function changed from the previous game source; no course, physics, renderer,
  timing, gameplay controls or dependency changes were made.
- Both unsigned packages verify 24 allowlisted assets with identical archive:
  `1f5bc92bcdb81a9e8913b75f203cfd801440c11d258d1eeabe3822c80719ae04`.
  Source HTML SHA-256:
  `b56f1ef4c02dca125b97f6dfc728f8750da6feffb9dd9f8c1148d44675518cf5`.
- On this build, the 17-19 segment completed Holes 17 and 18 in 4 and 2 shots,
  then reached its 45-second settling limit while Hole 19 shot 2 was still
  orbiting. A separate direct Hole 19 run used an explicit 90-second limit and
  completed in 5 real shots (longest shot 24.9 seconds in that run).
  Preserve the earlier timeout; this is not a continuous-round acceptance pass.
- The final-hole summary correctly shows 5 strokes, played par 6, difference -1,
  `ROUND SUMMARY`, and `1/19 HOLES PLAYED`. All 19 rows match actual scores or
  unplayed marks; no native unlock button appears. Play Again returns to Hole 1
  with zero strokes/total. Desktop 1280x800 and narrow 390x844 screenshots were
  inspected. The narrow summary has no horizontal overflow (375px panel width
  and scroll width); this is a viewport check, not mobile-device acceptance.
- Current-build native smoke passed trainer/skip, actual shot, Hole 9, Daily,
  fullscreen/exit, notices, save value across restart and MP3 playback state
  (2.05 seconds, readyState 4, not paused, no error). No observed script errors
  or external renderer requests. The standard browser-game client separately
  loaded playable Hole 8 with services disabled; screenshot/state inspected.
- Results and earlier failed harness/timeout records are preserved under
  `output/playwright/recovery-2026-09-10/`. The final-hole report pins the source
  harness hash, with matching `harness-source.mjs` included. The later continuous
  run above closes the current-build course-smoke gap. Timing/balance playtesting
  and Windows execution remain open. Historical runs retain their original scope.
- No Windows hardware, store-client installation, publisher enrollment, rights
  clearance, paid fee, listing, upload, launch or independent-customer revenue
  is established by this work. Earlier screenshot galleries retain their scope;
  the current-build revision 3 is recorded above.

## Aim-Control Build (Historical)

- Corrected one azimuth sign in `snapToOptimal()`. The slingshot slider now
  stores pull direction, matching what `computeLaunchFromSliders()` reads.
  Changing power after assistance no longer mirrors the horizontal heading.
  No course, gravity, rendering, timing or shot-strength formula was changed.
- Three regression cases execute the actual source functions with pinned
  Three.js, including positive/negative azimuth and a rotated surface frame.
  They failed before the fix with 59.07, 115.86 and 38.25 degree errors and
  pass afterward. All 12 desktop tests and 102 web tests/type checks/build pass.
- Native visible-power-bar input reproduced the old issue on Hole 1: a one-point
  power increase produced 47.5 route deviation. The rebuilt Mac app passed on
  Holes 1, 5 and 8 with deviation 0.6, 1.0 and 0.8, respectively, and fired all
  three adjusted shots. This metric includes slider rounding and power change;
  it is not a pure angular measurement. No script errors or external renderer
  requests were observed in the successful run.
- Both unsigned packages have the same verified 24-asset game archive:
  `80eadf449ac29cd0ca4440e5ca9731127b8f7fa42ce99ef93ffe77969c45d709`.
  Source HTML SHA-256:
  `233c7c610e79964e2857ff501a6bddfba98eaa24c3af8075f74b3d8de91bf3d9`.
- Course QA on the prior portal-glow build completed Holes 1-12 consecutively
  with scores 1,3,3,4,3,2,4,6,6,2,4,5 (total 43). The six-shot limit stopped
  that run on Hole 13. A separate normal course-picker run completed Hole 13
  in 12 assisted shots. No gameplay state, wins or scores were injected.
  This disproves the earlier apparent hard stop; it does not establish good
  difficulty balance or a full 19-hole continuous round.
- On the current aim-control build, a new segment completed Holes 14, 15 and 16
  in 3, 3 and 2 assisted shots. Hole 17 (Neutron Alley) reached the 12-shot cap,
  repeatedly settling on moving obstacle 21. No shot timed out and no script
  errors or external renderer requests were observed. Holes 18-19, the final
  scorecard and replay were not reached. Next: test real manual/boost recovery
  on Hole 17, then complete the remaining course and continuous-round acceptance.
- Full native smoke checks passed again on the current packaged Mac app:
  trainer/skip, actual shot, Hole 9, local Daily Challenge, fullscreen/exit,
  notices, save value across restart and MP3 playback (2.064 seconds, readyState
  4, paused false, no media error). No script errors or external renderer
  requests were observed. Windows execution and human listening remain open.
- The standard browser-game client loaded playable Hole 8 from the generated
  payload, after the intro, with live services and purchases disabled. Its
  screenshot/state were inspected; no client error artifact was produced.
  This load/render check complements, not replaces, native control testing.
- Per-shot states, real inputs, screenshots, scopes and build hashes are saved
  under `output/playwright/course-2026-09-10/`. Earlier results remain tied to
  their original archive; the combined coverage is not a continuous-round pass.
- The initial course-picker test selected Hole 12 because of a harness selector
  offset; the first native aim test used variable names instead of DOM IDs.
  Both harness errors were corrected before the successful evidence above.
- Screenshot revision 2 remains unretouched evidence for the prior portal-glow
  archive, not this control-fix archive. The exact-build storefront verifier
  intentionally rejects it until final-build screenshots are recaptured.

## Portal-Glow Build (Historical)

- Corrected the untextured additive portal sprites using one lazy shared 64x64
  radial alpha texture, with no mipmaps and no depth writes. Existing geometry,
  course data, physics, teleport behavior and animation loop are unchanged.
- Nine desktop tests pass, including two new tests using actual Three.js
  materials/geometry and a fixture canvas. They verify one shared 16 KiB RGBA
  texture allocation, reuse after level cleanup and no per-frame texture updates.
  The fixture does not prove GPU timings; minimum-spec performance QA is pending.
- Existing 102 web tests, TypeScript and the 17-file public web build pass.
- Standard gameplay client loaded actual Hole 8 after its intro; the captured
  portals have no square glow backgrounds. Artifact: `/tmp/gravitygolf-portal-gameplay/`.
- Rebuilt both unsigned prototypes. Each ASAR matches all 24 bundled public
  assets and has SHA-256:
  `fa0993ca459de311dce5364161480b366d4445787351f85461ed1b1ccf77fd49`.
  Source HTML SHA-256:
  `3ea77ad782f6145d5ba3423914c8450f54a327672045dbef0f586af1abf4a00a`.
- The rebuilt packaged Mac app passed the complete native smoke test again:
  training/skip, actual shot, Hole 9, Daily Challenge, fullscreen/exit, notices,
  save value across restart and bundled MP3 playback state (2.84 seconds,
  readyState 4, paused false, no media error). No observed script errors or
  external renderer requests. Human listening and Windows execution remain open.
- Screenshot revision 2 is under `output/playwright/storefront-2026-09-10-r2/`.
  Old captures and hashes below are historical, not evidence for this build.
- No live website, commerce configuration, original checkout, store account,
  payment, upload, publication or restart was changed/performed.

## Initial Build (Historical)

- Source: isolated `codex/updates-2026-09-07` worktree, base commit
  `74f29f63efd2d88d81c1b58400f523861346b2bb`, with uncommitted updates.
  Source HTML SHA-256:
  `2f6560cee9e3f1e11f1d7da70c17bf67153e1725a0c57a24f91abf1131c1c795`.
- Seven desktop tests pass: fail-closed adaptation, unchanged Pro course data,
  JavaScript syntax/CSP, exact local asset paths, MP3 byte ranges, renderer
  security options, and every generated public asset's hash.
- The locked desktop dependency audit reported zero known vulnerabilities.
  This is an advisory snapshot, not a complete security audit.
- Development Electron and the actual packaged macOS arm64 app both passed
  native Playwright checks: Electron 44.3.0 / Chromium 152.0.7977.78.
- Tested through the UI: ball selection, Tee Off, Launch Lab, Skip Training,
  a shot, 19 selectable holes, direct Hole 9, local Daily Challenge, F11
  fullscreen / Escape exit, local notices and the complete Three.js license.
- A localStorage test value survived process shutdown/relaunch in a disposable
  profile. This is not full-round save/resume, Steam Cloud or cross-device proof.
- The real bundled MP3 decoded and advanced to 3.13 seconds in the packaged run:
  readyState 4, paused false, no media error. Human listening remains separate.
- Observed native renderer flows had zero page/console errors and zero HTTP(S),
  WebSocket or file requests. Native OS/Electron background networking was not
  exhaustively packet-captured. The local protocol and CSP guards were enabled.
- The standard web-game client separately exercised CHOOSE HOLE and loaded
  playable Hole 9 from the generated payload. Screenshots/state were inspected
  at `/tmp/gravitygolf-steam-web-course/` and `/tmp/gravitygolf-steam-web-gameplay/`.
- Both packaged ASARs match generated app code/metadata and all 24 public assets.
  No backend, node_modules, .env or repository files are packaged. Packager
  intentionally removes npm-only `private` metadata. Both ASAR SHA-256 values:
  `6a0426f6e4648ad9264719e9594955234773c81238ad72dc594104b82b13c9ee`.
- Windows output is a PE32+ x86-64 GUI executable; macOS is Mach-O arm64.
  Windows was generated, not executed or approved for release.
- After saving into the actual isolated repository, all seven desktop tests and
  both package-integrity checks passed again. The existing 102 web tests,
  TypeScript checks and allowlisted 17-file web build also passed. No desktop
  package or dependency was included in the public web build.

## Fixes Found During QA

- Removed a top-level ESM await that prevented Electron startup.
- Corrected the packager API import and added clearly labeled prototype Windows
  metadata, without claiming a verified legal publisher.
- Fixed the Daily Challenge button overlapping the new course-dialog heading.
  A layout assertion covers that regression.
- Corrected harness assumptions about div-based ball buttons, click-to-aim
  controls and native keyboard events. Fullscreen QA waits for actual macOS
  transition events, not a guessed fixed delay.

## Still Required

Steamworks enrollment, approved Steam Direct fee, bank/tax/entity authority,
working support, name/rights clearance, policies and content survey, approved
model/price/territories, store artwork and genuine gameplay trailer, human full-course
playtesting, minimum-spec performance testing, accessibility/controller decisions,
Windows device QA, release signing/notarization decisions and Steam-client tests.

No AppID, depot upload, agreement acceptance, fee payment, public store page,
release, deployment, live charge or computer restart occurred. No Steam revenue
or store acceptance is claimed. See README.md for the publishing sequence.
