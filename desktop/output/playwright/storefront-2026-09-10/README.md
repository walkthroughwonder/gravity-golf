# Gravity Golf: Private Store Screenshot Review

**Archived pre-fix gallery.** These original captures/receipts no longer match
the current packaged build. Use `../storefront-2026-09-10-r2/review.html` for the
fresh set. The historical image/receipt bytes are unchanged; the new verifier
intentionally rejects a current-build match if given this old directory.

Captured September 10, 2026. Open `review.html` for the five-image shortlist.
**Private candidates only. Nothing submitted, published or legally cleared.**

## Deliverable

- Five selected, genuine gameplay PNGs at 1920x1080, across five authored holes.
- Original HUD and game rendering, with no added text, compositing, retouching,
  generated imagery, cropping, post-capture upscaling or hidden gameplay objects.
- Twenty-one total source frames across seven holes in `capture-main/` and
  `capture-additional/`. Each directory has its own `capture.json` receipt.
- `selection.json` identifies the five original files and their display order.
  Review captions are outside the images and are not screenshot upload content.

## Provenance And Limits

Actual packaged macOS arm64 prototype, not a mockup or website capture. The
native window was display-clamped to 1684x1000, so Playwright set the renderer's
viewport to 1920x1080 at device-pixel ratio 1. The game rendered at that size;
the images were not resized afterward. This is not a performance benchmark.

Both runs used disposable local profiles and normal ball selection, course
picker, mouse aiming and Fire inputs. The existing built-in assisted route was
left enabled. Game state was read only for receipts and waits; no positions,
scores, completion state, abilities or camera parameters were injected.
All seven fired shots were observed in flight with one stroke. This does not
prove successful hole completion or manual/unassisted skill.

Each receipt records runtime versions, source manifest, image hashes, input
history, timestamps and state before/after capture. Across the two runs there
were zero observed page/console errors and zero external renderer requests.
Both app instances closed and their temporary profiles were removed.

Verified game archive SHA-256 (same Mac and Windows payload):

`6a0426f6e4648ad9264719e9594955234773c81238ad72dc594104b82b13c9ee`

Original source HTML SHA-256:

`2f6560cee9e3f1e11f1d7da70c17bf67153e1725a0c57a24f91abf1131c1c795`

The source contains uncommitted work; the base Git commit alone does not
identify this build. Windows execution and Steam/Epic Launcher acceptance are
not established by captures of the Mac app.

## Visual Findings Before Release

Square colored quads are visible behind the wormhole rings in the Hole 8 and
Hole 10 source captures. Those frames are excluded from the shortlist but kept
as evidence. The current `createWormholePortal` glow uses an additive
`SpriteMaterial` without an alpha texture; this is a likely cause, not a tested
fix. Correct it in the isolated game source, rebuild, and verify actual portal
frames before marketing those effects. Do not retouch the flaw out of a
gameplay screenshot. No gameplay or rendering source was changed in this pass.

Some wide views have small HUD text and faint dark hazards; assess legibility
on actual target displays. No performance or accessibility claim is made.

## Store Use

Valve currently requires at least five genuine gameplay screenshots, 16:9,
minimum 1920x1080. Avoid marketing-copy overlays and unrelated menu/concept
images. [Steam specification](https://partner.steamgames.com/doc/store/assets/standard),
checked September 10, 2026. Meeting these checks is not store acceptance.

These are candidates for both Steam and Epic; check Epic's current portal
fields and acceptance requirements before uploading. Capsule/library artwork
and a final gameplay trailer remain separate deliverables. Existing vertical
first-shot promo files elsewhere in the repo were not overwritten.

Before public use: verify visual match to the final shipping build, clear name
and asset rights, confirm publisher/support details and platforms, and obtain
owner approval for the exact upload/publication. No storefront logo, release
date, price, user testimonial or availability claim has been added.

## Reproduce

From `desktop/`, use the existing trusted Playwright module:

```sh
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs \
node scripts/capture-storefront.mjs "$PWD" /absolute/path/to/new-output 1,5,8,10,11
```

Use a fresh output directory for each run. The supplemental run used `3,6`.
The capture script launches the already-built Mac prototype. No install,
network server, store SDK, upload or production credential is needed.

```sh
node scripts/verify-storefront.mjs
```

The verifier checks all recorded PNG hashes/dimensions, the five-file selection,
both capture receipts and their match to the current packaged game archive.
