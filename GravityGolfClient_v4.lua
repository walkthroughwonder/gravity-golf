-- GravityGolfClient v4 — LocalScript
-- Same as v3 (input + trajectory preview) but uses screen-distance click detection
-- instead of a precise raycast on the tiny ball, so the ball is far easier to click.
-- Replace the entire Source of StarterPlayer.StarterPlayerScripts.GravityGolfClient.

local UIS = game:GetService("UserInputService")
local RpS = game:GetService("ReplicatedStorage")
local W = workspace
local cam = W.CurrentCamera

local ball = W:WaitForChild("Ball", 10)
local pf = W:WaitForChild("Planets", 10)
local launchEvent = RpS:WaitForChild("GravityGolfLaunch", 10)
if not (ball and pf and launchEvent) then return end

-- Trajectory preview parts
local PREVIEW_COUNT = 40
local previewParts = {}
local hidden = Vector3.new(99999, 99999, 99999)
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

-- Physics simulation (must match server constants)
local G = 40
local MD = 15
local DT = 1/30

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
        vel = vel + accel * DT
        pos = pos + vel * DT
        previewParts[i].Position = pos
        if hitP then
            for j = i + 1, PREVIEW_COUNT do previewParts[j].Position = hidden end
            return
        end
    end
end

-- Aim/launch state
local aiming = false
local aimStart
local CLICK_RADIUS = 60 -- pixel radius around ball's projected position

-- NEW: screen-distance click test (replaces raycast)
local function isClickOnBall(inputPos)
    local sp, onScreen = cam:WorldToScreenPoint(ball.Position)
    if not onScreen then return false end
    local dx = inputPos.X - sp.X
    local dy = inputPos.Y - sp.Y
    return math.sqrt(dx*dx + dy*dy) < CLICK_RADIUS
end

local function aimVector(curPos)
    local delta = aimStart - curPos
    local toBall = (ball.Position - cam.CFrame.Position).Unit
    local right = toBall:Cross(Vector3.new(0, 1, 0))
    if right.Magnitude < 0.001 then right = Vector3.new(1, 0, 0) end
    right = right.Unit
    local up = right:Cross(toBall).Unit
    local dir = right * delta.X + up * delta.Y
    if dir.Magnitude < 0.001 then return Vector3.new(1, 0, 0), 0 end
    local power = math.clamp(dir.Magnitude * 2, 0, 150)
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

print("GG client v4 loaded — screen-distance click + multi-planet preview")
