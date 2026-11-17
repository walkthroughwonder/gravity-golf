# Gravity Golf: Sharing And Install Assets

Status: local branch only. No deployment, account change, installation or post.

## Changes

- Head-only description, canonical and Open Graph/card metadata describe the
  existing free browser course. No price, sales, store or offline availability
  claims. Canonical and social-image URLs target the intended public domain,
  not a local preview or a URL containing account/payment data.
- The formerly missing manifest now has a stable identity, relative scope/start
  URL, standalone display, and real 192x192 and 512x512 PNG icons.
- Apple touch icon is a real 180x180 PNG. Icons use purpose any, not maskable:
  the orbit artwork has not been qualified for every platform's cropping mask.
- The square 512-pixel icon is reused for the summary social card. This is an
  icon-led preview, not a gameplay screenshot or an actual platform-rendered card.

## Source And Performance

The existing `Gravity Golf/mobile/assets/icon.svg` was copied unchanged to
`marketing/brand/icon.svg`; both SHA-256 hashes are
`64bb4d70c1150bb1f9924660aa6f9cd43efd0505ce31928ede729a19f9d2e60d`.
Sharp 0.35.4 exported PNGs from that vector at 192, 512 and 180 pixels using
density 144 and PNG compression level 9. No new runtime or build dependency was
added to the game. All three exports were generated locally; the 512-pixel export
was visually inspected. Combined PNG size: 186,673 bytes.

All gameplay script blocks, styles and body markup are byte-identical to the
pre-change public build. The new work adds static metadata/assets, not per-frame
effects. This is a source-level performance safeguard, not an FPS benchmark.
Build output remains explicitly allowlisted: twelve public files, no private
art source, backend, docs, credentials or test fixtures.

## Verification

- `npm run check`: typecheck, 86 tests and public build passed in the actual clone.
- Chrome read and parsed the local manifest with no errors. Its installability
  diagnostics returned no errors. This did not install an application.
- Desktop and 390x844 opening screens visually checked. The existing Tee Off ->
  trainer -> Skip Training -> Hole 1 flow remained accessible on the local build.
- Browser warning/error logs were empty at inspection. Temporary viewport and
  preview tab were cleaned up; the credential-free static server was stopped.
- Git diff whitespace check and actual-public-build secret scan passed.

## Release Gates

The domain's new icon URL is not verified live because this branch is not
deployed. Actual social crawlers must be checked after an approved deployment.
Real iOS/Android install, relaunch, identity/restore and checkout-return behavior
still need device tests. No service worker was added, so do not promise offline
play. This work does not place the game in an app store.

Manifest requirements were checked against
[MDN's installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
Chrome's local diagnostic result is narrower than a successful real-device
installation or an approved production release.
