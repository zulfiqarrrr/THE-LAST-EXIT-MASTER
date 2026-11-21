/* ==========================================================================
   THE LAST EXIT — audio engine
   Every sound is generated with the Web Audio API: no audio files, no
   licensing, no network. The context is created on the first user gesture so
   autoplay policies are satisfied.
   ========================================================================== */

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambience = null;
    this.muted = false;
    this.tension = 0;
    this._heartTimer = 0;
    this._growlCooldown = 0;
    this._stepCooldown = 0;
    this._noiseBuffer = null;
    this.ready = false;
  }

  /** Must be called from inside a user gesture (click/tap). */
  init() {
    if (this.ready) {
      this.resume();
      return true;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    try {
      this.context = new Ctx();
    } catch {
      return false;
    }
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(this.context.destination);
    this._noiseBuffer = this._createNoiseBuffer();
    this.ready = true;
    return true;
  }

  resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  suspend() {
    if (this.context && this.context.state === 'running') {
      this.context.suspend().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.08);
    }
  }

  /* ------------------------------ primitives ----------------------------- */

  _createNoiseBuffer() {
    const ctx = this.context;
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _noise(duration = 1) {
    const source = this.context.createBufferSource();
    source.buffer = this._noiseBuffer;
    source.loop = true;
    source.playbackRate.value = 1;
    source.start(this.context.currentTime, Math.random() * 1.5, duration + 0.05);
    return source;
  }

  _gain(value = 1) {
    const gain = this.context.createGain();
    gain.gain.value = value;
    return gain;
  }

  _ok() {
    return this.ready && this.context && !this.muted;
  }

  /* ------------------------------- ambience ------------------------------ */

  startAmbience() {
    if (!this.ready || this.ambience) return;
    const ctx = this.context;
    const now = ctx.currentTime;

    const out = this._gain(0.0001);
    out.connect(this.master);

    // Two detuned drones: the building's plant machinery.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    droneFilter.Q.value = 3;
    droneFilter.connect(out);

    const oscillators = [];
    for (const [freq, type, level] of [
      [55, 'sawtooth', 0.34],
      [82.4, 'sine', 0.3],
      [36.7, 'triangle', 0.4],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 12;
      const gain = this._gain(level);
      osc.connect(gain).connect(droneFilter);
      osc.start(now);
      oscillators.push(osc);
    }

    // Slow breathing LFO on the drone.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this._gain(0.35);
    lfo.connect(lfoGain).connect(out.gain);
    lfo.start(now);

    // Ventilation hiss.
    const hiss = this._noise(3);
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 520;
    hissFilter.Q.value = 0.7;
    const hissGain = this._gain(0.05);
    hiss.connect(hissFilter).connect(hissGain).connect(this.master);

    // Distant metal groans.
    const groanInterval = window.setInterval(() => {
      if (!this._ok() || Math.random() < 0.45) return;
      this.groan();
    }, 9000);

    out.gain.setTargetAtTime(0.5, now, 2.5);

    this.ambience = {
      out,
      oscillators,
      lfo,
      hiss,
      groanInterval,
      stop() {
        try {
          oscillators.forEach((o) => o.stop());
          lfo.stop();
          hiss.stop();
        } catch {
          /* already stopped */
        }
      },
    };
  }

  stopAmbience() {
    if (!this.ambience) return;
    const now = this.context.currentTime;
    const node = this.ambience;
    this.ambience = null;
    node.out.gain.setTargetAtTime(0.0001, now, 0.4);
    window.clearInterval(node.groanInterval);
    window.setTimeout(() => node.stop(), 1400);
  }

  /** Ambient tension: rises as the creature closes in. */
  setTension(value) {
    this.tension = Math.max(0, Math.min(1, value));
  }

  /** Called every frame; drives the heartbeat rhythm. */
  update(dt) {
    if (!this._ok()) return;
    this._growlCooldown = Math.max(0, this._growlCooldown - dt);
    this._heartTimer -= dt;
    if (this.tension > 0.18 && this._heartTimer <= 0) {
      this.heartbeat(this.tension);
      this._heartTimer = 1.15 - this.tension * 0.72;
    }
  }

  /* -------------------------------- effects ------------------------------ */

  heartbeat(intensity = 0.5) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const thump = (delay, strength) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(72, now + delay);
      osc.frequency.exponentialRampToValueAtTime(34, now + delay + 0.16);
      const gain = this._gain(0);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.42 * strength, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.28);
      osc.connect(gain).connect(this.master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.32);
    };
    thump(0, intensity);
    thump(0.16, intensity * 0.6);
  }

  footstep(sprinting = false) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const noise = this._noise(0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = sprinting ? 900 : 620;
    filter.Q.value = 1.1;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(sprinting ? 0.16 : 0.1, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (sprinting ? 0.16 : 0.2));
    noise.connect(filter).connect(gain).connect(this.master);
    noise.stop(now + 0.26);

    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(120, now);
    body.frequency.exponentialRampToValueAtTime(58, now + 0.1);
    const bodyGain = this._gain(0);
    bodyGain.gain.setValueAtTime(0, now);
    bodyGain.gain.linearRampToValueAtTime(0.07, now + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    body.connect(bodyGain).connect(this.master);
    body.start(now);
    body.stop(now + 0.16);
  }

  /** Heavier, wetter step for the creature. */
  creatureStep(distance = 10) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const closeness = Math.max(0, 1 - distance / 22);
    const noise = this._noise(0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05 + closeness * 0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.stop(now + 0.36);
  }

  /* Stereo pan node (falls back to a plain gain where unsupported). */
  _panner(pan = 0) {
    if (!this.context.createStereoPanner) return this._gain(1);
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    return panner;
  }

  /** Low electrical hum from a ceiling fixture. strength 0..1, pan -1 (left)..1 (right). */
  fixtureBuzz(strength = 0.5, pan = 0) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const dur = 0.9 + Math.random() * 0.8;
    const level = 0.018 * Math.min(1, Math.max(0, strength));
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 100 + Math.random() * 20;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value = 2;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.08);
    gain.gain.linearRampToValueAtTime(level * 0.6, now + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0.0001, now + dur);
    osc.connect(filter).connect(gain).connect(this._panner(pan)).connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /** Short electrical crackle (a few pops) from a fixture that is failing. */
  fixtureCrackle(strength = 0.5, pan = 0) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const level = 0.09 * Math.min(1, Math.max(0, strength));
    const noise = this._noise(0.45);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0, now);
    const pops = 3 + Math.floor(Math.random() * 3);
    let offset = 0;
    for (let i = 0; i < pops; i += 1) {
      const at = now + offset;
      gain.gain.setValueAtTime(level * (0.5 + Math.random() * 0.5), at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
      offset += 0.02 + Math.random() * 0.06;
    }
    noise.connect(filter).connect(gain).connect(this._panner(pan)).connect(this.master);
    noise.stop(now + 0.45);
  }

  click() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1400;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  flashlight(on) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    for (const [delay, freq] of [
      [0, on ? 2100 : 1500],
      [0.05, on ? 1500 : 900],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const gain = this._gain(0);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(0.045, now + delay + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.035);
      osc.connect(gain).connect(this.master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    }
  }

  pickup() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    [880, 1320, 1980].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const gain = this._gain(0);
      const start = now + i * 0.07;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.16 / (i + 1), start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 1);
    });
  }

  /** A faint, short chime for the LUMEN key. `strength` (0–1) sets its volume. */
  lumenPing(strength = 0.5) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const peak = 0.05 * Math.min(1, Math.max(0, strength));
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1760;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, peak), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  unlock() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    // magnetic relay clunk
    const noise = this._noise(0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.3);
    filter.Q.value = 4;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.stop(now + 0.55);
    // servo whine pulling the bolts back
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.6);
    const oscGain = this._gain(0);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(0.07, now + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.connect(oscGain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  lockedBuzz() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 120;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  doorSlide() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const noise = this._noise(2.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.linearRampToValueAtTime(1800, now + 1.4);
    filter.Q.value = 0.9;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
    gain.gain.setTargetAtTime(0.0001, now + 1.3, 0.4);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.stop(now + 2.6);

    const rumble = ctx.createOscillator();
    rumble.type = 'triangle';
    rumble.frequency.setValueAtTime(48, now);
    rumble.frequency.linearRampToValueAtTime(74, now + 1.6);
    const rumbleGain = this._gain(0);
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.16, now + 0.3);
    rumbleGain.gain.setTargetAtTime(0.0001, now + 1.5, 0.35);
    rumble.connect(rumbleGain).connect(this.master);
    rumble.start(now);
    rumble.stop(now + 2.6);
  }

  growl(aggression = 1) {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(96 + aggression * 22, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 1.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(680, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 1.1);
    filter.Q.value = 6;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16 * aggression, now + 0.12);
    gain.gain.setTargetAtTime(0.0001, now + 0.7, 0.25);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 1.3);

    // wet rattle underneath
    const rattle = this._noise(1.4);
    const rattleFilter = ctx.createBiquadFilter();
    rattleFilter.type = 'bandpass';
    rattleFilter.frequency.value = 320;
    rattleFilter.Q.value = 2.4;
    const rattleGain = this._gain(0);
    rattleGain.gain.setValueAtTime(0.0001, now);
    rattleGain.gain.linearRampToValueAtTime(0.06 * aggression, now + 0.15);
    rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    rattle.connect(rattleFilter).connect(rattleGain).connect(this.master);
    rattle.stop(now + 1.5);
  }

  groan() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.linearRampToValueAtTime(41, now + 2.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 1.2);
    gain.gain.setTargetAtTime(0.0001, now + 1.8, 0.8);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 3.4);
  }

  stinger() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.5);
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.9);

    const noise = this._noise(0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1600;
    const noiseGain = this._gain(0);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.stop(now + 0.9);
  }

  caught() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 1.8);
    const gain = this._gain(0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.34, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 2.1);

    const noise = this._noise(1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 1.4);
    filter.Q.value = 0.8;
    const noiseGain = this._gain(0);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.stop(now + 1.7);
  }

  victory() {
    if (!this._ok()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    [146.8, 220, 293.7, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const gain = this._gain(0);
      const start = now + i * 0.28;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.12 / (i * 0.5 + 1), start + 0.5);
      gain.gain.setTargetAtTime(0.0001, start + 1.6, 0.9);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 4.4);
    });
  }
}
