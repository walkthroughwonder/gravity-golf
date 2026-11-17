# Gravity Golf: Private Store Screenshot Review

Revision 3, September 10, 2026. Open `review.html` for the five-image shortlist.
**Current-build candidates only. Not submitted, published or cleared for release.**

## What Is Included

Five selected, genuine gameplay PNGs at 1920x1080 across five authored holes.
All 21 original source frames across seven holes remain in `capture-main/` and
`capture-additional/`, with complete `capture.json` input/state/hash receipts.
`selection.json` identifies the exact originals and display order. Review-page
captions are outside the images, not content to upload as screenshots.

No retouching, compositing, generated imagery, marketing overlays, hidden game
objects, cropping or post-capture upscaling. The five selected frames and the
supplemental portal views were visually inspected. Wide views have small HUD
text and faint hazards; human legibility review on target displays remains open.

Browser policy blocked automatic rendering of the local HTML review page.
Its image order and local file links were checked statically; gallery layout
was not browser-verified. The screenshot PNGs themselves were viewed directly.

## Provenance

Both runs used the actual packaged Mac app, disposable profiles, and normal ball
selection/course-picker/aim/Fire inputs. Built-in aim assistance was enabled.
No gameplay, scores, camera state or DOM content was injected. All seven fired
shots were observed in flight with one stroke; these captures do not themselves
prove hole completion or unassisted skill.

macOS clamped the native window to 1684x1000. The renderer viewport was set to
1920x1080 at DPR 1 before capture; the images were not resized afterward.
Both runs recorded zero page/console errors and zero external renderer requests.
Both processes exited and their temporary profiles were removed.

Current Mac/Windows game archive SHA-256:
`1f5bc92bcdb81a9e8913b75f203cfd801440c11d258d1eeabe3822c80719ae04`.

Source HTML SHA-256:
`b56f1ef4c02dca125b97f6dfc728f8750da6feffb9dd9f8c1148d44675518cf5`.

This same build passed a separate continuous 19-hole Mac test with selective
boost recovery, accurate final scores and replay reset. See
`../continuous-2026-09-10/run-2/course-report.json`. Windows and store-client
acceptance remain unverified. The uncommitted source is identified by content
hashes, not just the base Git commit. Original capture code is saved as
`capture-script.mjs`; both runs supplied explicit output paths and hole lists.

## Store Use And Holds

Valve currently requires at least five gameplay screenshots, 16:9, minimum
1920x1080, without added marketing copy or concept-art substitutes.
[Steam specification](https://partner.steamgames.com/doc/store/assets/standard),
rechecked September 10, 2026. This set meets those count/dimension checks, not
store review or legal clearance. Review suitability flags in Steamworks before
publication; none were set by this work. Epic portal acceptance is unverified.

Capsule/library artwork and a final gameplay trailer remain separate. The
existing vertical promo was not overwritten. Rights, publisher/support details,
platform claims, exact upload approval and final shipping-build matching are
still required. No fees, uploads, public posts, listings or availability claims.
Revisions 1 and 2 retain their original images/receipts as historical evidence.

## Reproduce And Verify

From `desktop/`, with the existing trusted Playwright module:

```sh
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs \
node scripts/capture-storefront.mjs "$PWD" /absolute/fresh-set/capture-main 1,5,8,10,11
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs \
node scripts/capture-storefront.mjs "$PWD" /absolute/fresh-set/capture-additional 3,6
node scripts/verify-storefront.mjs
```

Use fresh capture directories, never overwrite existing receipts. The default
verifier targets this revision and checks all PNG hashes/dimensions, the five
selected originals, both receipts and exact match to the current packaged game.
