/* ==========================================================================
   THE WARDEN — MODEL
   Loads the sculpted creature (public/models/warden.glb) once and rigs it at
   runtime. The GLB is a single static mesh with no skeleton, so the rig is
   procedural: every vertex gets up to four weighted bones (soft distance
   falloff around six joints), and the vertex shader blends the bone matrices
   each frame. That gives bending limbs, a leaning torso and a head that turns
   on its neck without splitting the mesh into pieces.

   The skin colour is built in the fragment shader from the rest-space position
   (so it needs no UV seams): pale layered flesh, branching veins, scars and
   wounds around the joints, a bruised face, dark mouth and bone-grey claws.
   The albedo map only adds surface detail on top. Every colour lives in
   wardenColour(), so the look can be tuned from one place.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_URL = `${import.meta.env.BASE_URL}models/warden.glb`;

/**
 * Uniform scale from GLB units to metres. The raw mesh is about 1.0 wide,
 * 0.62 tall and 0.87 long, so at 2.8 it stands about 1.74 m tall, 2.8 m across
 * the claws and 2.4 m long. That is the largest uniform size that still fits
 * the 3 m corridors and 3.2 m ceilings; see PROJECT_HANDOFF.md.
 */
export const MODEL_SCALE = 2.8;
/** Lowest point of the raw mesh (claws/feet), used to stand it on the floor. */
const RAW_FLOOR_Y = -0.31;
/** Raw height of the head centre (measured from the GLB), in metres after scale. */
export const FACE_HEIGHT = (-RAW_FLOOR_Y + 0.21) * MODEL_SCALE;

export const BONE = { root: 0, head: 1, foreR: 2, foreL: 3, hindR: 4, hindL: 5 };
const BONE_COUNT = 6;

/* Joint pivots (raw GLB units, normalized to 1/MODEL_SCALE).
   Head turns on the neck, forelimbs on shoulders, hindquarters on hips. */
const PIVOT = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.0, 0.14, 0.23),
  new THREE.Vector3(0.18, 0.14, 0.15),
  new THREE.Vector3(-0.18, 0.14, 0.15),
  new THREE.Vector3(0.11, 0.05, -0.11),
  new THREE.Vector3(-0.11, 0.05, -0.11),
];
/* Where each bone's body region sits for Gaussian influence. */
const CENTRE = [
  new THREE.Vector3(0.0, 0.05, 0.0),
  new THREE.Vector3(0.0, 0.06, 0.35),
  new THREE.Vector3(0.30, -0.10, 0.15),
  new THREE.Vector3(-0.30, -0.10, 0.15),
  new THREE.Vector3(0.18, -0.15, -0.20),
  new THREE.Vector3(-0.18, -0.15, -0.20),
];
const SIGMA = [0.32, 0.16, 0.20, 0.20, 0.18, 0.18];
const ROOT_BIAS = 0.55;

/**
 * Shared shader uniforms. One object feeds both the lit material and the
 * shadow depth material, so one write updates both.
 */
export const WARDEN_UNIFORMS = {
  uBones: { value: Array.from({ length: BONE_COUNT }, () => new THREE.Matrix4()) },
  uTime: { value: 0 },
  uTwitch: { value: 0 },
};

const SKIN_VERTEX_HEADER = /* glsl */ `
  uniform mat4 uBones[${BONE_COUNT}];
  uniform float uTime;
  uniform float uTwitch;
  attribute vec4 aBones;
  attribute vec4 aWeights;
  attribute float aTwitch;
  varying vec3 vRest;
  mat4 wardenSkin() {
    mat4 m = mat4(0.0);
    for (int i = 0; i < 4; i++) {
      m += uBones[int(aBones[i] + 0.5)] * aWeights[i];
    }
    return m;
  }
`;

const SKIN_COLOUR_HEADER = /* glsl */ `
  varying vec3 vRest;
  float wardenRoughness = 0.82;

  float wardenHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float wardenNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(wardenHash(i), wardenHash(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(wardenHash(i + vec3(0.0, 1.0, 0.0)), wardenHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(wardenHash(i + vec3(0.0, 0.0, 1.0)), wardenHash(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(wardenHash(i + vec3(0.0, 1.0, 1.0)), wardenHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  float wardenFbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      s += a * wardenNoise(p);
      p = p * 2.03 + vec3(17.1, 9.2, 4.7);
      a *= 0.5;
    }
    return s / 0.875;
  }
  float wardenGauss(vec3 p, vec3 c, float s) {
    vec3 d = p - c;
    return exp(-dot(d, d) / (2.0 * s * s));
  }
  // palette colours are written as sRGB hex and linearised here
  vec3 wardenLin(vec3 c) { return pow(c, vec3(2.2)); }

  vec3 wardenColour(vec3 albedo) {
    vec3 p = vRest;

    // --- REGION MASKS ---
    // Head & face region
    float head = smoothstep(0.28, 0.14, length((p - vec3(0.0, 0.15, 0.40)) * vec3(1.0, 1.1, 0.9)));
    float notFace = 1.0 - head;

    // Deep mouth cavity (inside the jaw)
    float mouthD = length((p - vec3(0.0, 0.03, 0.43)) * vec3(1.4, 1.1, 0.9));
    float mouthVoid = smoothstep(0.09, 0.03, mouthD);

    // Dangling chin tendrils / drool (hanging below chin at +Z, y below 0.06)
    float tendrilDist = length(vec2(p.x * 1.5, p.z - 0.41));
    float tendril = smoothstep(0.16, 0.04, tendrilDist) * smoothstep(0.08, -0.06, p.y);

    // Shoulder & back injector spikes / quills
    float spikeRegion = smoothstep(0.13, 0.22, abs(p.x)) * smoothstep(0.03, 0.12, p.y) * smoothstep(0.30, 0.12, p.z) * smoothstep(-0.25, -0.10, p.z);
    float spikeNoise = wardenNoise(p * 22.0);
    float spike = spikeRegion * smoothstep(0.35, 0.65, spikeNoise);

    // Claws & talons
    float claw = smoothstep(0.32, 0.40, p.z) * smoothstep(0.26, 0.36, abs(p.x));
    float clawTip = claw * smoothstep(0.38, 0.44, p.z);

    // Major muscular joints for localized bruising
    float joint = max(
      max(wardenGauss(p, vec3(0.0, 0.2, 0.44), 0.2), wardenGauss(p, vec3(0.38, 0.0, 0.3), 0.2)),
      max(
        max(wardenGauss(p, vec3(-0.38, 0.0, 0.3), 0.2), wardenGauss(p, vec3(0.12, -0.1, -0.3), 0.2)),
        wardenGauss(p, vec3(-0.12, -0.1, -0.3), 0.2)
      )
    );

    // --- 1. BASE HORROR FLESH ---
    // Deep, decaying corpse hide: shadowed charcoal-taupe to necrotic olive-grey
    float n1 = wardenFbm(p * 2.4);
    vec3 flesh = mix(wardenLin(vec3(0.17, 0.16, 0.15)), wardenLin(vec3(0.38, 0.36, 0.33)), smoothstep(0.25, 0.65, n1));
    flesh = mix(flesh, wardenLin(vec3(0.28, 0.30, 0.24)), smoothstep(0.48, 0.76, wardenFbm(p * 3.1 + 7.3)) * 0.4);
    flesh = mix(flesh, wardenLin(vec3(0.48, 0.45, 0.41)), smoothstep(0.65, 0.92, n1) * 0.35);

    // --- 2. SUBDERMAL BRUISING & HEMATOMAS ---
    float bruise = smoothstep(0.55, 0.82, wardenFbm(p * 2.6 + 13.1));
    flesh = mix(flesh, wardenLin(vec3(0.32, 0.18, 0.22)), bruise * 0.45);
    flesh = mix(flesh, wardenLin(vec3(0.22, 0.12, 0.15)), smoothstep(0.64, 0.88, wardenFbm(p * 3.4 + 19.0)) * 0.4);
    flesh = mix(flesh, wardenLin(vec3(0.18, 0.07, 0.09)), smoothstep(0.68, 0.90, wardenFbm(p * 4.1 + 23.0)) * joint * 0.6);

    // --- 3. CONGESTED SUBDERMAL VEINS ---
    vec3 warp = vec3(wardenFbm(p * 3.0), wardenFbm(p * 3.0 + 5.2), wardenFbm(p * 3.0 + 9.1)) - 0.5;
    float vd = abs(wardenNoise((p + warp * 0.06) * 10.0) - 0.5);
    float width = mix(0.007, 0.024, wardenNoise(p * 6.0 + 3.0));
    float vein = (1.0 - smoothstep(width * 0.4, width, vd)) * (1.0 - claw);
    float faint = (1.0 - smoothstep(width, width * 2.6, vd)) * 0.5 * (1.0 - claw);
    flesh = mix(flesh, wardenLin(vec3(0.08, 0.04, 0.06)), vein * 0.9);
    flesh = mix(flesh, wardenLin(vec3(0.16, 0.08, 0.11)), faint * 0.65);

    // --- 4. SCARS & RAW WOUNDS ---
    float scar = (1.0 - smoothstep(0.0, 0.025, abs(wardenNoise(p * 14.0 + 2.0) - 0.5))) * (0.25 + 0.75 * joint) * notFace;
    flesh = mix(flesh, wardenLin(vec3(0.35, 0.14, 0.16)), scar * 0.5);
    float wn = wardenFbm(p * 7.0 + 21.0);
    float deep = smoothstep(0.78, 0.86, wn) * joint * notFace;
    float fresh = smoothstep(0.72, 0.78, wn) * (1.0 - smoothstep(0.78, 0.86, wn)) * joint * notFace;
    flesh = mix(flesh, wardenLin(vec3(0.12, 0.02, 0.03)), deep * 0.85);
    flesh = mix(flesh, wardenLin(vec3(0.28, 0.04, 0.06)), fresh * 0.6);

    // --- 5. CAVITY & UNDERBODY OCCLUSION ---
    float cavity = smoothstep(0.18, -0.22, p.y);
    flesh = mix(flesh, flesh * 0.35, cavity * 0.75);

    // --- 6. AUTHENTIC SCULPTED FACE (TEXTURE-GROUNDED) ---
    // Blend the model's true sculpted facial features directly from albedo!
    // No artificial geometric circles; the sculpt's actual eyes, snout and teeth show naturally.
    vec3 sculptedFace = albedo * wardenLin(vec3(0.78, 0.74, 0.70));
    flesh = mix(flesh, sculptedFace, head * 0.82);

    // Deep shadowy cavity inside the mouth void
    flesh = mix(flesh, wardenLin(vec3(0.03, 0.01, 0.015)), mouthVoid * 0.95);

    // --- 7. DANGLING CHIN TENDRILS / GORE ---
    flesh = mix(flesh, wardenLin(vec3(0.08, 0.015, 0.025)), tendril * 0.88);
    flesh = mix(flesh, wardenLin(vec3(0.22, 0.03, 0.05)), tendril * smoothstep(0.02, -0.15, p.y) * 0.5);

    // --- 8. SHOULDER & BACK SPIKES / TUBES ---
    flesh = mix(flesh, wardenLin(vec3(0.10, 0.09, 0.09)), spike * 0.88);
    flesh = mix(flesh, wardenLin(vec3(0.22, 0.05, 0.06)), spike * smoothstep(0.08, 0.18, p.y) * 0.4);

    // --- 9. OBSIDIAN-DARK TALONS / CLAWS ---
    flesh = mix(flesh, wardenLin(vec3(0.12, 0.10, 0.10)), claw);
    flesh = mix(flesh, wardenLin(vec3(0.06, 0.05, 0.05)), claw * (1.0 - clawTip));
    flesh = mix(flesh, wardenLin(vec3(0.25, 0.04, 0.05)), clawTip);

    // --- 10. GLOBAL SCULPT DETAIL INTEGRATION ---
    // Modulate overall flesh with sculpt's baked muscle striations and skin micro-detail
    flesh = mix(flesh, flesh * clamp(albedo * 1.5, 0.3, 1.3), 0.6);

    // --- 11. PBR SURFACE RESPONSE (ROUGHNESS & SPECULAR) ---
    wardenRoughness = mix(0.72, 0.88, wardenNoise(p * 9.0));
    wardenRoughness = mix(wardenRoughness, 0.45, deep + fresh);
    wardenRoughness = mix(wardenRoughness, 0.32, claw);
    wardenRoughness = mix(wardenRoughness, 0.16, mouthVoid);
    wardenRoughness = mix(wardenRoughness, 0.20, tendril); // glistening wet gore
    wardenRoughness = mix(wardenRoughness, 0.38, spike);   // dark weathered steel

    return flesh;
  }
`;

/** Patch a material so its vertices follow the bone matrices. */
function patchSkinning(material, key, hasColors = false) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, WARDEN_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SKIN_VERTEX_HEADER}`)
      .replace(
        '#include <beginnormal_vertex>',
        'vec3 objectNormal = normalize((wardenSkin() * vec4(normal, 0.0)).xyz);'
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 wardenPos = position + vec3(0.0, aTwitch * uTwitch * sin(uTime * 23.0 + position.x * 40.0) * 0.012, 0.0);
         vec3 transformed = (wardenSkin() * vec4(wardenPos, 1.0)).xyz;
         vRest = position;`
      );
    if (material.isMeshStandardMaterial) {
      if (hasColors) {
        // Use user's exact painted colors from Blender Color Attribute / Vertex Colors
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             // Deep, rich dark charcoal skin tone from Blender paint:
             diffuseColor.rgb = pow(vColor.rgb, vec3(1.4));`
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
             // Detect painted crimson gore / eyes and give them a luminous horror emissive glow!
             float isGore = clamp((vColor.r - max(vColor.g, vColor.b) * 1.4) * 2.5, 0.0, 1.0);
             totalEmissiveRadiance += vColor.rgb * isGore * 2.4;`
          );
      } else {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${SKIN_COLOUR_HEADER}`)
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
             diffuseColor.rgb = wardenColour(diffuseColor.rgb);`
          )
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n           roughnessFactor = wardenRoughness;');
      }
    }
  };
  material.customProgramCacheKey = () => key;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Per-vertex bone weights, computed once from the static mesh. */
function computeSkinWeights(position) {
  const count = position.count;
  const bones = new Float32Array(count * 4);
  const weights = new Float32Array(count * 4);
  const twitch = new Float32Array(count);
  const w = new Float32Array(BONE_COUNT);
  const order = Array.from({ length: BONE_COUNT }, (_, i) => i);

  for (let i = 0; i < count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    for (let b = 0; b < BONE_COUNT; b++) {
      const c = CENTRE[b];
      const d2 = (x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2;
      w[b] = Math.exp(-d2 / (2 * SIGMA[b] * SIGMA[b])) * (b === BONE.root ? ROOT_BIAS : 1);
    }

    // Anatomical isolation rules:
    // 1. Left/Right arm isolation (arms and legs do not pull across the sagittal plane)
    if (x < 0.02) { w[BONE.foreR] = 0; w[BONE.hindR] = 0; }
    if (x > -0.02) { w[BONE.foreL] = 0; w[BONE.hindL] = 0; }

    // 2. Fore/Hind isolation (forelimbs do not influence hips; hindlimbs do not reach shoulders)
    if (z < -0.05) { w[BONE.foreR] = 0; w[BONE.foreL] = 0; }
    if (z > 0.05) { w[BONE.hindR] = 0; w[BONE.hindL] = 0; }

    // 3. Head & Snout isolation: shoulders and claws never drag or deform the head and mouth
    if (z > 0.22 && Math.abs(x) < 0.16) {
      w[BONE.foreR] = 0;
      w[BONE.foreL] = 0;
    }

    order.sort((a, b) => w[b] - w[a]);
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += w[order[k]];
    for (let k = 0; k < 4; k++) {
      bones[i * 4 + k] = order[k];
      weights[i * 4 + k] = sum > 0 ? w[order[k]] / sum : k === 0 ? 1 : 0;
    }
    // claws and forepaws: the parts that twitch
    twitch[i] = clamp01((z - 0.15) * 8) * clamp01((Math.abs(x) - 0.25) * 6);
  }
  return { bones, weights, twitch };
}

let cached = null;

/**
 * Load and rig the Warden once. Resolves to { object, mesh, material, depthMaterial }.
 * The result is shared across creature instances, so callers must not dispose
 * its geometry or materials; they only detach the object from the scene.
 */
export function loadWardenModel() {
  if (cached) return cached;
  cached = new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => {
    let mesh = null;
    gltf.scene.traverse((child) => {
      if (!mesh && child.isMesh) mesh = child;
    });
    if (!mesh) throw new Error('warden.glb contains no mesh');

    // Reset any node-level offset baked by Blender's object transform
    mesh.position.set(0, 0, 0);

    const geometry = mesh.geometry;
    geometry.computeBoundingBox();
    const spanX = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    if (spanX > 1.8) {
      // Mesh was exported pre-scaled from Blender; normalize to rest space so bone weights map 1:1
      const invScale = 1.0 / MODEL_SCALE;
      geometry.scale(invScale, invScale, invScale);
      geometry.computeBoundingBox();
    }

    // CRITICAL: Blender exports painted Color Attributes into COLOR_1 (color_1 in Three.js GLTFLoader),
    // while COLOR_0 (color in Three.js) was left blank white.
    // Copy the painted red/charcoal attributes into color so Three.js renders them!
    const paintedColor = geometry.attributes.color_1 || geometry.attributes._color_1;
    if (paintedColor) {
      geometry.setAttribute('color', paintedColor);
    }

    const { bones, weights, twitch } = computeSkinWeights(geometry.attributes.position);
    geometry.setAttribute('aBones', new THREE.BufferAttribute(bones, 4));
    geometry.setAttribute('aWeights', new THREE.BufferAttribute(weights, 4));
    geometry.setAttribute('aTwitch', new THREE.BufferAttribute(twitch, 1));

    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const hasColors = Boolean(geometry.attributes.color);
    const material = new THREE.MeshStandardMaterial({
      name: 'warden-skin',
      map: source.map || null,
      vertexColors: hasColors,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
    });
    if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
    patchSkinning(material, hasColors ? 'warden-painted' : 'warden-skin', hasColors);

    const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    patchSkinning(depthMaterial, 'warden-depth', false);

    mesh.material = material;
    mesh.customDepthMaterial = depthMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // bones move vertices far outside the rest bounds, so culling is disabled
    mesh.frustumCulled = false;
    // raw mesh faces +Z; the creature's forward is -Z
    mesh.rotation.y = Math.PI;

    const object = new THREE.Group();
    object.name = 'warden-model';
    object.add(mesh);
    object.scale.setScalar(MODEL_SCALE);
    object.position.y = -RAW_FLOOR_Y * MODEL_SCALE;
    return { object, mesh, material, depthMaterial };
  });
  return cached;
}

/* ---------------------------------------------------------------------------
   Pose driver
   --------------------------------------------------------------------------- */

const EULER = new THREE.Euler();
const TMP = new THREE.Matrix4();
const T_POS = new THREE.Matrix4();
const T_NEG = new THREE.Matrix4();
const ROT = new THREE.Matrix4();

/**
 * Realistic quadruped crawl locomotion: asymmetric stance (64% ground drive)
 * and swing (36% forward reach and ground strike) derived from quadruped kinematics.
 */
function crawlGait(phase) {
  const TWO_PI = Math.PI * 2;
  const p = (((phase % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;
  if (p < 0.36) {
    const t = p / 0.36;
    const ease = t * t * (3 - 2 * t);
    return {
      reach: -1 + 2 * ease,
      lift: Math.sin(t * Math.PI),
      sweep: Math.sin(t * Math.PI) * 0.18,
    };
  }
  const t = (p - 0.36) / 0.64;
  return {
    reach: 1 - 2 * t,
    lift: 0,
    sweep: -Math.sin(t * Math.PI) * 0.08,
  };
}

/** Pose channels, smoothed toward their targets every frame. */
const CHANNELS = [
  'lean', 'spineYaw', 'roll', 'bob', 'breath',
  'headPitch', 'headYaw', 'headRoll',
  'foreR', 'foreL', 'foreYawR', 'foreYawL', 'liftR', 'liftL',
  'hindR', 'hindL', 'hindLiftR', 'hindLiftL',
];

/**
 * Turns high-level state into bone matrices. Each channel eases toward its
 * target with exponential damping, so transitions between idle, patrol, chase,
 * search and attack stay continuous.
 */
export class WardenRig {
  constructor() {
    this.pose = Object.fromEntries(CHANNELS.map((k) => [k, 0]));
    this.target = Object.fromEntries(CHANNELS.map((k) => [k, 0]));
    this.bones = WARDEN_UNIFORMS.uBones.value;
  }

  /**
   * @param {number} dt seconds
   * @param {object} d drive values:
   *   phase   gait phase in radians
   *   speed   0..1 of the top crawl speed
   *   settle  0..1 weight of the gait (0 when still)
   *   yawRate body yaw speed in rad/s (for leaning into turns)
   *   time    elapsed seconds (breathing, idle sway)
   *   headPitch / lookYaw / tilt  head aim and tilt offsets (rad)
   *   raise   0..1 head lifted and looking around (search)
   *   lunge   0..1 forward strike (attack)
   *   grab    0..1 forelimbs reaching for the camera (catch)
   *   rear    0..1 rising up on the hind legs, face lifted (catch)
   * @param {number} smoothing how quickly the pose follows its targets
   */
  update(dt, d, smoothing = 9) {
    const s = d.speed;
    const g = d.phase;
    const settle = d.settle;
    const amp = (0.08 + 0.18 * s) * settle;
    const reach = d.lunge * 0.5 + d.grab * 0.4;
    const T = this.target;
    const rear = d.rear ?? 0;

    // Quadruped diagonal stalking phase offsets
    const TWO_PI = Math.PI * 2;
    const legFR = crawlGait(g);
    const legHL = crawlGait(g + TWO_PI * 0.25);
    const legFL = crawlGait(g + TWO_PI * 0.5);
    const legHR = crawlGait(g + TWO_PI * 0.75);

    // Torso lean and lateral undulation (controlled predator breathing and stalk)
    T.lean = 0.04 + 0.08 * s + d.lunge * 0.2 - d.raise * 0.08 - rear * 0.35;
    T.spineYaw = (legFR.reach - legFL.reach) * 0.035 * settle + clamp(d.yawRate * 0.1, -0.12, 0.12);

    // Roll leans into corridor turns and shifts weight onto grounded claws
    T.roll = (legFL.lift - legFR.lift) * 0.025 * s + clamp(d.yawRate * 0.12, -0.12, 0.12) + Math.sin(d.time * 0.37) * 0.015;
    T.bob = (Math.max(legFR.lift, legFL.lift) * 0.018 + Math.abs(Math.sin(g * 2)) * 0.012) * s * settle + rear * 0.15;
    T.breath = Math.sin(d.time * 1.7) * 0.5 + 0.5;

    // Predator head stabilization: locks onto player, steady and isolated
    T.headPitch = 0.04 + Math.sin(g * 2) * 0.015 * s - T.bob * 0.3 + d.lunge * 0.3 - d.grab * 0.2 - rear * 0.2 - d.raise * 0.3 + d.headPitch;
    T.headYaw = d.lookYaw - T.spineYaw * 0.5;
    T.headRoll = d.tilt - T.roll * 0.4;

    // Forelimbs: firm predator stride with clean claw reach, no rubber warping
    T.foreR = legFR.reach * amp - reach;
    T.foreL = legFL.reach * amp - reach;
    T.foreYawR = legFR.sweep * settle * 0.25 + d.grab * 0.15;
    T.foreYawL = legFL.sweep * settle * 0.25 - d.grab * 0.15;
    T.liftR = legFR.lift * 0.16 * s + d.grab * 0.25;
    T.liftL = legFL.lift * 0.16 * s + d.grab * 0.25;

    // Hindlimbs: steady diagonal follow with ground drive
    T.hindR = legHR.reach * amp * 0.85 - d.lunge * 0.2;
    T.hindL = legHL.reach * amp * 0.85 - d.lunge * 0.2;
    T.hindLiftR = legHR.lift * 0.12 * s;
    T.hindLiftL = legHL.lift * 0.12 * s;

    const k = 1 - Math.exp(-smoothing * dt);
    for (const key of CHANNELS) this.pose[key] += (T[key] - this.pose[key]) * k;

    this._build(d.time);
    WARDEN_UNIFORMS.uTime.value = d.time;
  }

  /** Snap every channel back to rest (used on restart). */
  reset() {
    for (const key of CHANNELS) {
      this.pose[key] = 0;
      this.target[key] = 0;
    }
  }

  _build(time) {
    const p = this.pose;
    const bones = this.bones;

    // root: torso lean, undulating spine yaw, weight shift roll, bob and a heavy-breathing scale
    const breath = 1 + Math.sin(time * 1.7) * 0.018 * (1 + p.breath * 0.3);
    EULER.set(p.lean, p.spineYaw, p.roll);
    ROT.makeRotationFromEuler(EULER);
    TMP.makeScale(1, breath, breath);
    bones[BONE.root].makeTranslation(0, p.bob, 0).multiply(ROT).multiply(TMP);

    this._jointMatrix(BONE.head, p.headPitch, p.headYaw, p.headRoll);
    this._jointMatrix(BONE.foreR, p.foreR, p.foreYawR, p.liftR);
    this._jointMatrix(BONE.foreL, p.foreL, p.foreYawL, -p.liftL);
    this._jointMatrix(BONE.hindR, p.hindR, 0, p.hindLiftR);
    this._jointMatrix(BONE.hindL, p.hindL, 0, -p.hindLiftL);
  }

  /** Rotate bone b about its pivot: T(pivot) * R * T(-pivot). */
  _jointMatrix(b, rx, ry, rz) {
    EULER.set(rx, ry, rz);
    ROT.makeRotationFromEuler(EULER);
    const pivot = PIVOT[b];
    T_POS.makeTranslation(pivot.x, pivot.y, pivot.z);
    T_NEG.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    this.bones[b].copy(T_POS).multiply(ROT).multiply(T_NEG);
  }
}
