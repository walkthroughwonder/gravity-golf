# Gravity Golf: First-Shot Draft

Status: PRIVATE REVIEW ONLY. No upload, post, deployment, ad spend or sale.

## Asset

`gravity-golf-first-shot.mp4`: 10 seconds, vertical 1080x1920, 30 fps,
H.264/AAC. The complete first shot is shown chronologically at its recorded
speed. The golden title, verified result and four-second play link are added
in editing. Labels disclose local WIP footage and the built-in assisted route.

## Proposed Owner Caption

I'm building Gravity Golf, a playable work-in-progress game where planets
bend your shot. Here's the first hole using the built-in assisted route,
captured from my local build. Try the free course at https://gravitygolf.xyz.

## Before Posting

- Obtain approval for this exact video, caption, destination account and post.
- The public site was verified to load on 2026-09-08, and its authored level
  arrays exactly match the local capture source. Still check a fresh guest
  playthrough before posting: the inspected browser had an existing player
  account, which was left untouched. This draft does not prove local payment
  or analytics changes have shipped. See `../../REVENUE_READINESS.md` for
  the currently mismatched live course/Stripe copy and unverified fulfillment.
- Confirm the soundtrack can be used in public promotional clips. The audio
  is captured from the game's own mix, not separately licensed for this draft.
- Watch the MP4 on a phone with sound on and muted. Technical decode and
  signal checks are complete; subjective listening and phone playback review
  still need the owner. No voice, avatar or player testimonial was fabricated.

## Small Organic Test

Publish once on an owner-approved existing account after the checks above.
Use the free game as the single call to action. Do not buy ads or claim
conversion rates, player counts or revenue without evidence. Compare actual
visits and completed plays when owner-authorized analytics is available;
use the Stripe ledger, not browser unlocks, for actual sales.

## Evidence And Reproduction

`source/gameplay-raw.webm` preserves the unedited game canvas plus its Web
Audio output. `source/capture.json` records inputs, timestamps, state and the
captured HTML SHA-256. UI screenshots preserve the original HUD and actual
one-stroke completion even though DOM overlays are absent from the canvas
video. The public game files were not edited for this capture.

Recorded 2026-09-08 from the isolated clone's localhost build. HTML SHA-256:
`e82bc346d3052451bdf847a1aad837ab22ad541095b3f17c9bfb406faa5d6b75`.
Source and `dist/index.html` matched. Hardware capture yielded 281 source
frames over roughly 9.9 seconds; the export is normalized to 300 frames over
10 seconds. This is not a native 1080p or game-performance benchmark.

The game reports Hole 1 complete in one stroke before the edited result
caption appears. No boost, ability, score injection, physics patch, manual
ball teleport, paid unlock, payment or private account access was used.
Browser page-error and failed-request arrays are empty. Usage data and live
commerce remained off.

`gravity-golf-first-shot.edit.json` records the raw and final file hashes and
edit decisions. `review-contact-sheet.jpg` is a frame-review artifact, not a
separately published image. The raw mix and encoded audio are non-silent;
the checked export has approximately -23.4 dB mean / -8.0 dB peak level.

The capture script needs the local preview at port 8770, the installed
Playwright path and macOS Chromium. Use a new output directory for each take:

```sh
GG_CAPTURE_RENDERER=metal GG_CAPTURE_OUTPUT=/tmp/gg-new-take \
  /usr/local/bin/node scripts/capture-gameplay.mjs
/usr/local/bin/node scripts/render-promo.mjs \
  /tmp/gg-new-take/gameplay-raw.webm /tmp/gg-new-export/first-shot.mp4
```

The fixed render refuses footage without a recorded assisted one-stroke
Hole 1 completion before 3.9 seconds. Review every new take rather than
assuming it repeats this result. The scripts are local production tools and
are not loaded by or included in the game's public build.
