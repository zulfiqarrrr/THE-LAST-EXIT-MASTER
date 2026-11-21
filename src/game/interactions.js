/* ==========================================================================
   THE LAST EXIT — objectives & interaction
   Owns the maintenance key, the sealed blast door and every interaction
   prompt. Interaction uses a distance + view-cone test rather than a raycast
   so it behaves identically with a mouse, a keyboard or a thumb.
   ========================================================================== */

import { LUMEN_KEY } from './config.js';

const KEY_RANGE = 2.9;
const EXIT_RANGE = 4.2;
const KEY_DOT = 0.55;
const EXIT_DOT = 0.35;
// the security room CCTV console (see level.cctvConsole)
const CCTV_RANGE = 2.3;
const CCTV_DOT = 0.5;

export class Objectives {
  constructor({ level, hud, audio, camera, lumenKey, onEscape, onNotice, onLumenPickup, onCctv }) {
    this.level = level;
    this.hud = hud;
    this.audio = audio;
    this.camera = camera;
    this.lumenKey = lumenKey;
    this.onEscape = onEscape;
    this.onNotice = onNotice;
    this.onLumenPickup = onLumenPickup || (() => {});
    this.onCctv = onCctv || (() => {});
    this._cctvAnchor = level.cctvConsole ? level.cctvConsole.anchor : null;

    this.hasKey = false;
    this.exitUnlocked = false;
    // the maintenance key's resting point, updated in place by level.placeKey()
    this._keyWorld = level.keyAnchor;
    this._focus = null;
    this._pulse = 0;
    this._unlockAnim = 0;
    this.reset();
  }

  reset() {
    this.hasKey = false;
    this.exitUnlocked = false;
    this._focus = null;
    this._pulse = 0;
    this._unlockAnim = 0;
    this.level.keyGroup.visible = true;
    this.level.keyLight.intensity = 0.9;
    this.level.exitDoor.setLocked(true);
    this.level.exitDoor.setOpen(0);
    this.hud.setKey(false);
    this.hud.setObjective('Find the maintenance key', { flash: true });
  }

  /* ------------------------------- focus test ----------------------------- */

  _findFocus(player) {
    const camera = this.camera;

    // The LUMEN MAINTENANCE KEY is a separate world pickup. It is only offered
    // while it lies on the floor, so it cannot be taken twice.
    if (this.lumenKey && this.lumenKey.visible) {
      const key = this.lumenKey.position;
      const distance = Math.hypot(key.x - camera.position.x, key.z - camera.position.z);
      if (distance <= LUMEN_KEY.interactRange && player.isLookingAt(key, LUMEN_KEY.interactDot)) {
        return {
          kind: 'lumen',
          actionable: true,
          prompt: { text: 'PICK UP LUMEN KEY', kbd: 'E' },
        };
      }
    }

    if (!this.hasKey) {
      const distance = camera.position.distanceTo(
        this._keyWorld.clone().setY(camera.position.y)
      );
      if (
        distance <= KEY_RANGE &&
        player.isLookingAt(this._keyWorld, KEY_DOT) &&
        this.level.keyGroup.visible
      ) {
        return {
          kind: 'key',
          actionable: true,
          prompt: { text: 'Take the maintenance key', kbd: 'E' },
        };
      }
    }

    // The CCTV console in the security room. Range is measured on the floor
    // plane so the desk can be used from any height.
    if (this._cctvAnchor) {
      const anchor = this._cctvAnchor;
      const cctvDistance = Math.hypot(
        anchor.x - camera.position.x,
        anchor.z - camera.position.z
      );
      if (cctvDistance <= CCTV_RANGE && player.isLookingAt(anchor, CCTV_DOT)) {
        return {
          kind: 'cctv',
          actionable: true,
          prompt: { text: 'ACCESS CCTV', kbd: 'E' },
        };
      }
    }

    const door = this.level.exitDoor;
    const doorPoint = door.position;
    const doorDistance = camera.position.distanceTo(doorPoint.clone().setY(camera.position.y));
    if (
      doorDistance <= EXIT_RANGE &&
      player.isLookingAt(doorPoint, EXIT_DOT) &&
      door.getOpen() < 0.9
    ) {
      return this.exitUnlocked
        ? { kind: 'exit', actionable: true, prompt: { text: 'Open the blast door', kbd: 'E' } }
        : { kind: 'exit', actionable: false, prompt: { text: 'Sealed — maintenance key required' } };
    }

    return null;
  }

  /* --------------------------------- update ------------------------------- */

  update(dt, player) {
    // key idle animation
    if (!this.hasKey && this.level.keyGroup.visible) {
      this._pulse += dt;
      this.level.keyMesh.rotation.y += dt * 1.4;
      this.level.keyMesh.position.y = this.level.keyState.restY + Math.sin(this._pulse * 1.8) * 0.05;
      this.level.keyLight.intensity = 0.8 + Math.sin(this._pulse * 2.4) * 0.15;
    }

    // the leaves stay ajar once unlocked, then open fully during the escape
    if (this.exitUnlocked && this._unlockAnim < 1) {
      this._unlockAnim = Math.min(1, this._unlockAnim + dt * 0.55);
      this.level.exitDoor.setOpen(this._unlockAnim * 0.26);
    }

    const focus = this._findFocus(player);
    this._focus = focus;
    this.hud.setPrompt(focus ? focus.prompt : null, { ready: Boolean(focus && focus.actionable) });
    return focus;
  }

  /* -------------------------------- interact ------------------------------ */

  /** @returns {'key'|'lumen'|'escape'|'locked'|'none'} */
  interact(player) {
    const focus = this._focus || this._findFocus(player);
    if (!focus) return 'none';

    if (focus.kind === 'key') {
      this.collectKey();
      return 'key';
    }

    if (focus.kind === 'lumen') {
      this._focus = null;
      this.onLumenPickup();
      return 'lumen';
    }

    if (focus.kind === 'cctv') {
      this._focus = null;
      this.onCctv();
      return 'cctv';
    }

    if (focus.kind === 'exit') {
      if (!this.exitUnlocked) {
        this.audio.lockedBuzz();
        this.hud.showToast('The blast door is sealed — find the maintenance key');
        if (this.onNotice) this.onNotice('locked');
        return 'locked';
      }
      const door = this.level.exitDoor;
      door.setOpen(1);
      this.audio.doorSlide();
      if (this.onEscape) this.onEscape();
      return 'escape';
    }

    return 'none';
  }

  collectKey() {
    if (this.hasKey) return;
    this.hasKey = true;
    this.level.keyGroup.visible = false;
    this.level.keyLight.intensity = 0;
    this.hud.setKey(true);
    this.audio.pickup();
    this.hud.setObjective('Reach the blast door in the generator room', { flash: true });
    this.hud.showToast('Maintenance key acquired — the exit light is green');

    // unlock the blast door with a clunk
    this.exitUnlocked = true;
    this.level.exitDoor.setLocked(false);
    window.setTimeout(() => this.audio.unlock(), 420);
  }

  /** Level state used by the QA hooks and the menus. */
  get status() {
    return {
      hasKey: this.hasKey,
      exitUnlocked: this.exitUnlocked,
      doorOpen: this.level.exitDoor.getOpen(),
    };
  }

  dispose() {
    this._focus = null;
  }
}
