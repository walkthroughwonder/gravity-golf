# Gravity Golf Rights And Chronology Evidence

Recorded September 9, 2026, America/Los_Angeles. Internal working record, excluded from the public build. This is not a legal opinion, signed declaration, complete clearance search or attorney-client privileged communication. No public allegation, name change, filing or contact with another developer is authorized by this document.

## Owner Statements

- Edwin states: "my code is for sure made before the other gravity golf game". Record as an owner assertion requiring supporting chronology, not a disproven claim merely because a repository import is later.
- Edwin states he made `soundtrack.mp3` under one of his musical artist names, AGI House. Authorship is owner-attested. Composition/master ownership, collaborators, samples, distribution agreements and any applicable generation-service terms have not been independently checked.
- There is no finding here that either developer copied the other or that either party must rename its game.

## What The Available Repository Establishes

Inspected `/Users/edwin/Downloads/Gravity Golf Updates`, branch `codex/updates-2026-09-07`. The repository is not shallow. `git log --all --reverse --format='%H %aI %s' -- index.html` reports:

| Commit | Recorded author date | Subject |
| --- | --- | --- |
| `092b1cd4bd11ab78396d10127c0896e90e797704` | 2026-04-06T15:56:17-07:00 | Initial commit: Gravity Golf site |
| `59bc74e6c2a533029371719244622d863862dd62` | 2026-04-08T23:25:19-07:00 | Implement NASA lead engineer review: 10 gameplay & UX improvements |
| `e8fbed135036184c924ca7752887ae5f7516a2de` | 2026-04-09T19:45:38-07:00 | Hide Google Sign In button from auth modal |
| `246c47f674929ab33ec7828a6fb373f3fb3eb616` | 2026-07-12T14:11:26-07:00 | Publish optimized merged Gravity Golf build |
| `74f29f63efd2d88d81c1b58400f523861346b2bb` | 2026-07-22T12:05:35-07:00 | Replace onboarding with interactive Launch Lab |

These are available Git metadata, not independently certified timestamps or proof of earliest creation, public deployment, first sale or first qualifying trademark use. An import can contain substantially older work. Commit messages describing publication are not hosting receipts.

Initial September 9 working-file SHA-256 values identify that snapshot's bytes,
not their age or ownership. Later local source edits may have different hashes:

| File | SHA-256 |
| --- | --- |
| `index.html` | `3ff5809cddb4474eefaca28e6e318f6d8bd345b5233475f8b6482c8ca5b0df54` |
| `soundtrack.mp3` | `7373e5b93eceee09f3f9dfd51c261492fe2ff95cfd03e2e85d6ab47ba3c5492e` |
| `marketing/brand/icon.svg` | `64bb4d70c1150bb1f9924660aa6f9cd43efd0505ce31928ede729a19f9d2e60d` |

## Name Review: Unresolved, Not An Infringement Finding

Apple's official listing identifies **Gravity.Golf**, an orbital mini-golf game, with **JAMSoft Inc** as developer/seller. The visible history shows version 1.0 as "Mar 11" without an explicit year beside that entry. Do not turn that abbreviated label into a verified development date or trademark priority date. The listing establishes a relevant similar-name app, not which creator came first. [Apple listing](https://apps.apple.com/us/app/gravity-golf/id6760212499).

There is also a golf-instruction business using Gravity Golf. Historical USPTO Gazette material from February 21, 2012 lists application serial `85389026` for GRAVITY GOLF and golf instruction. Its current TSDR status was not established by this audit. Historical publication is not proof of a currently live registration or a bar to this particular game. [Business website](https://gravitygolf.com/), [historical official Gazette](https://www.uspto.gov/web/trademarks/tmog/20120221_OG.pdf), [TSDR record lookup](https://tsdr.uspto.gov/#caseNumber=85389026&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch).

Original software expression and a source-identifying game name involve different rights. Writing code earlier can support a development/authorship chronology; it does not by itself determine rights to the title. [USPTO distinction](https://www.uspto.gov/trademarks/basics/trademark-patent-copyright).

US common-law trademark rights can arise from use in commerce, with geographic scope; unregistered uses matter too. Counsel should assess qualifying use, relevant filings, continuity, territories and possible confusion, rather than compare code dates alone. [USPTO guidance](https://www.uspto.gov/trademarks/basics/why-register-your-trademark).

## Evidence To Preserve Next

1. Original pre-import source files, versioned backups and earlier repositories. Preserve originals, commit objects and metadata; work from copies and hash collected files. Do not rewrite dates or amend history to strengthen a claim.
2. Independently dated public-use material: first hosting deployment receipts, archived playable pages, release announcements, dated public gameplay posts and relevant sales records. Record the exact title, URL, territory and what was actually offered. Domain registration alone does not establish game-name use in commerce.
3. Original music project/session files, stems and creation exports; credits and agreements for any co-writers, performers, samples, label, publisher or distributor. Confirm rights for game embedding, redistribution and promotional clips separately where relevant.
4. Counsel-reviewed ownership or license documentation from the actual rightsholder to the intended publisher, epoch6 LLC. LLC formation/standing is not an IP assignment. Keep signed contracts and personal records outside a potentially public repository.

No earlier private hosting, billing, email or archive records were accessed for this chronology. Such evidence remains to be collected under the appropriate authorization.

## Initial Asset And License Register

| Asset or dependency | Evidence inspected | Current status / release action |
| --- | --- | --- |
| Game code and procedural effects | Available Git history and current game source | Owner asserts earlier creation. Complete contributor/source audit and entity ownership documentation; no independent originality or patent clearance concluded. |
| Soundtrack | Owner's AGI House statement; exact file hash above | Owner-attested creation. Preserve project evidence; resolve master/composition, third-party and publisher rights. |
| Icon/artwork | Existing project SVG copied from mobile artwork; exact hash above | Reuse provenance recorded, not independent rights clearance. Retain original design/generation source and applicable terms. |
| Three.js | Web CDN and mobile lock resolve 0.172.0; local package LICENSE is MIT | Preserve exact copyright/license in distributed notices; verify final artifact. |
| Capacitor | Mobile core/android/ios 8.4.2; plugins haptics 8.0.2, orientation 8.0.1, splash/status 8.0.3; MIT licenses | Audit native SPM/Gradle dependency graph and final package, not only npm packages. |
| Orbitron and Exo 2 | Mobile font packages 5.3.0; local full SIL OFL 1.1 license files | Include required copyright/OFL notices with redistributed fonts. Mobile generator currently copies WOFF2 files without the separate license files. |
| Backend npm dependencies | Lockfile scan found 262 non-dev packages with predominantly permissive declared licenses | Inventory is not complete license compliance. `limiter` 1.1.5 has MIT text in LICENSE.txt despite absent lock metadata; `callsite` 1.0.0 README says MIT but complete notice provenance still needs checking. |
| Future models, generated media and store SDKs | No complete release inventory supplied | Audit only actual included assets and their applicable creation-time terms. An open Tripo browser tab is not evidence of game assets or licenses. |

The mobile `prepare-web.mjs` copies Three build/examples and font binaries, but not their separate LICENSE/OFL files into `www`. Existing inline/native notices may cover some material; inspect rather than assume either total absence or compliance. No mobile source or generated native asset directory was modified in this audit or the web-only follow-up below.

## Web Dependency Notices Follow-Up

September 9: added `third-party-notices.html` and four explicitly allowlisted
license files to the isolated web build. Both starting-screen credit blocks link
to the notice page in a separate tab with `noopener noreferrer`. The page uses
no JavaScript, web fonts, analytics or other external assets. It states that the
third-party licenses do not license the game's original code, music, artwork or
brand, and does not claim complete legal clearance.

| Public file | SHA-256 | Inspected source |
| --- | --- | --- |
| `licenses/three-0.172.0-LICENSE.txt` | `4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9d32d4c5bcf4ba4454` | Local installed Three.js 0.172.0 LICENSE, byte-matched to upstream r172. |
| `licenses/firebase-10.12.0-LICENSE.txt` | `065e45b5674f9bf76670496e5472611b3fbd87fbeaf99336725430a9909cb687` | Official Firebase JS SDK `firebase@10.12.0` LICENSE, preserved in full including Apache 2.0 and Protocol Buffers BSD notice. |
| `licenses/orbitron-OFL.txt` | `ab609b0e110d622435ff337cdf233288556e011bbf9bd0550be98846c0630819` | Official Google Fonts OFL snapshot retrieved September 9, including Reserved Font Name "Orbitron". |
| `licenses/exo-2-OFL.txt` | `7f95a8eeecc6904ffc81cd10cc8ebc7fcee72a67922924bf45f02dff03b88127` | Official Google Fonts OFL snapshot retrieved September 9. |

Sources: [Three r172](https://github.com/mrdoob/three.js/blob/r172/LICENSE),
[Firebase 10.12.0](https://raw.githubusercontent.com/firebase/firebase-js-sdk/firebase%4010.12.0/LICENSE),
[Orbitron](https://github.com/google/fonts/blob/main/ofl/orbitron/OFL.txt),
[Exo 2](https://github.com/google/fonts/blob/main/ofl/exo2/OFL.txt).
The official Firebase root file listing contained LICENSE but no separate
root NOTICE. That is not an exhaustive transitive bundle notice audit.

The older Fontsource Orbitron license omitted the upstream Reserved Font Name;
the web build therefore uses the upstream text rather than that older copy.
The Exo 2 upstream text also differs in its copyright heading/OFL website.
Google Fonts requests are not version-pinned font binaries: these are dated
license snapshots, not a claim that the CDN can never change. Recheck notices
when dependencies/assets change, and separately package/audit the native assets.

Verification: all 102 unit tests plus TypeScript/build passed in staging and
again in the isolated clone after exact-file sync;
the build checks exact license inventory/bytes and excludes backend/private
files. Two deny-by-default browser fixtures (1280x720 and 390x844) verify the
visible focusable link, separate tab without opener, no horizontal overflow and
four successful byte-exact license responses. Screenshots were inspected; no
unexpected network requests or console/page errors were captured. A standard
game-client smoke test reached Launch Lab and then ready Hole 1. All script
blocks match the pre-notices source; main HTML grew by 691 bytes. No FPS benchmark,
native binary, full-course acceptance or hosted legal-page publication is claimed.
The final 17-file public output matches the browser-tested staging output and
passes the provider-secret audit. Saved commerce remains disabled. The temporary
static preview was stopped with SIGINT (exit 130); no listener remains on 8782.

## Counsel Handoff Questions

- What is the earliest defensible development and qualifying public-use chronology for Edwin's game, and what further evidence is needed?
- Which related marks and filings affect the intended US game/store launch? Does a broader search support continued use or registration, without presuming either developer infringed?
- Who presently owns the protectable code, soundtrack, artwork and name rights, and what documentation should license or assign them to epoch6 LLC?
- Which copyright registrations, contracts and risk/insurance measures are appropriate? Do not file, contact a competitor, buy insurance or make public legal claims without a separate owner decision.
