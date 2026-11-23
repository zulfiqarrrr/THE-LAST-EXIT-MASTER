/* ==========================================================================
   THE LAST EXIT — level construction + navigation graph
   The facility is authored as a 41x27 tile map. The same grid drives
   collision, the creature's BFS path-finding and line-of-sight checks, which
   keeps movement reliable on every device.
   ========================================================================== */

import * as THREE from 'three';
import { CELL, WALL_H, LIGHTING, clamp, mulberry32 } from './config.js';
import * as TEX from './textures.js';
import { buildWardProps } from './props.js';
import { buildSewerProps, buildArchiveProps } from './map-props.js';
import { getMapConfig, DEFAULT_MAP_ID } from './maps/index.js';
import * as facilityMap from './maps/map-facility.js';

/*
  Facility map constants (defaults to Facility / Map 1 for backwards compatibility).
*/
export const MAP_ROWS = facilityMap.MAP_ROWS;
export const MAINTENANCE_SPOTS = facilityMap.MAINTENANCE_SPOTS;

export const COLS = MAP_ROWS[0].length;
export const ROWS = MAP_ROWS.length;

/*
  Fixed world anchor: grid cell (ANCHOR_COL, ANCHOR_ROW) sits at the world
  origin. It stays put as the grid grows, so the original rooms, the exit
  door and the spawn keep their world positions when new areas are added.
*/
const ANCHOR_COL = 10;
const ANCHOR_ROW = 10;

/** Furniture the maintenance key can rest on. `top` is the surface height (m). */
const KEY_FURNITURE = {
  desk: { size: [1.0, 0.78, 0.6], top: 0.78, solid: true },
  cabinet: { size: [0.7, 1.1, 0.5], top: 1.1, solid: true },
  shelf: { size: [1.1, 0.06, 0.4], top: 1.3, solid: false },
};

/** Collider position used while no key is placed: far outside the map. */
const FAR_AWAY = 1e6;

const SOLID_CHARS = new Set(['#', 'X', 'B', 'E', 'K', 'T']);

/** Flat character grid: GRID[row][col]. */
export const GRID = MAP_ROWS.map((row) => row.split(''));

export let currentMapId = 'facility';
export let currentMapConfig = facilityMap;

export function setActiveMap(mapId = 'facility') {
  currentMapId = mapId;
  currentMapConfig = getMapConfig(mapId);
  const rows = currentMapConfig.MAP_ROWS;
  for (let r = 0; r < ROWS; r++) {
    const rowStr = rows[r] || '#'.repeat(COLS);
    for (let c = 0; c < COLS; c++) {
      GRID[r][c] = rowStr[c] || '#';
    }
  }
  FLOOR_CELLS.length = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (isFloor(col, row)) FLOOR_CELLS.push({ col, row });
    }
  }
}

const inBounds = (col, row) => col >= 0 && row >= 0 && col < COLS && row < ROWS;

/** Character at a cell ('#' when out of bounds). */
export function tileAt(col, row) {
  if (!inBounds(col, row)) return '#';
  return GRID[row][col];
}

/** True when a cell blocks movement. */
export function isSolid(col, row) {
  if (!inBounds(col, row)) return true;
  return SOLID_CHARS.has(GRID[row][col]);
}

export function isFloor(col, row) {
  return !isSolid(col, row);
}

/** World-space centre of a cell. */
export function cellToWorld(col, row) {
  return {
    x: (col - ANCHOR_COL) * CELL,
    z: (row - ANCHOR_ROW) * CELL,
  };
}

/** Cell containing a world position. */
export function worldToCell(x, z) {
  return {
    col: Math.round(x / CELL + ANCHOR_COL),
    row: Math.round(z / CELL + ANCHOR_ROW),
  };
}

/** True when a world point is inside solid geometry (used for collisions + LOS). */
export function isSolidAt(x, z) {
  const { col, row } = worldToCell(x, z);
  return isSolid(col, row);
}

/** Every walkable cell, computed once. */
export const FLOOR_CELLS = (() => {
  const cells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (isFloor(col, row)) cells.push({ col, row });
    }
  }
  return cells;
})();

/* ---------------------------------------------------------------------------
   Navigation graph: breadth-first search over the tile grid.
   The map is tiny (441 cells) so a fresh BFS per request is far cheaper and
   more dependable than maintaining a dynamic navmesh.
--------------------------------------------------------------------------- */

const CELL_COUNT = COLS * ROWS;
const bfsPrev = new Int32Array(CELL_COUNT);
const bfsQueue = new Int32Array(CELL_COUNT);
const bfsSeen = new Int32Array(CELL_COUNT);
let bfsStamp = 0;

const indexOf = (col, row) => row * COLS + col;

/**
 * Shortest walkable path between two cells.
 * @returns {Array<{col:number,row:number}>} cells after the start, ending at the goal.
 */
export function findPath(from, to) {
  if (!from || !to) return [];
  if (!inBounds(to.col, to.row) || isSolid(to.col, to.row)) return [];
  if (from.col === to.col && from.row === to.row) return [];

  bfsStamp += 1;
  let head = 0;
  let tail = 0;
  const start = indexOf(from.col, from.row);
  const goal = indexOf(to.col, to.row);
  bfsSeen[start] = bfsStamp;
  bfsPrev[start] = -1;
  bfsQueue[tail += 1] = start;

  while (head < tail) {
    const current = bfsQueue[head += 1];
    if (current === goal) break;
    const col = current % COLS;
    const row = (current - col) / COLS;
    for (let dir = 0; dir < 4; dir += 1) {
      const nc = col + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
      const nr = row + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (isSolid(nc, nr)) continue;
      const next = indexOf(nc, nr);
      if (bfsSeen[next] === bfsStamp) continue;
      bfsSeen[next] = bfsStamp;
      bfsPrev[next] = current;
      bfsQueue[tail += 1] = next;
    }
  }

  if (bfsSeen[goal] !== bfsStamp) return [];
  const path = [];
  let node = goal;
  while (node !== start && node >= 0) {
    const col = node % COLS;
    const row = (node - col) / COLS;
    path.push({ col, row });
    node = bfsPrev[node];
  }
  return path.reverse();
}

/** Straight-line visibility between two world points (samples the grid). */
export function hasLineOfSight(ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const distance = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(distance / (CELL * 0.18)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isSolidAt(ax + dx * t, az + dz * t)) return false;
  }
  return true;
}

/** Random walkable cell, optionally biased towards (or away from) a point. */
export function randomFloorCell(random = Math.random, filter = null) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const cell = FLOOR_CELLS[Math.floor(random() * FLOOR_CELLS.length)];
    if (cell && (!filter || filter(cell))) return { ...cell };
  }
  return { ...FLOOR_CELLS[Math.floor(FLOOR_CELLS.length / 2)] };
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Walking distance, in cells, from `from` to every walkable cell, indexed by
 * row * COLS + col. Walls and unreachable cells hold -1.
 */
export function floorDistances(from) {
  const dist = new Int32Array(CELL_COUNT).fill(-1);
  if (!from || isSolid(from.col, from.row)) return dist;
  const queue = new Int32Array(CELL_COUNT);
  let head = 0;
  let tail = 0;
  const start = indexOf(from.col, from.row);
  dist[start] = 0;
  queue[tail] = start;
  tail += 1;
  while (head < tail) {
    const current = queue[head];
    head += 1;
    const col = current % COLS;
    const row = (current - col) / COLS;
    for (const [dc, dr] of STEPS) {
      const nc = col + dc;
      const nr = row + dr;
      if (isSolid(nc, nr)) continue;
      const next = indexOf(nc, nr);
      if (dist[next] !== -1) continue;
      dist[next] = dist[current] + 1;
      queue[tail] = next;
      tail += 1;
    }
  }
  return dist;
}

/**
 * Pick a walkable cell for the LUMEN MAINTENANCE KEY. A candidate must be
 * reachable from `from`, at least `minSteps` walking steps away, not a doorway,
 * and at least `clearance` cells from every cell in `avoid` (the Warden and the
 * exit key). Cells in `recent` are skipped while any other candidate remains,
 * so the key does not keep reappearing in the same place.
 * @returns {{col:number,row:number}|null}
 */
export function chooseLumenKeyCell({
  from,
  avoid = [],
  recent = [],
  recentRadius = 0,
  minSteps,
  clearance,
  filter = null,
  random = Math.random,
}) {
  const dist = floorDistances(from);
  const near = (a, b, range) => Math.abs(a.col - b.col) <= range && Math.abs(a.row - b.row) <= range;
  const isRecent = (cell) => recent.some((r) => near(r, cell, recentRadius));
  const candidates = [];
  let farthest = null;
  let farthestSteps = -1;
  for (const cell of FLOOR_CELLS) {
    const steps = dist[indexOf(cell.col, cell.row)];
    if (steps < 0) continue;
    if (tileAt(cell.col, cell.row) === 'D') continue;
    if (steps > farthestSteps) {
      farthest = cell;
      farthestSteps = steps;
    }
    if (steps < minSteps) continue;
    if (avoid.some((a) => near(a, cell, clearance))) continue;
    if (filter && !filter(cell)) continue;
    candidates.push(cell);
  }
  let pool = candidates.filter((cell) => !isRecent(cell));
  if (!pool.length) pool = candidates;
  if (!pool.length) return farthest ? { ...farthest } : null;
  return { ...pool[Math.floor(random() * pool.length)] };
}

/**
 * Pick a random walkable spawn cell for the monster, guaranteed to be far from the player
 * and out of direct sight, so the player never spawns next to the creature.
 * @param {{col:number, row:number}} playerCell
 * @param {number} minSteps minimum walking steps away (default: 16)
 * @param {Function} random random number generator (default: Math.random)
 * @returns {{col:number, row:number}}
 */
export function chooseMonsterSpawnCell({
  playerCell,
  minSteps = 12,
  random = Math.random,
} = {}) {
  const from = playerCell || { col: 13, row: 12 };
  const dist = floorDistances(from);
  const pWorld = cellToWorld(from.col, from.row);

  const candidates = [];
  let farthest = null;
  let farthestSteps = -1;

  for (const cell of FLOOR_CELLS) {
    const idx = indexOf(cell.col, cell.row);
    const steps = dist[idx];
    if (steps < 0) continue;
    if (tileAt(cell.col, cell.row) === 'D') continue;

    if (steps > farthestSteps) {
      farthestSteps = steps;
      farthest = cell;
    }

    if (steps < minSteps) continue;

    const cWorld = cellToWorld(cell.col, cell.row);
    const worldDist = Math.hypot(cWorld.x - pWorld.x, cWorld.z - pWorld.z);
    if (worldDist < 12) continue; // at least 12m euclidean

    // Avoid direct line of sight with player spawn
    if (hasLineOfSight(pWorld.x, pWorld.z, cWorld.x, cWorld.z)) continue;

    candidates.push(cell);
  }

  if (candidates.length > 0) {
    return { ...candidates[Math.floor(random() * candidates.length)] };
  }
  return farthest ? { ...farthest } : { ...from };
}

/* ---------------------------------------------------------------------------
   Geometry construction
--------------------------------------------------------------------------- */

const randBetween = (min, max) => min + (max - min) * Math.random();

const smoothstep = (v) => {
  const c = clamp(v, 0, 1);
  return c * c * (3 - 2 * c);
};

/*
  Ceiling fixture state machine. Each fixture is in one of these modes:
  steady   - stable, with a very slight drift
  buzz     - electrical buzz: a dim, rippling hum for a second or two
  flicker  - short irregular stutter bursts
  off      - briefly dark (only a couple at a time, see LIGHTING.maxOffFixtures)
  recover  - fading back up after an off period
  Every fixture keeps its own phase, rate and timers, so they never sync.
*/
function beginMode(entry, mode, t, duration) {
  entry.mode = mode;
  entry.duration = duration;
  entry.until = t + duration;
  entry.rate = mode === 'buzz' ? randBetween(8, 14) : randBetween(14, 24);
}

function enterSteady(entry, t) {
  entry.mode = 'steady';
  entry.duration = 0;
  entry.until = Infinity;
  entry.next = t + randBetween(5, 16);
}

function fixtureFactor(entry, t) {
  const p = entry.phase;
  switch (entry.mode) {
    case 'buzz': {
      const sag = 0.5 + 0.5 * Math.sin(t * entry.rate + p);
      const ripple = 0.5 + 0.5 * Math.sin(t * 37 + p * 3);
      return 0.5 + 0.3 * sag + 0.08 * ripple;
    }
    case 'flicker':
    case 'recover': {
      const wave = Math.sin(t * entry.rate + p) + 0.6 * Math.sin(t * entry.rate * 2.37 + p * 1.9);
      const stutter = 0.12 + 0.88 * smoothstep((wave + 0.2) * 0.6);
      if (entry.mode === 'flicker') return stutter;
      const left = clamp((entry.until - t) / entry.duration, 0, 1);
      return 1 - (1 - stutter) * left;
    }
    case 'off':
      return 0.03;
    default:
      return 0.96 + 0.04 * Math.sin(t * 0.6 + p);
  }
}

/* Advances one fixture's timers. `cue(entry, kind)` plays spatial audio. */
function stepFixture(entry, t, fixtures, cue) {
  if (entry.queued && t >= entry.queued.at) {
    const { mode, duration } = entry.queued;
    entry.queued = null;
    beginMode(entry, mode, t, duration);
    if (mode === 'buzz') cue(entry, 'buzz');
    else if (mode === 'off') cue(entry, 'crackle');
  }

  if (entry.mode === 'steady') {
    if (entry.queued || t < entry.next) return;
    const roll = Math.random();
    const offCount = fixtures.reduce((n, f) => n + (f.mode === 'off' ? 1 : 0), 0);
    if (roll < 0.45) {
      beginMode(entry, 'buzz', t, randBetween(1.2, 3));
      cue(entry, 'buzz');
    } else if (roll < 0.85 || offCount >= LIGHTING.maxOffFixtures) {
      beginMode(entry, 'flicker', t, randBetween(0.5, 1.1));
    } else {
      beginMode(entry, 'off', t, randBetween(0.3, 0.8));
      cue(entry, 'crackle');
    }
  } else if (t >= entry.until) {
    if (entry.mode === 'off') beginMode(entry, 'recover', t, randBetween(0.35, 0.7));
    else enterSteady(entry, t);
  }
}

/* Red emergency fixtures: steady, gently pulsing, or irregularly flickering. */
function redFactor(red, t) {
  if (red.style === 'pulse') return 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.25 + red.phase));
  if (red.style === 'irregular') {
    const dip = Math.sin(t * 0.9 + red.phase) * Math.sin(t * 2.7 + red.phase * 2);
    return dip > 0.82 ? 0.35 : 0.8;
  }
  return 0.8 + 0.04 * Math.sin(t * 0.8 + red.phase);
}

/* Brightness boost for a localised emergency event (fades in and out). */
function envelopeAt(event, t) {
  if (!event || t < event.from || t > event.until) return 0;
  return Math.min(1, (t - event.from) / 1.2, (event.until - t) / 1.5);
}

/*
  Picks red fixture cells: doorways first, then open junctions (3+ walkable
  neighbours). Avoids the start, exit and each other, using a fixed seed so the
  layout is the same every run.
*/
function pickEmergencySpots(doors, exitCells, count, random) {
  const candidates = doors.map((d) => ({ col: d.col, row: d.row }));
  for (const cell of FLOOR_CELLS) {
    const tile = tileAt(cell.col, cell.row);
    if (tile === 'D' || tile === 'L') continue;
    const open = STEPS.filter(([dc, dr]) => isFloor(cell.col + dc, cell.row + dr)).length;
    if (open >= 3) candidates.push({ col: cell.col, row: cell.row });
  }
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const chosen = [];
  for (const cand of candidates) {
    if (chosen.length >= count) break;
    const nearExit = exitCells.some(
      (e) => Math.max(Math.abs(e.col - cand.col), Math.abs(e.row - cand.row)) <= 4
    );
    if (nearExit) continue;
    const tooClose = chosen.some(
      (o) => Math.max(Math.abs(o.col - cand.col), Math.abs(o.row - cand.row)) < LIGHTING.redSpacing
    );
    if (!tooClose) chosen.push(cand);
  }
  return chosen;
}

function collectWalls() {
  const walls = [];
  const crates = [];
  const barrels = [];
  const doors = [];
  const fixtures = [];
  const beds = [];
  const trolleys = [];
  let startCell = null;
  const exitCells = [];
  let enemy = null;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = tileAt(col, row);
      if (tile === '#') walls.push({ col, row });
      else if (tile === 'X') crates.push({ col, row });
      else if (tile === 'B') barrels.push({ col, row });
      else if (tile === 'D') doors.push({ col, row });
      else if (tile === 'L') fixtures.push({ col, row });
      else if (tile === 'S') startCell = { col, row };
      else if (tile === 'E') exitCells.push({ col, row });
      else if (tile === 'K') beds.push({ col, row });
      else if (tile === 'T') trolleys.push({ col, row });
    }
  }

  // The creature wakes according to map layout (e.g. generator room on facility, central hub on sewers, atrium on archive).
  enemy = currentMapConfig.ENEMY_SPAWN ? { ...currentMapConfig.ENEMY_SPAWN } : { col: 7, row: 7 };
  if (isSolid(enemy.col, enemy.row)) {
    enemy = randomFloorCell(mulberry32(7));
  }

  return {
    walls,
    crates,
    barrels,
    doors,
    fixtures,
    beds,
    trolleys,
    startCell: startCell || { col: 13, row: 12 },
    exitCells,
    enemyCell: enemy,
  };
}

/**
 * Build the whole facility into a THREE.Group.
 * @param {THREE.Scene} scene
 * @param {object} quality one of QUALITY.high / QUALITY.low
 */
export function buildLevel(scene, quality, mapId = DEFAULT_MAP_ID) {
  setActiveMap(mapId);
  const mapConfig = getMapConfig(mapId);
  const theme = mapConfig.THEME || {};
  const wallH = mapConfig.WALL_HEIGHT || theme.wallHeight || WALL_H;
  const parts = collectWalls();
  const rng = mulberry32(20261016);
  const group = new THREE.Group();
  group.name = 'facility';
  const disposables = [];
  const colliders = [];

  scene.background = new THREE.Color(theme.background ?? 0x06090e);
  scene.fog = new THREE.FogExp2(theme.fogColor ?? 0x091018, quality.fogDensity);

  const track = (resource) => {
    disposables.push(resource);
    return resource;
  };

  /* ---------------------------- shared materials --------------------------- */

  const wallMat = track(
    new THREE.MeshStandardMaterial({ map: TEX.wallTexture(), roughness: 0.98, metalness: 0.02 })
  );
  if (mapId === 'sewers') {
    wallMat.color.setHex(0x556b5a);
  } else if (mapId === 'archive') {
    wallMat.color.setHex(0x6a503a);
  }

  // The shared textures are cloned so the larger facility can set its own repeat.
  // Repeat density matches the original 63 m floor (10 repeats) and ceiling (14 repeats).
  const floorMap = track(TEX.floorTexture().clone());
  floorMap.repeat.set((COLS * CELL) / 6.3, (ROWS * CELL) / 6.3);
  floorMap.needsUpdate = true;
  const ceilMap = track(TEX.ceilingTexture().clone());
  ceilMap.repeat.set((COLS * CELL) / 4.5, (ROWS * CELL) / 4.5);
  ceilMap.needsUpdate = true;
  const floorMat = track(
    new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.94, metalness: 0.04 })
  );
  const ceilMat = track(
    new THREE.MeshStandardMaterial({ map: ceilMap, roughness: 1, metalness: 0 })
  );
  if (mapId === 'sewers') {
    floorMat.color.setHex(0x324036);
    ceilMat.color.setHex(0x223028);
  } else if (mapId === 'archive') {
    floorMat.color.setHex(0x483626);
    ceilMat.color.setHex(0x261e16);
  }
  const metalMat = track(
    new THREE.MeshStandardMaterial({
      map: TEX.metalTexture(),
      roughness: 0.62,
      metalness: 0.55,
      color: 0x9aa1a8,
    })
  );
  const rustMat = track(
    new THREE.MeshStandardMaterial({ map: TEX.rustTexture(), roughness: 0.9, metalness: 0.35 })
  );
  const lockerMat = track(
    new THREE.MeshStandardMaterial({
      map: TEX.plateTexture(),
      color: 0x6d7a72,
      roughness: 0.82,
      metalness: 0.35,
    })
  );
  const doorMat = track(
    new THREE.MeshStandardMaterial({
      map: TEX.plateTexture(),
      color: 0x8d949a,
      roughness: 0.6,
      metalness: 0.6,
    })
  );

  /* -------------------------------- floor/ceiling ------------------------- */

  // The grid is anchored at cell (ANCHOR_COL, ANCHOR_ROW), so its centre is offset from the origin.
  const gridCentre = cellToWorld((COLS - 1) / 2, (ROWS - 1) / 2);

  const floorGeo = track(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL));
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(gridCentre.x, 0, gridCentre.z);
  floor.receiveShadow = quality.shadows;
  group.add(floor);

  const ceilGeo = track(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL));
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(gridCentre.x, wallH, gridCentre.z);
  group.add(ceiling);

  /* --------------------------------- walls -------------------------------- */

  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const dummy = new THREE.Object3D();

  // Exit cells are left clear so the blast door reads as a real opening.
  const wallCells = parts.walls;
  const walls = new THREE.InstancedMesh(boxGeo, wallMat, wallCells.length);
  walls.name = 'walls';
  walls.receiveShadow = quality.shadows;
  walls.castShadow = quality.shadows;
  wallCells.forEach((cell, i) => {
    const { x, z } = cellToWorld(cell.col, cell.row);
    dummy.position.set(x, wallH / 2, z);
    const jitter = 0.94 + rng() * 0.06;
    dummy.scale.set(CELL * jitter, wallH, CELL * jitter);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
  });
  walls.instanceMatrix.needsUpdate = true;
  group.add(walls);

  /* --------------------------------- props -------------------------------- */

  // Crates
  if (parts.crates.length) {
    const crateGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const crates = new THREE.InstancedMesh(crateGeo, rustMat, parts.crates.length);
    crates.castShadow = quality.shadows;
    crates.receiveShadow = quality.shadows;
    parts.crates.forEach((cell, i) => {
      const { x, z } = cellToWorld(cell.col, cell.row);
      dummy.position.set(x, 0.85, z);
      dummy.scale.set(2.3, 1.7, 2.3);
      dummy.rotation.set(0, (rng() - 0.5) * 0.35, 0);
      dummy.updateMatrix();
      crates.setMatrixAt(i, dummy.matrix);
    });
    crates.instanceMatrix.needsUpdate = true;
    group.add(crates);
  }

  // Barrels
  if (parts.barrels.length) {
    const barrelGeo = track(new THREE.CylinderGeometry(0.5, 0.5, 1, 14));
    const barrels = new THREE.InstancedMesh(barrelGeo, rustMat, parts.barrels.length);
    barrels.castShadow = quality.shadows;
    barrels.receiveShadow = quality.shadows;
    parts.barrels.forEach((cell, i) => {
      const { x, z } = cellToWorld(cell.col, cell.row);
      dummy.position.set(x, 0.8, z);
      dummy.scale.set(1.3, 1.6, 1.3);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.updateMatrix();
      barrels.setMatrixAt(i, dummy.matrix);
    });
    barrels.instanceMatrix.needsUpdate = true;
    group.add(barrels);
  }

  /* --------------------- wall-mounted dressing: lockers/pipes -------------- */

  const lockerSpots = [];
  const pipeSpots = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!isFloor(col, row)) continue;
      const tile = tileAt(col, row);
      if (tile === 'D' || tile === 'E') continue;
      const neighbours = [
        { dc: 1, dr: 0, axis: 'z' },
        { dc: -1, dr: 0, axis: 'z' },
        { dc: 0, dr: 1, axis: 'x' },
        { dc: 0, dr: -1, axis: 'x' },
      ];
      for (const n of neighbours) {
        if (tileAt(col + n.dc, row + n.dr) !== '#') continue;
        const roll = rng();
        if (roll < 0.2) lockerSpots.push({ col, row, ...n });
        else if (roll < 0.52) pipeSpots.push({ col, row, ...n });
      }
    }
  }

  if (lockerSpots.length) {
    const lockers = new THREE.InstancedMesh(boxGeo, lockerMat, lockerSpots.length);
    lockers.castShadow = quality.shadows;
    lockers.receiveShadow = quality.shadows;
    lockerSpots.forEach((spot, i) => {
      const { x, z } = cellToWorld(spot.col, spot.row);
      const size = 1.05 + rng() * 1.35; // some lockers, some half-height cabinets
      const depth = 0.42;
      const offset = CELL / 2 - depth / 2 - 0.06;
      dummy.position.set(x + spot.dc * offset, size / 2, z + spot.dr * offset);
      dummy.scale.set(
        spot.axis === 'x' ? depth : 0.95,
        size,
        spot.axis === 'x' ? 0.95 : depth
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      lockers.setMatrixAt(i, dummy.matrix);
      colliders.push({
        minX: dummy.position.x - (spot.axis === 'x' ? depth : 0.95) / 2,
        maxX: dummy.position.x + (spot.axis === 'x' ? depth : 0.95) / 2,
        minZ: dummy.position.z - (spot.axis === 'x' ? 0.95 : depth) / 2,
        maxZ: dummy.position.z + (spot.axis === 'x' ? 0.95 : depth) / 2,
      });
    });
    lockers.instanceMatrix.needsUpdate = true;
    group.add(lockers);
  }

  if (pipeSpots.length) {
    const pipeGeo = track(new THREE.CylinderGeometry(1, 1, 1, 10));
    const pipes = new THREE.InstancedMesh(pipeGeo, rustMat, pipeSpots.length);
    pipeSpots.forEach((spot, i) => {
      const { x, z } = cellToWorld(spot.col, spot.row);
      const offset = CELL / 2 - 0.28;
      dummy.position.set(x + spot.dc * offset, wallH - 0.55, z + spot.dr * offset);
      dummy.scale.set(0.085, CELL, 0.085);
      dummy.rotation.set(0, 0, 0);
      if (spot.axis === 'z') dummy.rotation.x = Math.PI / 2;
      else dummy.rotation.z = Math.PI / 2;
      dummy.position.y = wallH - 0.4 - rng() * 0.3;
      dummy.updateMatrix();
      pipes.setMatrixAt(i, dummy.matrix);
    });
    pipes.instanceMatrix.needsUpdate = true;
    group.add(pipes);
  }

  // Ceiling beams along the ring corridor
  const beamSpots = [];
  for (const cell of FLOOR_CELLS) {
    const horizontal = isSolid(cell.col, cell.row - 1) && isSolid(cell.col, cell.row + 1);
    const vertical = isSolid(cell.col - 1, cell.row) && isSolid(cell.col + 1, cell.row);
    if ((!horizontal && !vertical) || rng() > 0.34) continue;
    beamSpots.push({ ...cell, axis: horizontal ? 'z' : 'x' });
  }
  if (beamSpots.length) {
    const beams = new THREE.InstancedMesh(boxGeo, metalMat, beamSpots.length);
    beamSpots.forEach((spot, i) => {
      const { x, z } = cellToWorld(spot.col, spot.row);
      dummy.position.set(x, wallH - 0.16, z);
      dummy.scale.set(spot.axis === 'z' ? CELL : 0.34, 0.3, spot.axis === 'z' ? 0.34 : CELL);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      beams.setMatrixAt(i, dummy.matrix);
    });
    beams.instanceMatrix.needsUpdate = true;
    group.add(beams);
  }

  // Small debris, purely decorative (no collision)
  const debrisSpots = FLOOR_CELLS.filter(() => rng() < 0.12);
  if (debrisSpots.length) {
    const debris = new THREE.InstancedMesh(boxGeo, rustMat, debrisSpots.length);
    debrisSpots.forEach((cell, i) => {
      const { x, z } = cellToWorld(cell.col, cell.row);
      const s = 0.12 + rng() * 0.3;
      dummy.position.set(x + (rng() - 0.5) * 1.9, s / 2, z + (rng() - 0.5) * 1.9);
      dummy.scale.set(s * 2.4, s, s * 1.7);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    });
    debris.instanceMatrix.needsUpdate = true;
    group.add(debris);
  }

  /* ------------------------------ gurneys --------------------------------- */

  const gurneyCells = [
    { col: 15, row: 12 },
    { col: 12, row: 13 },
  ];
  for (const cell of gurneyCells) {
    if (isSolid(cell.col, cell.row)) continue;
    const { x, z } = cellToWorld(cell.col, cell.row);
    const gurney = new THREE.Group();
    const top = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.12, 2)), metalMat);
    top.position.y = 0.72;
    top.castShadow = quality.shadows;
    top.receiveShadow = quality.shadows;
    gurney.add(top);
    const sheet = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.05, 1.9)), lockerMat);
    sheet.position.y = 0.8;
    gurney.add(sheet);
    for (const [dx, dz] of [
      [0.4, 0.85],
      [-0.4, 0.85],
      [0.4, -0.85],
      [-0.4, -0.85],
    ]) {
      const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.07, 0.72, 0.07)), metalMat);
      leg.position.set(dx, 0.36, dz);
      gurney.add(leg);
    }
    gurney.position.set(x, 0, z);
    gurney.rotation.y = (rng() - 0.5) * 0.3;
    group.add(gurney);
    colliders.push({ minX: x - 0.55, maxX: x + 0.55, minZ: z - 1.05, maxZ: z + 1.05 });
  }

  /* ------------------------------- blood decals --------------------------- */

  const decalTexture = TEX.bloodDecalTexture();
  const decalCells = [
    { col: 6, row: 13 },
    { col: 8, row: 12 },
    { col: 14, row: 13 },
    { col: 13, row: 15 },
    { col: 7, row: 6 },
    { col: 13, row: 6 },
    { col: 6, row: 5 },
    { col: 18, row: 9 },
  ].slice(0, quality.decals || 4);
  for (const cell of decalCells) {
    if (isSolid(cell.col, cell.row)) continue;
    const { x, z } = cellToWorld(cell.col, cell.row);
    const geo = track(new THREE.PlaneGeometry(2.4 + rng() * 1.2, 2.4 + rng() * 1.2));
    const mat = track(
      new THREE.MeshBasicMaterial({
        map: decalTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
        color: 0x8d2027,
        blending: THREE.NormalBlending,
      })
    );
    const decal = new THREE.Mesh(geo, mat);
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = rng() * Math.PI;
    decal.position.set(x + (rng() - 0.5), 0.012, z + (rng() - 0.5));
    group.add(decal);
  }

  /* --------------------------- sliding door frames ------------------------- */

  for (const cell of parts.doors) {
    const { x, z } = cellToWorld(cell.col, cell.row);
    // A doorway cut into an east-west wall opens along z, so its frame is
    // rotated a quarter turn; a doorway in a north-south wall is not.
    const alongX = isSolid(cell.col - 1, cell.row) && isSolid(cell.col + 1, cell.row);
    const span = CELL - 0.12;
    const frame = new THREE.Group();
    const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.42, span + 0.34)), doorMat);
    lintel.position.y = wallH - 0.21;
    frame.add(lintel);
    const jambGeo = track(new THREE.BoxGeometry(0.5, wallH, 0.24));
    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(jambGeo, doorMat);
      jamb.position.set(0, wallH / 2, (side * span) / 2);
      jamb.castShadow = quality.shadows;
      frame.add(jamb);
    }
    // two panels, propped open enough to squeeze through
    const panelGeo = track(new THREE.BoxGeometry(0.09, 2.42, span * 0.42));
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(panelGeo, doorMat);
      panel.position.set(0.14, 1.23, (side * (span - span * 0.42)) / 2 - side * 0.06);
      panel.castShadow = quality.shadows;
      frame.add(panel);
    }
    frame.position.set(x, 0, z);
    if (alongX) frame.rotation.y = Math.PI / 2;
    group.add(frame);
  }

  // Map-specific dressing
  if (mapId === 'sewers') {
    buildSewerProps({
      group,
      colliders,
      track,
      quality,
      rng,
      cellToWorld,
      isSolid,
      beds: parts.beds,
      trolleys: parts.trolleys,
      wallH,
    });
  } else if (mapId === 'archive') {
    buildArchiveProps({
      group,
      colliders,
      track,
      quality,
      rng,
      cellToWorld,
      isSolid,
      beds: parts.beds,
      trolleys: parts.trolleys,
      wallH,
    });
  } else {
    buildWardProps({
      group,
      colliders,
      track,
      quality,
      rng,
      cellToWorld,
      isSolid,
      beds: parts.beds,
      trolleys: parts.trolleys,
    });
  }

  /* ------------------------------- fixtures ------------------------------- */

  // Only the first few fixtures are lit per quality tier; the rest stay dim and
  // stable, which gives the lit ones contrast. Each lit fixture runs its own
  // state machine (see stepFixture), so none of them synchronise.
  const flickerLights = [];
  const fixtureLimit = Math.min(parts.fixtures.length, quality.maxFlickerLights);
  parts.fixtures.forEach((cell, i) => {
    const { x, z } = cellToWorld(cell.col, cell.row);
    const active = i < fixtureLimit;
    const fixtureColor = theme.fixtureColor ?? 0xbcd6ea;
    const fixtureEmissive = theme.fixtureEmissive ?? 0x9fc4e0;
    const fixtureDist = theme.fixtureDistance ?? (wallH > 4.0 ? 22 : 15);
    const fixtureIntensity = theme.fixtureIntensity ?? 7;

    const emissiveMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1b1e21,
        emissive: fixtureEmissive,
        emissiveIntensity: 1.4,
        roughness: 0.4,
        metalness: 0.2,
      })
    );
    const housing = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.14, 0.5)), emissiveMat);
    housing.position.set(x, wallH - 0.12, z);
    housing.rotation.y = isSolid(cell.col, cell.row - 1) || isSolid(cell.col, cell.row + 1) ? 0 : Math.PI / 2;
    group.add(housing);

    const light = new THREE.PointLight(fixtureColor, active ? fixtureIntensity : 0, fixtureDist, 1.7);
    light.position.set(x, wallH - 0.4, z);
    light.castShadow = false;
    group.add(light);
    if (!active) {
      light.visible = false;
      emissiveMat.emissiveIntensity = 0.05;
    }
    flickerLights.push({
      light,
      material: emissiveMat,
      x,
      z,
      base: 7,
      active,
      trim: randBetween(0.86, 1.08),
      phase: Math.random() * Math.PI * 2,
      level: 1,
      mode: 'steady',
      duration: 0,
      until: Infinity,
      rate: 0,
      next: randBetween(2, 9),
      queued: null,
      lastCue: -Infinity,
    });
  });

  /* ------------------------ red emergency fixtures ------------------------ */

  // Wall-mounted red warning lights on doorways and junctions. A fixed seed keeps
  // the layout identical every run. Fixture styles cycle steady / irregular /
  // pulse / steady, so the first lit ones include both steady and irregular.
  const emergencyRng = mulberry32(20261017);
  const redLights = [];
  const redStyles = ['steady', 'irregular', 'pulse', 'steady'];
  const redSpots = pickEmergencySpots(parts.doors, parts.exitCells, LIGHTING.redFixtures, emergencyRng);
  redSpots.forEach((spot, i) => {
    const { x, z } = cellToWorld(spot.col, spot.row);
    const active = i < quality.maxRedLights;
    const rotationY = isSolid(spot.col, spot.row - 1) || isSolid(spot.col, spot.row + 1) ? 0 : Math.PI / 2;
    const redMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1a0406,
        emissive: LIGHTING.redColor,
        emissiveIntensity: 1,
        roughness: 0.5,
        metalness: 0.1,
      })
    );
    const housing = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.16, 0.4)), redMat);
    housing.position.set(x, wallH - 0.55, z);
    housing.rotation.y = rotationY;
    const cage = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 0.05, 0.48)), metalMat);
    cage.position.set(x, wallH - 0.65, z);
    cage.rotation.y = rotationY;
    const light = new THREE.PointLight(
      LIGHTING.redColor,
      active ? LIGHTING.redIntensity : 0,
      LIGHTING.redDistance,
      LIGHTING.redDecay
    );
    light.position.set(x, wallH - 0.75, z);
    light.castShadow = false;
    light.visible = active;
    housing.visible = active;
    cage.visible = active;
    group.add(housing, cage, light);
    redLights.push({
      light,
      material: redMat,
      housing,
      cage,
      x,
      z,
      active,
      style: redStyles[i % redStyles.length],
      phase: Math.random() * Math.PI * 2,
      level: 1,
      event: null,
    });
  });

  /* --------------------------------- dust --------------------------------- */

  const dustCount = Math.max(40, quality.dustCount);
  const dustPositions = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  const dustSeed = mulberry32(4711);
  for (let i = 0; i < dustCount; i += 1) {
    dustPositions[i * 3] = (dustSeed() - 0.5) * 12;
    dustPositions[i * 3 + 1] = 0.2 + dustSeed() * (wallH - 0.6);
    dustPositions[i * 3 + 2] = (dustSeed() - 0.5) * 12;
    dustBase[i * 3] = dustSeed() * Math.PI * 2;
    dustBase[i * 3 + 1] = 0.1 + dustSeed() * 0.4;
    dustBase[i * 3 + 2] = 0.05 + dustSeed() * 0.25;
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = track(
    new THREE.PointsMaterial({
      size: 0.055,
      map: TEX.dustTexture(),
      color: 0xc3d6e4,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    })
  );
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.name = 'dust';
  group.add(dust);

  /* ---------------------------- maintenance key -------------------------- */

  // One key is hidden per run by placeKey(). It is small and its light is dim,
  // so it has to be searched for. Desks and cabinets share one prop that is moved.
  const keyGroup = new THREE.Group();
  keyGroup.name = 'key';
  keyGroup.visible = false;
  const keyMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4a3a18,
      emissive: 0xffc46b,
      emissiveIntensity: 0.9,
      roughness: 0.35,
      metalness: 0.7,
    })
  );
  const keyMesh = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.34, 0.05)), keyMat);
  keyMesh.rotation.z = 0.3;
  const keyBow = new THREE.Mesh(track(new THREE.TorusGeometry(0.09, 0.025, 8, 16)), keyMat);
  keyBow.position.set(0.04, 0.2, 0);
  keyBow.rotation.y = Math.PI / 2;
  keyMesh.add(keyBow);
  const keyLight = new THREE.PointLight(0xffc46b, 0.9, 2.4, 2);
  const keyProp = new THREE.Mesh(boxGeo, lockerMat);
  keyProp.castShadow = quality.shadows;
  keyProp.receiveShadow = quality.shadows;
  keyProp.visible = false;
  keyGroup.add(keyMesh, keyLight, keyProp);
  group.add(keyGroup);

  // Collision box for a solid piece of furniture; parked far away until placed.
  const keyCollider = { minX: FAR_AWAY, maxX: FAR_AWAY, minZ: FAR_AWAY, maxZ: FAR_AWAY };
  colliders.push(keyCollider);
  const keyAnchor = new THREE.Vector3();
  const keyState = { restY: 0.2 };

  /** Put the key (and any furniture it rests on) on an authored spot. */
  function placeKey(spot) {
    const { x, z } = cellToWorld(spot.col, spot.row);
    const furniture = KEY_FURNITURE[spot.style] || null;
    const top = furniture ? furniture.top : 0;
    const restY = top + 0.2;
    keyProp.visible = Boolean(furniture);
    if (furniture) {
      const [sx, sy, sz] = furniture.size;
      keyProp.scale.set(sx, sy, sz);
      keyProp.position.set(x, top - sy / 2, z);
    }
    const solid = Boolean(furniture && furniture.solid);
    const hx = furniture ? furniture.size[0] / 2 : 0;
    const hz = furniture ? furniture.size[2] / 2 : 0;
    keyCollider.minX = solid ? x - hx : FAR_AWAY;
    keyCollider.maxX = solid ? x + hx : FAR_AWAY;
    keyCollider.minZ = solid ? z - hz : FAR_AWAY;
    keyCollider.maxZ = solid ? z + hz : FAR_AWAY;
    keyMesh.position.set(x, restY, z);
    keyLight.position.set(x, restY + 0.45, z);
    keyAnchor.set(x, restY, z);
    keyState.restY = restY;
  }

  /* ------------------------------ blast door ------------------------------ */

  const exitDoor = buildBlastDoor(group, parts.exitCells, track, quality, wallH);

  /* -------------------------------- lighting ------------------------------ */

  const ambient = new THREE.AmbientLight(theme.ambientColor ?? 0x384a5c, theme.ambientIntensity ?? 0.75);
  const hemi = new THREE.HemisphereLight(
    theme.hemiSky ?? 0x283848,
    theme.hemiGround ?? 0x10161e,
    theme.hemiIntensity ?? 0.65
  );
  group.add(ambient, hemi);

  group.traverse((child) => {
    if (child.isMesh && child.material && child.material.isMeshStandardMaterial) {
      child.material.fog = true;
    }
  });

  scene.add(group);

  /* ------------------------------- behaviour ------------------------------ */

  let elapsed = 0;
  const dustAttr = dustGeo.getAttribute('position');
  let audioSink = null;
  let listener = null;
  let soundGap = 0;
  let nextGroupOutage = randBetween(...LIGHTING.groupOutageInterval);
  let nextEmergency = randBetween(...LIGHTING.emergencyInterval);
  const rightAxis = new THREE.Vector3();

  /*
    Spatial sound for a fixture. Plays through the audio engine with stereo pan
    from the listener's view and volume that falls off with distance. Rate-limited
    per fixture and globally so the buzz/crackle never repeats too often.
  */
  function cue(entry, kind) {
    if (!audioSink || !listener || soundGap > 0) return;
    if (elapsed - entry.lastCue < LIGHTING.soundRepeat) return;
    const dx = entry.x - listener.position.x;
    const dz = entry.z - listener.position.z;
    const dist = Math.hypot(dx, dz);
    const strength = 1 - dist / LIGHTING.soundRange;
    if (strength <= 0) return;
    rightAxis.set(1, 0, 0).applyQuaternion(listener.quaternion);
    const pan = clamp((dx * rightAxis.x + dz * rightAxis.z) / Math.max(dist, 0.001), -1, 1);
    entry.lastCue = elapsed;
    soundGap = LIGHTING.soundGap;
    if (kind === 'buzz') audioSink.fixtureBuzz(strength, pan);
    else audioSink.fixtureCrackle(strength, pan);
  }

  /* A few neighbouring white fixtures fail briefly, then recover. */
  function triggerGroupOutage(t) {
    const lit = flickerLights.filter((e) => e.active && !e.queued && e.mode !== 'off');
    if (lit.length < 2) return;
    const seed = lit[Math.floor(Math.random() * lit.length)];
    lit.sort((a, b) => Math.hypot(a.x - seed.x, a.z - seed.z) - Math.hypot(b.x - seed.x, b.z - seed.z));
    const count = Math.min(lit.length, Math.random() < 0.5 ? 2 : 3);
    lit.slice(0, count).forEach((entry, i) => {
      entry.queued = { at: t + i * randBetween(0.05, 0.25), mode: 'off', duration: randBetween(0.6, 1.4) };
    });
  }

  /* Rare localised event: one red light surges and nearby whites stutter. */
  function triggerEmergency(t) {
    const reds = redLights.filter((r) => r.active);
    if (reds.length === 0) return false;
    const red = reds[Math.floor(Math.random() * reds.length)];
    const duration = randBetween(LIGHTING.emergencyDuration[0], LIGHTING.emergencyDuration[1]);
    const near = (e) => Math.hypot(e.x - red.x, e.z - red.z) <= LIGHTING.emergencyRadius;
    for (const r of reds) {
      if (near(r)) r.event = { from: t, until: t + duration };
    }
    for (const f of flickerLights) {
      if (f.active && near(f)) f.queued = { at: t, mode: 'buzz', duration };
    }
    cue(red, 'crackle');
    return true;
  }

  function applyQuality(tier) {
    flickerLights.forEach((entry, index) => {
      entry.active = index < tier.maxFlickerLights;
      entry.light.visible = entry.active;
      entry.light.intensity = entry.active ? entry.base * entry.trim * entry.level : 0;
      entry.queued = null;
      if (entry.active) enterSteady(entry, elapsed);
      else entry.material.emissiveIntensity = 0.05;
    });
    redLights.forEach((red, index) => {
      red.active = index < tier.maxRedLights;
      red.light.visible = red.active;
      red.light.intensity = red.active ? LIGHTING.redIntensity * red.level : 0;
      red.housing.visible = red.active;
      red.cage.visible = red.active;
      red.event = null;
    });
  }

  function setAudio(audio) {
    audioSink = audio || null;
  }

  function update(dt, cameraPosition, camera) {
    elapsed += dt;
    const t = elapsed;
    listener = camera || null;
    soundGap = Math.max(0, soundGap - dt);

    if (t >= nextGroupOutage) {
      triggerGroupOutage(t);
      nextGroupOutage = t + randBetween(LIGHTING.groupOutageInterval[0], LIGHTING.groupOutageInterval[1]);
    }
    if (t >= nextEmergency) {
      nextEmergency = triggerEmergency(t)
        ? t + randBetween(LIGHTING.emergencyInterval[0], LIGHTING.emergencyInterval[1])
        : t + 15;
    }

    for (const entry of flickerLights) {
      if (!entry.active) continue;
      stepFixture(entry, t, flickerLights, cue);
      const target = fixtureFactor(entry, t);
      entry.level += (target - entry.level) * Math.min(1, dt * 22);
      entry.light.intensity = entry.base * entry.trim * entry.level;
      entry.material.emissiveIntensity = 0.2 + 2.2 * entry.level;
    }

    for (const red of redLights) {
      if (!red.active) continue;
      const target = redFactor(red, t) + envelopeAt(red.event, t) * 0.9;
      red.level += (target - red.level) * Math.min(1, dt * 8);
      red.light.intensity = LIGHTING.redIntensity * red.level;
      red.material.emissiveIntensity = 0.6 + 1.6 * red.level;
    }

    if (cameraPosition) {
      const array = dustAttr.array;
      for (let i = 0; i < dustCount; i += 1) {
        const i3 = i * 3;
        array[i3] += Math.sin(elapsed * dustBase[i3 + 1] + dustBase[i3]) * 0.006;
        array[i3 + 1] += Math.cos(elapsed * dustBase[i3 + 2] + dustBase[i3]) * 0.004;
        array[i3 + 2] += Math.sin(elapsed * dustBase[i3 + 2] * 0.7 + dustBase[i3]) * 0.006;

        let dx = array[i3] - cameraPosition.x;
        let dy = array[i3 + 1] - cameraPosition.y;
        let dz = array[i3 + 2] - cameraPosition.z;
        if (dx > 6) array[i3] -= 12;
        else if (dx < -6) array[i3] += 12;
        if (dz > 6) array[i3 + 2] -= 12;
        else if (dz < -6) array[i3 + 2] += 12;
        if (dy > 3) array[i3 + 1] -= 4;
        else if (dy < -3) array[i3 + 1] += 4;
      }
      dustAttr.needsUpdate = true;
    }
  }

  function dispose() {
    scene.remove(group);
    group.traverse((child) => {
      if (child.isInstancedMesh || child.isMesh || child.isPoints) {
        if (child.geometry) child.geometry.dispose();
      }
    });
    for (const resource of disposables) {
      if (resource && typeof resource.dispose === 'function') resource.dispose();
    }
    disposables.length = 0;
  }

  /* ------------------ security room: CCTV console ----------------------
     The security room is the 3x3 block behind the door at cell (37, 15):
     inner walls at x 76.5 (west), z 16.5 (north), x 85.5 (east). The desk
     runs along the west wall with the monitors facing east, where the player
     stands. The console anchor sits at the desk front (see cctv.js). */
  const cctvGroup = new THREE.Group();
  cctvGroup.name = 'cctv-console';
  const deskMat = track(
    new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.7, metalness: 0.35 })
  );
  const plasticMat = track(
    new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.6, metalness: 0.2 })
  );
  const screenMat = track(new THREE.MeshBasicMaterial({ color: 0x0c4a52, toneMapped: false }));
  const paperMat = track(new THREE.MeshStandardMaterial({ color: 0x8e8c82, roughness: 0.95 }));
  const ledGreenMat = track(new THREE.MeshBasicMaterial({ color: 0x39ff9b, toneMapped: false }));
  const ledRedMat = track(new THREE.MeshBasicMaterial({ color: 0xff2a33, toneMapped: false }));
  const addPiece = (mat, w, h, d, x, y, z, shadow = quality.shadows) => {
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    cctvGroup.add(mesh);
    return mesh;
  };

  // Desk and its body (solid)
  addPiece(deskMat, 0.9, 0.05, 2.4, 77.1, 0.83, 21);
  addPiece(plasticMat, 0.8, 0.8, 2.2, 77.1, 0.43, 21);
  // Three monitors on the desk, screens facing east
  for (const z of [20.25, 21.0, 21.75]) {
    addPiece(plasticMat, 0.06, 0.1, 0.12, 76.85, 0.91, z, false);
    addPiece(plasticMat, 0.08, 0.42, 0.62, 76.85, 1.17, z);
    addPiece(screenMat, 0.02, 0.36, 0.54, 76.91, 1.17, z, false);
  }
  // Keyboard, loose paperwork and a row of status LEDs on the desk front
  addPiece(plasticMat, 0.2, 0.02, 0.6, 77.35, 0.865, 21, false);
  addPiece(paperMat, 0.22, 0.005, 0.3, 77.2, 0.86, 22.0, false);
  for (let i = 0; i < 5; i += 1) {
    addPiece(i % 2 ? ledRedMat : ledGreenMat, 0.02, 0.03, 0.04, 77.56, 0.84, 20.4 + i * 0.4, false);
  }
  // Chair pulled out from the desk, back to the east
  addPiece(plasticMat, 0.5, 0.08, 0.5, 78.9, 0.5, 22.6);
  addPiece(plasticMat, 0.07, 0.55, 0.5, 79.2, 0.8, 22.6);
  addPiece(plasticMat, 0.08, 0.46, 0.08, 78.9, 0.23, 22.6, false);
  // Wall monitors on the north wall, either side of the door frame
  for (const x of [78.0, 84.5]) {
    addPiece(plasticMat, 0.62, 0.42, 0.05, x, 2.0, 16.62, false);
    addPiece(screenMat, 0.52, 0.34, 0.02, x, 2.0, 16.68, false);
    addPiece(ledGreenMat, 0.03, 0.03, 0.02, x + 0.25, 1.78, 16.7, false);
  }
  // Abandoned details: a bin and scattered papers on the floor
  addPiece(lockerMat, 0.35, 0.5, 0.35, 84.8, 0.25, 17.5);
  addPiece(paperMat, 0.25, 0.005, 0.3, 80.4, 0.003, 18.9, false);
  addPiece(paperMat, 0.22, 0.005, 0.28, 80.9, 0.003, 19.2, false);
  group.add(cctvGroup);

  // Collision for the desk and the chair
  colliders.push({ minX: 76.65, maxX: 77.55, minZ: 19.8, maxZ: 22.2 });
  colliders.push({ minX: 78.65, maxX: 79.25, minZ: 22.35, maxZ: 22.85 });
  const cctvAnchor = new THREE.Vector3(77.6, 1.0, 21.0);

  return {
    mapConfig,
    maintenanceSpots: mapConfig.MAINTENANCE_SPOTS || MAINTENANCE_SPOTS,
    group,
    colliders,
    cctvConsole: { anchor: cctvAnchor },
    ambient,
    hemi,
    flickerLights,
    redLights,
    applyQuality,
    setAudio,
    keyGroup,
    keyMesh,
    keyLight,
    keyAnchor,
    keyState,
    placeKey,
    exitDoor,
    fields: { wallMat, floorMat, ceilMat, metalMat, rustMat, lockerMat, doorMat },
    startCell: parts.startCell,
    enemyCell: parts.enemyCell,
    exitCells: parts.exitCells,
    update,
    dispose,
  };
}

/* ---------------------------------------------------------------------------
   The exit: a two-leaf blast door seated in the recessed alcove of the
   generator room. Red while sealed, green once the key is used.
--------------------------------------------------------------------------- */

function buildBlastDoor(parent, cells, track, quality, wallH = WALL_H) {
  const doorGroup = new THREE.Group();
  doorGroup.name = 'exit-door';

  const sorted = [...cells].sort((a, b) => a.col - b.col);
  const first = sorted[0] || { col: 6, row: 4 };
  const last = sorted[sorted.length - 1] || first;
  const a = cellToWorld(first.col, first.row);
  const b = cellToWorld(last.col, last.row);
  const centerX = (a.x + b.x) / 2;
  const centerZ = a.z + CELL / 2; // room-facing side of the wall
  const opening = (Math.abs(b.x - a.x) + CELL) - 0.5;

  const surroundMat = track(
    new THREE.MeshStandardMaterial({
      map: TEX.plateTexture(),
      color: 0x4a5157,
      roughness: 0.55,
      metalness: 0.75,
    })
  );
  const leafMat = track(
    new THREE.MeshStandardMaterial({
      map: TEX.metalTexture(),
      color: 0x767d84,
      roughness: 0.48,
      metalness: 0.82,
    })
  );
  const stripMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x140506,
      emissive: 0xff2a33,
      emissiveIntensity: 2.4,
      roughness: 0.4,
    })
  );
  const glowMat = track(
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9 })
  );

  // Frame: lintel, sill and side jambs
  const frameMat = surroundMat;
  const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(opening + 0.7, 0.55, 0.5)), frameMat);
  lintel.position.set(centerX, 2.82, centerZ - 0.1);
  doorGroup.add(lintel);
  const sill = new THREE.Mesh(track(new THREE.BoxGeometry(opening + 0.7, 0.14, 0.5)), frameMat);
  sill.position.set(centerX, 0.07, centerZ - 0.1);
  doorGroup.add(sill);
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, wallH, 0.52)), frameMat);
    jamb.position.set(centerX + (side * (opening + 0.34)) / 2, wallH / 2, centerZ - 0.1);
    jamb.castShadow = quality.shadows;
    doorGroup.add(jamb);
  }

  // Two leaves
  const leafWidth = opening / 2;
  const leaves = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    const panel = new THREE.Mesh(
      track(new THREE.BoxGeometry(leafWidth, 2.7, 0.26)),
      leafMat
    );
    panel.position.set((side * leafWidth) / 2, 1.35, 0);
    panel.castShadow = quality.shadows;
    panel.receiveShadow = quality.shadows;
    leaf.add(panel);

    const rib = new THREE.Mesh(track(new THREE.BoxGeometry(leafWidth * 0.86, 0.12, 0.34)), surroundMat);
    rib.position.set((side * leafWidth) / 2, 1.9, 0.02);
    leaf.add(rib);

    const window = new THREE.Mesh(track(new THREE.BoxGeometry(leafWidth * 0.5, 0.42, 0.32)), surroundMat);
    window.position.set((side * leafWidth) / 2, 1.15, 0.02);
    leaf.add(window);

    leaf.position.set(centerX, 0, centerZ + 0.06);
    doorGroup.add(leaf);
    leaves.push({ group: leaf, side, offset: (side * leafWidth) / 2 });
  }

  // Status strip above the door + EXIT sign
  const strip = new THREE.Mesh(track(new THREE.BoxGeometry(opening * 0.9, 0.12, 0.12)), stripMat);
  strip.position.set(centerX, 3.02, centerZ + 0.16);
  doorGroup.add(strip);

  const signMat = track(
    new THREE.MeshBasicMaterial({ map: TEX.exitSignTexture('EXIT'), toneMapped: false })
  );
  const sign = new THREE.Mesh(track(new THREE.PlaneGeometry(1.5, 0.5)), signMat);
  sign.position.set(centerX, 2.45, centerZ + 0.2);
  doorGroup.add(sign);

  // An alcove behind the door: reads as the lift shaft once the leaves retract
  const shaftMat = track(
    new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.9, metalness: 0.1 })
  );
  const shaft = new THREE.Mesh(track(new THREE.BoxGeometry(opening - 0.2, 2.75, 0.3)), shaftMat);
  shaft.position.set(centerX, 1.38, centerZ - 1.6);
  doorGroup.add(shaft);

  const lightPlane = new THREE.Mesh(track(new THREE.PlaneGeometry(opening - 0.3, 2.6)), glowMat);
  lightPlane.position.set(centerX, 1.42, centerZ - 1.4);
  doorGroup.add(lightPlane);

  const doorLight = new THREE.PointLight(0xff2a33, 14, 14, 1.8);
  doorLight.position.set(centerX, 2.6, centerZ + 0.4);
  doorGroup.add(doorLight);

  const shaftLight = new THREE.PointLight(0xfff0d8, 0, 20, 1.6);
  shaftLight.position.set(centerX, 1.6, centerZ - 1.1);
  doorGroup.add(shaftLight);

  parent.add(doorGroup);

  let openAmount = 0;
  const state = {
    group: doorGroup,
    /** world position used for interaction + prompt checks */
    position: new THREE.Vector3(centerX, 1.6, centerZ),
    at: { col: (first.col + last.col) / 2, row: first.row },
    locked: true,
    opening,
  };

  state.setLocked = (locked) => {
    state.locked = locked;
    stripMat.emissive.setHex(locked ? 0xff2a33 : 0x39ff9b);
    stripMat.emissiveIntensity = locked ? 2.4 : 2.2;
    doorLight.color.setHex(locked ? 0xff2a33 : 0x4dffa8);
    doorLight.intensity = locked ? 14 : 11;
  };

  state.setOpen = (amount) => {
    openAmount = Math.max(0, Math.min(1, amount));
    for (const leaf of leaves) {
      leaf.group.position.x = centerX + leaf.side * (leafWidth / 2) * openAmount * 0.94;
    }
    glowMat.color.setRGB(1, 0.94, 0.82);
    glowMat.opacity = 0.9 * openAmount;
    shaftLight.intensity = 70 * openAmount;
  };

  state.getOpen = () => openAmount;

  return state;
}
