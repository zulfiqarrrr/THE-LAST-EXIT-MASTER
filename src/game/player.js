/* ==========================================================================
   THE LAST EXIT — player
   Camera look, circle-vs-grid collision, sprint stamina and the flashlight.
   Everything is delta-time based so behaviour is identical at 30, 60 or
   120 fps.
   ========================================================================== */

import * as THREE from 'three';
import { LOOK, PLAYER, TORCH, clamp, damp } from './config.js';
import { cellToWorld, isSolidAt } from './level.js';

const CIRCLE_SAMPLES = 8;

export class Player {
  constructor({ camera, scene, level, quality }) {
    this.camera = camera;
    this.scene = scene;
    this.level = level;
    this.quality = quality;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0;

    this.stamina = PLAYER.staminaMax;
    this.battery = TORCH.batteryMax;
    this.flashlightOn = true;

    this.speed = 0;
    this.isMoving = false;
    this.isSprinting = false;
    this.stepEvent = false;
    this.flashlightChanged = false;
    this.batteryDead = false;

    this._bobPhase = 0;
    this._stepDistance = 0;
    this._regenDelay = 0;
    this._sway = new THREE.Vector2();
    this._forward = new THREE.Vector3();
    this._tmp = new THREE.Vector3();

    this.camera.rotation.order = 'YXZ';
    this._buildFlashlight();
    scene.add(camera);
  }

  /* ------------------------------- flashlight ----------------------------- */

  _buildFlashlight() {
    // Intensities are physical (candela) in modern three.js, so these values
    // are tuned for a falloff of ~1/d^1.5 over a 30 metre cone.
    const torch = new THREE.SpotLight(
      0xfff0cf,
      TORCH.intensity,
      TORCH.distance,
      TORCH.angle,
      TORCH.penumbra,
      TORCH.decay
    );
    torch.position.set(0.14, -0.16, 0.05);
    torch.castShadow = this.quality.shadows;
    if (this.quality.shadows) {
      torch.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
      torch.shadow.camera.near = 0.4;
      torch.shadow.camera.far = TORCH.distance;
      torch.shadow.bias = -0.0016;
    }
    const target = new THREE.Object3D();
    target.position.set(0, 0, -1);
    this.camera.add(torch, target);
    torch.target = target;
    this.torch = torch;

    // A weak fill light so the player is never completely blind with the
    // flashlight off (and mobile devices stay readable).
    const fill = new THREE.PointLight(0x9fb3c6, 2.2, 7, 2);
    fill.position.set(0, 0.1, 0);
    this.camera.add(fill);
    this.fillLight = fill;
  }

  setShadows(enabled) {
    if (!this.torch) return;
    this.torch.castShadow = enabled && this.quality.shadows;
  }

  /* --------------------------------- state -------------------------------- */

  reset(cell) {
    const { x, z } = cellToWorld(cell.col, cell.row);
    this.position.set(x, 0, z);
    this.velocity.set(0, 0);
    this.yaw = Math.PI; // face south, towards the room's far wall
    this.pitch = 0;
    this.stamina = PLAYER.staminaMax;
    this.battery = TORCH.batteryMax;
    this.flashlightOn = true;
    this._bobPhase = 0;
    this._stepDistance = 0;
    this._regenDelay = 0;
    this._sway.set(0, 0);
    this.batteryDead = false;
    this.torch.intensity = TORCH.intensity;
    this.camera.rotation.set(0, this.yaw, 0, 'YXZ');
    this._applyCamera(0);
  }

  /** QA/accessibility helper: jump straight to a map cell. */
  teleport(col, row) {
    const { x, z } = cellToWorld(col, row);
    this.position.set(x, 0, z);
    this.velocity.set(0, 0);
    this._applyCamera(0);
  }

  faceAngle(radians) {
    this.yaw = radians;
  }

  /* --------------------------------- look --------------------------------- */

  look(pixelsX, pixelsY) {
    this.yaw -= pixelsX * LOOK.mouseSensitivity;
    this.pitch = clamp(this.pitch - pixelsY * LOOK.mouseSensitivity, -LOOK.maxPitch, LOOK.maxPitch);
  }

  /** Forward direction on the XZ plane. */
  getForward(out = this._forward) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /** True when the view is roughly pointing at a world position. */
  isLookingAt(target, minDot = 0.5) {
    const toTarget = this._tmp.copy(target).sub(this.camera.position);
    const distance = toTarget.length();
    if (distance < 0.001) return true;
    toTarget.normalize();
    const forward = this.getForward().normalize();
    return forward.dot(toTarget) >= minDot;
  }

  /* -------------------------------- update -------------------------------- */

  update(dt, controls) {
    this.stepEvent = false;
    this.flashlightChanged = false;

    const look = controls.consumeLook();
    if (look.x || look.y) this.look(look.x, look.y);

    // ---- desired movement in camera space
    let inputX = controls.moveX;
    let inputY = controls.moveY;
    const magnitude = Math.hypot(inputX, inputY);
    if (magnitude > 1) {
      inputX /= magnitude;
      inputY /= magnitude;
    }

    const wantsSprint = controls.sprint && magnitude > 0.15;
    const canSprint = this.stamina > 1;
    this.isSprinting = wantsSprint && canSprint;
    const targetSpeed = this.isSprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    const wishX = rightX * inputX + forwardX * inputY;
    const wishZ = rightZ * inputX + forwardZ * inputY;

    this.velocity.x = damp(this.velocity.x, wishX * targetSpeed, PLAYER.acceleration, dt);
    this.velocity.y = damp(this.velocity.y, wishZ * targetSpeed, PLAYER.acceleration, dt);

    // ---- collision: move on each axis separately so the player slides
    const nextX = this.position.x + this.velocity.x * dt;
    if (!this._blocked(nextX, this.position.z)) this.position.x = nextX;
    else this.velocity.x = 0;

    const nextZ = this.position.z + this.velocity.y * dt;
    if (!this._blocked(this.position.x, nextZ)) this.position.z = nextZ;
    else this.velocity.y = 0;

    this.speed = Math.hypot(this.velocity.x, this.velocity.y);
    this.isMoving = this.speed > 0.12;

    // ---- stamina
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - PLAYER.staminaDrain * dt);
      this._regenDelay = PLAYER.staminaRegenDelay;
    } else {
      this._regenDelay = Math.max(0, this._regenDelay - dt);
      if (this._regenDelay === 0 && this.stamina < PLAYER.staminaMax) {
        this.stamina = Math.min(PLAYER.staminaMax, this.stamina + PLAYER.staminaRegen * dt);
      }
    }

    // ---- flashlight battery
    if (this.flashlightOn) {
      this.battery = Math.max(0, this.battery - TORCH.drain * dt);
      if (this.battery <= 0) {
        this.flashlightOn = false;
        this.flashlightChanged = true;
        this.batteryDead = true;
      }
    } else if (this.battery < TORCH.batteryMax) {
      this.battery = Math.min(TORCH.batteryMax, this.battery + TORCH.regen * dt);
    }
    this.torch.intensity = this.flashlightOn ? TORCH.intensity : 0;

    // ---- head bob + footstep cadence
    const bobStrength = Math.min(1, this.speed / PLAYER.sprintSpeed);
    this._bobPhase += dt * PLAYER.bobSpeed * (0.5 + bobStrength * (this.isSprinting ? 1.5 : 1));
    this._stepDistance += this.speed * dt;
    const stepLength = this.isSprinting ? 1.75 : 2.15;
    if (this._stepDistance >= stepLength) {
      this._stepDistance = 0;
      this.stepEvent = true;
    }

    // ---- torch sway lagging behind the body
    this._sway.x = damp(this._sway.x, this.velocity.x * 0.012, 6, dt);
    this._sway.y = damp(this._sway.y, this.velocity.y * 0.012, 6, dt);
    this.torch.position.x = 0.14 + this._sway.x;
    this.torch.position.z = 0.05 + this._sway.y;

    this._applyCamera(bobStrength);
  }

  _applyCamera(bobStrength) {
    const bob = Math.sin(this._bobPhase) * PLAYER.bobAmount * bobStrength;
    const roll = Math.cos(this._bobPhase * 0.5) * 0.012 * bobStrength;
    this.camera.position.set(this.position.x, PLAYER.eyeHeight + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, roll, 'YXZ');
  }

  toggleFlashlight(force) {
    const next = typeof force === 'boolean' ? force : !this.flashlightOn;
    if (next === this.flashlightOn) return false;
    if (next && this.battery <= 0.5) return false;
    this.flashlightOn = next;
    this.flashlightChanged = true;
    return true;
  }

  /* ------------------------------- collision ------------------------------ */

  _blocked(x, z) {
    const r = PLAYER.radius;
    if (isSolidAt(x, z)) return true;
    for (let i = 0; i < CIRCLE_SAMPLES; i += 1) {
      const angle = (i / CIRCLE_SAMPLES) * Math.PI * 2;
      if (isSolidAt(x + Math.cos(angle) * r, z + Math.sin(angle) * r)) return true;
    }
    const colliders = this.level.colliders;
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    return false;
  }

  /** Normalised stamina / battery for the HUD. */
  get staminaRatio() {
    return this.stamina / PLAYER.staminaMax;
  }

  get batteryRatio() {
    return this.battery / TORCH.batteryMax;
  }
}

export { cellToWorld };
