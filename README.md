# Gravity Golf — Roblox

A working multi-planet gravity golf game built in Roblox Studio. The ball lives in a 2D plane in 3D space, gets pulled by gravity from multiple planets, and the player slingshots it toward a hole. Features trajectory preview, stroke counter, hole-in-one detection, and a space-themed visual style.

## State of the project

**Live in Roblox Studio** — published as `My Test Game` under the Roblox account `thesingularityisnow`. The current scripts run end-to-end: launch ball → curve through gravity → either crash on a planet (reset), escape (auto-reset), or sink in the hole (banner + stroke count).

## File map

All Lua source files in this folder mirror the live state of the place. To restore from these files, paste each file's contents into the matching Roblox object's Source.

| File | Roblox location | Purpose |
|------|-----------------|---------|
| `GravityGolfDemo_v7_server.lua` | `ServerScriptService.GravityGolfDemo` | Server: scene setup, physics loop, RemoteEvent, hole detection, visual theme, ball trail |
| `GravityGolfClient_v4.lua` | `StarterPlayer.StarterPlayerScripts.GravityGolfClient` | Client: input (click-drag from ball), trajectory preview simulation, fires launch RemoteEvent |
| `GravityGolfHUD.lua` | `StarterPlayer.StarterPlayerScripts.GravityGolfHUD` | Camera framing + on-screen HUD (stroke counter, hole-in-one banner) |

Older versions kept for reference: `GravityGolfDemo.lua` (v1), `GravityGolfDemo_v6_server.lua` (v6, before 2D-plane lock).

## Architecture

```
Client (per player)                                    Server
─────────────────────                                  ───────────────────────
GravityGolfClient (LocalScript)
  ├─ click-drag on ball (60px radius)
  ├─ trajectory preview (40 dots)                      GravityGolfDemo (Script)
  └─ FireServer(direction, power)  ─────────────────►  ├─ RemoteEvent handler
                                                       │   └─ unanchor + apply impulse
GravityGolfHUD (LocalScript)                           │
  ├─ scriptable camera                                 ├─ Heartbeat: physics loop
  └─ ScreenGui with stroke label                       │   ├─ planet-crash check (reset)
       ▲                                               │   ├─ out-of-bounds check (reset)
       │                                               │   ├─ sum gravity from all planets
       │                                               │   └─ lock Y to play plane
       │     attribute change                          │
       └────────────────────────────  workspace:SetAttribute("Strokes", n)
                                                       └─ Hole.Touched → reset + stroke=0
```

**ReplicatedStorage** holds the `GravityGolfLaunch` RemoteEvent.
**Workspace.Planets** is a Folder containing planet Parts. Each planet has a `GravityMass` attribute on it (decoupled from physical mass for tunability).

## Tunables (must stay in sync between client and server)

```lua
local G = 40           -- gravitational constant
local MD = 15          -- min distance to prevent inverse-square singularity
local PLANE_Y = 80     -- the play plane's Y coordinate
local POWER_MAX = 150  -- max launch impulse magnitude (server only)
local CLICK_RADIUS = 60 -- pixel radius around ball for click detection (client only)
```

If you change `G`, `MD`, or `PLANE_Y` on the server, change them on the client too or the trajectory preview will lie.

## Current scene

- **BigPlanet** — 40-stud blue neon sphere at `(0, 80, 0)`, GravityMass 50000
- **SmallPlanet** — 20-stud orange neon sphere at `(-90, 80, 0)`, GravityMass 20000
- **Hole** — 12-stud yellow translucent sphere at `(-140, 80, 0)`, no-collide
- **Ball** — 4-stud white sphere starting anchored at `(80, 80, 80)`

The puzzle: launch from the right, slingshot off the big blue planet, thread past the small orange planet, sink it in the yellow hole.

## How a launch flows

1. Player presses left mouse on the ball (within 60-pixel screen radius)
2. Client tracks drag delta on every mouse-move, simulates the next 40 physics frames locally, positions the preview dots along the predicted path
3. On mouse release, client computes direction (slingshot — opposite of drag) and power (clamped 0–150), fires `GravityGolfLaunch:FireServer(dir, power)`
4. Server projects `dir` to XZ plane, unanchors ball, sets `AssemblyLinearVelocity = dir.Unit * power`, increments stroke count, publishes via `workspace:SetAttribute("Strokes", n)`
5. HUD's `:GetAttributeChangedSignal("Strokes")` listener fires, label updates
6. Server's Heartbeat loop: each frame applies summed gravity from all planets, locks Y to plane, checks for planet crash (reset) or out-of-bounds (reset)
7. If ball touches Hole, server publishes `LastHoleInStrokes` attribute → HUD shows banner for 2.5s, ball resets, stroke count resets to 0

## Things that work

- Multi-planet inverse-square gravity (n-body summation)
- 2D plane lock (Y coord and Y velocity forced each frame)
- Planet collision = instant reset (no bouncing, like classic gravity golf)
- Out-of-bounds reset at 1000 stud distance from nearest planet
- Trajectory preview matches actual physics
- Stroke counter, hole-in-one banner
- Space visual theme (black sky with stars, glowing planets, hidden ground, ball trail)
- Screen-distance click on ball (much more forgiving than raycast)

## Known issues / nice-to-haves

- **Trail width feels thin from the camera distance** — increase trail Lifetime or add WidthScale taper
- **Planet visuals could use atmospheres** — add a slightly larger semi-transparent sphere around each planet for a glow halo
- **Camera is fixed and doesn't follow the ball** — fine for level design that fits in one frame, but limits future bigger levels
- **Ball reset on planet hit is sudden** — could add a "you crashed" particle effect / sound / brief fade

## Next-step ideas

1. **Multiple levels**. Define levels as `{ planets, holePos, ballStart, par }` table in a `Levels` ModuleScript. Advance to next level on hole-in-one. Show level number in HUD.
2. **Discord webhook on hole-in-one**. In server's `h.Touched` handler, add `HttpService:PostAsync(WEBHOOK_URL, JSON{player_name, strokes, level})`. Requires `HttpService.HttpEnabled = true` in Game Settings + Roblox account in good standing.
3. **Par + scoring**. Each level has a par; total score is sum of strokes. Below par highlighted green, above par red.
4. **Camera control**. Let the player middle-mouse-drag to rotate or scroll-wheel to zoom. Currently camera is locked.
5. **Planet variety**. Add black holes (extreme mass + auto-fail if ball enters), repulsors (negative mass), wormholes (paired teleport parts).
6. **Sound**. Whoosh on launch, thud on planet crash, satisfying chime on hole-in-one.

## Gotchas if you keep editing in Studio

- **Don't set `script.Source` from the Command Bar with the script editor tab open.** The editor's cached buffer overwrites your change. Close the tab in Studio first, then run your `.Source = "..."` command.
- **Roblox `FallenPartsDestroyHeight` defaults to -500.** With `Workspace.Gravity = 0` it doesn't matter for falling, but our v7 still sets it to `-50000` defensively.
- **Setting `AssemblyLinearVelocity` directly each frame** works but isn't the most idiomatic Roblox pattern. A `VectorForce` constraint would be cleaner if you want to refactor — but the current approach is simpler and behaves well.
- **`CFrame.new(eye, target)` becomes degenerate when eye→target is parallel to world Y.** If you ever change the camera to true top-down, use `CFrame.lookAt(eye, target, upVector)` with an explicit up vector like `Vector3.new(0, 0, -1)`.

## Visual theme idempotency

The v7 server script applies the visual theme (black sky, stars, bloom, hide baseplate, ball trail) **every Play session**. So even if the place gets edited and the lighting reverts, hitting Play re-establishes the theme. The only persistent edit-mode change is the existing `Baseplate` and `SpawnLocation` becoming transparent (those changes don't survive a fresh place, but the script re-applies them on Play start).
