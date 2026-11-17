# Handoff to local Claude Code

You're picking up a Roblox gravity golf project that was built in a Cowork session. Everything's already live in a Roblox Studio place (`My Test Game` under Roblox account `thesingularityisnow`), and the source files in this folder are the canonical copy.

## What to read first

In this order:

1. **`README.md`** — overview of the project, file map, architecture diagram, how a launch flows end-to-end, known issues, and next-step ideas.
2. **`CLAUDE.md`** — conventions and gotchas specifically for Claude Code working on this codebase. Things to do and not do.
3. The current Lua source files (latest versions only):
   - `GravityGolfDemo_v7_server.lua`
   - `GravityGolfClient_v4.lua`
   - `GravityGolfHUD.lua`

You can ignore the older versions (`GravityGolfDemo.lua`, `GravityGolfDemo_v6_server.lua`) unless the user wants to revert.

## Suggested first steps with the user

Open a chat with the user and ask:

> "Where's this project living locally? Do you want me to set up a folder in your home dir and copy these files in, or are you just going to paste them into Studio manually as we make changes?"

If they want a local folder:

```bash
mkdir -p ~/Projects/gravity-golf
cp /Users/edwin/Library/Application\ Support/Claude/local-agent-mode-sessions/<this-session>/outputs/*.lua ~/Projects/gravity-golf/
cp /Users/edwin/Library/Application\ Support/Claude/local-agent-mode-sessions/<this-session>/outputs/*.md ~/Projects/gravity-golf/
cd ~/Projects/gravity-golf
```

Then `cd` into that folder and run `claude` from there so this CLAUDE.md is auto-loaded.

## Workflow from here on

You're a code editor — the user is the runtime. Loop:

1. User describes a change ("make the planets pull harder", "add sound on hole-in-one", etc.)
2. You edit the appropriate `.lua` file in the folder
3. You tell the user *exactly* which Roblox object to paste the new content into (`ServerScriptService.GravityGolfDemo`, `StarterPlayer.StarterPlayerScripts.GravityGolfClient`, etc.)
4. User pastes into Studio's script editor, hits Play, reports back
5. Iterate

You CANNOT drive Roblox Studio yourself from a local CLI session (the original Cowork agent could; you can't). Don't pretend you can — be honest with the user about being a code-editor role.

## Quick smoke test you can suggest

If the user is ever unsure whether the live place matches the source files, have them:

1. Open `My Test Game` in Roblox Studio
2. Check `ServerScriptService.GravityGolfDemo.Source` against `GravityGolfDemo_v7_server.lua`
3. Check `StarterPlayer.StarterPlayerScripts.GravityGolfClient.Source` against `GravityGolfClient_v4.lua`
4. Check `StarterPlayer.StarterPlayerScripts.GravityGolfHUD.Source` against `GravityGolfHUD.lua`

If a file is missing or mismatched, paste from the source files. Hit Play to verify the basic loop:

- Black space scene with three glowing planets
- HUD says "Strokes: 0" top-left
- Click and drag on the white ball — yellow trajectory dots appear
- Release — ball launches, follows the predicted arc, leaves a glowing trail
- Sink it in the yellow hole — banner appears, stroke count resets

## Where to go next

The user's last working note was that they wanted the physics to feel like gravity golf, which v7 delivers. They explicitly said they do NOT want a top-down 2D camera — keep the angled 3D perspective.

Reasonable next bets (already listed in README):

- Multiple levels
- Discord webhook on hole-in-one
- Par + scoring
- Sound effects
- Planet variety (black holes, repulsors, wormholes)

Ask them which direction calls to them rather than picking one yourself.
