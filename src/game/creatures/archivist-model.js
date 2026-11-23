/* ==========================================================================
   THE LAST EXIT — THE ARCHIVIST (Sublevel 1 Research Archive)
   A towering 2.6m 4-armed skeletal horror.
   Features emaciated ribcage, elongated spine, two massive overhead mantis
   scythes, two folded thoracic grabbing arms, sunken amber eye voids,
   and predatory digitigrade walking kinematics.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clamp, damp, lerp } from '../config.js';

export const ARCHIVIST_FACE_HEIGHT = 2.45;
export const ARCHIVIST_MODEL_URL = `${import.meta.env.BASE_URL}models/the_archivist.glb`;

export const ARCHIVIST_UNIFORMS = {
  uTime: { value: 0 },
  uPhase: { value: 0 },
  uSpeed: { value: 1.0 },
  uLunge: { value: 0 },
  uAggro: { value: 0 },
};

const ARCHIVIST_VERTEX_HEADER = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSpeed;
  uniform float uLunge;
  uniform float uAggro;

  vec3 archivistDeform(vec3 p) {
    float x = p.x;
    float y = p.y;
    float z = p.z;
    float absX = abs(x);
    float side = sign(x);

    // 1. Predatory Digitigrade Leg Stride (Isolated to legs; keeps pelvis rock-solid)
    if (y < 0.95 && absX > 0.08 && absX < 0.40) {
      float legT = clamp((0.95 - y) / 0.95, 0.0, 1.0);
      float legPhase = uPhase + (x > 0.0 ? 0.0 : 3.14159);
      float strideZ = -sin(legPhase) * 0.22 * clamp(uSpeed, 0.0, 1.3) * legT;
      float liftY = max(0.0, cos(legPhase)) * 0.08 * clamp(uSpeed, 0.0, 1.3) * legT;
      z += strideZ;
      y += liftY;
    }

    // 2. Clawed Arms & Talons
    if (y >= 0.70 && y <= 1.65 && absX >= 0.22 && absX <= 0.55 && z > -0.30) {
      float armT = clamp((1.65 - y) / 0.95, 0.0, 1.0);
      float armPhase = uPhase + (x > 0.0 ? 3.14159 : 0.0);
      float armSwingZ = -sin(armPhase) * 0.16 * clamp(uSpeed, 0.1, 1.2) * armT;
      float aggroReachZ = -(uAggro * 0.38 + uLunge * 0.25) * armT;
      z += armSwingZ + aggroReachZ;
    }

    // 3. Bat Wing 3D Aerodynamic Flap & Billow (Flaps forward/down in 3D, zero pinwheeling)
    if (absX > 0.20) {
      float wingSpanT = clamp((absX - 0.20) / 2.20, 0.0, 1.0);
      float wingWeight = smoothstep(0.20, 0.45, absX);

      // Majestic, powerful flap rate: 1.8 Hz idle/walk, up to 3.2 Hz in chase
      float flapRate = mix(1.8, 3.2, uAggro);
      float flapCycle = uTime * flapRate * 6.28318;
      float downstroke = sin(flapCycle);

      // Vertical downstroke/upstroke
      float flapY = downstroke * mix(0.32, 0.58, uAggro) * wingSpanT * wingWeight;

      // Aerodynamic forward cup on downstroke, recovery trail on upstroke
      float sweepZ = -cos(flapCycle) * mix(0.28, 0.48, uAggro) * wingSpanT * wingWeight;

      // Organic leathery membrane traveling ripple wave
      float wavePhase = flapCycle - wingSpanT * 3.2;
      float billow = sin(wavePhase) * mix(0.10, 0.20, uAggro) * wingSpanT * wingWeight;

      // Aggro wing flare: wings cup forward to envelop prey
      float aggroFlareZ = -uAggro * 0.42 * wingSpanT * wingWeight;

      y += flapY;
      z += sweepZ + billow + aggroFlareZ;
    }

    // 4. Demonic Head Lunging & Feral Twitching
    if (y > 1.85 && absX < 0.40) {
      float headT = clamp((y - 1.85) / 0.65, 0.0, 1.0);
      float lungeZ = -(uLunge * 0.35 + uAggro * 0.22) * headT;
      float twitchX = sin(uTime * 24.0) * 0.015 * uAggro * headT;
      z += lungeZ;
      x += twitchX;
    }

    return vec3(x, y, z);
  }
`;

function patchArchivistSkinning(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, ARCHIVIST_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${ARCHIVIST_VERTEX_HEADER}`)
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = archivistDeform(position);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         #if defined( USE_COLOR )
         diffuseColor.rgb = pow(vColor.rgb, vec3(1.15));
         #endif`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         #if defined( USE_COLOR )
         float isYellowEye = clamp((min(vColor.r, vColor.g) - vColor.b * 1.8) * 3.0, 0.0, 1.0);
         totalEmissiveRadiance += vec3(1.0, 0.88, 0.05) * isYellowEye * 4.5;
         #endif`
      );
  };
  material.customProgramCacheKey = () => 'archivist-painted-shader';
}

let archivistCached = null;
let archivistLoadedInstance = null;

export function getLoadedArchivistModel() {
  return archivistLoadedInstance;
}

export function loadArchivistModel(quality = {}) {
  if (archivistCached) return archivistCached;
  archivistCached = new GLTFLoader().loadAsync(ARCHIVIST_MODEL_URL).then((gltf) => {
    let mesh = null;
    let maxVerts = 0;
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry?.attributes?.position) {
        const count = child.geometry.attributes.position.count;
        if (count > maxVerts) {
          maxVerts = count;
          mesh = child;
        }
      }
    });
    if (!mesh) throw new Error('the_archivist.glb contains no mesh');

    const geometry = mesh.geometry;
    geometry.computeBoundingBox();

    // Check both standard color and color_1 (Blender gltf attribute name)
    const colorAttr = geometry.attributes.color || geometry.attributes.color_1 || geometry.attributes._color;
    if (colorAttr && !geometry.attributes.color) {
      geometry.setAttribute('color', colorAttr);
    }
    const hasColors = Boolean(geometry.attributes.color);
    const material = new THREE.MeshStandardMaterial({
      name: 'archivist-skin',
      vertexColors: hasColors,
      roughness: 0.65,
      metalness: 0.18,
    });
    patchArchivistSkinning(material);

    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    // Custom depth material so shadows deform with wing flaps and walking
    const depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    depthMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, ARCHIVIST_UNIFORMS);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${ARCHIVIST_VERTEX_HEADER}`)
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = archivistDeform(position);`
        );
    };
    depthMat.customProgramCacheKey = () => 'archivist-depth-shader';
    mesh.customDepthMaterial = depthMat;

    mesh.position.set(0, 0, 0);
    mesh.rotation.y = Math.PI;

    const object = new THREE.Group();
    object.name = 'archivist-model-root';
    object.add(mesh);

    archivistLoadedInstance = {
      object,
      mesh,
      material,
      isGlb: true,
      dispose: () => {
        geometry.dispose();
        material.dispose();
        depthMat.dispose();
      },
    };
    return archivistLoadedInstance;
  }).catch((err) => {
    console.warn('Fallback to procedural archivist:', err);
    return buildArchivistModel(quality);
  });
  return archivistCached;
}

export function buildArchivistModel(quality) {
  const group = new THREE.Group();
  group.name = 'archivist-model';

  const geos = [];
  const trackGeo = (g) => {
    geos.push(g);
    return g;
  };

  // PBR Horror Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x9e9588,
    roughness: 0.85,
    metalness: 0.08,
  });

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x2e2924,
    roughness: 0.62,
    metalness: 0.35,
  });

  const scytheMat = new THREE.MeshStandardMaterial({
    color: 0x0c0d10,
    roughness: 0.22,
    metalness: 0.85,
  });

  const emberMat = new THREE.MeshBasicMaterial({
    color: 0xff991c,
  });

  const socketVoidMat = new THREE.MeshBasicMaterial({
    color: 0x050403,
  });

  const toothMat = new THREE.MeshStandardMaterial({
    color: 0xd2cbbd,
    roughness: 0.3,
  });

  // Pelvis & Lower Torso
  const pelvisGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.35, 8));
  const pelvis = new THREE.Mesh(pelvisGeo, skinMat);
  pelvis.position.y = 1.35;
  pelvis.castShadow = !!quality.shadows;
  group.add(pelvis);

  // Slender curved ribcage / torso group
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.48;

  // Vertebral column
  for (let v = 0; v < 7; v++) {
    const vertGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 6));
    const vert = new THREE.Mesh(vertGeo, boneMat);
    vert.position.set(0, v * 0.12 + 0.06, -v * 0.015);
    torsoGroup.add(vert);
  }

  // Emaciated Ribcage (Layered arched rib bones)
  for (let r = 0; r < 5; r++) {
    const ribW = 0.52 - r * 0.04;
    const ribGeo = trackGeo(new THREE.TorusGeometry(ribW * 0.5, 0.035, 6, 12, Math.PI * 1.3));
    const rib = new THREE.Mesh(ribGeo, skinMat);
    rib.position.set(0, 0.35 + r * 0.11, 0.05);
    rib.rotation.set(-mathRadians(80), 0, mathRadians(115));
    torsoGroup.add(rib);
  }

  // Chest sternum plate
  const chestGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.55, 0.28));
  const chest = new THREE.Mesh(chestGeo, skinMat);
  chest.position.set(0, 0.55, 0.04);
  chest.castShadow = !!quality.shadows;
  torsoGroup.add(chest);

  // Elongated Neck
  const neckGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 6));
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 0.96, 0.1);
  neck.rotation.x = mathRadians(18);
  torsoGroup.add(neck);

  // ---------------- Predatory Horned Skull ----------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0.22);

  // Cranium
  const skullGeo = trackGeo(new THREE.ConeGeometry(0.24, 0.65, 6));
  skullGeo.rotateX(Math.PI);
  const skull = new THREE.Mesh(skullGeo, skinMat);
  skull.scale.set(0.85, 1.0, 0.95);
  skull.castShadow = !!quality.shadows;
  headGroup.add(skull);

  // Brow ridges
  const browGeo = trackGeo(new THREE.BoxGeometry(0.34, 0.08, 0.18));
  const brow = new THREE.Mesh(browGeo, boneMat);
  brow.position.set(0, 0.06, 0.16);
  headGroup.add(brow);

  // Deep recessed eye voids with glowing ember pupils
  for (const side of [-1, 1]) {
    const socketGeo = trackGeo(new THREE.SphereGeometry(0.065, 8, 8));
    const socket = new THREE.Mesh(socketGeo, socketVoidMat);
    socket.position.set(side * 0.11, 0.02, 0.16);
    headGroup.add(socket);

    const emberGeo = trackGeo(new THREE.SphereGeometry(0.035, 6, 6));
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.set(side * 0.11, 0.02, 0.19);
    headGroup.add(ember);
  }

  // Gaping Maw & Needle Fangs
  const jawGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.14, 0.32));
  const jaw = new THREE.Mesh(jawGeo, boneMat);
  jaw.position.set(0, -0.22, 0.12);
  jaw.rotation.x = mathRadians(24);
  headGroup.add(jaw);

  for (let f = 0; f < 6; f++) {
    const s = f % 2 === 0 ? 1 : -1;
    const fangGeo = trackGeo(new THREE.ConeGeometry(0.022, 0.12, 4));
    const fang = new THREE.Mesh(fangGeo, toothMat);
    fang.position.set(s * 0.08, -0.16, 0.14 + (f >> 1) * 0.06);
    fang.rotation.x = mathRadians(170);
    headGroup.add(fang);
  }

  torsoGroup.add(headGroup);
  group.add(torsoGroup);

  // ---------------- 4 Multi-Jointed Arms ----------------
  const arms = [];

  // 1. PRIMARY UPPER MANTIS SCYTHE ARMS (Huge overhead execution blades)
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.44, 0.82, 0.08);

    // Shoulder Socket Capsule
    const shGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 8));
    const shMesh = new THREE.Mesh(shGeo, boneMat);
    shoulder.add(shMesh);

    // Upper Bicep Limb
    const bicepGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 1.05, 6));
    const bicep = new THREE.Mesh(bicepGeo, skinMat);
    bicep.position.set(s * 0.08, -0.48, 0);
    bicep.rotation.z = s * mathRadians(-12);
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.position.set(s * 0.16, -0.98, 0);

    const elGeo = trackGeo(new THREE.SphereGeometry(0.085, 8, 8));
    const elMesh = new THREE.Mesh(elGeo, boneMat);
    elbow.add(elMesh);

    // Forearm Forelimb
    const foreGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.065, 1.25, 6));
    const foreMesh = new THREE.Mesh(foreGeo, skinMat);
    foreMesh.position.set(0, -0.58, 0.06);
    elbow.add(foreMesh);

    // Massive Curved Obsidian Mantis Scythe Blade
    const bladeGeo = trackGeo(new THREE.ConeGeometry(0.09, 1.45, 4));
    const blade = new THREE.Mesh(bladeGeo, scytheMat);
    blade.position.set(0, -1.25, 0.28);
    blade.rotation.set(mathRadians(145), 0, s * mathRadians(15));
    blade.scale.set(0.65, 1.0, 1.35);
    blade.castShadow = !!quality.shadows;
    elbow.add(blade);

    shoulder.add(elbow);
    torsoGroup.add(shoulder);
    arms.push({ shoulder, elbow, side: s, isPrimary: true });
  }

  // 2. SECONDARY THORACIC ARMS (Slender, grasping, trailing claws)
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.32, 0.42, 0.12);

    const shGeo = trackGeo(new THREE.SphereGeometry(0.07, 6, 6));
    const shMesh = new THREE.Mesh(shGeo, boneMat);
    shoulder.add(shMesh);

    const armGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.05, 0.72, 6));
    const armMesh = new THREE.Mesh(armGeo, skinMat);
    armMesh.position.set(0, -0.34, 0);
    shoulder.add(armMesh);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.68, 0);

    const clawForeGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.65, 6));
    const clawFore = new THREE.Mesh(clawForeGeo, skinMat);
    clawFore.position.set(0, -0.3, 0.08);
    elbow.add(clawFore);

    // Triple Hooked Claws
    for (let c = -1; c <= 1; c++) {
      const clawGeo = trackGeo(new THREE.ConeGeometry(0.024, 0.28, 4));
      const claw = new THREE.Mesh(clawGeo, scytheMat);
      claw.position.set(c * 0.04, -0.62, 0.18);
      claw.rotation.set(mathRadians(85), 0, c * mathRadians(20));
      elbow.add(claw);
    }

    shoulder.add(elbow);
    torsoGroup.add(shoulder);
    arms.push({ shoulder, elbow, side: s, isPrimary: false });
  }

  // ---------------- Bipedal Digitigrade Legs ----------------
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.28, 1.35, 0);

    const hipJointGeo = trackGeo(new THREE.SphereGeometry(0.12, 8, 8));
    const hipJoint = new THREE.Mesh(hipJointGeo, boneMat);
    hip.add(hipJoint);

    // Thigh
    const thighGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.11, 0.95, 6));
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.set(0, -0.45, 0.08);
    thigh.rotation.x = mathRadians(25);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.88, 0.18);

    const kneeJointGeo = trackGeo(new THREE.SphereGeometry(0.09, 6, 6));
    const kneeJoint = new THREE.Mesh(kneeJointGeo, boneMat);
    knee.add(kneeJoint);

    // Digitigrade Hock
    const hockGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.08, 0.98, 6));
    const hock = new THREE.Mesh(hockGeo, skinMat);
    hock.position.set(0, -0.46, -0.12);
    hock.rotation.x = -mathRadians(32);
    knee.add(hock);

    // Hooked Talons
    const foot = new THREE.Group();
    foot.position.set(0, -0.92, -0.22);
    for (let c = -1; c <= 1; c++) {
      const talonGeo = trackGeo(new THREE.ConeGeometry(0.035, 0.38, 4));
      const talon = new THREE.Mesh(talonGeo, scytheMat);
      talon.position.set(c * 0.08, -0.05, 0.16);
      talon.rotation.set(mathRadians(80), 0, c * mathRadians(15));
      foot.add(talon);
    }
    knee.add(foot);

    hip.add(knee);
    group.add(hip);
    legs.push({ hip, knee, side: s });
  }

  return {
    object: group,
    mesh: skull,
    torso: torsoGroup,
    head: headGroup,
    arms,
    legs,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      skinMat.dispose();
      boneMat.dispose();
      scytheMat.dispose();
      emberMat.dispose();
      socketVoidMat.dispose();
      toothMat.dispose();
    },
  };
}

function mathRadians(deg) {
  return (deg * Math.PI) / 180;
}

export class ArchivistRig {
  constructor(model) {
    this.model = model;
    this.isGlb = Boolean(model.isGlb);
    this.torso = model.torso || null;
    this.head = model.head || null;
    this.arms = model.arms || [];
    this.legs = model.legs || [];

    this._armReach = 0;
    this._spineTilt = 0;
    this._lungeAmount = 0;
  }

  reset() {
    this._armReach = 0;
    this._spineTilt = 0;
    this._lungeAmount = 0;
    ARCHIVIST_UNIFORMS.uLunge.value = 0;
    ARCHIVIST_UNIFORMS.uAggro.value = 0;
  }

  update(dt, params) {
    const { phase, speed, time, lunge, grab, lookYaw } = params;

    const isHunting = Boolean(lunge || grab || speed > 0.8);
    this._armReach = damp(this._armReach, isHunting ? 1 : 0, 7, dt);
    this._lungeAmount = damp(this._lungeAmount, lunge ? 1 : 0, 9, dt);

    if (this.isGlb) {
      ARCHIVIST_UNIFORMS.uTime.value = time;
      ARCHIVIST_UNIFORMS.uPhase.value = phase;
      ARCHIVIST_UNIFORMS.uSpeed.value = speed;
      ARCHIVIST_UNIFORMS.uLunge.value = this._lungeAmount;
      ARCHIVIST_UNIFORMS.uAggro.value = this._armReach;

      // Whole-model ground walking & hovering dynamics
      const hover = Math.sin(time * 2.0) * 0.035;
      const stepDip = Math.abs(Math.sin(phase)) * 0.035 * clamp(speed, 0, 1.0);
      if (this.model.object) {
        this.model.object.position.y = hover - stepDip;
        this.model.object.position.z = -this._armReach * 0.12;
        this.model.object.rotation.y = (lookYaw || 0) * 0.35;
        this.model.object.rotation.z = Math.sin(phase) * 0.018 * clamp(speed, 0, 1.0);
        this.model.object.rotation.x = isHunting ? -0.16 : -0.04;
      }
      return;
    }

    // Torso height & walking spine dip
    const stepDip = Math.abs(Math.sin(phase)) * 0.08;
    this.torso.position.y = 1.48 - stepDip;
    this._spineTilt = damp(this._spineTilt, Math.sin(phase) * 0.08, 8, dt);
    this.torso.rotation.z = this._spineTilt;
    this.torso.rotation.y = Math.sin(phase) * 0.12;

    // Head orientation & uncanny twitching
    this.head.rotation.y = (lookYaw || 0) * 0.7;
    this.head.rotation.x = Math.sin(time * 2.5) * 0.08 + (lunge ? -0.25 : 0);

    // Bipedal leg stride with forward foot planting
    this.legs.forEach((leg) => {
      const legPhase = phase + (leg.side > 0 ? 0 : Math.PI);
      const hipRot = Math.sin(legPhase) * 0.45 * clamp(speed, 0, 1.2);
      leg.hip.rotation.x = hipRot;
      leg.knee.rotation.x = Math.max(0, -Math.sin(legPhase + 0.3) * 0.55);
    });

    // Arm articulation
    this._armReach = damp(this._armReach, isHunting ? 1 : 0, 6, dt);

    this.arms.forEach((arm) => {
      if (arm.isPrimary) {
        // Upper mantis scythes: poise high overhead when hunting or striking
        if (isHunting) {
          arm.shoulder.rotation.x = lerp(-0.45, -1.45, this._armReach);
          arm.shoulder.rotation.z = arm.side * lerp(0.2, 0.48, this._armReach);
          arm.elbow.rotation.x = lerp(0.85, 0.25, this._armReach) + Math.sin(time * 8) * 0.05;
        } else {
          // Idle menacing predatory sway
          const armPhase = phase + (arm.side > 0 ? Math.PI : 0);
          arm.shoulder.rotation.x = Math.sin(armPhase) * 0.28 - 0.25;
          arm.shoulder.rotation.z = arm.side * 0.22;
          arm.elbow.rotation.x = 0.95 + Math.sin(time * 2) * 0.05;
        }
      } else {
        // Lower grasping limbs
        const secPhase = time * 2.5 + arm.side;
        arm.shoulder.rotation.x = Math.sin(secPhase) * 0.18 - 0.12;
        arm.shoulder.rotation.z = arm.side * (0.32 + Math.sin(secPhase * 0.8) * 0.1);
        arm.elbow.rotation.x = 0.48 + (isHunting ? 0.45 : 0);
      }
    });
  }
}
