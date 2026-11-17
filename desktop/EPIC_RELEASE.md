# Gravity Golf: Epic Games Store Release Preparation

Reviewed September 10, 2026. **Private planning only. Not uploaded, listed,
enrolled, approved, or cleared for release.**

## Store And Commercial Direction

Interpret the owner's "Unreal store" request as the Epic Games Store, where
players buy games. Fab is Epic's marketplace for development assets, a separate
licensing/product decision. Do not offer the game's source or asset rights for
sale merely because the owner asked for a second game storefront.
[Fab overview](https://www.fab.com/o/about).

Target Steam and Epic non-exclusively, using the same offline desktop codebase.
Epic is engine-agnostic, so retain Three.js/Electron instead of converting the
game to Unreal. Epic lists a separate recoupable $100 USD submission fee per
game; confirm the actual checkout total and terms before asking the owner to
pay. [Epic distribution FAQ](https://store.epicgames.com/distribution?lang=en-US).

The current general share is 100% to the developer on the first $1 million in
net revenue per product per calendar year, then 88% to the developer / 12% to
Epic. It applies to Epic-processed payments, combines the title's supported
platforms, and resets January 1. Separate agreements can affect payouts. This
is not a profit forecast or a promise of no taxes, refunds or other deductions.
[Revenue-share terms](https://store.epicgames.com/distribution/revenue-programs/revenue-share?lang=en-US).

Do not opt into Epic First Run: its six-month exclusivity would conflict with
the requested non-exclusive Steam + Epic launch. The general revenue-share
policy is not itself that exclusivity program.
[Epic First Run](https://store.epicgames.com/distribution/revenue-programs/epic-first-run-program?lang=en-US).

## Current Artifact And Scope

Artifact status updated September 11; the policy review above remains dated
September 10 and must be rechecked before a consequential portal action.
Current private candidate folders in this repository:

```text
desktop/out/aim-worker-2026-09-11/Gravity Golf Prototype-win32-x64/
desktop/out/aim-worker-2026-09-11/Gravity Golf Prototype-darwin-arm64/
```

Windows launch executable within its complete folder: `gravity-golf.exe`.
The whole distribution folder is needed, not just the EXE or ASAR. Do not upload
the repository root, dependencies, .env, web backend or QA records.

Both candidates have the same verified game ASAR:
`dd0753e970b79ea92998563d17c1b42e3ae1e91b7584313f5a4cda67bf3a4ffd`.
The prior September 10 packages remain unchanged directly under `desktop/out/`
with ASAR `1f5bc92bcdb81a9e8913b75f203cfd801440c11d258d1eeabe3822c80719ae04`.
They contain 19 authored holes, local Daily Challenge, music and the trainer.
The current aim-worker candidate passed a separate continuous 19-hole Mac smoke
run: 62 real shots, seven boost recoveries, correct scorecard and replay reset.
Human balance testing and exact current-build scope are in
[AIM_WORKER_QA.md](./AIM_WORKER_QA.md). Existing marketing captures belong to the
earlier build and must not be silently relabeled as this candidate.
Windows has not been tested on a PC. Neither has been installed/launched through Epic.
See [verification scope](./VERIFICATION.md).

No Epic SDK, login, store ownership validation, cloud save or platform
achievement integration exists. Local mastery medals are not store achievements.
No shared web/Steam/Epic purchases or account migration is promised. Keep the
prototype's current save path unchanged for now; choose and test a neutral
release profile/migration policy before either store ships.

## Approval And Acceptance Checklist

- [ ] Confirm the authorized Epic account and intended publisher organization.
  The intended LLC needs verified publication rights and correct contact,
  tax and payout information. Owner handles sensitive records and approves
  agreements/submissions; do not put them in source control.
- [ ] Owner approves the separate $100 submission fee and exact checkout total.
  No fee, account creation or agreement acceptance is authorized by this document.
- [ ] Complete the shared rights, name, soundtrack, licensing, privacy, support
  and entity gates in the repository's launch compliance records. Confirm a
  monitored contact before publishing; the proposed support email is unverified.
- [ ] Approve the one-time full-course purchase model, price, territories and
  language/platform claims. Retain no in-game upsell in this candidate. A better
  store share alone is not evidence of demand; track real sales after release.
- [ ] Before adding multiplayer, implement and test play between PC stores.
  Before shipping achievements on Steam or another PC store, implement Epic
  Games Store achievements too. The current proposed release has neither online
  multiplayer nor platform achievements. Recheck this gate whenever features
  change. [Epic requirements](https://store.epicgames.com/distribution?lang=en-US).
- [ ] Complete applicable ratings/content disclosures and the actual final
  store-page fields, with real gameplay images/video and accurate system
  requirements. Do not select unsupported features or assume the owner's age
  preference is a formal rating. Epic advertises IARC within its portal.
  [Epic publishing overview](https://store.epicgames.com/distribution?lang=en-US).
- [ ] Verify current artifact configuration and upload workflow in the owner's
  Epic Developer Portal, after onboarding and approval. Obtain real product,
  sandbox and artifact identifiers there; do not invent IDs or upload scripts.
  Use private testing first and keep secrets and launcher auth values out of logs.
- [ ] Test clean Windows installation, launcher start/quit, offline operation,
  save persistence, updates, uninstall/reinstall, display/DPI, alt-tab,
  fullscreen, audio devices and all holes on supported hardware. Repeat for
  macOS only if choosing to advertise Mac support. Resolve final signing,
  notarization and save-profile decisions before submission.
- [ ] Record Epic Launcher/private-build acceptance against exact artifact
  hashes. A passing standalone Electron test is not store integration proof.
- [ ] Obtain action-time approval for each upload, review submission, public
  listing and launch. Use Epic's current portal review status; do not copy
  Steam's 30-day/two-week requirements into an assumed Epic schedule.

## Initial Planning Verification (Historical)

Documentation/store-copy changes only. Existing game code, build configuration,
dependencies, save path and packaged binaries were not changed. Both existing
package payloads were rechecked against their generated asset manifest; this
does not add Epic runtime acceptance. No Epic account, fee or upload was used.

Some detailed dev.epicgames.com documentation returned empty/rate-limited
responses during this review. Broad requirements above were checked against
Epic's current public distribution FAQ and revenue-program pages. Detailed
portal upload fields and final review rules remain an explicit onboarding check.
