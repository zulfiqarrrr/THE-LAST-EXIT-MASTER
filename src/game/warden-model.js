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

/* Joint pivots (raw GLB units). Head turns on the neck, forelimbs on the
   shoulders, hindquarters on the hips. Root pivots at the origin. */
const PIVOT = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0.12, 0.3),
  new THREE.Vector3(0.22, 0, 0.26),
  new THREE.Vector3(-0.22, 0, 0.26),
  new THREE.Vector3(0.1, -0.05, -0.14),
  new THREE.Vector3(-0.1, -0.05, -0.14),
];
/* Where each bone's body region sits. */
const CENTRE = [
  new THREE.Vector3(0, 0.05, 0.05),
  new THREE.Vector3(0, 0.2, 0.44),
  new THREE.Vector3(0.38, 0, 0.3),
  new THREE.Vector3(-0.38, 0, 0.3),
  new THREE.Vector3(0.12, -0.1, -0.3),
  new THREE.Vector3(-0.12, -0.1, -0.3),
];
const SIGMA = [0.34, 0.16, 0.2, 0.2, 0.2, 0.2];
const ROOT_BIAS = 0.6;

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
    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));

    // masks in rest space: the head sits at +Z, the forelimb claws reach furthest forward
    float head = smoothstep(0.27, 0.15, length((p - vec3(0.0, 0.15, 0.4)) * vec3(1.0, 1.1, 0.9)));
    float mouthD = length((p - vec3(0.0, 0.04, 0.44)) * vec3(1.4, 1.0, 0.8));
    float mouth = smoothstep(0.1, 0.05, mouthD);
    float gums = smoothstep(0.14, 0.08, mouthD) * (1.0 - mouth);
    // wounds and scars must not touch the face: the head joint's Gaussian sits between
    // the eyes, so without this mask it painted large red blobs around them
    float notFace = 1.0 - head;
    float claw = smoothstep(0.34, 0.4, p.z) * smoothstep(0.28, 0.36, abs(p.x));
    float clawTip = claw * smoothstep(0.38, 0.44, p.z);
    float joint = max(
      max(wardenGauss(p, vec3(0.0, 0.2, 0.44), 0.2), wardenGauss(p, vec3(0.38, 0.0, 0.3), 0.2)),
      max(
        max(wardenGauss(p, vec3(-0.38, 0.0, 0.3), 0.2), wardenGauss(p, vec3(0.12, -0.1, -0.3), 0.2)),
        wardenGauss(p, vec3(-0.12, -0.1, -0.3), 0.2)
      )
    );

    // 1. base flesh: pale dirty ivory-grey #D2CEC2, cool grey shadows #777873, warmer #B8B2A7
    // transitions, muted ivory #E3DDD1 highlights
    float n1 = wardenFbm(p * 2.4);
    vec3 flesh = mix(wardenLin(vec3(0.467, 0.471, 0.451)), wardenLin(vec3(0.824, 0.808, 0.761)), smoothstep(0.28, 0.62, n1));
    flesh = mix(flesh, wardenLin(vec3(0.722, 0.698, 0.655)), smoothstep(0.5, 0.75, wardenFbm(p * 3.1 + 7.3)) * 0.3);
    flesh = mix(flesh, wardenLin(vec3(0.890, 0.867, 0.820)), smoothstep(0.62, 0.9, n1) * 0.45);

    // 2. restrained bruising: #A77C78 pink-grey, #806A6C mauve-grey, #55454A deep plum
    float bruise = smoothstep(0.6, 0.82, wardenFbm(p * 2.6 + 13.1));
    flesh = mix(flesh, wardenLin(vec3(0.655, 0.486, 0.471)), bruise * 0.3);
    flesh = mix(flesh, wardenLin(vec3(0.502, 0.416, 0.424)), smoothstep(0.66, 0.86, wardenFbm(p * 3.4 + 19.0)) * 0.3);
    flesh = mix(flesh, wardenLin(vec3(0.333, 0.271, 0.290)), smoothstep(0.7, 0.9, wardenFbm(p * 4.1 + 23.0)) * joint * 0.45);

    // 3. veins: contour lines of a domain-warped field branch unevenly
    vec3 warp = vec3(wardenFbm(p * 3.0), wardenFbm(p * 3.0 + 5.2), wardenFbm(p * 3.0 + 9.1)) - 0.5;
    float vd = abs(wardenNoise((p + warp * 0.06) * 10.0) - 0.5);
    float width = mix(0.006, 0.026, wardenNoise(p * 6.0 + 3.0));
    float vein = (1.0 - smoothstep(width * 0.4, width, vd)) * (1.0 - claw);
    float faint = (1.0 - smoothstep(width, width * 2.6, vd)) * 0.5 * (1.0 - claw);
    flesh = mix(flesh, wardenLin(vec3(0.145, 0.137, 0.149)), vein * 0.85);
    flesh = mix(flesh, wardenLin(vec3(0.396, 0.337, 0.353)), faint * 0.35);
    flesh = mix(flesh, wardenLin(vec3(0.286, 0.251, 0.278)), faint * 0.6);

    // 4. scars (dusty pink-grey #987675, edges #514448, raw #985B5D) and wounds
    // (interior #3B1117, maroon #4A171C, dried blood #651C22, raw tissue #8C4247),
    // concentrated around the joints so they stay localized
    float scar = (1.0 - smoothstep(0.0, 0.025, abs(wardenNoise(p * 14.0 + 2.0) - 0.5))) * (0.25 + 0.75 * joint) * notFace;
    flesh = mix(flesh, wardenLin(vec3(0.596, 0.463, 0.459)), scar * 0.45);
    flesh = mix(flesh, wardenLin(vec3(0.318, 0.267, 0.282)), scar * joint * 0.3);
    float wn = wardenFbm(p * 7.0 + 21.0);
    float deep = smoothstep(0.8, 0.86, wn) * joint * notFace;
    float fresh = smoothstep(0.74, 0.8, wn) * (1.0 - smoothstep(0.8, 0.86, wn)) * joint * notFace;
    flesh = mix(flesh, wardenLin(vec3(0.231, 0.067, 0.090)), deep * 0.8);
    flesh = mix(flesh, wardenLin(vec3(0.396, 0.110, 0.133)), fresh * 0.5);
    flesh = mix(flesh, wardenLin(vec3(0.549, 0.259, 0.278)), fresh * joint * 0.25);

    // 5. grime pooled in the low body
    float grime = smoothstep(0.6, 0.8, wardenFbm(p * 4.5 + 31.0)) * smoothstep(0.1, -0.2, p.y);
    flesh = mix(flesh, wardenLin(vec3(0.318, 0.290, 0.277)), grime * 0.4);

    // 6. face: pale corpse-grey, only faint shadow (no tint)
    flesh = mix(flesh, wardenLin(vec3(0.824, 0.808, 0.761)), head * 0.3);

    // 7. gums (#6F252B) and near-black burgundy mouth interior (#260B10, shadows #160D10)
    flesh = mix(flesh, wardenLin(vec3(0.435, 0.145, 0.169)), gums * 0.9);
    flesh = mix(flesh, wardenLin(vec3(0.149, 0.043, 0.063)), mouth);
    flesh = mix(flesh, wardenLin(vec3(0.086, 0.051, 0.063)), mouth * smoothstep(0.06, 0.0, mouthD));

    // 7b. red eyes and dirty ivory teeth (approximate rest-space masks, tuned in warden-viewer.html)
    // 3D distance from an eye centre sitting on the front of the face (z ~ 0.43), so the
    // eyes only paint where the surface faces forward instead of a stripe through the head
    float eyeR = length(vec3(abs(p.x) - 0.05, (p.y - 0.17) * 1.1, p.z - 0.42));
    float eyeZone = smoothstep(0.3, 0.36, p.z);
    // small deep blood-red eyeball #850014 with #B00020 highlight and #10090B pupil.
    // The surrounding skin is grey (eyeHalo above), so no red patch sits around the eye.
    // the area around each eye is restored to pale grey skin, so no red or pink halo remains
    float eyeHalo = smoothstep(0.05, 0.028, eyeR) * eyeZone;
    flesh = mix(flesh, wardenLin(vec3(0.824, 0.808, 0.761)), eyeHalo * 0.9);
    float eyeball = smoothstep(0.014, 0.011, eyeR) * eyeZone;
    flesh = mix(flesh, wardenLin(vec3(0.522, 0.000, 0.078)), eyeball);
    // brighter red highlight #B00020 on the upper inner part of each eye
    float eyeHi = length(vec3(abs(p.x) - 0.058, (p.y - 0.18) * 1.1, p.z - 0.42));
    float highlight = smoothstep(0.009, 0.006, eyeHi) * eyeZone;
    flesh = mix(flesh, wardenLin(vec3(0.690, 0.000, 0.125)), highlight * 0.6);
    // near-black pupil #10090B
    float pupil = smoothstep(0.008, 0.005, eyeR) * eyeZone;
    flesh = mix(flesh, wardenLin(vec3(0.063, 0.035, 0.043)), pupil);
    // dirty aged ivory teeth #D8CDB8, darkened roots and gaps #514447
    float teeth = smoothstep(0.035, 0.02, abs(p.y - 0.02)) * smoothstep(0.11, 0.08, abs(p.x)) * smoothstep(0.34, 0.37, p.z);
    flesh = mix(flesh, wardenLin(vec3(0.847, 0.804, 0.722)), teeth);
    // bone-grey claws #B4AA98 -> dirty grey #81796F, dark tips #373033
    flesh = mix(flesh, wardenLin(vec3(0.706, 0.667, 0.596)), claw);
    flesh = mix(flesh, wardenLin(vec3(0.506, 0.475, 0.435)), claw * 0.5 * (1.0 - clawTip));
    flesh = mix(flesh, wardenLin(vec3(0.216, 0.188, 0.200)), clawTip);

    // the albedo map is grey skin with red blotches and purple veins. Its red
    // blotches are NOT blended in as colour any more (that painted broad red
    // patches over the face and eyes); the map only adds fine luminance detail below.
    flesh *= mix(0.9, 1.08, clamp(lum, 0.0, 1.0));

    // PBR response: skin varies in roughness; wounds and claws are harder; the mouth is wet
    wardenRoughness = mix(0.8, 0.94, wardenNoise(p * 9.0));
    wardenRoughness = mix(wardenRoughness, 0.6, deep + fresh);
    wardenRoughness = mix(wardenRoughness, 0.42, claw);
    wardenRoughness = mix(wardenRoughness, 0.3, mouth);
    // a thin wet sheen around the mouth, glossier than the dry skin
    float wet = smoothstep(0.15, 0.09, mouthD) * (1.0 - mouth);
    wardenRoughness = mix(wardenRoughness, 0.36, wet * 0.8);
    return flesh;
  }
`;

/** Patch a material so its vertices follow the bone matrices. */
function patchSkinning(material, key) {
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
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SKIN_COLOUR_HEADER}`)
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
           diffuseColor.rgb = wardenColour(diffuseColor.rgb);`
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n           roughnessFactor = wardenRoughness;');
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
    order.sort((a, b) => w[b] - w[a]);
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += w[order[k]];
    for (let k = 0; k < 4; k++) {
      bones[i * 4 + k] = order[k];
      weights[i * 4 + k] = sum > 0 ? w[order[k]] / sum : k === 0 ? 1 : 0;
    }
    // claws and forepaws: the parts that twitch
    twitch[i] = clamp01((z - 0.22) * 8) * clamp01((Math.abs(x) - 0.25) * 6);
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

    const geometry = mesh.geometry;
    const { bones, weights, twitch } = computeSkinWeights(geometry.attributes.position);
    geometry.setAttribute('aBones', new THREE.BufferAttribute(bones, 4));
    geometry.setAttribute('aWeights', new THREE.BufferAttribute(weights, 4));
    geometry.setAttribute('aTwitch', new THREE.BufferAttribute(twitch, 1));

    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const material = new THREE.MeshStandardMaterial({
      name: 'warden-skin',
      map: source.map || null,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
    });
    if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
    patchSkinning(material, 'warden-skin');

    const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    patchSkinning(depthMaterial, 'warden-depth');

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

/** Pose channels, smoothed toward their targets every frame. */
const CHANNELS = [
  'lean', 'roll', 'bob', 'breath',
  'headPitch', 'headYaw', 'headRoll',
  'foreR', 'foreL', 'liftR', 'liftL',
  'hindR', 'hindL',
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
    const amp = (0.1 + 0.34 * s) * d.settle;
    const reach = d.lunge * 1.05 + d.grab * 0.8;
    const T = this.target;
    const rear = d.rear ?? 0;
    T.lean = 0.1 + 0.16 * s + d.lunge * 0.4 - d.raise * 0.12 - rear * 0.5;
    // slow idle weight shift, plus the lean into a turn
    T.roll = Math.sin(g) * 0.035 * s + clamp(d.yawRate * 0.12, -0.1, 0.1) + Math.sin(d.time * 0.37) * 0.025;
    T.bob = Math.abs(Math.sin(g)) * 0.05 * s + rear * 0.22;
    T.breath = Math.sin(d.time * 1.7) * 0.5 + 0.5;
    T.headPitch = 0.12 + Math.sin(g * 2) * 0.03 * s + d.lunge * 0.5 - d.grab * 0.35 - rear * 0.3 - d.raise * 0.5 + d.headPitch;
    T.headYaw = d.lookYaw;
    T.headRoll = d.tilt;
    T.foreR = Math.sin(g) * amp - reach;
    T.foreL = Math.sin(g + Math.PI) * amp - reach;
    T.liftR = Math.max(0, Math.sin(g + Math.PI)) * 0.25 * s + d.grab * 0.4;
    T.liftL = Math.max(0, Math.sin(g)) * 0.25 * s + d.grab * 0.4;
    T.hindR = Math.sin(g + Math.PI) * amp * 0.8 - d.lunge * 0.35;
    T.hindL = Math.sin(g) * amp * 0.8 - d.lunge * 0.35;

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

    // root: torso lean, weight shift, bob and a heavy-breathing scale
    const breath = 1 + Math.sin(time * 1.7) * 0.018 * (1 + p.breath * 0.3);
    EULER.set(p.lean, 0, p.roll);
    ROT.makeRotationFromEuler(EULER);
    TMP.makeScale(1, breath, breath);
    bones[BONE.root].makeTranslation(0, p.bob, 0).multiply(ROT).multiply(TMP);

    this._jointMatrix(BONE.head, p.headPitch, p.headYaw, p.headRoll);
    this._jointMatrix(BONE.foreR, p.foreR, 0, p.liftR);
    this._jointMatrix(BONE.foreL, p.foreL, 0, -p.liftL);
    this._jointMatrix(BONE.hindR, p.hindR, 0, 0);
    this._jointMatrix(BONE.hindL, p.hindL, 0, 0);
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
