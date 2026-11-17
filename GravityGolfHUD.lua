-- GravityGolfHUD — LocalScript (consolidated)
-- One client-side script handling everything the player sees and does:
--   1. Camera framing (scriptable, fixed angled view of the scene)
--   2. ScreenGui HUD (stroke counter, hint text, hole-in-one banner)
--   3. Workspace attribute subscriptions for live HUD updates
--   4. Click-and-drag input on the ball (screen-distance check, no raycast)
--   5. Trajectory preview (40 dots, locally-simulated physics)
--   6. Launch RemoteEvent firing on release
--
-- Place: StarterPlayer.StarterPlayerScripts.GravityGolfHUD
-- Replaces the previous separate GravityGolfHUD + GravityGolfClient scripts.
-- Delete StarterPlayer.StarterPlayerScripts.GravityGolfClient before using this.

local UIS = game:GetService("UserInputService")
local Players = game:GetService("Players")
local RpS = game:GetService("ReplicatedStorage")
local W = workspace
local cam = W.CurrentCamera

-- TUNABLES (must match server's constants — see GravityGolfDemo_v8_server.lua)
local G = 40
local MD = 15
local PLANE_Y = 80 -- not directly used by client but documented for parity
local POWER_PER_PIXEL = 2
local POWER_MAX = 150
local CLICK_RADIUS = 60 -- pixel radius around ball for click detection
local PREVIEW_COUNT = 40
local PREVIEW_DT = 1 / 30

local player = Players.LocalPlayer
local pgui = player:WaitForChild("PlayerGui")

-- Wait for the scene to exist
local ball = W:WaitForChild("Ball", 10)
local pf = W:WaitForChild("Planets", 10)
local launchEvent = RpS:WaitForChild("GravityGolfLaunch", 10)
if not (ball and pf and launchEvent) then
  warn("GravityGolfHUD: scene not found, aborting")
  return
end

----------------------------------------------------------------------
-- 1. CAMERA SETUP
----------------------------------------------------------------------

local function setCamera()
  cam.CameraType = Enum.CameraType.Scriptable
  cam.CFrame = CFrame.new(Vector3.new(50, 180, 200), Vector3.new(-30, 80, 0))
end

setCamera()

-- Re-apply if Roblox tries to reset on character spawn
player.CharacterAdded:Connect(function()
  task.wait(0.5)
  setCamera()
end)

----------------------------------------------------------------------
-- 2. HUD (ScreenGui)
----------------------------------------------------------------------

local screen = Instance.new("ScreenGui")
screen.Name = "GravityGolfHUD"
screen.ResetOnSpawn = false
screen.IgnoreGuiInset = true
screen.Parent = pgui

local function makeLabel(name, size, pos, bg, fg, font, ts)
  local l = Instance.new("TextLabel")
  l.Name = name
  l.Size = size
  l.Position = pos
  l.BackgroundColor3 = bg
  l.BackgroundTransparency = 0.4
  l.BorderSizePixel = 0
  l.TextColor3 = fg
  l.Font = font
  l.TextSize = ts
  l.Parent = screen
  return l
end

local strokeLabel = makeLabel(
  "Strokes",
  UDim2.new(0, 280, 0, 60),
  UDim2.new(0, 20, 0, 20),
  Color3.fromRGB(0, 0, 0),
  Color3.fromRGB(255, 220, 80),
  Enum.Font.GothamBold,
  28
)
strokeLabel.Text = "Strokes: 0"

local hintLabel = makeLabel(
  "Hint",
  UDim2.new(0, 460, 0, 36),
  UDim2.new(0, 20, 0, 90),
  Color3.fromRGB(0, 0, 0),
  Color3.fromRGB(220, 220, 220),
  Enum.Font.Gotham,
  14
)
hintLabel.Text = "Click & drag from the white ball — release to launch"

local banner = makeLabel(
  "HoleBanner",
  UDim2.new(0, 600, 0, 100),
  UDim2.new(0.5, -300, 0.4, 0),
  Color3.fromRGB(255, 220, 80),
  Color3.fromRGB(0, 0, 0),
  Enum.Font.GothamBold,
  48
)
banner.TextXAlignment = Enum.TextXAlignment.Center
banner.TextYAlignment = Enum.TextYAlignment.Center
banner.Text = "HOLE IN ONE!"
banner.Visible = false

----------------------------------------------------------------------
-- 3. ATTRIBUTE SUBSCRIPTIONS (server publishes via SetAttribute)
----------------------------------------------------------------------

local function refreshStrokes()
  strokeLabel.Text = "Strokes: " .. tostring(W:GetAttribute("Strokes") or 0)
end

W:GetAttributeChangedSignal("Strokes"):Connect(refreshStrokes)

W:GetAttributeChangedSignal("LastHoleInStrokes"):Connect(function()
  local n = W:GetAttribute("LastHoleInStrokes") or 0
  if n < 0 then return end -- initial sentinel
  banner.Text = (n == 1) and "HOLE IN ONE!" or ("Sunk in " .. n .. " strokes!")
  banner.Visible = true
  task.wait(2.5)
  banner.Visible = false
end)

refreshStrokes()

----------------------------------------------------------------------
-- 4. TRAJECTORY PREVIEW
----------------------------------------------------------------------

local hidden = Vector3.new(99999, 99999, 99999)
local previewParts = {}
for i = 1, PREVIEW_COUNT do
  local pp = Instance.new("Part")
  pp.Size = Vector3.new(0.6, 0.6, 0.6)
  pp.Shape = Enum.PartType.Ball
  pp.Anchored = true
  pp.CanCollide = false
  pp.Material = Enum.Material.Neon
  pp.Color = Color3.fromRGB(255, 200, 100)
  pp.Transparency = 0.4
  pp.Position = hidden
  pp.Parent = W
  previewParts[i] = pp
end

local function clearPreview()
  for _, pp in ipairs(previewParts) do pp.Position = hidden end
end

-- Local physics simulation (same math as the server's Heartbeat)
local function simulate(startPos, startVel)
  local pos = startPos
  local vel = startVel
  local planets = pf:GetChildren()
  for i = 1, PREVIEW_COUNT do
    local accel = Vector3.zero
    local hitP = false
    for _, pl in ipairs(planets) do
      local tc = pl.Position - pos
      local d = math.max(tc.Magnitude, MD)
      local mass = pl:GetAttribute("GravityMass") or pl:GetMass()
      accel = accel + tc.Unit * (mass * G / (d * d))
      if (pos - pl.Position).Magnitude < (pl.Size.X / 2) + 1 then
        hitP = true
      end
    end
    vel = vel + accel * PREVIEW_DT
    pos = pos + vel * PREVIEW_DT
    previewParts[i].Position = pos
    if hitP then
      for j = i + 1, PREVIEW_COUNT do previewParts[j].Position = hidden end
      return
    end
  end
end

----------------------------------------------------------------------
-- 5. INPUT (click-drag aim with slingshot mechanic)
----------------------------------------------------------------------

local aiming = false
local aimStart -- Vector2 in screen space

local function isClickOnBall(inputPos)
  local sp, onScreen = cam:WorldToScreenPoint(ball.Position)
  if not onScreen then return false end
  local dx = inputPos.X - sp.X
  local dy = inputPos.Y - sp.Y
  return math.sqrt(dx * dx + dy * dy) < CLICK_RADIUS
end

local function aimVector(curPos)
  local delta = aimStart - curPos -- slingshot: drag-back gives forward launch
  local toBall = (ball.Position - cam.CFrame.Position).Unit
  local right = toBall:Cross(Vector3.new(0, 1, 0))
  if right.Magnitude < 0.001 then right = Vector3.new(1, 0, 0) end
  right = right.Unit
  local up = right:Cross(toBall).Unit
  local dir = right * delta.X + up * delta.Y
  if dir.Magnitude < 0.001 then return Vector3.new(1, 0, 0), 0 end
  local power = math.clamp(dir.Magnitude * POWER_PER_PIXEL, 0, POWER_MAX)
  return dir.Unit, power
end

UIS.InputBegan:Connect(function(input, gpe)
  if gpe or input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end
  if isClickOnBall(input.Position) then
    aiming = true
    aimStart = Vector2.new(input.Position.X, input.Position.Y)
  end
end)

UIS.InputChanged:Connect(function(input)
  if not aiming or input.UserInputType ~= Enum.UserInputType.MouseMovement then return end
  local cur = Vector2.new(input.Position.X, input.Position.Y)
  local dir, power = aimVector(cur)
  if power > 5 then
    simulate(ball.Position, dir * power)
  else
    clearPreview()
  end
end)

UIS.InputEnded:Connect(function(input)
  if not aiming or input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end
  aiming = false
  local cur = Vector2.new(input.Position.X, input.Position.Y)
  local dir, power = aimVector(cur)
  clearPreview()
  if power > 5 then
    launchEvent:FireServer(dir, power)
  end
end)

print("GravityGolfHUD loaded — camera + HUD + input + preview consolidated")
