/* ==========================================================================
   THE LAST EXIT — tuning constants, quality tiers, device helpers
   Every gameplay number lives here so movement, AI and rendering stay
   delta-time based and easy to balance.
   ========================================================================== */

/** Size of one map cell in metres (corridor width). */
export const CELL = 3;
/** Wall / ceiling height in metres. */
export const WALL_H = 3.2;

export const PLAYER = {
  radius: 0.48,
  eyeHeight: 1.62,
  walkSpeed: 3.1,
  sprintSpeed: 5.6,
  acceleration: 14,
  damping: 12,
  staminaMax: 100,
  staminaDrain: 20,
  staminaRegen: 16,
  staminaRegenDelay: 0.8,
  bobAmount: 0.035,
  bobSpeed: 9.5,
};

export const TORCH = {
  batteryMax: 100,
  drain: 1.1,
  regen: 4.2,
  distance: 30,
  angle: 0.46,
  penumbra: 0.55,
  /** candela — modern three.js uses physical light units */
  intensity: 15,
  /** gentle falloff so the beam still reads 10-15 metres down a corridor */
  decay: 1,
};

export const LOOK = {
  /** radians per pixel of desktop mouse movement */
  mouseSensitivity: 0.0021,
  /** default desktop mouse sensitivity percentage */
  mouseDefault: 100,
  /** radians per second for arrow-key look */
  keySpeed: 1.9,
  /** radians per pixel of touch drag, multiplied by the per-axis touch sensitivity sliders */
  touchBase: 0.0035,
  /** slider value (percent of touchBase) used until the player changes it */
  touchDefault: 100,
  maxPitch: Math.PI / 2 - 0.08,
};

/**
 * LUMEN SURGE: a timed cyan burst that lights the facility without the torch.
 * Intensities are physical (candela), like TORCH. The light only brightens the
 * scene; it never touches the Warden's AI, detection or materials.
 * The surge needs the LUMEN MAINTENANCE KEY (see LUMEN_KEY): it is used up when
 * the 45 seconds run out and a new key spawns somewhere else in the facility.
 */
export const LUMEN = {
  duration: 45,
  fadeIn: 1.1,
  fadeOut: 1.4,
  color: 0x3fd8ff,
  intensity: 45,
  distance: 18,
  decay: 1.2,
  pulseRate: 2.2,
  pulseDepth: 0.05,
  particleCount: 42,
  particleSpread: 4.5,
};

/**
 * The collectible LUMEN MAINTENANCE KEY. Tuned to be found by searching: its
 * glow is short-range so it cannot be seen across the facility, and it only
 * starts to pulse once the player is within clueRange.
 */
export const LUMEN_KEY = {
  color: 0x3fd8ff,
  hoverY: 1.0,
  glowIntensity: 0.5,
  glowDistance: 1.6,
  /** the halo fades to nothing beyond this distance (m) */
  clueRange: 3.5,
  /** a faint ping is heard within this distance (m) */
  pingRange: 3.5,
  pingInterval: 2.4,
  /** a key is not placed within this distance (m) of the player's sight line */
  viewRange: 9,
  interactRange: 2.6,
  interactDot: 0.55,
  /** a spawn must be at least this many steps of walking from the player */
  minSpawnSteps: 10,
  /** cells kept clear around the player, the Warden and the exit key */
  clearance: 3,
  /** previous spawn cells are avoided while other valid cells exist */
  recentSpawns: 3,
  /** cells this close (in tiles) to a recent spawn are avoided too */
  recentRadius: 4,
};

export const MAINTENANCE_KEY = {
  /** the escape key is hidden at least this many steps from the spawn */
  minSpawnSteps: 24,
  /** and never in plain sight of the spawn within this range (m) */
  viewRange: 9,
};

export const ENEMY = {
  patrolSpeed: 1.75,
  investigateSpeed: 2.3,
  /**
   * Deliberately between the player's walk (3.1) and sprint (5.6): it always
   * closes on a walker, and a sprinting player can always outrun it.
   */
  chaseSpeed: 3.35,
  /**
   * body radius used for collision against walls, in metres. The Warden is
   * about 2.8 m across, so a 1.0 m disc keeps it 0.5 m off each wall of a 3 m
   * corridor and lets it pass the 2.3 m+ clear doorways.
   */
  radius: 1.0,
  /**
   * Clearance kept from wall tiles, in metres. The model reaches about 1.4 m
   * sideways, so 1.45 keeps its body out of the walls of a 3 m corridor (cell
   * centres sit 1.5 m from the walls). Only the tile grid uses it: crates and
   * lockers keep the smaller `radius`, so the Warden still fits the gaps the
   * level was built around.
   */
  wallClearance: 1.45,
  /**
   * The highest detection a sound alone can reach. Hearing you makes the
   * Warden investigate, but only sight (which fills the meter to 1) starts a chase.
   */
  suspicionCap: 0.6,
  /** within this distance the HUD shows its proximity warning */
  nearRange: 13,
  /** detection + vision range */
  sightRange: 23,
  /** half-angle of the creature's vision cone, radians */
  sightFov: Math.PI * 0.45,
  hearingWalk: 9,
  hearingSprint: 19,
  /** how fast the detection meter fills while it can see you */
  detectRate: 0.95,
  /** multiplied when your flashlight is pointed at it */
  torchBonus: 1.9,
  loseSightTime: 3.4,
  /** the player is caught once the Warden's centre is this close (its head reaches ~1.2 m) */
  catchDistance: 1.6,
  /** seconds of "searching" after losing you before it goes back to patrol */
  searchTime: 6,
  repathInterval: 0.4,
  /** minimum distance it must gain before it is allowed to pick a new patrol cell */
  waypointRadius: 0.55,
  /** how often (seconds) the stuck detector samples movement */
  stuckCheckInterval: 0.8,
  /** if it travels less than this in that window while trying to move, it is stuck */
  stuckMinDistance: 0.35,
  /** how long a recovery sidestep lasts */
  sidestepTime: 0.45,
};

/** Ceiling lighting behaviour: fixture flicker, red emergency lights and outage events. */
export const LIGHTING = {
  /** red emergency fixtures placed in the facility (QUALITY.maxRedLights are lit) */
  redFixtures: 4,
  redColor: 0xff2330,
  redIntensity: 6,
  redDistance: 8,
  redDecay: 1.6,
  /** minimum spacing (in tiles) between two red emergency fixtures */
  redSpacing: 5,
  /** how many white fixtures may be dark at the same time during random flickers */
  maxOffFixtures: 2,
  /** seconds between random group outages (a few nearby fixtures fail, then recover) */
  groupOutageInterval: [22, 40],
  /** seconds between rare localised emergency events (red lights surge, nearby lights stutter) */
  emergencyInterval: [90, 160],
  emergencyRadius: 9,
  emergencyDuration: [6, 9],
  /** audio: distance at which fixture sounds fade out, minimum gap between sounds, and per-fixture repeat gap */
  soundRange: 20,
  soundGap: 0.9,
  soundRepeat: 8,
};

export const QUALITY = {
  high: {
    name: 'high',
    pixelRatioCap: 2,
    shadows: true,
    shadowMapSize: 1024,
    dustCount: 320,
    maxFlickerLights: 5,
    maxRedLights: 4,
    fogDensity: 0.058,
    antialias: true,
    decals: 8,
  },
  low: {
    name: 'low',
    pixelRatioCap: 1.35,
    shadows: false,
    shadowMapSize: 512,
    dustCount: 110,
    maxFlickerLights: 3,
    maxRedLights: 2,
    fogDensity: 0.048,
    antialias: false,
    decals: 3,
  },
};

/** Cheap capability + device sniffing used for the default quality tier. */
export function detectQuality() {
  if (typeof navigator === 'undefined') return 'high';
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (mobile && (cores <= 6 || mem <= 4)) return 'low';
  if (coarse && cores <= 4) return 'low';
  return 'high';
}

/**
 * Allows ?touch=1 / ?touch=0 to force the control scheme, which is handy for
 * desktop testing and for testing on a tablet with a keyboard attached.
 */
let forcedTouch = null;
export function setForcedTouch(value) {
  forcedTouch = value === null || value === undefined ? null : Boolean(value);
}

/** True when the device should get the on-screen thumb controls. */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  if (forcedTouch !== null) return forcedTouch;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const noHover = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
  return (
    coarse ||
    noHover ||
    'ontouchstart' in window ||
    (navigator.maxTouchPoints || 0) > 1
  );
}

/** Small localStorage wrapper that never throws (private mode, quota, etc). */
export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`tle.${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`tle.${key}`, JSON.stringify(value));
    } catch {
      /* ignore — settings are a nicety, not a requirement */
    }
  },
};

/**
 * The kill sequence when the Warden catches the player. Times are in seconds.
 * Set `enabled: false` to skip straight to the game over screen.
 */
export const CATCH = {
  enabled: true,
  /** seconds for the lunge to reach the player (the strike lands here) */
  lungeTime: 0.85,
  /** seconds the Warden holds its face to the camera before game over */
  holdTime: 2.3,
  /**
   * metres from the kill camera's lens to the Warden's centre at the grip. Its
   * head reaches about 1.2 m forward of the centre, so ~0.4 m stays clear of the lens.
   */
  faceDistance: 1.6,
  /** metres the lens pulls back along open floor, away from the Warden */
  pullback: 1.1,
  /** seconds for the lens to dolly from the player's eye to the kill position */
  dollyTime: 0.5,
  /** horizontal field of view (degrees) the lens narrows to on the face */
  zoomFov: 52,
  /** metres the lens aims below the head's centre, so the jaw stays in frame */
  aimDrop: 0.2,
  /** seconds after the impact before the CAUGHT YOU caption appears */
  textDelay: 0.25,
  /** strength of the jaw chatter during the hold, 0..1 */
  chatter: 1,
  /** camera shake amplitude in metres at impact (scaled down for reduced motion) */
  shake: 0.12,
  /** seconds at the end of the hold over which the screen fades to black */
  fadeTime: 0.6,
};

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Deterministic PRNG so the facility looks identical on every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
