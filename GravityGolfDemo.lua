-- GravityGolfDemo.lua
-- Drop this into ServerScriptService as a Script (not a LocalScript).
-- Hit Play. Click the white ball to boost it. Watch it orbit the blue planet.
-- The yellow glowing sphere is the goal hole.

local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

-- Disable the world's default gravity so we control it ourselves
Workspace.Gravity = 0

-- Tunables — adjust these to change feel
local G_CONST = 4000              -- gravitational constant (higher = stronger pull)
local INITIAL_TANGENTIAL = 60     -- starting orbital velocity
local CLICK_BOOST = 60            -- extra velocity per click
local MIN_DIST = 8                -- distance floor (prevents infinite force at zero distance)

-- Clean up if we've run before
for _, name in ipairs({"Planet", "Ball", "Hole"}) do
    local existing = Workspace:FindFirstChild(name)
    if existing then existing:Destroy() end
end

-- The Planet
local planet = Instance.new("Part")
planet.Name = "Planet"
planet.Shape = Enum.PartType.Ball
planet.Size = Vector3.new(40, 40, 40)
planet.Position = Vector3.new(0, 50, 0)
planet.Anchored = true
planet.Color = Color3.fromRGB(80, 140, 200)
planet.Material = Enum.Material.Neon
planet.Parent = Workspace

-- The Hole (goal)
local hole = Instance.new("Part")
hole.Name = "Hole"
hole.Shape = Enum.PartType.Ball
hole.Size = Vector3.new(8, 8, 8)
hole.Position = planet.Position + Vector3.new(0, 0, -28)
hole.Anchored = true
hole.CanCollide = false
hole.Color = Color3.fromRGB(255, 220, 80)
hole.Material = Enum.Material.Neon
hole.Transparency = 0.3
hole.Parent = Workspace

-- The Ball
local ball = Instance.new("Part")
ball.Name = "Ball"
ball.Shape = Enum.PartType.Ball
ball.Size = Vector3.new(2, 2, 2)
local startPos = planet.Position + Vector3.new(60, 0, 0)
ball.Position = startPos
ball.Anchored = false
ball.CanCollide = true
ball.Color = Color3.fromRGB(255, 255, 255)
ball.Material = Enum.Material.SmoothPlastic
ball.CustomPhysicalProperties = PhysicalProperties.new(0.7, 0.3, 0.5)
ball.Parent = Workspace

-- Initial sideways velocity to start the orbit
ball.AssemblyLinearVelocity = Vector3.new(0, 0, INITIAL_TANGENTIAL)

-- Click on the ball to boost it perpendicular to its current radial direction
local clicker = Instance.new("ClickDetector")
clicker.MaxActivationDistance = 1000
clicker.Parent = ball

clicker.MouseClick:Connect(function(player)
    local radial = (ball.Position - planet.Position).Unit
    local up = Vector3.new(0, 1, 0)
    local tangent = radial:Cross(up)
    if tangent.Magnitude < 0.001 then tangent = Vector3.new(1, 0, 0) end
    tangent = tangent.Unit
    ball.AssemblyLinearVelocity = ball.AssemblyLinearVelocity + tangent * CLICK_BOOST
    print(player.Name, "boosted the ball")
end)

-- The Gravity Loop: every Heartbeat, accelerate the ball toward the planet
local conn
conn = RunService.Heartbeat:Connect(function(dt)
    if not ball.Parent then conn:Disconnect() return end
    local toCenter = planet.Position - ball.Position
    local dist = math.max(toCenter.Magnitude, MIN_DIST)
    local accel = toCenter.Unit * (G_CONST * planet:GetMass() / (dist * dist))
    ball.AssemblyLinearVelocity = ball.AssemblyLinearVelocity + accel * dt
end)

-- Hole detection: reset on success
hole.Touched:Connect(function(hit)
    if hit == ball then
        print("HOLE IN!")
        ball.AssemblyLinearVelocity = Vector3.new(0, 0, 0)
        ball.Position = startPos
        task.wait(0.1)
        ball.AssemblyLinearVelocity = Vector3.new(0, 0, INITIAL_TANGENTIAL)
    end
end)

print("Gravity Golf demo loaded. Click the ball to boost.")
