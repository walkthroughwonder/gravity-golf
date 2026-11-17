-- GravityGolfDemo v6 — Server
-- Same as v5 but publishes stroke count via Workspace attributes
-- so the HUD client script can read and display them.
-- Replace the entire Source of ServerScriptService.GravityGolfDemo with this.

local RS = game:GetService("RunService")
local W = workspace
local RpS = game:GetService("ReplicatedStorage")

W.Gravity = 0
pcall(function() W.FallenPartsDestroyHeight = -50000 end)

local G = 40
local MD = 15
local MAX_DIST = 600

-- Initial published state for HUD
W:SetAttribute("Strokes", 0)
W:SetAttribute("LastHoleInStrokes", -1)

-- Cleanup any prior run
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
    p.CanCollide = true
    p.Color = color
    p.Material = Enum.Material.Neon
    p:SetAttribute("GravityMass", mass)
    p.Parent = pf
    return p
end

makePlanet("BigPlanet", Vector3.new(0, 80, 0), 40, Color3.fromRGB(80, 140, 200), 50000)
makePlanet("SmallPlanet", Vector3.new(-90, 80, 0), 20, Color3.fromRGB(200, 140, 80), 20000)

-- Hole
local h = Instance.new("Part")
h.Name = "Hole"
h.Shape = Enum.PartType.Ball
h.Size = Vector3.new(12, 12, 12)
h.Position = Vector3.new(-140, 80, 0)
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
local sp = Vector3.new(80, 80, 80)
b.Position = sp
b.Anchored = true
b.CanCollide = true
b.Color = Color3.fromRGB(255, 255, 255)
b.Material = Enum.Material.SmoothPlastic
b.CustomPhysicalProperties = PhysicalProperties.new(0.7, 0.3, 0.5)
b.Parent = W

local function resetBall()
    b.Anchored = true
    b.AssemblyLinearVelocity = Vector3.new(0, 0, 0)
    b.Position = sp
end

-- RemoteEvent
local RE = Instance.new("RemoteEvent")
RE.Name = "GravityGolfLaunch"
RE.Parent = RpS

local strokes = 0

RE.OnServerEvent:Connect(function(pl, dir, power)
    if typeof(dir) ~= "Vector3" or typeof(power) ~= "number" then return end
    if dir.Magnitude < 0.001 then return end
    power = math.clamp(power, 0, 150)
    b.Anchored = false
    b.AssemblyLinearVelocity = dir.Unit * power
    strokes = strokes + 1
    W:SetAttribute("Strokes", strokes) -- HUD reads this
    print(pl.Name .. " shot #" .. strokes .. " power=" .. math.floor(power))
end)

-- Multi-planet gravity loop
local cn
cn = RS.Heartbeat:Connect(function(dt)
    if not b.Parent then cn:Disconnect() return end
    if b.Anchored then return end
    local minDist = math.huge
    for _, pl in ipairs(pf:GetChildren()) do
        local d = (b.Position - pl.Position).Magnitude
        if d < minDist then minDist = d end
    end
    if minDist > MAX_DIST then resetBall() return end
    local accel = Vector3.zero
    for _, pl in ipairs(pf:GetChildren()) do
        local mass = pl:GetAttribute("GravityMass") or pl:GetMass()
        local tc = pl.Position - b.Position
        local d = math.max(tc.Magnitude, MD)
        accel = accel + tc.Unit * (G * mass / (d * d))
    end
    b.AssemblyLinearVelocity = b.AssemblyLinearVelocity + accel * dt
end)

-- Hole detection — publish hole-in-one event for HUD banner
h.Touched:Connect(function(hit)
    if hit == b then
        W:SetAttribute("LastHoleInStrokes", strokes)
        print("HOLE IN ONE! strokes=" .. strokes)
        resetBall()
        strokes = 0
        W:SetAttribute("Strokes", 0)
    end
end)

print("GravityGolf v6 server loaded — publishing strokes attribute")
