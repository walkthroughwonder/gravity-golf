# Project context for Claude Code

You're working on a Roblox gravity golf game. The Lua source files in this directory mirror what's currently live in a Roblox Studio place called `My Test Game` (Roblox account: `thesingularityisnow`). Read `README.md` first for the architecture overview.

## What you can and can't do from this directory

You're working with **source files only**. You don't have direct access to Roblox Studio from here — the user opens Studio themselves, and you help them iterate on the Lua code. Your role is:

- Edit the `.lua` files in this folder when the user wants gameplay changes
- Explain *what* changes mean for them to apply (e.g. "paste the new content into `ServerScriptService.GravityGolfDemo`")
- Never invent Roblox APIs you're not sure exist — confirm via web search if uncertain

If the user asks you to "make a change in Studio for me" or "test it," remind them you can only edit the source files; they need to copy-paste into Studio and hit Play themselves.

## Conventions used so far

- **Two-space indents in Lua** (matches Roblox Studio's default). Some compact one-liners exist where the file was originally injected via Command Bar — feel free to reformat to multi-line on edit.
- **Local variable names are short** (`b` for ball, `p` or `pl` for planet, `pf` for planets folder, `h` for hole, `cn` for connection) — same reason.
- **Tunables grouped near the top** of each file. If you add a constant, put it with the others.
- **Server uses `workspace:SetAttribute(...)` to publish state**, client subscribes via `:GetAttributeChangedSignal(...)`. Use this pattern instead of adding more RemoteEvents when the data is one-way server → client.
- **Physics constants must match between server and client** (`G`, `MD`, `PLANE_Y`). Document this when adding new shared constants. If duplication gets painful, factor into a `ReplicatedStorage` ModuleScript.

## Don't do

- **Don't suggest pasting into the Roblox Command Bar.** That was useful in the original session because the agent was driving Studio directly. From a local session, the user pastes into the script editor instead — much more reliable.
- **Don't change `G`, `MD`, or `PLANE_Y` on only one side** (server or client). Always update both.
- **Don't enable `CanCollide = true` on planets.** The script handles planet collisions via distance check; physics-based bouncing breaks the gravity-golf feel.
- **Don't remove the `pcall` wrapping `W.FallenPartsDestroyHeight`.** Some Roblox versions have a stricter range on that property and would error.

## What "matches gravity golf" means in this codebase

The user's reference is the classic web gravity golf games. Specifically:
1. Ball moves in a 2D plane (we lock Y to `PLANE_Y = 80`)
2. Multi-planet inverse-square gravity (we sum forces from all children of the `Planets` Folder)
3. Hitting a planet ends the shot — no bouncing (we distance-check and reset)
4. Slingshot launch (drag back, ball goes opposite direction)
5. Trajectory preview while aiming so the player isn't blind-guessing
6. Visible glowing trail behind the ball

The user has explicitly said they DO NOT want a top-down 2D camera. Keep the angled 3D perspective. The "2D" is in the physics (plane-locked motion), not the visuals.

## Things to watch when editing

- **`AssemblyLinearVelocity`** is the modern API for setting Part velocity. Don't use the deprecated `Velocity`.
- **`Vector3.zero`** is shorthand for `Vector3.new(0, 0, 0)` — both work, prefer the former.
- **`task.wait(n)`** is preferred over deprecated `wait(n)`.
- **Decals on `Baseplate` and `SpawnLocation`** are destroyed by the visual theme. If the user complains those defaults are gone, that's why — they can re-add them or the theme block can be skipped.

## Open improvements (in priority order)

These are flagged in `README.md` too. Knock them off when the user asks for "what's next":

1. Multiple levels via a `Levels` ModuleScript table
2. Discord webhook on hole-in-one (`HttpService:PostAsync`)
3. Par + total score
4. Camera control (rotate/zoom)
5. Planet variety (black holes, repulsors, wormholes)
6. Sound effects
