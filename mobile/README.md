# Gravity Golf Mobile

Capacitor 8 wrapper for the App Store and Google Play editions of Gravity Golf.

## Identity

- App name: Gravity Golf
- Bundle/package ID: `com.epoch6.gravitygolf`
- First release: guest-only, complete course, offline gameplay

## Commands

```bash
npm install
npm run build:web
npm run verify:web
npm run build:assets
npm run add:ios
npm run add:android
npm run generate:native-assets
npm run sync
```

`scripts/prepare-web.mjs` derives `www/` from the production `../index.html`, bundles Three.js, fonts, and music, unlocks the complete course, and disables web-only account, leaderboard, and Stripe surfaces.

The web build is intentionally different from the live site: it bundles all runtime assets locally, unlocks the full course, and removes account, leaderboard, and Stripe code from the store binary. The iOS and Android shells add landscape locking, full-screen layout, native haptics, and branded launch assets.

## Verified

- Offline web build and all required local assets
- Full six-step touch trainer and clean handoff to Hole 1 at 844x390
- iPhone 17 simulator launch, privacy sheet, full trainer, and Hole 1 handoff
- Unsigned iOS Debug simulator build
- Unsigned iOS Release arm64 device build with Xcode bundle validation
- `Edwin Rosero` team selected for automatic signing
- Signed iOS Release device build with a valid Apple Development identity and Xcode-managed provisioning profile
- Signed App Store archive created and preserved in Xcode's standard Archives folder

## Submission blockers

- Account Holder must accept Apple's current Program License Agreement in App Store Connect.
- Create the App Store Connect app record, then export and upload the archived build.
- Publish `store/privacy-policy.html` at a public HTTPS URL.
- Choose App Store and Google Play pricing.
- Install Android Studio 2025.2.1+ with Android SDK/API 36 before producing the Android App Bundle.

Store copy, review notes, privacy answers, and release checks are in `store/`.
