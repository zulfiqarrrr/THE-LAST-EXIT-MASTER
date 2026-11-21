/* ==========================================================================
   THE LAST EXIT — hospital props for the ward and treatment rooms.
   Beds and medical trolleys are merged once and drawn with InstancedMesh, so
   a dozen beds cost only a couple of draw calls. Their footprints are solid
   tiles in the level grid (see level.js), which gives the player, the Warden's
   path-finding and line-of-sight the same answer. Loose pieces (wheelchairs,
   IV stands) get small AABB colliders. Curtains and ceiling units are
   decorative and have no collision.
   ========================================================================== */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WALL_H } from './config.js';

const COLOR = {
  metal: 0x9aa1a6,
  rust: 0x6b5a48,
  plastic: 0x2d3536,
  stain: 0x8f9a8c,
  sheet: 0xc4cbc0,
  blanket: 0x5d7079,
  pillow: 0xaeb3a8,
  screen: 0x0b1012,
  bag: 0xb9cfc6,
  unit: 0xc9cfd2,
  curtain: 0x6f8a8e,
};

/** Hand-placed decor (grid cells). Cells that turn out to be solid are skipped. */
export const WARD_DECOR = {
  wheelchairs: [
    { col: 33, row: 7 },
    { col: 24, row: 8 },
    { col: 22, row: 7 },
  ],
  ivStands: [
    { col: 25, row: 5 },
    { col: 31, row: 9 },
    { col: 29, row: 2 },
  ],
  ceilingUnits: [
    { col: 28, row: 8 },
    { col: 34, row: 4 },
  ],
};

const DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cylinder = (r, h, seg) => new THREE.CylinderGeometry(r, r, h, seg);

/** Bake a colour and transform into a geometry so parts can be merged. */
function part(geometry, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  geometry.rotateX(rx);
  geometry.rotateY(ry);
  geometry.rotateZ(rz);
  geometry.translate(x, y, z);
  const c = new THREE.Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Hospital bed, long axis along z, headboard at -z. Bedding is optional. */
function bedGeometry(withBedding) {
  const p = [part(box(1.0, 0.12, 2.1), COLOR.metal, 0, 0.42, 0)];
  for (const [x, z] of [
    [-0.44, -0.98],
    [0.44, -0.98],
    [-0.44, 0.98],
    [0.44, 0.98],
  ]) {
    p.push(part(box(0.05, 0.42, 0.05), COLOR.metal, x, 0.21, z));
    p.push(part(box(0.1, 0.08, 0.1), COLOR.plastic, x, 0.04, z));
  }
  for (const x of [-0.5, 0.5]) p.push(part(box(0.04, 0.3, 1.5), COLOR.metal, x, 0.7, 0.05));
  p.push(part(box(1.0, 0.7, 0.05), COLOR.metal, 0, 0.78, -1.05));
  p.push(part(box(1.0, 0.34, 0.05), COLOR.metal, 0, 0.6, 1.05));
  if (withBedding) {
    p.push(part(box(0.92, 0.14, 1.9), COLOR.stain, 0, 0.56, 0));
    p.push(part(box(0.95, 0.02, 1.2), COLOR.sheet, 0, 0.635, 0.3));
    p.push(part(box(0.95, 0.05, 0.5), COLOR.blanket, 0, 0.67, 0.85));
    p.push(part(box(0.6, 0.1, 0.34), COLOR.pillow, 0, 0.66, -0.74));
  }
  return mergeGeometries(p);
}

/** Medical trolley: cabinet, top, shelf, small monitor and four casters. */
function trolleyGeometry() {
  const p = [
    part(box(0.8, 0.7, 0.5), COLOR.metal, 0, 0.62, 0),
    part(box(0.86, 0.04, 0.56), COLOR.plastic, 0, 1.0, 0),
    part(box(0.7, 0.02, 0.4), COLOR.rust, 0, 0.45, 0),
    part(box(0.36, 0.26, 0.04), COLOR.screen, 0.1, 1.2, 0),
    part(box(0.04, 0.2, 0.04), COLOR.metal, 0.1, 1.1, 0),
  ];
  for (const [x, z] of [
    [-0.34, -0.2],
    [0.34, -0.2],
    [-0.34, 0.2],
    [0.34, 0.2],
  ]) {
    p.push(part(cylinder(0.035, 0.06, 6), COLOR.plastic, x, 0.03, z));
  }
  return mergeGeometries(p);
}

/** Wheelchair facing +z (footrest end). */
function wheelchairGeometry() {
  const p = [
    part(box(0.46, 0.05, 0.44), COLOR.plastic, 0, 0.5, 0),
    part(box(0.46, 0.5, 0.05), COLOR.plastic, 0, 0.8, -0.22),
    part(box(0.04, 0.04, 0.36), COLOR.metal, -0.25, 0.68, 0),
    part(box(0.04, 0.04, 0.36), COLOR.metal, 0.25, 0.68, 0),
    part(box(0.36, 0.02, 0.2), COLOR.metal, 0, 0.14, 0.34),
    part(box(0.04, 0.44, 0.04), COLOR.metal, -0.25, 0.27, -0.2),
    part(box(0.04, 0.44, 0.04), COLOR.metal, 0.25, 0.27, -0.2),
  ];
  for (const x of [-0.27, 0.27]) {
    p.push(part(cylinder(0.31, 0.04, 16), COLOR.plastic, x, 0.31, -0.05, 0, 0, Math.PI / 2));
  }
  for (const x of [-0.22, 0.22]) {
    p.push(part(cylinder(0.06, 0.04, 10), COLOR.plastic, x, 0.06, 0.32, 0, 0, Math.PI / 2));
  }
  return mergeGeometries(p);
}

/** Drip stand with a hanging bag. */
function ivGeometry() {
  return mergeGeometries([
    part(cylinder(0.22, 0.03, 12), COLOR.metal, 0, 0.02, 0),
    part(cylinder(0.012, 1.9, 6), COLOR.metal, 0, 0.97, 0),
    part(box(0.02, 0.02, 0.22), COLOR.metal, 0, 1.9, 0.1),
    part(box(0.12, 0.22, 0.03), COLOR.bag, 0, 1.6, 0.21),
  ]);
}

/** Ceiling-hung air-conditioning unit with a dark grille. */
function acGeometry() {
  return mergeGeometries([
    part(box(1.2, 0.32, 0.7), COLOR.unit, 0, 0, 0),
    part(box(1.0, 0.02, 0.5), COLOR.plastic, 0, -0.17, 0),
  ]);
}

/** A curtain panel hung from a rail: vertical folds, no collision. */
function curtainGeometry(width, height, seed) {
  const geo = new THREE.PlaneGeometry(width, height, 16, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = pos.getX(i) / width + 0.5;
    const wave = Math.sin(u * Math.PI * (4 + seed * 2)) * 0.05;
    pos.setZ(i, wave * (0.6 + 0.4 * Math.sin(u * 7 + seed)));
  }
  geo.computeVertexNormals();
  return geo;
}

/** Heading (rotation about Y) that points the headboard at the nearest solid neighbour. */
function bedHeading(cell, isSolid, rng) {
  const walls = DIRS.filter(([dc, dr]) => isSolid(cell.col + dc, cell.row + dr));
  if (walls.length) {
    const [dc, dr] = walls[Math.floor(rng() * walls.length)];
    return Math.atan2(-dc, -dr);
  }
  return rng() < 0.5 ? 0 : Math.PI / 2;
}

/**
 * Build the hospital props. Bed and trolley cells are solid tiles in the grid,
 * so only their visuals are created here; wheelchairs and IV stands get colliders.
 * @param {object} args
 * @param {THREE.Group} args.group parent group
 * @param {Array} args.colliders shared AABB list used by player and Warden
 * @param {Function} args.track registers a resource for disposal
 * @param {object} args.quality quality preset (shadows flag)
 * @param {Function} args.rng seeded random source
 * @param {Function} args.cellToWorld grid cell to world position
 * @param {Function} args.isSolid grid solidity test
 * @param {Array<{col:number,row:number}>} args.beds bed bay cells
 * @param {Array<{col:number,row:number}>} args.trolleys trolley cells
 */
export function buildWardProps({ group, colliders, track, quality, rng, cellToWorld, isSolid, beds, trolleys }) {
  const dummy = new THREE.Object3D();
  const propMat = track(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.3 })
  );
  const curtainMat = track(
    new THREE.MeshStandardMaterial({
      color: COLOR.curtain,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  const shadows = quality.shadows;

  /* ----------------------------- beds ----------------------------------- */

  // Every ninth bed has lost its bedding: an empty frame.
  const fullBeds = beds.filter((_, i) => i % 9 !== 4);
  const bareBeds = beds.filter((_, i) => i % 9 === 4);
  const bedPlacements = [];

  const placeBeds = (list, geometry, withBedding) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geometry, propMat, list.length);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    list.forEach((cell, i) => {
      const { x, z } = cellToWorld(cell.col, cell.row);
      const heading = bedHeading(cell, isSolid, rng);
      dummy.position.set(x + (rng() - 0.5) * 0.3, 0, z + (rng() - 0.5) * 0.3);
      dummy.rotation.set(0, heading + (rng() - 0.5) * 0.25, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // grime and fading vary per bed
      mesh.setColorAt(i, new THREE.Color().setScalar(0.7 + rng() * 0.3));
      if (withBedding) bedPlacements.push({ cell, x: dummy.position.x, z: dummy.position.z, heading: dummy.rotation.y });
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  };

  placeBeds(fullBeds, track(bedGeometry(true)), true);
  placeBeds(bareBeds, track(bedGeometry(false)), false);

  /* --------------------------- medical trolleys ------------------------- */

  if (trolleys.length) {
    const mesh = new THREE.InstancedMesh(track(trolleyGeometry()), propMat, trolleys.length);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    trolleys.forEach((cell, i) => {
      const { x, z } = cellToWorld(cell.col, cell.row);
      dummy.position.set(x + (rng() - 0.5) * 0.4, 0, z + (rng() - 0.5) * 0.4);
      dummy.rotation.set(0, Math.floor(rng() * 4) * (Math.PI / 2) + rng() * 0.2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color().setScalar(0.6 + rng() * 0.4));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }

  /* ------------------------ wheelchairs + IV stands ---------------------- */

  const wheelchairGeo = track(wheelchairGeometry());
  for (const spot of WARD_DECOR.wheelchairs) {
    if (isSolid(spot.col, spot.row)) continue;
    const { x, z } = cellToWorld(spot.col, spot.row);
    const chair = new THREE.Mesh(wheelchairGeo, propMat);
    const angle = rng() * Math.PI * 2;
    chair.position.set(x, 0, z);
    chair.rotation.y = angle;
    chair.castShadow = shadows;
    chair.receiveShadow = shadows;
    group.add(chair);
    colliders.push(boxCollider(x, z, 0.36, angle));
  }

  const ivGeo = track(ivGeometry());
  for (const spot of WARD_DECOR.ivStands) {
    if (isSolid(spot.col, spot.row)) continue;
    const { x, z } = cellToWorld(spot.col, spot.row);
    const stand = new THREE.Mesh(ivGeo, propMat);
    stand.position.set(x, 0, z);
    stand.rotation.y = rng() * Math.PI * 2;
    stand.castShadow = shadows;
    group.add(stand);
    colliders.push({ minX: x - 0.22, maxX: x + 0.22, minZ: z - 0.22, maxZ: z + 0.22 });
  }

  /* ------------------------------ curtains ------------------------------ */

  // Every third bed has a curtain on a ceiling rail, drawn to one side.
  const railGeo = track(box(0.03, 0.03, 1.9));
  bedPlacements.forEach((bed, i) => {
    if (i % 3 !== 0) return;
    const offset = 0.85;
    const cx = bed.x + offset * Math.cos(bed.heading);
    const cz = bed.z - offset * Math.sin(bed.heading);
    const rail = new THREE.Mesh(railGeo, propMat);
    rail.position.set(cx, 2.4, cz);
    rail.rotation.y = bed.heading;
    group.add(rail);

    // some curtains are drawn half way, some are torn short
    const height = i % 6 === 0 ? 1.3 : 2.1;
    const curtainGeo = track(curtainGeometry(1.9, height, rng() * 2));
    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(cx, 2.4 - height / 2 - 0.02, cz);
    curtain.rotation.y = bed.heading + Math.PI / 2;
    curtain.castShadow = false;
    curtain.receiveShadow = shadows;
    group.add(curtain);
  });

  /* ---------------------------- ceiling units --------------------------- */

  const acGeo = track(acGeometry());
  for (const spot of WARD_DECOR.ceilingUnits) {
    if (isSolid(spot.col, spot.row)) continue;
    const { x, z } = cellToWorld(spot.col, spot.row);
    const unit = new THREE.Mesh(acGeo, propMat);
    unit.position.set(x, WALL_H - 0.35, z);
    unit.rotation.y = Math.floor(rng() * 2) * (Math.PI / 2);
    unit.castShadow = shadows;
    group.add(unit);
  }
}

/** Axis-aligned collider for a footprint of half-size `half`, rotated by `angle`. */
function boxCollider(x, z, half, angle) {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const ex = half * (c + s);
  return { minX: x - ex, maxX: x + ex, minZ: z - ex, maxZ: z + ex };
}
