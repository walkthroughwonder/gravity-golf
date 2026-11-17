Original prompt: Create a new standalone browser instrument called Orbital Violin at /instruments/orbital-violin, preserving Gravity Golf unchanged, reusing Gravity Golf-style orbital mechanics, mobile launch controls, Web Audio violin sample proximity/orbit mapping, three prototype levels, defensive missing-sample handling, and local verification.

## Progress

- Cloned `walkthroughwonder/gravity-golf` into `/Users/edwin/Projects/gravity-golf`.
- Confirmed the repo is a static Three.js site with Gravity Golf implemented in root `index.html`.
- Decision: keep Gravity Golf root untouched and add Orbital Violin as a separate static route under `instruments/orbital-violin/`.
- Decision: wire sample paths to `/audio/violin/...`; Drive WAVs can be copied there later.
- Added the standalone `/instruments/orbital-violin/` page, Three.js scene, mobile slingshot/correction controls, OrbitAnalyzer, three prototype levels, Web Audio engine, ambient bed, effect modes, and HUD.
- Added tiny placeholder WAV files at the expected sample paths so local verification does not 404 before the real Drive samples are copied in.
- Verified syntax with `node --check` for all new JS modules.
- Verified local routes with `curl -I`: `/` and `/instruments/orbital-violin/` both return `200 OK`.
- Verified browser smoke with the develop-web-game Playwright client: route loads, audio unlock works, state export works, and no browser errors were reported after placeholder samples were added.
- Verified mobile-sized drag-launch with a targeted Playwright script: unlock succeeded, launch state became true, speed updated, and no browser errors were reported.
- Confirmed `git diff -- index.html index_codex.html soundtrack.mp3` is empty; Gravity Golf root files remain unchanged.

## TODO

- Replace placeholder WAVs under `audio/violin/` with the real files from the provided Drive folder.
- Optionally add a visible link/card to Orbital Violin from `edwinrosero.com` navigation once you decide where it belongs.
- If publishing to Netlify, deploy from `/Users/edwin/Projects/gravity-golf` or copy the new `instruments/` and `audio/` folders into the portfolio deployment target.
