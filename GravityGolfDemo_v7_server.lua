-- GravityGolfDemo v7 — Server
-- Full gravity-golf physics: ball locked to 2D plane, planet crash = reset (no bounce),
-- launch direction projected to XZ, multi-planet sum, multi-planet trajectory preview-friendly.
-- Replace the Source of ServerScriptService.GravityGolfDemo with this.

local RS = game:GetService("RunService")
local W = workspace
local RpS = game:GetService("ReplicatedStorage")
local L = game:GetService("Lighting")

W.Gravity = 0
pcall(function() W.FallenPartsDestroyHeight = -50000 end)

-- TUNABLES (must match client preview's G/MD/PLANE_Y)
local G = 40
local MD = 15
local MAX_DIST = 1000
local PLANE_Y = 80
local POWER_MAX = 150

-- Initial published HUD state
W:SetAttribute("Strokes", 0)
W:SetAttribute("LastHoleInStrokes", -1)

-- Cleanup
for _, n in ipairs({"Planet", "Ball", "Hole", "TestBall", "Planets"}) do
    local e = W:FindFirstChild(n)
    if e then e:Destroy() end
end
local oldRE = RpS:FindFirstChild("GravityGolfLaunch")
if oldRE then oldRE:Destroy() end

-- Planets folder
local pf = Instance.new("Folder")
pf.Name = "Planets"
pf.Parent = W

local function makePlanet(name, pos, size, color, mass)
    local p = Instance.new("Part")
    p.Name = name
    p.Shape = Enum.PartType.Ball
    p.Size = Vector3.new(size, size, size)
    p.Position = pos
    p.Anchored = true
    p.CanCollide = false -- don't physically bounce; we use scripted distance check
    p.Color = color
    p.Material = Enum.Material.Neon
    p:SetAttribute("GravityMass", mass)
    p.Parent = pf
    return p
end

makePlanet("BigPlanet", Vector3.new(0, PLANE_Y, 0), 40, Color3.fromRGB(80, 140, 200), 50000)
makePlanet("SmallPlanet", Vector3.new(-90, PLANE_Y, 0), 20, Color3.fromRGB(200, 140, 80), 20000)

-- Hole
local h = Instance.new("Part")
h.Name = "Hole"
h.Shape = Enum.PartType.Ball
h.Size = Vector3.new(12, 12, 12)
h.Position = Vector3.new(-140, PLANE_Y, 0)
h.Anchored = true
h.CanCollide = false
h.Color = Color3.fromRGB(255, 220, 80)
h.Material = Enum.Material.Neon
h.Transparency = 0.2
h.Parent = W

-- Ball
local b = Instance.new("Part")
b.Name = "Ball"
b.Shape = Enum.PartType.Ball
b.Size = Vector3.new(4, 4, 4)
local sp = Vector3.new(80, PLANE_Y, 80)
b.Position = sp
b.Anchored = true
b.CanCollide = false
b.Color = Color3.fromRGB(255, 255, 255)
b.Material = Enum.Material.Neon
b.Parent = W

local function resetBall()
    b.Anchored = true
    b.AssemblyLinearVelocity = Vector3.zero
    b.Position = sp
end

-- RemoteEvent for launch
local RE = Instance.new("RemoteEvent")
RE.Name = "GravityGolfLaunch"
RE.Parent = RpS

local strokes = 0

RE.OnServerEvent:Connect(function(pl, dir, power)
    if typeof(dir) ~= "Vector3" or typeof(power) ~= "number" then return end
    -- Project to XZ plane (no vertical motion)
    dir = Vector3.new(dir.X, 0, dir.Z)
    if dir.Magnitude < 0.001 then return end
    power = math.clamp(power, 0, POWER_MAX)
    b.Anchored = false
    b.AssemblyLinearVelocity = dir.Unit * power
    strokes = strokes + 1
    W:SetAttribute("Strokes", strokes)
    print(pl.Name .. " shot #" .. strokes .. " power=" .. math.floor(power))
end)

-- Physics loop: check crash, sum gravity, lock to plane
local cn
cn = RS.Heartbeat:Connect(function(dt)
    if not b.Parent then cn:Disconnect() return end
    if b.Anchored then return end

    -- Planet crash detection (no bounce — this is the gravity-golf rule)
    for _, pl in ipairs(pf:GetChildren()) do
        local pd = (b.Position - pl.Position).Magnitude
        if pd < (pl.Size.X / 2) + (b.Size.X / 2) + 0.5 then
            print("crashed into " .. pl.Name)
            resetBall()
            return
        end
    end

    -- Out-of-bounds: nearest planet > MAX_DIST
    local minD = math.huge
    for _, pl in ipairs(pf:GetChildren()) do
        local d = (b.Position - pl.Position).Magnitude
        if d < minD then minD = d end
    end
    if minD > MAX_DIST then
        resetBall()
        return
    end

    -- Sum gravity from all planets
    local accel = Vector3.zero
    for _, pl in ipairs(pf:GetChildren()) do
        local mass = pl:GetAttribute("GravityMass") or pl:GetMass()
        local tc = pl.Position - b.Position
        local d = math.max(tc.Magnitude, MD)
        accel = accel + tc.Unit * (G * mass / (d * d))
    end

    -- Integrate, then lock to plane
    local newVel = b.AssemblyLinearVelocity + accel * dt
    newVel = Vector3.new(newVel.X, 0, newVel.Z) -- zero Y
    b.AssemblyLinearVelocity = newVel
    b.Position = Vector3.new(b.Position.X, PLANE_Y, b.Position.Z) -- snap Y
end)

-- Hole detection
h.Touched:Connect(function(hit)
    if hit == b then
        W:SetAttribute("LastHoleInStrokes", strokes)
        print("HOLE IN ONE! strokes=" .. strokes)
        resetBall()
        strokes = 0
        W:SetAttribute("Strokes", 0)
    end
end)

-- VISUAL THEME (idempotent, applied each Play)
L.Ambient = Color3.fromRGB(15, 15, 25)
L.OutdoorAmbient = Color3.fromRGB(15, 15, 25)
L.Brightness = 0.5
L.ClockTime = 0
L.FogStart = 99999
L.FogEnd = 999999

for _, c in ipairs(L:GetChildren()) do
    if c:IsA("Sky") or c:IsA("BloomEffect") then c:Destroy() end
end

local sky = Instance.new("Sky")
sky.StarCount = 3000
sky.SunAngularSize = 0
sky.MoonAngularSize = 0
sky.Parent = L

local bl = Instance.new("BloomEffect")
bl.Intensity = 1.2
bl.Size = 24
bl.Threshold = 0.85
bl.Parent = L

for _, name in ipairs({"Baseplate", "SpawnLocation"}) do
    local part = W:FindFirstChild(name)
    if part then
        part.Transparency = 1
        part.CanCollide = false
        for _, d in ipairs(part:GetDescendants()) do
            if d:IsA("Decal") or d:IsA("Texture") then d:Destroy() end
        end
    end
end

-- Ball trail
local ba0 = Instance.new("Attachment")
ba0.Name = "BallTrailA0"
ba0.Position = Vector3.new(0, 1, 0)
ba0.Parent = b
local ba1 = Instance.new("Attachment")
ba1.Name = "BallTrailA1"
ba1.Position = Vector3.new(0, -1, 0)
ba1.Parent = b
local bt = Instance.new("Trail")
bt.Name = "BallTrail"
bt.Attachment0 = ba0
bt.Attachment1 = ba1
bt.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255))
bt.Transparency = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0.2),
    NumberSequenceKeypoint.new(1, 1),
})
bt.Lifetime = 2
bt.MinLength = 0.1
bt.LightEmission = 1
bt.LightInfluence = 0
bt.Parent = b

print("GravityGolf v7 loaded — 2D plane, planet-crash kill, multi-planet gravity")
