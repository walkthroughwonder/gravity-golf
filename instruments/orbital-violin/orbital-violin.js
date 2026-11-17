import * as THREE from "three";
import { ORBITAL_VIOLIN_LEVELS } from "./levels.js";
import { analyzeOrbit, clamp, updateOrbitCapture } from "./OrbitAnalyzer.js";

window.orbitalViolinModuleLoaded = true;

const TAU = Math.PI * 2;
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const canvas = document.getElementById("orbitalCanvas");
const unlockScreen = document.getElementById("unlockScreen");
const enterButton = document.getElementById("enterButton");
const audioStatus = document.getElementById("audioStatus");
const levelName = document.getElementById("levelName");
const goalText = document.getElementById("goalText");
const debugToggle = document.getElementById("debugToggle");
const debugPanel = document.getElementById("debugPanel");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isTouchDevice,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.35 : 1.85));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070a);
scene.fog = new THREE.FogExp2(0x03070a, 0.018);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0, -1, 24);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xcce8ff, 0.9);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xf7e3b0, 1.7);
keyLight.position.set(-6, -4, 10);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x79f4d5, 0.6);
fillLight.position.set(8, 7, 8);
scene.add(fillLight);

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const interactionPlane = new THREE.Plane();
const tempWorld = new THREE.Vector3();
const cameraForward = new THREE.Vector3();

const levelRoot = new THREE.Group();
scene.add(levelRoot);

const starRoot = new THREE.Group();
scene.add(starRoot);

const aimMaterial = new THREE.LineBasicMaterial({
  color: 0xf2c66d,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const aimLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), aimMaterial);
scene.add(aimLine);

const state = {
  levelIndex: 0,
  level: null,
  spheres: [],
  player: null,
  launched: false,
  aiming: false,
  aimStart: new THREE.Vector2(),
  aimCurrent: new THREE.Vector2(),
  aimWorldStart: new THREE.Vector3(),
  correctionActive: false,
  correctionStart: new THREE.Vector2(),
  correctionWorldStart: new THREE.Vector3(),
  correctionHeldFor: 0,
  energy: 1,
  nearestSphere: null,
  nearestCapture: null,
  captures: new Map(),
  goalProgress: 0,
  sequenceIndex: 0,
  complete: false,
  audioUnlocked: false,
  debug: false,
  elapsed: 0,
  lastMessage: "",
};

function setParam(param, value, timeConstant = 0.04, startTime = 0) {
  if (!param) return;
  param.setTargetAtTime(value, startTime, timeConstant);
}

function createGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.92)");
  grad.addColorStop(0.28, "rgba(121,244,213,0.45)");
  grad.addColorStop(1, "rgba(121,244,213,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const glowTexture = createGlowTexture();

function createNebulaTexture(color1, color2, color3, size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const base = ctx.createRadialGradient(cx * 0.9, cy * 1.08, 0, cx, cy, size * 0.52);
  base.addColorStop(0, color1);
  base.addColorStop(0.42, color2);
  base.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "screen";
  const wisp = ctx.createRadialGradient(cx * 1.28, cy * 0.72, 0, cx * 1.1, cy * 0.82, size * 0.36);
  wisp.addColorStop(0, color2);
  wisp.addColorStop(0.5, color3);
  wisp.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wisp;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "overlay";
  for (let i = 0; i < 520; i++) {
    const a = Math.random() * 0.13;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 1.8, 0, TAU);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addNebulae() {
  const configs = [
    { pos: [28, 12, -38], scale: 120, c1: "rgba(75,20,120,0.22)", c2: "rgba(140,40,190,0.12)", c3: "rgba(210,80,255,0.07)" },
    { pos: [-34, -8, -30], scale: 110, c1: "rgba(15,45,95,0.2)", c2: "rgba(40,90,180,0.12)", c3: "rgba(70,150,250,0.06)" },
    { pos: [8, 28, -45], scale: 145, c1: "rgba(90,38,10,0.16)", c2: "rgba(160,80,20,0.1)", c3: "rgba(255,170,45,0.055)" },
    { pos: [-15, 8, 28], scale: 82, c1: "rgba(45,16,82,0.13)", c2: "rgba(85,35,140,0.08)", c3: "rgba(140,80,220,0.045)" },
  ];

  for (const cfg of configs) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createNebulaTexture(cfg.c1, cfg.c2, cfg.c3),
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }));
    sprite.position.set(...cfg.pos);
    sprite.scale.set(cfg.scale, cfg.scale, 1);
    starRoot.add(sprite);
  }
}

function createPlanetoidTexture(baseColor) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const color = new THREE.Color(baseColor);
  const dark = color.clone().multiplyScalar(0.34);
  const warm = color.clone().lerp(new THREE.Color(0xffcc44), 0.42);

  const gradient = ctx.createRadialGradient(size * 0.34, size * 0.26, 0, size * 0.5, size * 0.52, size * 0.72);
  gradient.addColorStop(0, `#${warm.getHexString()}`);
  gradient.addColorStop(0.55, `#${color.getHexString()}`);
  gradient.addColorStop(1, `#${dark.getHexString()}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 950; i++) {
    const alpha = 0.04 + Math.random() * 0.18;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 34; i++) {
    ctx.strokeStyle = `rgba(255,230,120,${0.08 + Math.random() * 0.16})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.4;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(Math.random() * size * 0.2, y);
    ctx.bezierCurveTo(size * 0.25, y + Math.random() * 50 - 25, size * 0.7, y + Math.random() * 50 - 25, size, y + Math.random() * 30 - 15);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createRuggedSphereGeometry(radius, detail, seed = 1) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const posAttr = geometry.attributes.position;
  const phase = typeof seed === "number" ? seed : seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  for (let i = 0; i < posAttr.count; i++) {
    const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    const len = v.length();
    const noise =
      1 +
      Math.sin(v.x * 5.1 + phase) * Math.cos(v.y * 7.3 - phase * 0.3) * Math.sin(v.z * 3.7 + phase * 0.13) * 0.055;
    v.normalize().multiplyScalar(len * noise);
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createStarfield() {
  const count = isTouchDevice ? 780 : 1400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyan = new THREE.Color(0x79f4d5);
  const amber = new THREE.Color(0xf2c66d);
  const white = new THREE.Color(0xf4efe4);

  for (let i = 0; i < count; i++) {
    const radius = 26 + Math.random() * 74;
    const angle = Math.random() * TAU;
    const z = -14 - Math.random() * 24;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = z;

    const color = white.clone().lerp(Math.random() > 0.55 ? cyan : amber, Math.random() * 0.55);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.07,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  starRoot.add(new THREE.Points(geometry, material));
}

class PlayerProbe {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.group = new THREE.Group();
    this.group.name = "PlayerProbe";

    const bodyGeo = createRuggedSphereGeometry(0.26, 2, "probe");
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      emissive: 0xffaa22,
      emissiveIntensity: 1.35,
      roughness: 0.38,
      metalness: 0.16,
      flatShading: true,
    });
    this.body = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.group.add(this.body);

    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffcc33,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.glow.scale.setScalar(2.4);
    this.group.add(this.glow);

    this.speedRing = this.makeRing(0.48, 0xffcc33);
    this.resonanceRing = this.makeRing(0.64, 0x88ccff);
    this.stabilityRing = this.makeRing(0.8, 0xffaa44);
    this.group.add(this.speedRing, this.resonanceRing, this.stabilityRing);

    this.trailPositions = [];
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trail = new THREE.Line(this.trailGeometry, this.trailMaterial);
    levelRoot.add(this.trail);
    levelRoot.add(this.group);
  }

  makeRing(radius, color) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 8, 64),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    return ring;
  }

  set(position, velocity) {
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.group.position.copy(this.position);
    this.trailPositions.length = 0;
    this.updateTrail(true);
  }

  updateVisuals(stats) {
    this.group.position.copy(this.position);
    this.group.rotation.z += 0.012 + stats.speed * 0.0015;
    if (this.velocity.lengthSq() > 0.0001) {
      const flightNormal = this.velocity.clone().normalize();
      this.speedRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), flightNormal);
      this.resonanceRing.quaternion.copy(this.speedRing.quaternion);
      this.stabilityRing.quaternion.copy(this.speedRing.quaternion);
    }
    this.glow.scale.setScalar(2.1 + stats.resonance * 1.2 + clamp(stats.speed / 18) * 1.1);
    this.glow.material.opacity = 0.34 + stats.resonance * 0.36;
    this.speedRing.material.opacity = 0.16 + clamp(stats.speed / 14) * 0.44;
    this.resonanceRing.material.opacity = 0.12 + stats.resonance * 0.52;
    this.stabilityRing.material.opacity = 0.12 + stats.stability * 0.5;
    const stretch = 1 + clamp(stats.speed / 18) * 0.22;
    this.speedRing.scale.set(stretch, 1 / stretch, 1);
    this.resonanceRing.scale.setScalar(1 + stats.resonance * 0.18);
    this.stabilityRing.scale.setScalar(1 + stats.stability * 0.16);
    this.bodyMat.emissiveIntensity = 1.2 + stats.resonance * 1.7 + stats.stability * 0.8;
  }

  updateTrail(force = false) {
    const last = this.trailPositions[this.trailPositions.length - 1];
    if (force || !last || last.distanceToSquared(this.position) > 0.035) {
      this.trailPositions.push(this.position.clone());
    }
    const maxTrail = Math.round(34 + clamp(this.velocity.length() / 18) * 72);
    while (this.trailPositions.length > maxTrail) this.trailPositions.shift();
    if (this.trailPositions.length > 1) {
      this.trailGeometry.setFromPoints(this.trailPositions);
    }
  }

  dispose() {
    this.body.geometry.dispose();
    this.bodyMat.dispose();
    this.glow.material.dispose();
    this.speedRing.geometry.dispose();
    this.speedRing.material.dispose();
    this.resonanceRing.geometry.dispose();
    this.resonanceRing.material.dispose();
    this.stabilityRing.geometry.dispose();
    this.stabilityRing.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}

class ResonantSphere {
  constructor(data) {
    Object.assign(this, data);
    this.position = new THREE.Vector3(...data.position);
    this.lockTimer = 0;
    this.resonanceLock = 0;
    this.audioState = { proximity: 0, wet: 0, gate: 1 };
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.name = data.id;

    const color = new THREE.Color(data.color);
    const texture = createPlanetoidTexture(color);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color,
      map: texture,
      emissive: color,
      emissiveIntensity: 0.38,
      transparent: true,
      opacity: 0.96,
      roughness: 0.42,
      metalness: 0.14,
      flatShading: true,
    });
    this.body = new THREE.Mesh(createRuggedSphereGeometry(0.72, 3, data.id), this.bodyMat);
    this.group.add(this.body);

    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.86, 32, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      })
    );
    this.group.add(this.atmosphere);

    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.halo.scale.setScalar(5.2);
    this.group.add(this.halo);

    this.audibleShell = this.makeRingSet(data.audibleRadius, 0.012, color, 0.04);
    this.minBand = this.makeRingSet(data.minOrbitRadius, 0.018, color, 0.13);
    this.maxBand = this.makeRingSet(data.maxOrbitRadius, 0.018, color, 0.09);
    this.lockPulse = this.makeRingSet((data.minOrbitRadius + data.maxOrbitRadius) * 0.5, 0.026, color, 0);
    this.group.add(this.audibleShell, this.minBand, this.maxBand, this.lockPulse);

    levelRoot.add(this.group);
  }

  makeRing(radius, tube, color, opacity) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 128),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    return ring;
  }

  makeRingSet(radius, tube, color, opacity) {
    const group = new THREE.Group();
    const xy = this.makeRing(radius, tube, color, opacity);
    const yz = this.makeRing(radius, tube, color, opacity * 0.72);
    const xz = this.makeRing(radius, tube, color, opacity * 0.72);
    yz.rotation.y = Math.PI / 2;
    xz.rotation.x = Math.PI / 2;
    group.add(xy, yz, xz);
    return group;
  }

  setRingSetOpacity(group, opacity) {
    group.children.forEach((ring, index) => {
      ring.material.opacity = index === 0 ? opacity : opacity * 0.72;
    });
  }

  updateVisuals(capture, proximity, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time * (2.2 + this.resonanceLock * 4));
    const lock = capture.resonanceLock;
    this.group.rotation.z += 0.003 + lock * 0.012;
    this.body.rotation.y += 0.002 + lock * 0.005;
    this.body.rotation.x += 0.001;
    this.body.scale.setScalar(1 + proximity * 0.08 + lock * 0.16);
    this.bodyMat.emissiveIntensity = 0.38 + proximity * 1.25 + lock * 2.3;
    this.atmosphere.scale.setScalar(1 + proximity * 0.15 + lock * 0.28 + pulse * lock * 0.08);
    this.atmosphere.material.opacity = 0.08 + proximity * 0.12 + lock * 0.22;
    this.halo.scale.setScalar(4.8 + proximity * 2.5 + lock * 3.6);
    this.halo.material.opacity = 0.16 + proximity * 0.22 + lock * 0.32;
    this.setRingSetOpacity(this.audibleShell, 0.025 + proximity * 0.08);
    this.setRingSetOpacity(this.minBand, 0.08 + lock * 0.25);
    this.setRingSetOpacity(this.maxBand, 0.06 + lock * 0.22);
    this.setRingSetOpacity(this.lockPulse, lock > 0.02 ? lock * (0.16 + pulse * 0.3) : 0);
    this.lockPulse.scale.setScalar(1 + lock * 0.1 + pulse * lock * 0.07);
  }

  dispose() {
    this.body.geometry.dispose();
    this.body.material.map?.dispose();
    this.body.material.dispose();
    this.atmosphere.geometry.dispose();
    this.atmosphere.material.dispose();
    for (const group of [this.audibleShell, this.minBand, this.maxBand, this.lockPulse]) {
      for (const ring of group.children) {
        ring.geometry.dispose();
        ring.material.dispose();
      }
    }
    this.halo.material.dispose();
  }
}

class SphereAudioBus {
  constructor(ctx, master, reverbBuffer, sphere, buffer, index) {
    this.ctx = ctx;
    this.sphere = sphere;
    this.hasSample = Boolean(buffer);
    this.mainGain = ctx.createGain();
    this.mainGain.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 650;
    this.filter.Q.value = 0.7;
    this.gateGain = ctx.createGain();
    this.gateGain.gain.value = 1;
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.84;
    this.delay = ctx.createDelay(0.72);
    this.delay.delayTime.value = 0.18;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.03;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0.02;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = reverbBuffer;
    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = 0.02;

    if (buffer) {
      this.source = ctx.createBufferSource();
      this.source.buffer = buffer;
      this.source.loop = true;
      this.source.loopStart = 0;
      this.source.loopEnd = buffer.duration;
      this.source.playbackRate.value = 1;
    } else {
      this.source = ctx.createOscillator();
      this.source.type = index % 2 ? "sine" : "triangle";
      this.source.frequency.value = 196 + index * 41;
    }

    this.source.connect(this.filter);
    this.filter.connect(this.gateGain);
    this.gateGain.connect(this.dryGain);
    this.dryGain.connect(this.mainGain);
    this.gateGain.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.mainGain);
    this.gateGain.connect(this.reverb);
    this.reverb.connect(this.reverbWet);
    this.reverbWet.connect(this.mainGain);
    this.mainGain.connect(master);
    this.source.start();
  }

  update(capture, proximity, time) {
    const now = this.ctx.currentTime;
    const distanceGain = Math.pow(proximity, 1.8);
    const lock = capture.resonanceLock;
    const speedNorm = clamp(capture.speed / 18);
    const fieldNorm = clamp(capture.fieldDepth / 4);
    const radialNorm = clamp(Math.abs(capture.radialVelocity) / 4);
    const targetGain = distanceGain * (this.hasSample ? 0.78 : 0.18) * (0.55 + lock * 0.65);
    setParam(this.mainGain.gain, targetGain, 0.06, now);

    let filterTarget = 480 + fieldNorm * 1200 + lock * 1800;
    let reverbTarget = 0.025 + lock * 0.22 + fieldNorm * 0.08;
    let delayTarget = 0.02 + lock * 0.1;
    let feedbackTarget = 0.03 + lock * 0.16;
    let gateTarget = 1;
    let playbackTarget = 1;

    if (this.sphere.effectType === "legatoBloom") {
      filterTarget = 650 + fieldNorm * 1500 + lock * 2600;
      reverbTarget = 0.04 + lock * 0.34 + fieldNorm * 0.12;
      delayTarget = 0.025 + lock * 0.16;
      feedbackTarget = 0.04 + lock * 0.2;
      playbackTarget = 1 + clamp(capture.tangentialVelocity - capture.circularSpeed, -4, 4) * 0.006;
    } else if (this.sphere.effectType === "asymmetricGate") {
      const rate = clamp(2.2 + capture.angularMomentum * 0.24, 2.2, 9.5);
      const skew = 0.22 * Math.sin(time * 1.7) + radialNorm * 0.16;
      const wave = 0.5 + 0.5 * Math.sin(time * TAU * rate + Math.sin(time * 3.1) * skew);
      const gateDepth = lock * 0.82;
      gateTarget = 1 - gateDepth * Math.pow(wave, 1.75);
      filterTarget = 820 + fieldNorm * 1700 + (1 - radialNorm) * 900;
      delayTarget = 0.04 + lock * 0.19;
      feedbackTarget = 0.05 + lock * 0.24;
      reverbTarget = 0.02 + lock * 0.12;
      playbackTarget = 1 + clamp(capture.angularMomentum / 80, 0, 0.07) - radialNorm * 0.012;
    } else {
      const shimmer = clamp(speedNorm * 0.65 + fieldNorm * 0.6);
      filterTarget = 900 + shimmer * 3600;
      reverbTarget = 0.03 + shimmer * 0.24 + lock * 0.18;
      delayTarget = 0.025 + shimmer * 0.18;
      feedbackTarget = 0.04 + shimmer * 0.18;
      playbackTarget = 1 + shimmer * 0.045;
    }

    setParam(this.filter.frequency, filterTarget, 0.05, now);
    setParam(this.filter.Q, 0.8 + lock * 3.6, 0.08, now);
    setParam(this.gateGain.gain, gateTarget, 0.018, now);
    setParam(this.delayWet.gain, delayTarget, 0.08, now);
    setParam(this.feedback.gain, feedbackTarget, 0.08, now);
    setParam(this.reverbWet.gain, reverbTarget, 0.1, now);
    if (this.source.playbackRate) setParam(this.source.playbackRate, playbackTarget, 0.08, now);
  }

  dispose() {
    try {
      this.source.stop();
    } catch {
      // Buffer sources can already be stopped when changing levels.
    }

    for (const node of [
      this.source,
      this.filter,
      this.gateGain,
      this.dryGain,
      this.delay,
      this.feedback,
      this.delayWet,
      this.reverb,
      this.reverbWet,
      this.mainGain,
    ]) {
      try {
        node.disconnect();
      } catch {
        // Already disconnected nodes are harmless during route-level cleanup.
      }
    }
  }
}

class OrbitalViolinAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.reverbBuffer = null;
    this.buses = new Map();
    this.unlocked = false;
    this.ambientGain = null;
    this.drone = null;
    this.shimmer = null;
    this.shimmerGain = null;
    this.sampleReport = [];
  }

  async unlock(spheres) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      this.sampleReport.push("Web Audio is unavailable in this browser.");
      return this.sampleReport;
    }

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.ctx.destination);
      this.reverbBuffer = this.createImpulseResponse();
      this.createAmbientBed();
    }

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    this.unlocked = true;
    return this.connectSpheres(spheres);
  }

  createImpulseResponse() {
    const seconds = 1.8;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8) * 0.24;
      }
    }
    return buffer;
  }

  createAmbientBed() {
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.015;
    this.ambientGain.connect(this.master);

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 220;
    droneFilter.Q.value = 0.8;
    droneFilter.connect(this.ambientGain);

    this.drone = this.ctx.createOscillator();
    this.drone.type = "sine";
    this.drone.frequency.value = 64;
    this.drone.connect(droneFilter);
    this.drone.start();

    this.shimmerGain = this.ctx.createGain();
    this.shimmerGain.gain.value = 0.004;
    this.shimmerGain.connect(this.master);
    this.shimmer = this.ctx.createOscillator();
    this.shimmer.type = "triangle";
    this.shimmer.frequency.value = 392;
    this.shimmer.connect(this.shimmerGain);
    this.shimmer.start();
  }

  async loadBuffer(url) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  async prepareSphere(sphere, index) {
    const buffer = await this.loadBuffer(sphere.sampleUrl);
    const bus = new SphereAudioBus(this.ctx, this.master, this.reverbBuffer, sphere, buffer, index);
    this.buses.set(sphere.id, bus);
    return buffer ? `${sphere.id}: loaded` : `${sphere.id}: missing sample, using fallback`;
  }

  disposeBuses() {
    for (const bus of this.buses.values()) bus.dispose();
    this.buses.clear();
  }

  async connectSpheres(spheres) {
    if (!this.ctx || !this.master) return [];
    this.disposeBuses();
    const loaded = await Promise.all(spheres.map((sphere, index) => this.prepareSphere(sphere, index)));
    this.sampleReport = loaded;
    return loaded;
  }

  updateSphere(sphere, capture, proximity, time) {
    if (!this.unlocked) return;
    const bus = this.buses.get(sphere.id);
    if (bus) bus.update(capture, proximity, time);
  }

  updateAmbient(stats) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;
    const field = clamp(stats.fieldDepth / 4);
    const resonance = clamp(stats.resonance);
    const speed = clamp(stats.speed / 20);
    setParam(this.ambientGain.gain, 0.012 + field * 0.026 + resonance * 0.018, 0.12, now);
    setParam(this.drone.frequency, 58 + field * 38 + resonance * 16, 0.16, now);
    setParam(this.shimmer.frequency, 300 + speed * 420 + resonance * 240, 0.12, now);
    setParam(this.shimmerGain.gain, 0.002 + resonance * 0.018 + speed * 0.008, 0.14, now);
  }
}

const audioEngine = new OrbitalViolinAudio();

function screenToWorld(clientX, clientY, target = tempWorld, anchor = state.player?.position || new THREE.Vector3()) {
  pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
  pointerNdc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  camera.getWorldDirection(cameraForward);
  interactionPlane.setFromNormalAndCoplanarPoint(cameraForward, anchor);
  raycaster.ray.intersectPlane(interactionPlane, target);
  return target;
}

function screenDragToWorldDirection(dx, dy) {
  const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const worldDir = camRight.multiplyScalar(-dx).add(camUp.multiplyScalar(dy));
  if (worldDir.lengthSq() < 0.0001) worldDir.set(1, 0, 0);
  return worldDir.normalize();
}

function clearLevel() {
  audioEngine.disposeBuses();
  while (levelRoot.children.length) {
    levelRoot.remove(levelRoot.children[0]);
  }
  if (state.player) {
    state.player.dispose();
    state.player = null;
  }
  for (const sphere of state.spheres) sphere.dispose();
  state.spheres = [];
  state.captures.clear();
}

async function connectCurrentLevelAudio() {
  if (!state.audioUnlocked) return;
  audioStatus.textContent = "Connecting violin bodies...";
  const report = await audioEngine.connectSpheres(state.spheres);
  audioStatus.textContent = report.join(" / ");
}

function selectLevel(levelIndex) {
  loadLevel(levelIndex);
  if (state.audioUnlocked) {
    void connectCurrentLevelAudio();
  }
}

function loadLevel(levelIndex) {
  clearLevel();
  const level = ORBITAL_VIOLIN_LEVELS[levelIndex];
  state.levelIndex = levelIndex;
  state.level = level;
  state.launched = false;
  state.aiming = false;
  state.correctionActive = false;
  state.energy = 1;
  state.nearestSphere = null;
  state.nearestCapture = null;
  state.goalProgress = 0;
  state.sequenceIndex = 0;
  state.complete = false;
  state.elapsed = 0;
  state.captures = new Map();
  scene.background.setHex(level.theme.background);
  scene.fog.color.setHex(level.theme.background);
  levelName.textContent = level.name;
  goalText.textContent = level.goal.text;
  document.querySelectorAll(".level-button").forEach((button, index) => {
    button.classList.toggle("active", index === levelIndex);
  });

  state.spheres = level.spheres.map((sphereData) => new ResonantSphere(sphereData));
  state.player = new PlayerProbe();
  state.player.set(
    new THREE.Vector3(...level.playerStart.position),
    new THREE.Vector3(...level.playerStart.velocity)
  );

  audioStatus.textContent = state.audioUnlocked
    ? "Samples are connected. Missing WAVs use quiet fallbacks."
    : "Audio starts only after this gesture.";

  updateAimLine(false);
  updateCamera(1);
}

function updateAimLine(visible) {
  if (!visible || !state.player) {
    aimMaterial.opacity = 0;
    return;
  }
  const dx = state.aimCurrent.x - state.aimStart.x;
  const dy = state.aimCurrent.y - state.aimStart.y;
  const dist = Math.hypot(dx, dy);
  const dir = screenDragToWorldDirection(dx, dy);
  const power = clamp(dist / 150) * 6.5;
  const points = [
    state.player.position.clone(),
    state.player.position.clone().add(dir.multiplyScalar(power)),
  ];
  aimLine.geometry.setFromPoints(points);
  aimMaterial.opacity = 0.24 + clamp(dist / 160) * 0.52;
}

function launchFromAim() {
  const dx = state.aimCurrent.x - state.aimStart.x;
  const dy = state.aimCurrent.y - state.aimStart.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) {
    goalText.textContent = "Drag backward from the probe, then release to launch.";
    return;
  }

  const dir = screenDragToWorldDirection(dx, dy);
  const power = 1.1 + clamp(dist / 170) * 7.4;
  state.player.velocity.copy(dir.multiplyScalar(power));
  state.launched = true;
  state.aiming = false;
  updateAimLine(false);
  goalText.textContent = "Tap for correction impulses. Hold to damp into bow drift.";
}

function applyCorrectionImpulse(endClientX, endClientY) {
  if (!state.launched || state.complete || state.energy <= 0.025) return;
  const endWorld = screenToWorld(endClientX, endClientY, new THREE.Vector3(), state.player.position);
  const screenDist = Math.hypot(endClientX - state.correctionStart.x, endClientY - state.correctionStart.y);
  let direction;
  let impulse;

  if (screenDist < 18) {
    direction = endWorld.sub(state.player.position);
    impulse = 0.72;
  } else {
    direction = endWorld.sub(state.correctionWorldStart);
    impulse = clamp(direction.length() * 0.14, 0.4, 1.15);
  }

  if (direction.lengthSq() < 0.0001) return;
  direction.normalize();
  const energyCost = clamp(impulse * 0.08, 0.05, 0.14);
  state.player.velocity.add(direction.multiplyScalar(impulse));
  state.energy = clamp(state.energy - energyCost);
}

function updateControls(dt) {
  if (state.correctionActive && state.launched && state.energy > 0 && !state.complete) {
    state.correctionHeldFor += dt;
    if (state.correctionHeldFor > 0.14) {
      const damp = Math.pow(0.78, dt);
      state.player.velocity.multiplyScalar(damp);
      state.energy = clamp(state.energy - dt * 0.07);
    }
  }

  if (state.launched && !state.correctionActive) {
    state.energy = clamp(state.energy + dt * 0.026);
  }
}

function updatePhysics(dt) {
  if (!state.player || !state.launched || state.complete) return;
  const steps = isTouchDevice ? 4 : 6;
  const subDt = Math.min(dt, 1 / 20) / steps;

  for (let i = 0; i < steps; i++) {
    for (const sphere of state.spheres) {
      const toSphere = sphere.position.clone().sub(state.player.position);
      const dist = Math.max(toSphere.length(), 0.42);
      const force = sphere.gravityStrength / Math.max(dist * dist, 0.18);
      state.player.velocity.add(toSphere.normalize().multiplyScalar(force * subDt));

      if (dist < 0.78) {
        const outward = state.player.position.clone().sub(sphere.position).normalize();
        const radialSpeed = state.player.velocity.dot(outward);
        if (radialSpeed < 0) {
          state.player.velocity.sub(outward.multiplyScalar(radialSpeed * 1.45));
        }
        state.player.position.copy(sphere.position).add(outward.multiplyScalar(0.78));
        state.player.velocity.multiplyScalar(0.92);
      }
    }

    state.player.velocity.multiplyScalar(Math.pow(0.9992, subDt * 60));
    state.player.position.add(state.player.velocity.clone().multiplyScalar(subDt));

    const escapeRadius = 34;
    if (state.player.position.length() > escapeRadius) {
      state.player.position.multiplyScalar(escapeRadius / state.player.position.length());
      state.player.velocity.multiplyScalar(0.72);
      goalText.textContent = "The probe skimmed the outer field. Redirect with a correction impulse.";
    }
  }
}

function findNearestSphere() {
  let nearest = null;
  let nearestDist = Infinity;
  for (const sphere of state.spheres) {
    const dist = sphere.position.distanceTo(state.player.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = sphere;
    }
  }
  return nearest;
}

function updateOrbitAndAudio(dt) {
  if (!state.player) return;
  let nearest = null;
  let nearestCapture = null;
  let nearestDist = Infinity;

  for (const sphere of state.spheres) {
    const capture = state.launched
      ? updateOrbitCapture(state.player, sphere, dt)
      : { ...analyzeOrbit(state.player, sphere), resonanceLock: sphere.resonanceLock, captured: false, insideResonanceShell: false };
    const dist = capture.radius;
    const proximity = clamp(1 - dist / sphere.audibleRadius);
    sphere.updateVisuals(capture, proximity, state.elapsed);
    audioEngine.updateSphere(sphere, capture, proximity, state.elapsed);
    state.captures.set(sphere.id, capture);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = sphere;
      nearestCapture = capture;
    }
  }

  state.nearestSphere = nearest;
  state.nearestCapture = nearestCapture;
  audioEngine.updateAmbient({
    speed: nearestCapture?.speed || 0,
    fieldDepth: nearestCapture?.fieldDepth || 0,
    resonance: nearestCapture?.resonanceLock || 0,
  });
}

function updateGoal(dt) {
  if (!state.level || state.complete || !state.launched) return;
  const goal = state.level.goal;

  if (goal.type === "single_lock") {
    const capture = state.captures.get(goal.sphereId);
    state.goalProgress = capture?.resonanceLock || 0;
    if (capture?.captured) completeLevel("First orbit captured. The violin bloom is locked.");
  }

  if (goal.type === "angular_lock") {
    const capture = state.captures.get(goal.sphereId);
    const angularOk =
      capture &&
      capture.angularMomentum >= goal.minAngularMomentum &&
      capture.angularMomentum <= goal.maxAngularMomentum;
    state.goalProgress = angularOk ? capture.resonanceLock : 0;
    if (capture?.captured && angularOk) completeLevel("Balkan gate opened. Angular rhythm is locked.");
  }

  if (goal.type === "sequence_lock") {
    const activeId = goal.sequence[state.sequenceIndex];
    const capture = state.captures.get(activeId);
    state.goalProgress = capture?.resonanceLock || 0;

    if (capture?.captured) {
      state.sequenceIndex += 1;
      state.goalProgress = 0;
      if (state.sequenceIndex >= goal.sequence.length) {
        completeLevel("Transfer resonance complete. The two violin bodies are layered.");
      } else {
        goalText.textContent = "First lock held. Transfer to the second resonant sphere.";
      }
    }
  }
}

function completeLevel(message) {
  state.complete = true;
  state.lastMessage = message;
  goalText.textContent = `${message} Choose another prototype level, or keep listening.`;
}

function updateCamera(dt) {
  if (!state.player) return;
  const speed = state.player.velocity.length();
  const nearest = state.nearestSphere || findNearestSphere();
  const radialUp = nearest
    ? state.player.position.clone().sub(nearest.position)
    : new THREE.Vector3(0, 1, 0);
  if (radialUp.lengthSq() < 0.001) radialUp.set(0, 1, 0);
  radialUp.normalize();

  const flightBack = state.player.velocity.clone();
  if (flightBack.lengthSq() > 0.001) {
    flightBack.normalize().multiplyScalar(-(6 + clamp(speed / 16) * 5));
  } else {
    flightBack.set(-5, -4, 7);
  }

  const cameraLift = radialUp.multiplyScalar(isTouchDevice ? 4.2 : 3.2);
  const targetPos = state.player.position
    .clone()
    .add(flightBack)
    .add(cameraLift)
    .add(new THREE.Vector3(0, 0, 10 + clamp(speed / 18) * 4));
  camera.position.lerp(targetPos, clamp(dt * 3.8, 0.04, 0.16));
  const lookTarget = nearest
    ? state.player.position.clone().lerp(nearest.position, 0.18)
    : state.player.position.clone();
  camera.lookAt(lookTarget);
}

function updateHud() {
  const capture = state.nearestCapture;
  const sphere = state.nearestSphere;
  const speed = capture?.speed || state.player?.velocity.length() || 0;
  const stability = capture?.orbitStability || 0;
  const resonance = capture?.resonanceLock || 0;
  const fieldDepth = capture?.fieldDepth || 0;
  const angularMomentum = capture?.angularMomentum || 0;

  document.querySelector('[data-label="speed"]').style.setProperty("--value", String(clamp(speed / 16)));
  document.querySelector('[data-label="resonance"]').style.setProperty("--value", String(resonance));
  document.querySelector('[data-label="stability"]').style.setProperty("--value", String(stability));
  document.querySelector(".energy-arc").style.setProperty("--energy", String(state.energy));
  document.getElementById("energyValue").textContent = Math.round(state.energy * 100);

  if (state.player) {
    state.player.updateVisuals({ speed, resonance, stability });
  }

  if (!debugPanel.hidden) {
    document.getElementById("statSpeed").textContent = speed.toFixed(2);
    document.getElementById("statAngular").textContent = angularMomentum.toFixed(2);
    document.getElementById("statStability").textContent = stability.toFixed(2);
    document.getElementById("statField").textContent = fieldDepth.toFixed(2);
    document.getElementById("statResonance").textContent = resonance.toFixed(2);
    document.getElementById("statEnergy").textContent = `${Math.round(state.energy * 100)}%`;
    document.getElementById("statNearest").textContent = sphere?.name || "none";
    document.getElementById("statLock").textContent = capture?.captured
      ? "captured"
      : `${Math.round(resonance * 100)}%`;
  }
}

function step(dt) {
  state.elapsed += dt;
  updateControls(dt);
  updatePhysics(dt);
  updateOrbitAndAudio(dt);
  updateGoal(dt);
  updateCamera(dt);
  if (state.player) state.player.updateTrail();
  updateHud();
  if (state.aiming) updateAimLine(true);
}

function render() {
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  step(dt);
  render();
}

function renderGameToText() {
  const player = state.player;
  const capture = state.nearestCapture;
  const payload = {
    coordinateSystem: "World XYZ space. Resonant spheres attract the probe in full 3D; +Z is depth toward the initial camera.",
    mode: state.audioUnlocked ? "audio_enabled" : "awaiting_audio_unlock",
    level: state.level?.id,
    launched: state.launched,
    complete: state.complete,
    goalProgress: Number(state.goalProgress.toFixed(2)),
    sequenceIndex: state.sequenceIndex,
    player: player
      ? {
          x: Number(player.position.x.toFixed(2)),
          y: Number(player.position.y.toFixed(2)),
          z: Number(player.position.z.toFixed(2)),
          vx: Number(player.velocity.x.toFixed(2)),
          vy: Number(player.velocity.y.toFixed(2)),
          vz: Number(player.velocity.z.toFixed(2)),
          speed: Number(player.velocity.length().toFixed(2)),
          energy: Number(state.energy.toFixed(2)),
        }
      : null,
    nearestSphere: state.nearestSphere
      ? {
          id: state.nearestSphere.id,
          name: state.nearestSphere.name,
          radius: Number((capture?.radius || 0).toFixed(2)),
          lock: Number((capture?.resonanceLock || 0).toFixed(2)),
          stability: Number((capture?.orbitStability || 0).toFixed(2)),
          captured: Boolean(capture?.captured),
        }
      : null,
    spheres: state.spheres.map((sphere) => ({
      id: sphere.id,
      x: sphere.position.x,
      y: sphere.position.y,
      z: sphere.position.z,
      lock: Number(sphere.resonanceLock.toFixed(2)),
    })),
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) {
    step(1 / 60);
  }
  render();
};

canvas.addEventListener("pointerdown", (event) => {
  if (!state.player || unlockScreen.classList.contains("hidden") === false) return;
  canvas.setPointerCapture(event.pointerId);

  if (!state.launched || state.complete) {
    if (state.complete) {
      selectLevel(state.levelIndex);
    }
    state.aiming = true;
    state.aimStart.set(event.clientX, event.clientY);
    state.aimCurrent.copy(state.aimStart);
    screenToWorld(event.clientX, event.clientY, state.aimWorldStart, state.player.position);
    updateAimLine(true);
    return;
  }

  state.correctionActive = true;
  state.correctionHeldFor = 0;
  state.correctionStart.set(event.clientX, event.clientY);
  screenToWorld(event.clientX, event.clientY, state.correctionWorldStart, state.player.position);
});

canvas.addEventListener("pointermove", (event) => {
  if (state.aiming) {
    state.aimCurrent.set(event.clientX, event.clientY);
    updateAimLine(true);
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (state.aiming) {
    state.aimCurrent.set(event.clientX, event.clientY);
    launchFromAim();
  } else if (state.correctionActive) {
    if (state.correctionHeldFor < 0.42) {
      applyCorrectionImpulse(event.clientX, event.clientY);
    }
  }
  state.aiming = false;
  state.correctionActive = false;
  updateAimLine(false);
});

canvas.addEventListener("pointercancel", () => {
  state.aiming = false;
  state.correctionActive = false;
  updateAimLine(false);
});

function enterOrbitalViolin(event) {
  event?.preventDefault();
  if (enterButton.disabled) return;

  enterButton.disabled = true;
  state.audioUnlocked = true;
  unlockScreen.classList.add("hidden");
  goalText.textContent = state.level.goal.text;
  audioStatus.textContent = "Entering orbit. Audio is connecting...";

  void audioEngine.unlock(state.spheres)
    .then((report) => {
      audioStatus.textContent = report.length ? report.join(" / ") : "Audio ready.";
    })
    .catch((error) => {
      console.warn("Orbital Violin audio init failed; continuing in visual mode.", error);
      audioStatus.textContent = "Audio unavailable; visual mode enabled.";
    });
}

enterButton.addEventListener("pointerup", enterOrbitalViolin);
enterButton.addEventListener("click", enterOrbitalViolin);

debugToggle.addEventListener("click", () => {
  state.debug = !state.debug;
  debugToggle.setAttribute("aria-pressed", String(state.debug));
  debugPanel.hidden = !state.debug;
});

document.querySelectorAll(".level-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectLevel(Number(button.dataset.level));
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "d") debugToggle.click();
  if (event.key.toLowerCase() === "r") selectLevel(state.levelIndex);
  if (event.key.toLowerCase() === "f") {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.35 : 1.85));
});

createStarfield();
addNebulae();
loadLevel(0);
animate();
