/* ==========================================================================
   THE LAST EXIT — touch controls
   A virtual thumb stick for movement, a drag-anywhere look surface and large
   action buttons. Uses Pointer Events so a phone, tablet or stylus works and
   two thumbs can be used at once.
   ========================================================================== */

import { LOOK } from './config.js';

const STICK_DEAD_ZONE = 0.14;

export class TouchControls {
  constructor({ controls, dom, layer }) {
    this.controls = controls;
    this.dom = dom;
    this.layer = layer;
    this.enabled = false;

    this._stickPointer = null;
    this._lookPointer = null;
    this._lookLast = { x: 0, y: 0 };
    this._sprintPointer = null;
    this._stickCenter = { x: 0, y: 0 };
    this._stickRadius = 60;

    this._handlers = {
      stickDown: (event) => this._onStickDown(event),
      stickMove: (event) => this._onStickMove(event),
      stickUp: (event) => this._onStickUp(event),
      lookDown: (event) => this._onLookDown(event),
      lookMove: (event) => this._onLookMove(event),
      lookUp: (event) => this._onLookUp(event),
      sprintDown: (event) => this._onSprintDown(event),
      sprintUp: (event) => this._onSprintUp(event),
      interact: (event) => this._onButton(event, 'interact'),
      flash: (event) => this._onButton(event, 'flashlight'),
      // the one lumen button either equips the carried key or starts the surge,
      // depending on the mode the HUD sets on it
      lumen: (event) =>
        this._onButton(event, event.currentTarget.dataset.mode === 'equip' ? 'equip' : 'lumen'),
      prevent: (event) => this._preventGesture(event),
    };
  }

  /* ------------------------------- lifecycle ------------------------------ */

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    const { stick, look, sprintButton, interactButton, flashButton, lumenButton } = this.dom;

    if (stick) {
      stick.addEventListener('pointerdown', this._handlers.stickDown);
      stick.addEventListener('pointermove', this._handlers.stickMove);
      stick.addEventListener('pointerup', this._handlers.stickUp);
      stick.addEventListener('pointercancel', this._handlers.stickUp);
      stick.addEventListener('lostpointercapture', this._handlers.stickUp);
    }
    if (look) {
      look.addEventListener('pointerdown', this._handlers.lookDown);
      look.addEventListener('pointermove', this._handlers.lookMove);
      look.addEventListener('pointerup', this._handlers.lookUp);
      look.addEventListener('pointercancel', this._handlers.lookUp);
      look.addEventListener('pointerleave', this._handlers.lookUp);
    }
    if (sprintButton) {
      sprintButton.addEventListener('pointerdown', this._handlers.sprintDown);
      sprintButton.addEventListener('pointerup', this._handlers.sprintUp);
      sprintButton.addEventListener('pointercancel', this._handlers.sprintUp);
      sprintButton.addEventListener('pointerleave', this._handlers.sprintUp);
    }
    if (interactButton) interactButton.addEventListener('pointerdown', this._handlers.interact);
    if (flashButton) flashButton.addEventListener('pointerdown', this._handlers.flash);
    if (lumenButton) lumenButton.addEventListener('pointerdown', this._handlers.lumen);

    // Stop pull-to-refresh, pinch zoom and long-press menus while playing.
    this.layer.addEventListener('contextmenu', this._handlers.prevent);
    this.layer.addEventListener('gesturestart', this._handlers.prevent);
    this.layer.addEventListener('dblclick', this._handlers.prevent);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    const { stick, look, sprintButton, interactButton, flashButton, lumenButton } = this.dom;
    if (stick) {
      stick.removeEventListener('pointerdown', this._handlers.stickDown);
      stick.removeEventListener('pointermove', this._handlers.stickMove);
      stick.removeEventListener('pointerup', this._handlers.stickUp);
      stick.removeEventListener('pointercancel', this._handlers.stickUp);
      stick.removeEventListener('lostpointercapture', this._handlers.stickUp);
    }
    if (look) {
      look.removeEventListener('pointerdown', this._handlers.lookDown);
      look.removeEventListener('pointermove', this._handlers.lookMove);
      look.removeEventListener('pointerup', this._handlers.lookUp);
      look.removeEventListener('pointercancel', this._handlers.lookUp);
      look.removeEventListener('pointerleave', this._handlers.lookUp);
    }
    if (sprintButton) {
      sprintButton.removeEventListener('pointerdown', this._handlers.sprintDown);
      sprintButton.removeEventListener('pointerup', this._handlers.sprintUp);
      sprintButton.removeEventListener('pointercancel', this._handlers.sprintUp);
      sprintButton.removeEventListener('pointerleave', this._handlers.sprintUp);
    }
    if (interactButton) interactButton.removeEventListener('pointerdown', this._handlers.interact);
    if (flashButton) flashButton.removeEventListener('pointerdown', this._handlers.flash);
    if (lumenButton) lumenButton.removeEventListener('pointerdown', this._handlers.lumen);
    this.layer.removeEventListener('contextmenu', this._handlers.prevent);
    this.layer.removeEventListener('gesturestart', this._handlers.prevent);
    this.layer.removeEventListener('dblclick', this._handlers.prevent);

    this._resetStick();
    this._lookPointer = null;
    this._sprintPointer = null;
    this.controls.setTouchSprint(false);
    this.controls.setTouchMove(0, 0);
  }

  _preventGesture(event) {
    if (this.enabled) event.preventDefault();
  }

  /* --------------------------------- stick -------------------------------- */

  _onStickDown(event) {
    if (!this.enabled) return;
    event.preventDefault();
    if (this._stickPointer !== null) return;
    this._stickPointer = event.pointerId;
    this.dom.stick.setPointerCapture?.(event.pointerId);
    this.dom.stick.classList.add('is-active');
    const rect = this.dom.stick.getBoundingClientRect();
    this._stickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this._stickRadius = rect.width / 2;
    this._updateStick(event.clientX, event.clientY);
  }

  _onStickMove(event) {
    if (!this.enabled || event.pointerId !== this._stickPointer) return;
    event.preventDefault();
    this._updateStick(event.clientX, event.clientY);
  }

  _onStickUp(event) {
    if (event && this._stickPointer !== null && event.pointerId !== this._stickPointer) return;
    this._resetStick();
  }

  _updateStick(clientX, clientY) {
    let dx = clientX - this._stickCenter.x;
    let dy = clientY - this._stickCenter.y;
    const distance = Math.hypot(dx, dy);
    const max = this._stickRadius;
    // a zero-size stick (hidden layer) would divide by zero
    if (!(max > 0)) return;
    if (distance > max) {
      dx = (dx / distance) * max;
      dy = (dy / distance) * max;
    }
    const knob = this.dom.knob;
    if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    let nx = dx / max;
    let ny = -dy / max; // screen up is forward
    const magnitude = Math.hypot(nx, ny);
    if (magnitude < STICK_DEAD_ZONE) {
      nx = 0;
      ny = 0;
    }
    this.controls.setTouchMove(nx, ny);
  }

  _resetStick() {
    this._stickPointer = null;
    if (this.dom.knob) this.dom.knob.style.transform = 'translate(-50%, -50%)';
    if (this.dom.stick) this.dom.stick.classList.remove('is-active');
    this.controls.setTouchMove(0, 0);
  }

  /* --------------------------------- look --------------------------------- */

  _onLookDown(event) {
    if (!this.enabled) return;
    event.preventDefault();
    if (this._lookPointer !== null) return;
    this._lookPointer = event.pointerId;
    this._lookLast = { x: event.clientX, y: event.clientY };
    this.dom.look.setPointerCapture?.(event.pointerId);
  }

  _onLookMove(event) {
    if (!this.enabled || event.pointerId !== this._lookPointer) return;
    event.preventDefault();
    const dx = event.clientX - this._lookLast.x;
    const dy = event.clientY - this._lookLast.y;
    this._lookLast = { x: event.clientX, y: event.clientY };
    // touch deltas become pixel-equivalents, so player.js's mouse scale gives LOOK.touchBase per px
    const scale = 1 / LOOK.mouseSensitivity;
    this.controls.addLook(
      dx * this.controls.touchLookX * LOOK.touchBase * scale,
      dy * this.controls.touchLookY * LOOK.touchBase * scale
    );
  }

  _onLookUp(event) {
    if (event && this._lookPointer !== null && event.pointerId !== this._lookPointer) return;
    this._lookPointer = null;
  }

  /* -------------------------------- buttons ------------------------------- */

  _onSprintDown(event) {
    if (!this.enabled) return;
    event.preventDefault();
    if (this._sprintPointer !== null) return;
    this._sprintPointer = event.pointerId;
    this.dom.sprintButton?.setPointerCapture?.(event.pointerId);
    this.dom.sprintButton?.classList.add('is-pressed');
    this.dom.sprintButton?.setAttribute('aria-pressed', 'true');
    this.controls.setTouchSprint(true);
  }

  _onSprintUp(event) {
    // only the finger that started the sprint may release it
    if (event && this._sprintPointer !== null && event.pointerId !== this._sprintPointer) return;
    this._sprintPointer = null;
    this.dom.sprintButton?.classList.remove('is-pressed');
    this.dom.sprintButton?.setAttribute('aria-pressed', 'false');
    this.controls.setTouchSprint(false);
  }

  _onButton(event, action) {
    if (!this.enabled) return;
    event.preventDefault();
    const button = event.currentTarget;
    button.classList.add('is-pressed');
    window.setTimeout(() => button.classList.remove('is-pressed'), 140);
    this.controls.press(action);
  }
}
