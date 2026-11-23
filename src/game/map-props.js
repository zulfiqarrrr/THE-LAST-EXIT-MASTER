/* ==========================================================================
   THE LAST EXIT — Map-specific props for Sewers and Archive
   Generates authentic thematic environmental dressing for Sublevel 7 and Sublevel 1.
   ========================================================================== */

import * as THREE from 'three';
import { CELL } from './config.js';

export function buildSewerProps({ group, colliders, track, quality, rng, cellToWorld, isSolid, beds, trolleys, wallH = 2.9 }) {
  // Sewers replace hospital beds/trolleys with massive sludge vats and drainage pump assemblies
  const vatMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x223528,
      roughness: 0.82,
      metalness: 0.45,
    })
  );

  const ironMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1a241e,
      roughness: 0.6,
      metalness: 0.7,
    })
  );

  const rustPipeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4a3224,
      roughness: 0.75,
      metalness: 0.5,
    })
  );

  const vatGeo = track(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 12));
  const dummy = new THREE.Object3D();

  // Build sludge vats at bed locations
  beds.forEach((cell) => {
    const { x, z } = cellToWorld(cell.col, cell.row);
    const vat = new THREE.Mesh(vatGeo, vatMat);
    vat.position.set(x, 0.8, z);
    vat.castShadow = quality.shadows;
    vat.receiveShadow = quality.shadows;
    group.add(vat);

    // Rim pipe
    const rimGeo = track(new THREE.TorusGeometry(1.12, 0.08, 6, 12));
    const rim = new THREE.Mesh(rimGeo, ironMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 1.6, z);
    group.add(rim);

    colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 1.1, maxZ: z + 1.1 });
  });

  // Build pump generators at trolley locations
  const pumpGeo = track(new THREE.BoxGeometry(1.6, 1.4, 1.2));
  trolleys.forEach((cell) => {
    const { x, z } = cellToWorld(cell.col, cell.row);
    const pump = new THREE.Mesh(pumpGeo, ironMat);
    pump.position.set(x, 0.7, z);
    pump.castShadow = quality.shadows;
    group.add(pump);

    // Overhead pipe
    const pipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.18, wallH, 8)), rustPipeMat);
    pipe.position.set(x + 0.4, wallH / 2, z);
    group.add(pipe);

    colliders.push({ minX: x - 0.8, maxX: x + 0.8, minZ: z - 0.6, maxZ: z + 0.6 });
  });
}

export function buildArchiveProps({ group, colliders, track, quality, rng, cellToWorld, isSolid, beds, trolleys, wallH = 3.8 }) {
  // Archive replaces beds/trolleys with towering library stacks and reading tables
  const shelfWoodMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3d281a,
      roughness: 0.88,
      metalness: 0.05,
    })
  );

  const bookMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x5a3424,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const deskMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x483222,
      roughness: 0.75,
      metalness: 0.1,
    })
  );

  // Towering book stack geometry: scales with archive wall height (up to 3.8m tall)
  const shelfHeight = Math.min(3.8, wallH * 0.76);
  const shelfGeo = track(new THREE.BoxGeometry(2.4, shelfHeight, 0.85));
  const bookRowGeo = track(new THREE.BoxGeometry(2.2, 0.35, 0.75));

  beds.forEach((cell) => {
    const { x, z } = cellToWorld(cell.col, cell.row);
    const shelf = new THREE.Mesh(shelfGeo, shelfWoodMat);
    shelf.position.set(x, shelfHeight / 2, z);
    shelf.castShadow = quality.shadows;
    shelf.receiveShadow = quality.shadows;
    group.add(shelf);

    // Colorful book rows
    const numRows = Math.floor(shelfHeight / 0.7);
    for (let r = 0; r < numRows; r++) {
      const books = new THREE.Mesh(bookRowGeo, bookMat);
      books.position.set(x, 0.4 + r * 0.65, z);
      group.add(books);
    }

    colliders.push({ minX: x - 1.2, maxX: x + 1.2, minZ: z - 0.45, maxZ: z + 0.45 });
  });

  // Reading tables at trolley locations
  const tableGeo = track(new THREE.BoxGeometry(1.8, 0.85, 1.2));
  trolleys.forEach((cell) => {
    const { x, z } = cellToWorld(cell.col, cell.row);
    const table = new THREE.Mesh(tableGeo, deskMat);
    table.position.set(x, 0.42, z);
    table.castShadow = quality.shadows;
    group.add(table);

    // Lamp on desk
    const lamp = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.18, 0.4, 6)), shelfWoodMat);
    lamp.position.set(x, 0.85 + 0.2, z);
    group.add(lamp);

    colliders.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.6, maxZ: z + 0.6 });
  });
}
