/* ==========================================================================
   THE LAST EXIT — THE CRAWLER (Sublevel 7 Drainage Network)
   A continuous, seamless 10-segmented subterranean serpent predator.
   Features overlapping chitinous carapace armor, articulated twin mandibles,
   sinuous S-curve body-wave physics, lateral crawling scutes, and
   bioluminescent emerald bio-nodes.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clamp, damp, lerp } from '../config.js';

export const CRAWLER_SEGMENTS = 10;
export const CRAWLER_FACE_HEIGHT = 0.55;
export const CRAWLER_MODEL_URL = `${import.meta.env.BASE_URL}models/the_crawler.glb`;

export const CRAWLER_UNIFORMS = {
  uTime: { value: 0 },
  uPhase: { value: 0 },
  uSpeed: { value: 1.0 },
  uWaveAmp: { value: 0.32 },
  uLunge: { value: 0 },
};

const CRAWLER_VERTEX_HEADER = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSpeed;
  uniform float uWaveAmp;
  uniform float uLunge;

  vec3 crawlerDeform(vec3 p) {
    // Model spans from Z = -0.45 (tail) to Z = 2.96 (head)
    float zNorm = clamp((p.z + 0.45) / 3.41, 0.0, 1.0);
    float wave = sin(uPhase * 2.0 - (1.0 - zNorm) * 7.5);
    float taper = 1.0 - zNorm * 0.35;
    float lateral = wave * uWaveAmp * taper * clamp(uSpeed, 0.25, 1.4);
    float vertical = cos(uPhase * 1.5 - (1.0 - zNorm) * 4.0) * 0.035 * taper;

    // Head lunging & rearing
    float headMask = smoothstep(1.6, 2.8, p.z);
    float lungeY = headMask * uLunge * 0.32;
    float lungeZ = headMask * uLunge * 0.42;

    return p + vec3(lateral, vertical + lungeY, lungeZ);
  }
`;

function patchCrawlerSkinning(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, CRAWLER_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CRAWLER_VERTEX_HEADER}`)
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = crawlerDeform(position);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Boost deep chitin contrast:
         diffuseColor.rgb = pow(vColor.rgb, vec3(1.2));`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         // Toxic emerald bioluminescent glow along dorsal spine:
         float isEmerald = clamp((vColor.g - max(vColor.r, vColor.b) * 1.25) * 2.5, 0.0, 1.0);
         totalEmissiveRadiance += vColor.rgb * isEmerald * 3.2;

         // User's painted crimson blood / eye accents glow:
         float isRed = clamp((vColor.r - max(vColor.g, vColor.b) * 1.25) * 2.5, 0.0, 1.0);
         totalEmissiveRadiance += vColor.rgb * isRed * 2.8;`
      );
  };
  material.customProgramCacheKey = () => 'crawler-painted-shader';
}

let crawlerCached = null;
let crawlerLoadedInstance = null;

export function getLoadedCrawlerModel() {
  return crawlerLoadedInstance;
}

export function loadCrawlerModel(quality = {}) {
  if (crawlerCached) return crawlerCached;
  crawlerCached = new GLTFLoader().loadAsync(CRAWLER_MODEL_URL).then((gltf) => {
    let mesh = null;
    gltf.scene.traverse((child) => {
      if (!mesh && child.isMesh) mesh = child;
    });
    if (!mesh) throw new Error('the_crawler.glb contains no mesh');

    const geometry = mesh.geometry;
    geometry.computeBoundingBox();

    // Material setup with user vertex colors
    const hasColors = Boolean(geometry.attributes.color);
    const material = new THREE.MeshStandardMaterial({
      name: 'crawler-chitin',
      vertexColors: hasColors,
      roughness: 0.42,
      metalness: 0.35,
    });
    patchCrawlerSkinning(material);

    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    // Center on turntable: head at -Z (facing forward), resting on floor at Y = 0
    mesh.position.set(0, 0.54, -1.25);
    mesh.rotation.y = 0;

    const object = new THREE.Group();
    object.name = 'crawler-model-root';
    object.add(mesh);

    crawlerLoadedInstance = {
      object,
      mesh,
      material,
      isGlb: true,
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    };
    return crawlerLoadedInstance;
  }).catch((err) => {
    console.warn('Fallback to procedural crawler:', err);
    return buildCrawlerModel(quality);
  });
  return crawlerCached;
}

export function buildCrawlerModel(quality) {
  const group = new THREE.Group();
  group.name = 'crawler-model';

  const geos = [];
  const trackGeo = (g) => {
    geos.push(g);
    return g;
  };

  // PBR Horror Materials
  const chitinMat = new THREE.MeshStandardMaterial({
    color: 0x141d17,
    roughness: 0.38,
    metalness: 0.45,
    emissive: 0x051a0d,
    emissiveIntensity: 0.4,
  });

  const underbellyMat = new THREE.MeshStandardMaterial({
    color: 0x222a24,
    roughness: 0.72,
    metalness: 0.12,
  });

  const veinMat = new THREE.MeshStandardMaterial({
    color: 0x2aff88,
    emissive: 0x2aff88,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.1,
  });

  const mandibleMat = new THREE.MeshStandardMaterial({
    color: 0x090e0b,
    roughness: 0.22,
    metalness: 0.75,
  });

  const toothMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8c8,
    roughness: 0.28,
    metalness: 0.1,
  });

  // Body segments chain
  const segments = [];

  for (let i = 0; i < CRAWLER_SEGMENTS; i++) {
    const t = i / (CRAWLER_SEGMENTS - 1);
    const radius = lerp(0.46, 0.18, t);
    const segLen = 0.52;

    const segGroup = new THREE.Group();
    segGroup.name = `segment-${i}`;

    // 1. Continuous Overlapping Capsule Body (eliminates all gaps!)
    const bodyGeo = trackGeo(new THREE.SphereGeometry(radius, 12, 10));
    const bodyMesh = new THREE.Mesh(bodyGeo, underbellyMat);
    bodyMesh.scale.set(1.15, 0.75, 1.45);
    bodyMesh.castShadow = !!quality.shadows;
    bodyMesh.receiveShadow = !!quality.shadows;
    segGroup.add(bodyMesh);

    // 2. Overlapping Heavy Armored Dorsal Carapace Shield
    const carapaceGeo = trackGeo(new THREE.CylinderGeometry(radius * 1.05, radius * 1.15, segLen * 0.85, 8, 1, false, 0, Math.PI));
    carapaceGeo.rotateZ(Math.PI / 2);
    carapaceGeo.rotateY(Math.PI / 2);
    const carapace = new THREE.Mesh(carapaceGeo, chitinMat);
    carapace.position.set(0, radius * 0.15, -0.05);
    carapace.scale.set(1.2, 0.85, 1.0);
    carapace.castShadow = !!quality.shadows;
    segGroup.add(carapace);

    // 3. Swept-Back Dorsal Spinal Blade
    const spineBladeGeo = trackGeo(new THREE.ConeGeometry(radius * 0.18, radius * 0.75, 4));
    const spineBlade = new THREE.Mesh(spineBladeGeo, mandibleMat);
    spineBlade.position.set(0, radius * 0.85, -radius * 0.25);
    spineBlade.rotation.set(-mathRadians(35), 0, 0);
    segGroup.add(spineBlade);

    // 4. Glowing Bioluminescent Emerald Vein Nodes
    if (i % 2 === 0) {
      const veinGeo = trackGeo(new THREE.SphereGeometry(radius * 0.26, 8, 8));
      const vein = new THREE.Mesh(veinGeo, veinMat);
      vein.position.set(0, radius * 0.72, 0.05);
      vein.scale.set(0.9, 0.45, 1.4);
      segGroup.add(vein);
    }

    // 5. Lateral Crawling Scutes / Claws (crawling legs along the body)
    for (const side of [-1, 1]) {
      const legUpperGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.06, radius * 0.9, 6));
      const legUpper = new THREE.Mesh(legUpperGeo, chitinMat);
      legUpper.position.set(side * radius * 1.05, -radius * 0.2, 0);
      legUpper.rotation.set(0, 0, side * mathRadians(45));
      segGroup.add(legUpper);

      const clawGeo = trackGeo(new THREE.ConeGeometry(0.04, radius * 0.7, 4));
      const claw = new THREE.Mesh(clawGeo, mandibleMat);
      claw.position.set(side * radius * 1.45, -radius * 0.65, 0.08);
      claw.rotation.set(0, 0, side * mathRadians(-35));
      segGroup.add(claw);
    }

    group.add(segGroup);
    segments.push(segGroup);
  }

  // Head Assembly
  const headGroup = new THREE.Group();
  headGroup.name = 'crawler-head';

  // Predatory spade cranial shield
  const headGeo = trackGeo(new THREE.ConeGeometry(0.58, 0.95, 6));
  headGeo.rotateX(Math.PI / 2);
  const headMesh = new THREE.Mesh(headGeo, chitinMat);
  headMesh.scale.set(1.2, 0.7, 1.3);
  headMesh.castShadow = !!quality.shadows;
  headGroup.add(headMesh);

  // Visceral Gaping Throat Void
  const throatGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.32, 0.45, 8));
  throatGeo.rotateX(Math.PI / 2);
  const throatMat = new THREE.MeshStandardMaterial({ color: 0x3d0b12, roughness: 0.3, metalness: 0.1 });
  const throat = new THREE.Mesh(throatGeo, throatMat);
  throat.position.set(0, -0.08, 0.32);
  headGroup.add(throat);

  // Sharp Needle Teeth lining the throat
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const toothGeo = trackGeo(new THREE.ConeGeometry(0.032, 0.15, 4));
    const tooth = new THREE.Mesh(toothGeo, toothMat);
    tooth.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.18 - 0.08, 0.45);
    tooth.rotation.set(Math.sin(angle) * 0.6, -Math.cos(angle) * 0.6, 0);
    headGroup.add(tooth);
  }

  // Twin Articulated Predatory Mandibles (Heavy, curved pincers)
  const leftMandGroup = new THREE.Group();
  leftMandGroup.position.set(0.38, -0.05, 0.25);
  const mandGeoL = trackGeo(new THREE.ConeGeometry(0.09, 0.85, 6));
  const leftMand = new THREE.Mesh(mandGeoL, mandibleMat);
  leftMand.position.set(0.12, 0, 0.35);
  leftMand.rotation.set(mathRadians(85), -mathRadians(35), 0);
  leftMandGroup.add(leftMand);
  headGroup.add(leftMandGroup);

  const rightMandGroup = new THREE.Group();
  rightMandGroup.position.set(-0.38, -0.05, 0.25);
  const mandGeoR = trackGeo(new THREE.ConeGeometry(0.09, 0.85, 6));
  const rightMand = new THREE.Mesh(mandGeoR, mandibleMat);
  rightMand.position.set(-0.12, 0, 0.35);
  rightMand.rotation.set(mathRadians(85), mathRadians(35), 0);
  rightMandGroup.add(rightMand);
  headGroup.add(rightMandGroup);

  // 6 Glowing Emerald Sensory Eye Pits
  for (const s of [-1, 1]) {
    for (let p = 0; p < 3; p++) {
      const pitGeo = trackGeo(new THREE.SphereGeometry(0.045, 6, 6));
      const pit = new THREE.Mesh(pitGeo, veinMat);
      pit.position.set(s * (0.2 + p * 0.09), 0.15, 0.18 - p * 0.12);
      headGroup.add(pit);
    }
  }

  group.add(headGroup);

  return {
    object: group,
    mesh: headMesh,
    segments,
    head: headGroup,
    leftMandible: leftMandGroup,
    rightMandible: rightMandGroup,
    materials: [chitinMat, underbellyMat, veinMat, mandibleMat, toothMat, throatMat],
    dispose: () => {
      geos.forEach((g) => g.dispose());
      chitinMat.dispose();
      underbellyMat.dispose();
      veinMat.dispose();
      mandibleMat.dispose();
      toothMat.dispose();
      throatMat.dispose();
    },
  };
}

function mathRadians(deg) {
  return (deg * Math.PI) / 180;
}

export class CrawlerRig {
  constructor(model) {
    this.model = model;
    this.isGlb = Boolean(model.isGlb);
    this.segments = model.segments || [];
    this.head = model.head || null;
    this.leftMand = model.leftMandible || null;
    this.rightMand = model.rightMandible || null;

    this._mandibleAngle = 0;
    this._strikeProgress = 0;
  }

  reset() {
    this._mandibleAngle = 0;
    this._strikeProgress = 0;
  }

  update(dt, params) {
    const { phase, speed, time, lunge, grab, lookYaw } = params;

    if (this.isGlb) {
      CRAWLER_UNIFORMS.uTime.value = time;
      CRAWLER_UNIFORMS.uPhase.value = phase;
      CRAWLER_UNIFORMS.uSpeed.value = speed;
      CRAWLER_UNIFORMS.uLunge.value = lunge || grab ? 1.0 : 0.0;
      return;
    }

    // Head orientation and striking height
    const baseH = CRAWLER_FACE_HEIGHT + (lunge ? 0.38 : 0);
    this.head.position.set(0, baseH, 0.25);
    this.head.rotation.y = (lookYaw || 0) * 0.5;
    this.head.rotation.x = lunge ? -0.35 : Math.sin(time * 3) * 0.05;

    // Mandibles twitch & flare when hunting / lunging
    const twitch = Math.sin(time * 16) * 0.06;
    const flare = lerp(0.18, 0.85, lunge || grab ? 1 : 0);
    this._mandibleAngle = damp(this._mandibleAngle, flare + twitch, 14, dt);

    this.leftMand.rotation.y = -this._mandibleAngle;
    this.rightMand.rotation.y = this._mandibleAngle;

    // Fluid Sinusoidal body-wave displacement
    const waveAmp = lerp(0.22, 0.48, clamp(speed, 0, 1.2));
    const spacing = 0.36;

    for (let i = 0; i < CRAWLER_SEGMENTS; i++) {
      const seg = this.segments[i];
      if (!seg) continue;

      // Phase offset along spine
      const segPhase = phase * 2.0 - i * 0.65;
      const waveX = Math.sin(segPhase) * waveAmp * (1 - i / (CRAWLER_SEGMENTS * 1.3));
      const segZ = -i * spacing - 0.2;
      const segY = baseH * 0.85 + Math.cos(segPhase * 0.6) * 0.04;

      seg.position.set(waveX, segY, segZ);

      // Tangent rotation to follow the continuous wave
      const dX = Math.cos(segPhase) * waveAmp * 0.75;
      seg.rotation.y = -Math.atan2(dX, spacing);
      seg.rotation.z = waveX * 0.35;
      seg.rotation.x = Math.sin(segPhase) * 0.08;
    }
  }
}
