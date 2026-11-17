# Gravity Golf: Private Store Key Art

Status: OWNER REVIEW ONLY. Not uploaded, submitted, approved, or legally cleared.

Open `review/contact-sheet.png` for the full set. `masters/` contains editable,
self-contained SVGs; `png/` contains native-size exports for review. This is
illustrated marketing art, NOT gameplay screenshots. Do not put these images
in a storefront's screenshot gallery. The current real gameplay screenshots
remain in `../../desktop/output/playwright/storefront-2026-09-10-r3/`.

## Files

| PNG / SVG Basename | Dimensions | Intended Steam Field |
| --- | --- | --- |
| header-capsule | 920 x 430 | Store header capsule |
| small-capsule | 462 x 174 | Store small capsule |
| main-capsule | 1232 x 706 | Store main capsule |
| vertical-capsule | 748 x 896 | Store vertical capsule |
| library-capsule | 600 x 900 | Library capsule |
| library-header | 920 x 430 | Library header; same art as store header |
| library-hero | 3840 x 1240 | Text-free library hero |
| library-logo | 1280 x 510 | Transparent library logotype |

`review/small-120x45.png` and `review/small-184x69.png` are readability checks,
not upload replacements. The review contact sheet is also not an upload asset.

## Design And Provenance

Warm-gold Orbitron lettering, a faceted planetary fairway, a green target world,
and a white golf ball communicate the existing game's visual identity. This is
stylized illustration, not an exact hole layout or simulated shot outcome.
There are no quotes, prices, sale badges, release dates, publisher claims,
platform logos, or extra marketing words inside the assets.

The SVG composition was written with AI assistance and rendered locally from
vector geometry. No stock illustration, screenshot retouching, paid generation,
or raster image-generation service was used. Review and truthfully answer each
platform's AI-content questions before submission; do not claim this work was
made without AI assistance.

The existing game's Orbitron font is outlined at weight 900. Original font:
`@fontsource-variable/orbitron@5.3.0`, SIL Open Font License 1.1. The original
license is retained in `ORBITRON-OFL.txt`. No external fonts are needed to open
or rasterize the masters. Planet geometry uses the project's Three.js 0.172.0;
no renderer or game dependency was changed. These files are not loaded by the
game and have no runtime performance cost.

The hero's primary planet, target/flag and ball are inside the conservative
center 860 x 380 area of the full-size image. Ambient orbital lines extend
beyond it. Actual Steam client crop and logo placement need portal preview;
use a left-side logo placement that does not cover the central course.

## Verification

- Checked dimensions against Valve's documentation on 2026-09-11:
  [Store graphical assets](https://partner.steamgames.com/doc/store/assets/standard)
  and [Library assets](https://partner.steamgames.com/doc/store/assets/libraryassets).
- Direct PNG review of the final contact sheet and both small-capsule reductions.
- `scripts/verify-keyart.mjs` checks eight expected dimensions, source/export
  hashes, title-only outlined lettering, absence of embedded images/scripts or
  external links, opaque capsules/hero, and unclipped transparent logo pixels.
- Verification proves these specific file properties, not compliance with every
  store rule, human approval, trademark ownership, or successful publication.

## Rebuild

Render tooling is separate from the game. This run used Node 22.17.0,
fontkit 2.0.4, wawoff2 2.0.1, sharp 0.35.4 and the existing Three.js 0.172.0.
Install those art tools in a separate temporary/tooling directory, not the game
package. Set `SHARP_MODULE`, `FONTKIT_MODULE`, and `WAWOFF2_MODULE` to their module
directories if they are not resolvable beside the script.

```sh
node scripts/render-keyart.mjs "/absolute/path/to/Gravity Golf Updates" "/new/private/output"
node scripts/verify-keyart.mjs "/absolute/path/to/this/art-set"
```

Use a fresh output directory for revisions. The renderer recreates files in its
chosen output; it never builds, installs, launches, publishes, or edits the game.
When generating to a new folder, also retain the exact renderer script there
under `scripts/render-keyart.mjs` before verification. `manifest.json` records
its hash and the source font hash. Fontkit's variable WOFF2 decoding failed in
the first attempt; the final script decompresses with wawoff2 before outlining.

## Remaining Approval Gates

Owner visual approval, name/trademark review, truthful AI disclosures, publisher
authority, portal uploads and store review remain pending. This set is sized
for Steam; do not assume Epic's live asset fields or requirements are identical.
Epic-specific exports should follow the authenticated product portal's fields.
Steamworks and Epic both still showed sign-in forms during the 2026-09-11 check;
that does not establish whether accounts, enrollment, or paid fees already exist.
No live site, account, fee, tax/bank information, listing, or release was changed.
