/* ==========================================================================
   THE LAST EXIT — the world LUMEN MAINTENANCE KEY
   A small brass key with a cyan maintenance tag, hovering on a walkable cell
   of the facility until the player picks it up. Its halo is a single sprite
   reused every frame, so it adds no light source and no per-frame allocation.
   The halo fades out completely beyond clueRange, brightening as the player
   nears, and a faint ping sounds only inside pingRange (via onPing).
   ========================================================================== */

import * as THREE from 'three';
import { LUMEN_KEY } from './config.js';
import { cellToWorld } from './level.js';

const HALO_SIZE = 256;

/** Soft radial gradient used as the cyan halo; drawn once. */
function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = HALO_SIZE;
  canvas.height = HALO_SIZE;
  const ctx = canvas.getContext('2d');
  const half = HALO_SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(160, 240, 255, 1)');
  gradient.addColorStop(0.35, 'rgba(63, 216, 255, 0.45)');
  gradient.addColorStop(1, 'rgba(63, 216, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class LumenKey {
  constructor(scene, { onPing = null } = {}) {
    this.scene = scene;
    this.onPing = onPing;
    this._pingTimer = 0;
    this.group = new THREE.Group();
    this.group.name = 'lumen-key';
    this.group.visible = false;

    const brass = new THREE.MeshStandardMaterial({
      color: 0x8a6d3b,
      roughness: 0.35,
      metalness: 0.8,
    });
    const tag = new THREE.MeshStandardMaterial({
      color: 0x0d1d24,
      emissive: LUMEN_KEY.color,
      emissiveIntensity: 1.1,
      roughness: 0.5,
    });
    this._materials = [brass, tag];

    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16), brass);
    bow.position.y = 0.2;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.32, 0.02), brass);
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), brass);
    teeth.position.set(0.03, -0.14, 0);
    const maintenanceTag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.015), tag);
    maintenanceTag.position.set(0, 0.04, 0.01);
    this._geometries = [bow.geometry, shaft.geometry, teeth.geometry, maintenanceTag.geometry];
    this.group.add(bow, shaft, teeth, maintenanceTag);

    this._haloTexture = haloTexture();
    this._haloMaterial = new THREE.SpriteMaterial({
      map: this._haloTexture,
      color: LUMEN_KEY.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Sprite(this._haloMaterial);
    halo.scale.setScalar(LUMEN_KEY.glowDistance);
    this.group.add(halo);

    this._spin = 0;
    this._time = 0;
    scene.add(this.group);
  }

  /** The key's world position, read by the interaction test. */
  get position() {
    return this.group.position;
  }

  get visible() {
    return this.group.visible;
  }

  /** Put the key on a walkable cell and show it. */
  place(cell) {
    const { x, z } = cellToWorld(cell.col, cell.row);
    this._baseY = LUMEN_KEY.hoverY;
    this.group.position.set(x, this._baseY, z);
    this.group.visible = true;
    this._spin = 0;
    this._pingTimer = 0;
  }

  hide() {
    this.group.visible = false;
    this._haloMaterial.opacity = 0;
  }

  /**
   * Spin and bob the key, and brighten its halo as the player comes close.
   * Costs one distance check and a few assignments per frame.
   */
  update(dt, playerPosition) {
    if (!this.group.visible) return;
    this._time += dt;
    this._spin += dt * 1.1;
    this.group.rotation.y = this._spin;
    this.group.position.y = this._baseY + Math.sin(this._time * 1.6) * 0.05;

    const dx = playerPosition.x - this.group.position.x;
    const dz = playerPosition.z - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    const clue = Math.max(0, 1 - distance / LUMEN_KEY.clueRange);
    const pulse = 0.85 + Math.sin(this._time * 3) * 0.15;
    this._haloMaterial.opacity = LUMEN_KEY.glowIntensity * clue * pulse;

    // a faint chime, only audible when the player is close
    if (this.onPing && distance < LUMEN_KEY.pingRange) {
      this._pingTimer -= dt;
      if (this._pingTimer <= 0) {
        this._pingTimer = LUMEN_KEY.pingInterval * (0.5 + distance / LUMEN_KEY.pingRange);
        this.onPing(1 - distance / LUMEN_KEY.pingRange);
      }
    } else {
      this._pingTimer = 0;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    for (const geometry of this._geometries) geometry.dispose();
    for (const material of this._materials) material.dispose();
    this._haloMaterial.dispose();
    this._haloTexture.dispose();
  }
}
