# Gravity Golf: Private Desktop Gameplay Trailer

Status: PRIVATE OWNER REVIEW. Not uploaded, posted, submitted or released.

Preview: `gravity-golf-desktop-gameplay-draft.mp4`.
Visual contact sheet: `review/contact-sheet.png`.

## The Cut

Thirty seconds, 1920x1080, H.264/AAC stereo MP4. Real desktop gameplay with the
original HUD for 27 seconds, followed by a three-second title card. All gameplay
is visibly labeled `LOCAL DESKTOP BUILD / ASSISTED AIM`. No release date, store
availability, price, review quote, or purchase/wishlist link is claimed.

| Final Time | Source Take | Source Range | Actual Content |
| --- | --- | --- | --- |
| 0-7s | Hole 1 | 7.4-14.4s | Aim, launch, real hole-in-one |
| 7-17s | Hole 6 | 8.8-18.8s | The Slingshot, first flight |
| 17-27s | Hole 11 | 12.4-22.4s | Twin Suns, first flight |
| 27-30s | Title card | 3s | Gravity Golf / Playable work in progress |

Hard cuts select these portions of independent takes; they are not one
continuous course. No time acceleration, slow motion, frame interpolation,
camera/physics manipulation, score injection, invented results or game overlays
were used during capture. The small provenance label and final title card are
editorial additions. Only Hole 1 is presented as completed.

## Capture And Audio

The unmodified current packaged Mac app was recorded using the existing
Playwright/Electron test environment with disposable profiles. Normal ball
selection, course picker, mouse aim and Fire inputs; built-in aim assistance.
The renderer was set to 1920x1080 before gameplay because macOS clamps native
window size. The capture includes the renderer/HUD, not the desktop, microphone,
other apps or publisher account pages. All three profiles were cleaned up.

Raw Playwright video is 25fps VP8 and has NO AUDIO. The 30fps delivery duplicates
frames; it is not native 30fps capture or proof of 30fps gameplay performance.
The high-bitrate export does not restore detail absent from the source capture.
No game or packaged dependency was changed.

Music is the first 30 seconds of the existing `soundtrack.mp3`, added as an
editorial bed with level normalization and edge fades. It is NOT live gameplay
audio and contains no captured in-game SFX. The owner previously identified the
music as their work under AGI House, but rights/assignment/sample clearance is
still pending. This draft does not establish legal clearance. No new paid or
generated music was used. Human listening and whole-video playback remain open.

## Evidence

`capture/capture.json` records the current ASAR/source hashes, actual input
timestamps, game-state observations and runtime data. All three takes had one
Fire input, observed flight and no observed page errors or external renderer
requests. The first take reached a real one-stroke completion. `capture/` keeps
the full raw recordings, PNG observations and exact original capture script.

`edit.json` records cut ranges, source/music/logo/output hashes and the exact
renderer hash. `verification.json` checks the actual output streams, dimensions,
duration, 900 output frames, full decode, fast-start MP4 layout, audio levels and
matching current game package. This proves file/receipt properties, not human
approval, target-hardware performance, rights clearance or store acceptance.

Directly reviewed all three raw contact sheets, the final contact sheet, the
opening full-resolution frame and cut/title boundary frames. No full human
motion or listening review has been completed by this workflow.

Current Valve guidance checked on 2026-09-11: lead with real gameplay/HUD and use
a high-bitrate widescreen H.264/AAC delivery. See
[Steamworks trailers](https://partner.steamgames.com/doc/store/trailer).
Epic-specific upload fields and acceptance remain unverified.

## Follow-Up Before Release

- Owner: watch and listen to the entire draft; approve the exact cut and artwork.
- Performance: Twin Suns took about four seconds between the recorded aim
  click and first aiming-state receipt during video capture. Investigate without
  recording overhead before declaring the cause or setting minimum requirements.
  Loading, introductions and most aim setup are omitted by the montage; this is
  not a responsiveness or benchmark demonstration.
- Clear name/IP, music and artwork disclosures, intended publisher authority,
  support and refund handling. Complete Windows/target-hardware acceptance.
- Sign in to Steamworks and Epic. Both still displayed sign-in forms during
  this turn; no enrollment, fee, organization or product status was inferred.
- Recheck exact current build before submission; a gameplay change may require
  new footage. Obtain explicit approval before uploads, payments or publication.

## Reproduce

Use a new output folder rather than overwriting reviewed files. Existing Node
22.17.0, Playwright, FFmpeg 8.1 and the current packaged app were used. No new
game dependencies or permissions are required. Native app execution requires
the normal local execution approval, not a computer restart.

```sh
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node scripts/capture-trailer.mjs "/repo/desktop" "/new/output/capture" 1,6,11
node scripts/render-trailer.mjs "/repo" "/new/output"
node scripts/verify-trailer.mjs "/repo" "/output"
```

Retain the exact scripts under the output's `scripts/` folder before verifying.
The renderer's cut points were selected for these saved takes; new recordings
require fresh visual edit-point review, not blind reuse of these time offsets.
