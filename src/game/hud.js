/* ==========================================================================
   THE LAST EXIT — HUD controller
   Thin wrapper around the DOM overlay. The game loop writes values here and
   this module owns every DOM write, so markup stays in index.html.
   ========================================================================== */

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Coarse bearing words, clockwise from straight ahead. Deliberately only eight
 * buckets: a caption that flickers through every degree is unreadable, and a
 * player needs a direction to run in, not a heading.
 */
const BEARINGS = [
  'AHEAD',
  'AHEAD RIGHT',
  'RIGHT',
  'BEHIND RIGHT',
  'BEHIND',
  'BEHIND LEFT',
  'LEFT',
  'AHEAD LEFT',
];

function bearingWord(degrees) {
  const normalised = ((degrees % 360) + 360) % 360;
  return BEARINGS[Math.round(normalised / 45) % 8];
}

const CUE_WORDS = { step: 'FOOTSTEPS', growl: 'GROWL' };

export class Hud {
  constructor(dom) {
    this.dom = dom;
    this.toastTimer = 0;
    this.promptText = '';
    this.promptKind = '';
    this._lastTimerText = '';
    this._lastStamina = -1;
    this._lastBattery = -1;
    this._lastFlashlightOn = null;
    this._lastTension = -1;
    this._lastThreatAngle = -1;
  }

  setObjective(text, { flash = false, done = false } = {}) {
    if (!this.dom.objective) return;
    this.dom.objective.textContent = text;
    const wrapper = this.dom.objectiveWrapper;
    if (!wrapper) return;
    wrapper.classList.toggle('is-done', done);
    if (flash) {
      wrapper.classList.remove('is-new');
      // force a reflow so the animation restarts for repeated updates
      void wrapper.offsetWidth;
      wrapper.classList.add('is-new');
    }
  }

  setTimer(seconds) {
    const text = formatTime(seconds);
    if (this._lastTimerText !== text) {
      this._lastTimerText = text;
      if (this.dom.timer) this.dom.timer.textContent = text;
    }
  }

  setStamina(ratio) {
    if (!this.dom.stamina) return;
    const rounded = Math.round(ratio * 200) / 200;
    if (this._lastStamina !== rounded) {
      this._lastStamina = rounded;
      this.dom.stamina.style.transform = `scaleX(${Math.max(0, Math.min(1, rounded))})`;
      this.dom.stamina.classList.toggle('is-low', rounded <= 0.35 && rounded > 0.05);
      this.dom.stamina.classList.toggle('is-empty', rounded <= 0.05);
    }
  }

  setBattery(ratio, flashlightOn) {
    const rounded = Math.round(ratio * 200) / 200;
    if (this._lastBattery !== rounded) {
      this._lastBattery = rounded;
      if (this.dom.battery) {
        this.dom.battery.style.transform = `scaleX(${Math.max(0, Math.min(1, rounded))})`;
        this.dom.battery.classList.toggle('is-low', rounded <= 0.25);
      }
    }
    if (this._lastFlashlightOn !== flashlightOn) {
      this._lastFlashlightOn = flashlightOn;
      if (this.dom.flashState) {
        this.dom.flashState.textContent = flashlightOn ? 'ON' : 'OFF';
        this.dom.flashState.classList.toggle('is-off', !flashlightOn);
      }
      if (this.dom.flashButton) this.dom.flashButton.setAttribute('aria-pressed', String(flashlightOn));
    }
  }

  /**
   * LUMEN SURGE readout for the LUMEN MAINTENANCE KEY. `state` is the Lumen
   * object itself each frame, or a plain {} when it has just been cleared.
   *   none     no key in the pack
   *   carried  key picked up, not equipped (press R)
   *   equipped key equipped, surge ready (press Q)
   *   active   surge running, counting down from LUMEN.duration
   * The touch button reads data-mode: 'equip' while a key is carried but not
   * equipped, otherwise 'lumen'.
   */
  setLumen(state = {}) {
    const active = Boolean(state.active);
    const mode = active
      ? 'active'
      : state.equipped
        ? 'equipped'
        : state.carried
          ? 'carried'
          : 'none';
    const remaining = state.remaining || 0;
    const clock = formatTime(Math.ceil(remaining));
    const texts = {
      none: 'NO KEY',
      carried: 'R · EQUIP',
      equipped: 'EQUIPPED · Q',
      active: `LUMEN SURGE ${clock}`,
    };
    const touchTexts = { none: 'No key', carried: 'Equip', equipped: 'Surge', active: clock };
    const text = texts[mode];

    let fill = 0;
    if (mode === 'active') fill = state.duration > 0 ? remaining / state.duration : 0;
    else if (mode === 'equipped') fill = 1;
    fill = Math.max(0, Math.min(1, fill));

    const disabled = mode === 'none' || mode === 'active';
    const button = this.dom.lumenButton;
    if (button) {
      button.dataset.state = mode;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-disabled', String(disabled));
    }
    if (this.dom.lumenTime && this._lumenText !== text) {
      this.dom.lumenTime.textContent = text;
      this._lumenText = text;
    }
    if (this.dom.lumenFill) this.dom.lumenFill.style.transform = `scaleX(${fill})`;

    const touch = this.dom.lumenTouch;
    if (touch) {
      touch.dataset.state = mode;
      touch.dataset.mode = mode === 'carried' ? 'equip' : 'lumen';
      touch.setAttribute('aria-pressed', String(active));
      touch.setAttribute('aria-disabled', String(disabled));
    }
    const touchText = touchTexts[mode];
    if (this.dom.lumenTouchLabel && this._lumenTouchText !== touchText) {
      this.dom.lumenTouchLabel.textContent = touchText;
      this._lumenTouchText = touchText;
    }
  }

  setKey(held) {
    if (this.dom.key) this.dom.key.classList.toggle('is-held', held);
  }

  setTension(value) {
    const rounded = Math.round(value * 100) / 100;
    if (this._lastTension !== rounded) {
      this._lastTension = rounded;
      if (this.dom.danger) this.dom.danger.style.opacity = String(Math.max(0, Math.min(1, rounded)));
      if (this.dom.reticle) this.dom.reticle.classList.toggle('is-danger', rounded > 0.55);
    }
  }

  /**
   * Directional threat indicator — the non-audio equivalent of the creature's
   * footsteps and growls.
   *
   * @param {object}  state
   * @param {boolean} state.active   show the ring at all
   * @param {number} [state.angle]   degrees clockwise from straight ahead
   * @param {number} [state.distance] metres to the creature
   * @param {string} [state.cue]     'step' | 'growl' while the sound is fresh
   * @param {boolean}[state.chase]   the creature is actively hunting
   */
  setThreat(state = {}) {
    const active = Boolean(state.active);
    const root = this.dom.threat;
    if (root) {
      root.classList.toggle('is-visible', active);
      root.classList.toggle('is-chase', active && Boolean(state.chase));
      root.classList.toggle('is-close', active && (state.distance ?? Infinity) < 6);
    }
    if (this.dom.threatArrow && typeof state.angle === 'number') {
      const rounded = Math.round(state.angle * 2) / 2;
      if (this._lastThreatAngle !== rounded) {
        this._lastThreatAngle = rounded;
        this.dom.threatArrow.style.transform = `rotate(${rounded.toFixed(1)}deg)`;
      }
    }

    const caption = this.dom.threatCaption;
    if (!caption) return;
    const text = active ? this._threatText(state) : '';
    // Only touch the DOM when the sentence actually changes: the caption is a
    // live region, and rewriting it every frame would make it unusable.
    if (text === this.threatText) return;
    this.threatText = text;
    caption.textContent = text;
    caption.classList.toggle('is-visible', Boolean(text));
  }

  _threatText({ angle = 0, distance, cue, chase }) {
    const where = bearingWord(angle);
    const metres = typeof distance === 'number' && distance < 40 ? `${Math.max(1, Math.round(distance))}m` : '';
    const sound = cue ? CUE_WORDS[cue] : '';
    const subject = sound || (chase ? 'IT IS COMING' : 'SOMETHING IS CLOSE');
    return [subject, where, metres].filter(Boolean).join(' \u00b7 ');
  }

  /** Interaction prompt: { text, kbd } or null to hide. */
  setPrompt(prompt, { ready = false } = {}) {
    const next = prompt ? prompt.text : '';
    if (this.dom.prompt && next !== this.promptText) {
      this.dom.prompt.innerHTML = prompt
        ? `${prompt.text}${prompt.kbd ? ` <kbd>${prompt.kbd}</kbd>` : ''}`
        : '';
      this.promptText = next;
    }
    if (this.dom.prompt) this.dom.prompt.classList.toggle('is-visible', Boolean(prompt));
    if (this.dom.reticle) this.dom.reticle.classList.toggle('is-active', Boolean(prompt) && ready);
    if (this.dom.interactButton) this.dom.interactButton.classList.toggle('is-ready', ready);
  }

  showToast(message, duration = 2600) {
    if (!this.dom.toast) return;
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add('is-visible');
    this.toastTimer = duration / 1000;
  }

  update(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0 && this.dom.toast) {
        this.dom.toast.classList.remove('is-visible');
      }
    }
  }

  setDamage(visible) {
    if (this.dom.damage) this.dom.damage.classList.toggle('is-visible', visible);
  }

  reset() {
    this._lastTimerText = '';
    this._lastStamina = -1;
    this._lastBattery = -1;
    this._lastFlashlightOn = null;
    this._lastTension = -1;
    this._lastThreatAngle = -1;
    this.setStamina(1);
    this.setBattery(1, true);
    this.setLumen({});
    this.setKey(false);
    this.setTension(0);
    this.setThreat({});
    this.setPrompt(null);
    this.setDamage(false);
    this.setTimer(0);
    if (this.dom.toast) this.dom.toast.classList.remove('is-visible');
    this.toastTimer = 0;
  }
}

export { formatTime };
