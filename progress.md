Original prompt: i hear sounds effects no music

- 2026-05-20: Confirmed `soundtrack.mp3` exists beside `index_merge.html` and contains real audio.
- 2026-05-20: SFX path works, so the bug is isolated to soundtrack playback rather than overall Web Audio init.
- 2026-05-20: Added more aggressive soundtrack retry logic in `index_merge.html`; next step is verifying whether `file://` playback specifically needs a fallback path.

- 2026-07-22: Added Orbital Mastery to `index_merge.html`: Assisted/Pilot routes, gravity-graze chains, style scoring, pooled visual effects, procedural Web Audio cues, and boost recharges.
- 2026-07-22: Added one-use ball-specific abilities with keyboard/touch controls; Daily Challenge intentionally disables them.
- 2026-07-22: Added persistent hole medals, best-stroke/style/combo records, sampled gold best-shot ghosts, and score-neutral hole retry.
- 2026-07-22: Fixed first-click ball targeting and aiming-toolbar state, kept in-flight mobile controls reachable, and removed the missing `/sw.js` request.
- 2026-07-22: Verified desktop, mobile, Daily Challenge, gravity-graze, completion, retry, and ghost flows on localhost; final browser probe completed with no console, page, or network errors.
- 2026-07-22: Replaced the three-card onboarding carousel with Launch Lab, a responsive interactive trainer built on the real Hole 1 scene, controls, gravity, camera, audio, haptics, and ball ability.
- 2026-07-22: Added six input-gated checkpoints (aim, adjust, fire, boost, ability, land), a moving target ring, animated inline SVG briefing, progress rail, Reset Drill, Skip Training, and completion handoff.
- 2026-07-22: Training results are score-neutral; completion, reset, and skip reload Hole 1 at 0 strokes, 0.0 time, and a fresh ability without touching mastery, artifacts, or progression.
- 2026-07-22: Removed obsolete carousel CSS/JS and limited target-ring layout work to the active trainer; fixed controls are measured once per step.
- 2026-07-22: Verified the complete desktop and mobile-touch trainer flows, out-of-order input guards, reset, skip, normal post-training firing, and clean Hole 1 handoff with no runtime errors.
