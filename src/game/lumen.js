/* ==========================================================================
   THE LAST EXIT — LUMEN SURGE
   A timed cyan burst centred on the player. One point light and one particle
   cloud are created at setup and reused. The light is never removed from the
   scene, only dimmed to zero, so the lit shader programs stay the same and no
   light is created or destroyed during play.

   The surge is gated by the LUMEN MAINTENANCE KEY. The player must carry the
   key, equip it, then activate. A surge lasts exactly LUMEN.duration seconds;
   when it runs out the key is used up and onExpire() lets the game place a
   new key elsewhere in the facility.

   The countdown is driven by the game's update() loop, so it stops whenever
   the loop stops (pause, kill sequence, finale, menu).
   ========================================================================== */

import * as THREE from 'three';
import { LUMEN } from './config.js';

const moveToward = (value, target, step) => {
  if (value < target) return Math.min(target, value + step);
  if (value > target) return Math.max(target, value - step);
  return value;
};

export class Lumen {
  constructor({ camera, scene, onExpire = () => {} }) {
    this.camera = camera;
    this.scene = scene;
    this.onExpire = onExpire;

    /** the LUMEN MAINTENANCE KEY is in the player's inventory */
    this.carried = false;
    /** the carried key is equipped and may start a surge */
    this.equipped = false;
    /** true while the 45 second surge is running */
    this.active = false;
    /** seconds left in the current surge */
    this.remaining = 0;
    /** full length, read by the HUD to draw its gauge */
    this.duration = LUMEN.duration;
    /** 0..1 brightness, eased toward 1 while active and toward 0 otherwise */
    this.strength = 0;
    this._time = 0;

    // Attached to the camera so it always lights the space around the eye,
    // like the torch, and reaches the walls and doors the player is facing.
    this.light = new THREE.PointLight(LUMEN.color, 0, LUMEN.distance, LUMEN.decay);
    this.camera.add(this.light);

    // A faint cloud of motes drifting around the player. Positions are written
    // into a buffer created here; nothing is allocated per frame.
    const count = LUMEN.particleCount;
    this._base = new Float32Array(count * 3);
    this._phase = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      // golden-angle spread keeps the motes even without random calls
      const angle = i * 2.39996;
      const radius = LUMEN.particleSpread * (0.25 + 0.75 * ((i * 0.618) % 1));
      this._base[i * 3] = Math.cos(angle) * radius;
      this._base[i * 3 + 1] = 0.25 + ((i * 0.37) % 1) * 2.1;
      this._base[i * 3 + 2] = Math.sin(angle) * radius;
      this._phase[i] = i * 1.7;
    }
    const geometry = new THREE.BufferGeometry();
    this._positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this._positions.array.set(this._base);
    geometry.setAttribute('position', this._positions);
    const material = new THREE.PointsMaterial({
      color: LUMEN.color,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geometry, material);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  /** The player has picked up the world key. Not equipped until they choose to. */
  pickUp() {
    if (this.active) return;
    this.carried = true;
    this.equipped = false;
  }

  /**
   * Equip or unequip the carried key. Refused while a surge is running, so the
   * key cannot be swapped out from under an active effect.
   * @returns {'equipped'|'unequipped'|'none'|'surge'}
   */
  toggleEquip() {
    if (this.active) return 'surge';
    if (!this.carried) return 'none';
    this.equipped = !this.equipped;
    return this.equipped ? 'equipped' : 'unequipped';
  }

  /**
   * Start the 45 second surge.
   * @returns {'started'|'active'|'missing'|'unequipped'}
   */
  activate() {
    if (this.active) return 'active';
    if (!this.carried) return 'missing';
    if (!this.equipped) return 'unequipped';
    this.active = true;
    this.remaining = LUMEN.duration;
    return 'started';
  }

  /**
   * Cut the surge and clear the key from the inventory. Used on death, victory,
   * restart and quitting, so nothing carries over from the previous run.
   */
  stop() {
    this.active = false;
    this.remaining = 0;
    this.carried = false;
    this.equipped = false;
    this.strength = 0;
    this._hide();
  }

  _hide() {
    this.light.intensity = 0;
    this.particles.material.opacity = 0;
  }

  /**
   * Advance the countdown and the light. `playerPosition` is the player's feet;
   * the motes follow it so the glow stays around the player as they walk.
   */
  update(dt, playerPosition) {
    if (this.active) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining <= 0) {
        // The key is used up: the light goes out at once and the game places a
        // new key somewhere else in the facility.
        this.active = false;
        this.carried = false;
        this.equipped = false;
        this.strength = 0;
        this._hide();
        this.onExpire();
        return;
      }
    }

    const target = this.active ? 1 : 0;
    const rate = this.active ? LUMEN.fadeIn : LUMEN.fadeOut;
    this.strength = moveToward(this.strength, target, dt / rate);

    const s = this.strength;
    if (s <= 0) {
      if (this.light.intensity !== 0) this._hide();
      return;
    }
    this._time += dt;
    const eased = s * s * (3 - 2 * s);
    const pulse = 1 + Math.sin(this._time * LUMEN.pulseRate) * LUMEN.pulseDepth * eased;
    this.light.intensity = LUMEN.intensity * eased * pulse;
    this.particles.material.opacity = 0.55 * eased;

    this.particles.position.copy(playerPosition);
    const array = this._positions.array;
    const t = this._time;
    for (let i = 0, n = this._phase.length; i < n; i += 1) {
      const phase = this._phase[i];
      const j = i * 3;
      array[j] = this._base[j] + Math.sin(t * 0.25 + phase) * 0.12;
      array[j + 1] = this._base[j + 1] + Math.sin(t * 0.6 + phase) * 0.1;
      array[j + 2] = this._base[j + 2] + Math.cos(t * 0.22 + phase) * 0.12;
    }
    this._positions.needsUpdate = true;
  }

  dispose() {
    this.camera.remove(this.light);
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}
