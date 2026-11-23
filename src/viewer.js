/* ==========================================================================
   THE LAST EXIT — Dedicated 3D Monster Inspector Controller
   Standalone full-window WebGL turntable viewer.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadWardenModel, WardenRig, WARDEN_UNIFORMS } from './game/warden-model.js';
import { loadCrawlerModel, buildCrawlerModel, CrawlerRig } from './game/creatures/crawler-model.js';
import { loadArchivistModel, buildArchivistModel, ArchivistRig } from './game/creatures/archivist-model.js';
import { QUALITY } from './game/config.js';

const canvas = document.getElementById('viewer-canvas');

// Scene, Fog, Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06090e);
scene.fog = new THREE.FogExp2(0x06090e, 0.04);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Platform Pedestal
const stageGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.28, 64);
const stageMat = new THREE.MeshStandardMaterial({
  color: 0x11161d,
  roughness: 0.82,
  metalness: 0.2,
});
const stage = new THREE.Mesh(stageGeo, stageMat);
stage.position.y = -0.14;
stage.receiveShadow = true;
scene.add(stage);

const ringGeo = new THREE.RingGeometry(3.3, 3.36, 64);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x2af588, side: THREE.DoubleSide });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.002;
scene.add(ring);

// Studio / Horror Lights
const ambientLight = new THREE.AmbientLight(0x383432, 1.1);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xfff6ec, 2.0);
mainLight.position.set(5, 8, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
scene.add(mainLight);

const rimLight = new THREE.DirectionalLight(0x992a2a, 1.1);
rimLight.position.set(-6, 5, -5);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xd4dde6, 0.7);
fillLight.position.set(-4, 3, 4);
scene.add(fillLight);

const spotLight = new THREE.SpotLight(0xfff5e6, 0, 25, Math.PI / 5.5, 0.35, 1.6);
spotLight.position.set(0, 2.2, 5.0);
spotLight.target.position.set(0, 1.2, 0);
spotLight.castShadow = true;
scene.add(spotLight);
scene.add(spotLight.target);

let lightPreset = 'studio';
function setLightPreset(preset) {
  lightPreset = preset;
  if (preset === 'flashlight') {
    ambientLight.intensity = 0.15;
    mainLight.intensity = 0.25;
    rimLight.intensity = 0.15;
    fillLight.intensity = 0.1;
    spotLight.intensity = 4.8;
  } else {
    ambientLight.intensity = 1.4;
    mainLight.intensity = 3.6;
    rimLight.intensity = 2.5;
    fillLight.intensity = 1.4;
    spotLight.intensity = 0;
  }
}
setLightPreset('studio');

// Camera Orbit Controls
const spherical = { radius: 5.0, theta: 0.35, phi: 1.25 };
const target = new THREE.Vector3(0, 0.9, 0);
let isDragging = false;
let isPanning = false;
let autoRotate = true;
const prevMouse = { x: 0, y: 0 };

function updateCamera() {
  const sinPhiRadius = Math.sin(spherical.phi) * spherical.radius;
  camera.position.set(
    target.x + sinPhiRadius * Math.sin(spherical.theta),
    target.y + Math.cos(spherical.phi) * spherical.radius,
    target.z + sinPhiRadius * Math.cos(spherical.theta)
  );
  camera.lookAt(target);
}
updateCamera();

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  prevMouse.x = e.clientX;
  prevMouse.y = e.clientY;
  if (e.button === 2) isPanning = true;
  else isDragging = true;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  prevMouse.x = e.clientX;
  prevMouse.y = e.clientY;

  if (isDragging) {
    spherical.theta -= dx * 0.007;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.007, 0.15, Math.PI / 2 + 0.08);
    updateCamera();
  } else if (isPanning) {
    target.y += dy * spherical.radius * 0.0015;
    updateCamera();
  }
});

const stopDrag = (e) => {
  isDragging = false;
  isPanning = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {}
};
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    spherical.radius = THREE.MathUtils.clamp(spherical.radius + e.deltaY * 0.004, 1.8, 9.5);
    updateCamera();
  },
  { passive: false }
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Telemetry & Lore
const CREATURES = {
  warden: {
    title: 'THE WARDEN',
    badge: 'SUBLEVEL 4 · MEDICAL FACILITY',
    desc: 'Heavily muscled quadruped horror with pale necrotic corpse skin, charcoal rib contours, obsidian claws, and metallic spinal braces. Prowling 4-legged gait with natural shoulder lurching and visceral maws.',
    targetY: 1.15,
    radius: 4.8,
  },
  crawler: {
    title: 'THE CRAWLER',
    badge: 'SUBLEVEL 7 · DRAINAGE SEWERS',
    desc: 'Continuous overlapping 10-segmented subterranean serpent predator. Armored chitinous spade plates, dual articulated razor mandibles, lateral crawling scutes, and pulsing bioluminescent emerald vein nodes.',
    targetY: 0.65,
    radius: 4.6,
  },
  archivist: {
    title: 'THE ARCHIVIST',
    badge: 'SUBLEVEL 1 · RESEARCH ARCHIVE',
    desc: 'Towering 2.5m winged demonic phantom with a 4.8m wingspan. Massive bat wings with high-frequency flap physics and predatory engulfing wing flare, clawed arms, swept horns, piercing yellow eyes, and digitigrade stride.',
    targetY: 1.45,
    radius: 5.2,
  },
};

let activeInstance = null;
let animMode = 'walk';
let time = 0;
let phase = 0;

async function loadMonster(monsterId = 'warden') {
  if (activeInstance) {
    scene.remove(activeInstance.object);
    if (activeInstance.dispose) activeInstance.dispose();
    activeInstance = null;
  }

  const meta = CREATURES[monsterId] || CREATURES.warden;
  document.getElementById('creature-title').textContent = meta.title;
  document.getElementById('creature-badge').textContent = meta.badge;
  document.getElementById('creature-desc').textContent = meta.desc;

  const isMixamoSupported = monsterId !== 'crawler';
  const fileKey = monsterId === 'crawler' ? 'the_crawler' : monsterId === 'archivist' ? 'archivist_tpose' : 'warden_tpose';
  const btnBlend = document.getElementById('btn-download-blend');
  const btnObj = document.getElementById('btn-download-obj');
  const btnGlb = document.getElementById('btn-download-glb');
  if (btnBlend) btnBlend.href = `./models/${fileKey}.blend`;
  if (btnObj) {
    btnObj.href = `./models/${fileKey}.obj`;
    btnObj.textContent = isMixamoSupported ? '📦 Download Mixamo T-Pose (.OBJ)' : '📦 Download .OBJ (Segmented)';
  }
  if (btnGlb) btnGlb.href = `./models/${fileKey}.glb`;

  if (monsterId === 'crawler') {
    const crawler = await loadCrawlerModel(QUALITY.high);
    crawler.object.position.set(0, 0, 0);
    scene.add(crawler.object);
    activeInstance = {
      type: 'crawler',
      object: crawler.object,
      rig: new CrawlerRig(crawler),
      dispose: crawler.dispose,
    };
  } else if (monsterId === 'archivist') {
    const archivist = await loadArchivistModel(QUALITY.high);
    archivist.object.position.set(0, 0, 0);
    scene.add(archivist.object);
    activeInstance = {
      type: 'archivist',
      object: archivist.object,
      rig: new ArchivistRig(archivist),
      dispose: archivist.dispose,
    };
  } else {
    // The Warden (Full Organic High-Poly Mesh & Quadruped Rig)
    const warden = await loadWardenModel();
    warden.object.position.x = 0;
    warden.object.position.z = 0;
    scene.add(warden.object);
    activeInstance = {
      type: 'warden',
      object: warden.object,
      mesh: warden.mesh,
      rig: new WardenRig(),
      dispose: () => {},
    };
  }

  target.set(0, meta.targetY, 0);
  spherical.radius = meta.radius;
  updateCamera();
}

// UI Buttons
document.querySelectorAll('[data-monster]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-monster]').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    loadMonster(btn.dataset.monster);
  });
});

document.querySelectorAll('[data-anim]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-anim]').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    animMode = btn.dataset.anim;
  });
});

document.querySelectorAll('[data-light]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-light]').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    setLightPreset(btn.dataset.light);
  });
});

const autoBtn = document.getElementById('btn-autorotate');
autoBtn?.addEventListener('click', () => {
  autoRotate = !autoRotate;
  autoBtn.classList.toggle('is-active', autoRotate);
});

const resetBtn = document.getElementById('btn-resetcam');
resetBtn?.addEventListener('click', () => {
  const current = CREATURES[activeInstance?.type] || CREATURES.warden;
  spherical.radius = current.radius;
  spherical.theta = 0.35;
  spherical.phi = 1.25;
  target.set(0, current.targetY, 0);
  updateCamera();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') document.querySelector('[data-monster="warden"]')?.click();
  else if (e.code === 'Digit2') document.querySelector('[data-monster="crawler"]')?.click();
  else if (e.code === 'Digit3') document.querySelector('[data-monster="archivist"]')?.click();
  else if (e.code === 'Space') {
    e.preventDefault();
    autoBtn?.click();
  }
});

// URL query support (?monster=crawler)
try {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('monster') || params.get('view') || 'warden';
  const targetId = ['warden', 'crawler', 'archivist'].includes(q) ? q : 'warden';
  document.querySelectorAll('[data-monster]').forEach((b) => b.classList.remove('is-active'));
  document.querySelector(`[data-monster="${targetId}"]`)?.classList.add('is-active');
  loadMonster(targetId);
} catch {
  loadMonster('warden');
}

// Render Loop
let lastT = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  if (autoRotate && !isDragging && !isPanning) {
    spherical.theta += dt * 0.35;
    updateCamera();
  }

  if (activeInstance && animMode !== 'freeze') {
    time += dt;
    const isAggro = animMode === 'aggro';
    const isIdle = animMode === 'idle';
    const speed = isAggro ? 1.4 : isIdle ? 0.05 : 0.85;
    phase += dt * (isAggro ? 8.5 : isIdle ? 1.8 : 4.5);
    const rig = activeInstance.rig;

    if (activeInstance.type === 'crawler') {
      rig?.update(dt, {
        phase,
        speed,
        time,
        lunge: isAggro,
        grab: isAggro,
        lookYaw: Math.sin(time * 1.5) * 0.25,
      });
    } else if (activeInstance.type === 'archivist') {
      rig?.update(dt, {
        phase,
        speed,
        time,
        lunge: isAggro,
        grab: isAggro,
        lookYaw: Math.sin(time * 1.8) * 0.3,
      });
    } else if (activeInstance.type === 'warden') {
      WARDEN_UNIFORMS.uTwitch.value = isAggro ? 0.8 : 0;
      rig?.update(
        dt,
        {
          speed,
          phase,
          settle: isIdle ? 0 : 1,
          time,
          lunge: isAggro ? 0.85 : 0,
          grab: isAggro ? 0.65 : 0,
          rear: 0,
          raise: isIdle ? 0.4 : 0,
          yawRate: Math.sin(time * 1.2) * 0.15,
          lookYaw: Math.sin(time * 1.6) * 0.25,
          headPitch: 0,
          tilt: 0,
        },
        10
      );
    }
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
