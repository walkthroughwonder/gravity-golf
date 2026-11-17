export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function analyzeOrbit(player, sphere) {
  const rVec = player.position.clone().sub(sphere.position);
  const vVec = player.velocity.clone();
  const r = Math.max(rVec.length(), 0.001);
  const speed = vVec.length();
  const radialDir = rVec.clone().normalize();
  const radialVelocity = vVec.dot(radialDir);
  const tangentialVelocity = Math.sqrt(Math.max(0, speed * speed - radialVelocity * radialVelocity));
  const angularMomentum = r * tangentialVelocity;
  const fieldDepth = sphere.gravityStrength / Math.max(r * r, 0.001);
  const circularSpeed = Math.sqrt(sphere.gravityStrength / Math.max(r, 0.001));
  const speedError = Math.abs(tangentialVelocity - circularSpeed);
  const radialPenalty = Math.abs(radialVelocity);
  const orbitStability = clamp(
    1 - speedError / Math.max(circularSpeed, 0.001) - radialPenalty / Math.max(circularSpeed, 0.001),
    0,
    1
  );

  return {
    radius: r,
    speed,
    radialVelocity,
    tangentialVelocity,
    angularMomentum,
    fieldDepth,
    circularSpeed,
    orbitStability,
  };
}

export function updateOrbitCapture(player, sphere, dt) {
  const orbit = analyzeOrbit(player, sphere);
  const insideResonanceShell = orbit.radius > sphere.minOrbitRadius && orbit.radius < sphere.maxOrbitRadius;
  const stableEnough =
    orbit.orbitStability > sphere.requiredStability &&
    Math.abs(orbit.radialVelocity) < sphere.maxRadialVelocity;

  if (insideResonanceShell && stableEnough) {
    sphere.lockTimer += dt;
  } else {
    sphere.lockTimer = Math.max(0, sphere.lockTimer - dt * 2);
  }

  sphere.resonanceLock = clamp(sphere.lockTimer / sphere.requiredLockTime, 0, 1);

  return {
    ...orbit,
    resonanceLock: sphere.resonanceLock,
    captured: sphere.resonanceLock >= 1,
    insideResonanceShell,
  };
}
