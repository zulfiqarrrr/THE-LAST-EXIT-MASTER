/* ==========================================================================
   THE LAST EXIT — input
   One neutral surface where keyboard, mouse (with or without the Pointer Lock
   API) and the on-screen thumb controls meet. The game loop only reads the
   fields on this object, so every control scheme behaves identically.
   ========================================================================== */

import { LOOK } from './config.js';

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

const isTypingTarget = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

export class Controls {
  constructor({ onPointerLockChange } = {}) {
    this.onPointerLockChange = onPointerLockChange || (() => {});

    // neutral state read by the game loop
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.lookX = 0;
    this.lookY = 0;

    // touch contributions
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprint = false;
    this.touchActive = false;
    // per-axis touch-look multipliers, 1 = LOOK.touchBase
    this.touchLookX = 1;
    this.touchLookY = 1;
    // desktop mouse sensitivity multiplier, 1 = LOOK.mouseSensitivity
    this.mouseSensitivity = 1;

    this.enabled = false;
    this.mapOpen = false;
    this.consoleOpen = false;
    this.keys = new Set();
    this.actions = new Set();
    this.canvas = null;
    this._dragging = false;
    this._dragPointer = null;
    this._lastMouseX = null;
    this._lastMouseY = null;
    this._keyboardLookActive = false;

    this._handlers = {
      keydown: (event) => this._onKeyDown(event),
      keyup: (event) => this._onKeyUp(event),
      blur: () => this.releaseAll(),
      mousedown: (event) => this._onMouseDown(event),
      mouseup: () => this._onMouseUp(),
      mousemove: (event) => this._onMouseMove(event),
      pointerlockchange: () => {
        this.lookX = 0;
        this.lookY = 0;
        this.onPointerLockChange(this.locked);
      },
      pointerlockerror: () => {
        this.onPointerLockChange(false, true);
      },
      contextmenu: (event) => {
        if (this.enabled) event.preventDefault();
      },
    };
  }

  /* ------------------------------- lifecycle ------------------------------ */

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', this._handlers.keydown);
    window.addEventListener('keyup', this._handlers.keyup);
    window.addEventListener('blur', this._handlers.blur);
    document.addEventListener('mousemove', this._handlers.mousemove);
    document.addEventListener('pointerlockchange', this._handlers.pointerlockchange);
    document.addEventListener('pointerlockerror', this._handlers.pointerlockerror);
    if (canvas) {
      canvas.addEventListener('mousedown', this._handlers.mousedown);
      canvas.addEventListener('contextmenu', this._handlers.contextmenu);
    }
    window.addEventListener('mouseup', this._handlers.mouseup);
  }

  detach() {
    window.removeEventListener('keydown', this._handlers.keydown);
    window.removeEventListener('keyup', this._handlers.keyup);
    window.removeEventListener('blur', this._handlers.blur);
    document.removeEventListener('mousemove', this._handlers.mousemove);
    document.removeEventListener('pointerlockchange', this._handlers.pointerlockchange);
    document.removeEventListener('pointerlockerror', this._handlers.pointerlockerror);
    window.removeEventListener('mouseup', this._handlers.mouseup);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this._handlers.mousedown);
      this.canvas.removeEventListener('contextmenu', this._handlers.contextmenu);
    }
    this.releaseAll();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.releaseAll();
  }

  /** While the facility map is open, look and drag input are ignored so the view cannot turn. */
  setMapOpen(open) {
    this.mapOpen = open;
    this.releaseAll();
  }

  /** While the CCTV console is open, movement and look are ignored; only console keys act. */
  setConsoleOpen(open) {
    this.consoleOpen = open;
    this.releaseAll();
  }

  releaseAll() {
    this.keys.clear();
    this.actions.clear();
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.lookX = 0;
    this.lookY = 0;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprint = false;
    this._dragging = false;
    this._lastMouseX = null;
    this._lastMouseY = null;
    this._keyboardLookActive = false;
  }

  /* -------------------------------- keyboard ------------------------------ */

  _onKeyDown(event) {
    if (isTypingTarget(event.target)) return;
    const code = event.code;

    if (!this.enabled) return;
    // Swallow the keys we own so the page never scrolls mid-chase.
    if (MOVE_KEYS.has(code)) event.preventDefault();

    // CCTV console: its own keys only, never movement, and no auto-repeat
    if (this.consoleOpen) {
      if (!event.repeat) {
        if (code === 'Escape' || code === 'KeyP') this.actions.add('pause');
        else if (code === 'KeyE') this.actions.add('interact');
        else if (code === 'ArrowRight' || code === 'KeyD') this.actions.add('cctvNext');
        else if (code === 'ArrowLeft' || code === 'KeyA') this.actions.add('cctvPrev');
        else if (/^Digit[1-9]$/.test(code)) this.actions.add(`cctvSelect${code.slice(5)}`);
      }
      return;
    }

    this.keys.add(code);

    if (code === 'KeyE' || code === 'Space') this.actions.add('interact');
    else if (code === 'KeyF') this.actions.add('flashlight');
    else if (code === 'Escape') this.actions.add('pause');
    else if (code === 'KeyN') this.actions.add('mute');
    else if (code === 'KeyM') this.actions.add('map');
    // ignore key repeats so holding Q cannot re-trigger LUMEN SURGE after it expires
    else if (code === 'KeyQ' && !event.repeat) this.actions.add('lumen');
    // R equips or stows the carried LUMEN MAINTENANCE KEY
    else if (code === 'KeyR' && !event.repeat) this.actions.add('equip');
    else if (code === 'KeyP') this.actions.add('pause');

    this._recompute();
  }

  _onKeyUp(event) {
    const code = event.code;
    this.keys.delete(code);
    this._recompute();
  }

  _recompute() {
    const keys = this.keys;
    const keyboardX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const keyboardY = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);

    const touchMagnitude = Math.hypot(this.touchMoveX, this.touchMoveY);
    if (touchMagnitude > 0.08) {
      this.moveX = this.touchMoveX;
      this.moveY = this.touchMoveY;
    } else {
      this.moveX = keyboardX;
      this.moveY = keyboardY;
    }

    this.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || this.touchSprint;

    this._keyboardLookActive =
      keys.has('ArrowLeft') ||
      keys.has('ArrowRight') ||
      keys.has('ArrowUp') ||
      keys.has('ArrowDown');
  }

  /* ----------------------- keyboard look (accessible) --------------------- */

  /** Arrow keys feed pixels into the same look pipeline as the mouse. */
  updateKeyboardLook(dt) {
    if (!this.enabled || !this._keyboardLookActive) return;
    const pixelsPerSecond = LOOK.keySpeed / LOOK.mouseSensitivity;
    const horizontal =
      (this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('ArrowRight') ? 1 : 0);
    const vertical = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
    this.addLook(horizontal * pixelsPerSecond * dt, vertical * pixelsPerSecond * dt);
  }

  /* --------------------------------- mouse -------------------------------- */

  get locked() {
    return Boolean(this.canvas && document.pointerLockElement === this.canvas);
  }

  requestPointerLock() {
    const canvas = this.canvas;
    if (!canvas || !canvas.requestPointerLock || document.pointerLockElement === canvas) return;
    try {
      const result = canvas.requestPointerLock({ unadjustedMovement: true });
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          try {
            const fallback = canvas.requestPointerLock();
            if (fallback && typeof fallback.catch === 'function') fallback.catch(() => {});
          } catch {}
        });
      }
    } catch {
      try {
        const fallback = canvas.requestPointerLock();
        if (fallback && typeof fallback.catch === 'function') fallback.catch(() => {});
      } catch {}
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        /* ignore */
      }
    }
  }

  _onMouseDown(event) {
    if (!this.enabled || this.mapOpen || this.consoleOpen) return;
    if (event.button !== 0) return;
    if (!this.locked) {
      this.requestPointerLock();
    }
    // Drag-to-look fallback (also keeps desktop usable when lock is denied).
    this._dragging = true;
    this._dragPointer = event.pointerId ?? null;
    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
  }

  _onMouseUp() {
    this._dragging = false;
    this._lastMouseX = null;
    this._lastMouseY = null;
  }

  _onMouseMove(event) {
    if (!this.enabled) return;
    let mx = event.movementX ?? event.mozMovementX ?? event.webkitMovementX ?? 0;
    let my = event.movementY ?? event.mozMovementY ?? event.webkitMovementY ?? 0;

    if (this.locked) {
      if (mx || my) {
        this.addLook(mx * this.mouseSensitivity, my * this.mouseSensitivity);
      }
    } else if (this._dragging) {
      if (!mx && !my && this._lastMouseX !== null && this._lastMouseX !== undefined) {
        mx = event.clientX - this._lastMouseX;
        my = event.clientY - this._lastMouseY;
      }
      this._lastMouseX = event.clientX;
      this._lastMouseY = event.clientY;
      if (mx || my) {
        this.addLook(mx * this.mouseSensitivity, my * this.mouseSensitivity);
      }
    }
  }

  /* --------------------------------- touch -------------------------------- */

  setTouchMove(x, y) {
    this.touchMoveX = x;
    this.touchMoveY = y;
    this._recompute();
  }

  setTouchSprint(active) {
    this.touchSprint = active;
    this._recompute();
  }

  addLook(pixelsX, pixelsY) {
    if (this.mapOpen || this.consoleOpen) return;
    this.lookX += pixelsX;
    this.lookY += pixelsY;
  }

  /** Queue a one-shot action (used by touch buttons). */
  press(name) {
    this.actions.add(name);
  }

  /* -------------------------------- readers ------------------------------- */

  consumeLook() {
    const out = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return out;
  }

  consumeAction(name) {
    if (!this.actions.has(name)) return false;
    this.actions.delete(name);
    return true;
  }

  clearActions() {
    this.actions.clear();
  }
}
