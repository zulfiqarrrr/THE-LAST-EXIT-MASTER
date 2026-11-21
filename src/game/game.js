/* ==========================================================================
   THE LAST EXIT — game controller
   Owns the renderer, scene, run state machine and the single animation loop.
   Pausing stops the loop instead of spawning another one, so restarting any
   number of times never leaves duplicate loops running.
   ========================================================================== */

import * as THREE from 'three';
import { CATCH, ENEMY, LOOK, LUMEN, LUMEN_KEY, MAINTENANCE_KEY, PLAYER, QUALITY, clamp, isTouchDevice, lerp, store } from './config.js';
import {
  COLS,
  MAINTENANCE_SPOTS,
  buildLevel,
  cellToWorld,
  chooseLumenKeyCell,
  floorDistances,
  hasLineOfSight,
  isSolidAt,
  worldToCell,
} from './level.js';
import { Player } from './player.js';
import { Creature } from './enemy.js';
import { Objectives } from './interactions.js';
import { Controls } from './input.js';
import { TouchControls } from './touch.js';
import { Lumen } from './lumen.js';
import { LumenKey } from './lumen-key.js';
import { FacilityMap } from './map.js';
import { CctvSystem } from './cctv.js';

const MAX_DELTA = 0.05;
const FINALE_DURATION = 1.7;
/** How long a creature sound stays captioned on screen, in seconds. */
const CUE_FRESH = 1.15;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class Game {
  constructor({ canvas, layer, hud, audio, dom, onStateChange, quality, warden }) {
    this.canvas = canvas;
    this.layer = layer;
    this.hud = hud;
    this.audio = audio;
    this.dom = dom;
    this.warden = warden || null;
    this.reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onStateChange = onStateChange || (() => {});

    this.qualityName = quality || 'high';
    this.quality = QUALITY[this.qualityName] || QUALITY.high;

    this.state = 'idle';
    this.timer = 0;
    this.detections = 0;
    this.tension = 0;
    this.initialized = false;
    this.touchEnabled = isTouchDevice();
    this._raf = null;
    this._lastTime = 0;
    this._finale = null;
    this._finaleStart = new THREE.Vector3();
    this._rotateDismissed = store.get('rotateDismissed', false);
    this._pauseRequested = false;
    this._lastHeight = 0;
    this._lastWidth = 0;
    // kill-sequence state: time into the sequence, impact flag, camera shake, fade
    this._catchT = 0;
    this._impacted = false;
    this._shake = 0;
    this._shakeScale = this.reducedMotion ? 0.3 : 1;
    // kill-camera state: lens target, dolly start, sideways/vertical shake axes
    this._catchCam = new THREE.Vector3();
    this._catchFrom = new THREE.Vector3();
    this._catchRight = new THREE.Vector3();
    this._catchUp = new THREE.Vector3();
    this._baseFov = 0;
    this._flashAmt = 0;
    this._textShown = false;
    this._fade = null;
    this._flash = null;
    this._caughtText = null;
    /** facility map (minimap + full map), created in init() */
    this.map = null;
  }

  /* -------------------------------- setup --------------------------------- */

  init() {
    if (this.initialized) return;
    if (!this.warden) throw new Error('the Warden model has not been loaded');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      this.touchEnabled ? 76 : 72,
      1,
      0.06,
      140
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality.antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.pixelRatioCap));
    renderer.shadowMap.enabled = this.quality.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = scene;
    this.camera = camera;
    this._baseFov = camera.fov;
    this.renderer = renderer;

    this.level = buildLevel(scene, this.quality);
    this.level.setAudio(this.audio);
    this.player = new Player({ camera, scene, level: this.level, quality: this.quality });
    this.lumen = new Lumen({ camera, scene, onExpire: () => this._onLumenExpired() });
    this.lumenKey = new LumenKey(scene, { onPing: (strength) => this.audio.lumenPing(strength) });
    /** cells the world key recently spawned on, avoided for the next spawn */
    this._recentLumenCells = [];
    /** the authored spot holding this run's LUMEN MAINTENANCE KEY (escape key) */
    this._maintenanceSpot = null;
    this.creature = new Creature({
      scene,
      level: this.level,
      quality: this.quality,
      audio: this.audio,
      model: this.warden,
    });
    this.objectives = new Objectives({
      level: this.level,
      hud: this.hud,
      audio: this.audio,
      camera,
      lumenKey: this.lumenKey,
      onLumenPickup: () => this._pickUpLumenKey(),
      onEscape: () => this._beginFinale(),
      onCctv: () => this.openCctv(),
      onNotice: () => {},
    });

    this.controls = new Controls({
      onPointerLockChange: (locked, failed) => this._onPointerLockChange(locked, failed),
    });
    this.controls.attach(this.canvas);
    this._bindMouseSettings();
    this._bindTouchLookSettings();

    const cctvRoot = this.layer.querySelector('#cctv');
    if (cctvRoot) this.cctv = new CctvSystem({ root: cctvRoot, scene, onExit: () => this.closeCctv() });

    if (this.dom.map) {
      this.map = new FacilityMap(this.dom.map, {
        onOpen: () => this.openMap(),
        onClose: () => this.closeMap(),
      });
      this.dom.map.touchButton?.addEventListener('click', () => this.openMap());
    }

    this.touch = new TouchControls({
      controls: this.controls,
      dom: this.dom.touch,
      layer: this.layer,
    });
    if (this.touchEnabled) this.touch.enable();

    this._bindWindowEvents();
    this._resize();
    this.initialized = true;
    this.setState('idle');
  }

  /**
   * Build the scene and compile every shader before the first run, so the
   * first gameplay frame does not stall on GPU work. Safe to call repeatedly.
   */
  async prepare() {
    if (!this.initialized) this.init();
    if (this._prepared) return;
    this._prepared = true;
    if (typeof this.renderer.compileAsync === 'function') {
      await this.renderer.compileAsync(this.scene, this.camera);
    }
    // one real frame compiles the shadow and depth programs compileAsync misses
    // and uploads the textures, so the first gameplay frame does not pay for them
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Desktop mouse sensitivity slider (percent of LOOK.mouseSensitivity),
   * saved between visits with immediate live response and reset button.
   */
  _bindMouseSettings() {
    const slider = this.dom.mouseSensitivity;
    const readout = this.dom.mouseSensitivityVal;
    const reset = this.dom.mouseReset;
    const setSensitivity = (percent) => {
      this.controls.mouseSensitivity = percent / 100;
      if (slider) slider.value = String(percent);
      if (readout) readout.textContent = `${percent}%`;
      store.set('mouseSensitivity', percent);
    };
    const stored = store.get('mouseSensitivity', LOOK.mouseDefault || 100);
    setSensitivity(stored);

    slider?.addEventListener('input', (event) => {
      setSensitivity(Number(event.target.value));
    });
    reset?.addEventListener('click', () => {
      setSensitivity(LOOK.mouseDefault || 100);
    });
  }

  /**
   * Two touch-look sliders (percent of LOOK.touchBase), saved between visits,
   * plus a button that restores the default for both axes.
   */
  _bindTouchLookSettings() {
    const sliders = { touchLookX: this.dom.touchLookX, touchLookY: this.dom.touchLookY };
    const setScale = (key, percent) => {
      this.controls[key] = percent / 100;
      store.set(key, percent);
    };
    for (const [key, slider] of Object.entries(sliders)) {
      if (!slider) continue;
      setScale(key, Number(slider.value));
      slider.addEventListener('input', (event) => setScale(key, Number(event.target.value)));
    }
    this.dom.touchLookReset?.addEventListener('click', () => {
      for (const [key, slider] of Object.entries(sliders)) {
        if (!slider) continue;
        slider.value = String(LOOK.touchDefault);
        setScale(key, LOOK.touchDefault);
      }
    });
  }

  _bindWindowEvents() {
    this._onResize = () => this._resize();
    this._onOrientation = () => {
      // Deliberately resize without rebuilding anything: the run state,
      // player position and creature path all survive the rotation.
      window.setTimeout(() => {
        this._resize();
        this._updateRotateHint();
      }, 120);
      this._updateRotateHint();
    };
    this._onVisibility = () => {
      if (document.hidden && this.state === 'playing') this.pause();
    };
    this._onMenuKey = (event) => {
      if (event.code !== 'Escape' && event.code !== 'KeyP') return;
      if (this.state === 'paused') this.resume();
    };

    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onOrientation);
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('keydown', this._onMenuKey);
    if (this.dom.overlays?.rotateDismiss) {
      this.dom.overlays.rotateDismiss.addEventListener('click', () => {
        this._rotateDismissed = true;
        store.set('rotateDismissed', true);
        this._updateRotateHint();
      });
    }
    if (this.dom.captureHint) {
      this.dom.captureHint.addEventListener('click', () => this.controls.requestPointerLock());
    }
    // HUD button (desktop, no pointer lock); touch uses its own button in touch.js
    this.dom.hud?.lumenButton?.addEventListener('click', () => this.controls.press('lumen'));
  }

  /* -------------------------------- run flow ------------------------------ */

  startRun() {
    if (!this.initialized) this.init();
    this._hideOverlays();
    this._resetRun();
    this.setState('playing');
    // drop any look or move input queued during the kill sequence or game over
    this.controls.releaseAll();
    this.controls.setEnabled(true);
    if (!this.touchEnabled) this.controls.requestPointerLock();
    else this._requestFullscreen();
    this.audio.startAmbience();
    this._startLoop();
  }

  restart() {
    this._hideOverlays();
    this._resetRun();
    this.setState('playing');
    // drop any look or move input queued during the kill sequence or game over
    this.controls.releaseAll();
    this.controls.setEnabled(true);
    if (!this.touchEnabled) this.controls.requestPointerLock();
    this.audio.resume();
    this._startLoop();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.controls.setEnabled(false);
    this.controls.exitPointerLock();
    this.hud.setThreat({});
    this._stopLoop();
    this.audio.suspend();
    this.renderer.render(this.scene, this.camera);
  }

  resume() {
    if (this.state !== 'paused') return;
    this._hideOverlays();
    this.setState('playing');
    // drop any look or move input queued during the kill sequence or game over
    this.controls.releaseAll();
    this.controls.setEnabled(true);
    if (!this.touchEnabled) this.controls.requestPointerLock();
    this.audio.resume();
    this._startLoop();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  /** Leave the facility entirely and return to the website. */
  quitToMenu() {
    this._stopLoop();
    this._hideOverlays();
    this.controls.setEnabled(false);
    this.controls.exitPointerLock();
    this.controls.releaseAll();
    this.lumen.stop();
    this.lumenKey.hide();
    this.hud.setLumen({ active: false });
    this.audio.stopAmbience();
    this.hud.setThreat({});
    this.setState('idle');
  }

  /** Open the facility map. The simulation stays frozen until it closes. */
  openMap() {
    if (!this.map || this.state !== 'playing' || this._finale !== null || this.map.isOpen) return;
    this.controls.setMapOpen(true);
    this.map.open(this.player);
    if (this.dom.captureHint) this.dom.captureHint.hidden = true;
    // the map needs a free cursor; pointer lock returns when it closes
    if (!this.touchEnabled) this.controls.exitPointerLock();
  }

  closeMap() {
    if (!this.map?.isOpen) return;
    this.map.close();
    this.controls.setMapOpen(false);
    if (this.state === 'playing' && this._finale === null && !this.touchEnabled) {
      this.controls.requestPointerLock();
    }
  }

  /** Use the security-room CCTV console. Freezes movement and look like the map does. */
  openCctv() {
    if (!this.cctv || this.state !== 'playing' || this._finale !== null) return;
    if (this.cctv.isOpen || this.map?.isOpen) return;
    this.controls.releaseAll();
    this.controls.setConsoleOpen(true);
    this.controls.clearActions();
    this.hud.setPrompt?.(null);
    if (this.dom.captureHint) this.dom.captureHint.hidden = true;
    // the console needs a free cursor; pointer lock returns when it closes
    if (!this.touchEnabled) this.controls.exitPointerLock();
    this.layer.classList.add('is-cctv');
    this.cctv.open(this.camera.aspect);
  }

  closeCctv() {
    if (!this.cctv?.isOpen) return;
    this.cctv.close();
    this.layer.classList.remove('is-cctv');
    this.controls.setConsoleOpen(false);
    this.controls.releaseAll();
    this.controls.clearActions();
    if (this.state === 'playing' && this._finale === null && !this.touchEnabled && !this.map?.isOpen) {
      this.controls.requestPointerLock();
    }
  }

  _resetRun() {
    this.lumen.stop();
    this.lumenKey.hide();
    this._recentLumenCells = [];
    this.player.reset(this.level.startCell);
    this.map?.reset(this.player);
    this.creature.reset(this.level.enemyCell);
    this._placeMaintenanceKey();
    this._spawnLumenKey();
    this.objectives.reset();
    this.hud.reset();
    this.hud.setObjective('Find the maintenance key', { flash: true });
    this.timer = 0;
    this.detections = 0;
    this.tension = 0;
    this._finale = null;
    this._lastTime = 0;
    this._catchT = 0;
    this._impacted = false;
    this._shake = 0;
    this._resetCatchView();
    this.audio.setTension(0);
    this.controls.clearActions();
    this._updateRotateHint();
  }

  setState(state, payload = {}) {
    this.state = state;
    // any state other than live play (pause, kill, finale, menus) closes the map
    if (state !== 'playing' && this.map?.isOpen) this.closeMap();
    if (state !== 'playing' && this.cctv?.isOpen) this.closeCctv();
    this.onStateChange(state, payload);
  }

  _hideOverlays() {
    this._setFade(0);
    const overlays = this.dom.overlays;
    if (!overlays) return;
    if (overlays.loading) overlays.loading.hidden = true;
    if (overlays.pause) overlays.pause.hidden = true;
    if (overlays.gameover) overlays.gameover.hidden = true;
    if (overlays.victory) overlays.victory.hidden = true;
  }

  /* --------------------------------- loop --------------------------------- */

  _startLoop() {
    if (this._raf !== null) return; // never stack loops
    this._lastTime = 0;
    this._raf = window.requestAnimationFrame(this._loop);
  }

  _stopLoop() {
    if (this._raf === null) return;
    window.cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _loop = (time) => {
    // the kill sequence runs on the same loop so it can animate after capture
    if (this.state !== 'playing' && this.state !== 'caught') {
      this._raf = null;
      return;
    }
    this._raf = window.requestAnimationFrame(this._loop);
    const dt = this._lastTime === 0 ? 0.016 : Math.min(MAX_DELTA, (time - this._lastTime) / 1000);
    this._lastTime = time;
    if (this.state === 'caught') this._updateCaught(dt);
    else this.update(dt);
    this.renderer.render(this.scene, this._viewCamera());
    if (this.map && this.state === 'playing') this.map.render(this.player);
  };

  update(dt) {
    const controls = this.controls;

    /* ---- facility map freezes the simulation; only M and Esc reach here */
    if (this.map?.isOpen) {
      if (controls.consumeAction('map') || controls.consumeAction('pause')) this.closeMap();
      controls.clearActions();
      return;
    }

    /* ---- CCTV console freezes the player; its feed keeps the world rendering */
    if (this.cctv?.isOpen) {
      if (controls.consumeAction('pause') || controls.consumeAction('interact')) this.closeCctv();
      else if (controls.consumeAction('cctvNext')) this.cctv.next();
      else if (controls.consumeAction('cctvPrev')) this.cctv.prev();
      else {
        for (let key = 1; key <= 9; key++) {
          if (controls.consumeAction(`cctvSelect${key}`)) {
            this.cctv.select(key - 1);
            break;
          }
        }
      }
      controls.clearActions();
      this.cctv.update(dt);
      this.level.update(dt, this.cctv.camera.position, this.cctv.camera);
      return;
    }

    /* ---- one-shot actions */
    if (controls.consumeAction('map')) {
      this.openMap();
      if (this.map?.isOpen) return;
    }
    if (controls.consumeAction('pause')) {
      this.pause();
      return;
    }
    if (controls.consumeAction('flashlight')) {
      if (this.player.toggleFlashlight()) this.audio.flashlight(this.player.flashlightOn);
    }
    if (controls.consumeAction('equip') && this._finale === null) this._toggleLumenEquip();
    if (controls.consumeAction('lumen') && this._finale === null) this._activateLumen();
    if (controls.consumeAction('mute')) {
      this.audio.setMuted(!this.audio.muted);
      if (this.dom.onMuteChange) this.dom.onMuteChange(this.audio.muted);
    }

    /* ---- escape cinematic takes over the camera */
    if (this._finale !== null) {
      this._updateFinale(dt);
      this.level.update(dt, this.camera.position, this.camera);
      this.hud.update(dt);
      this.hud.setTimer(this.timer);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.timer += dt;
    controls.updateKeyboardLook(dt);

    /* ---- player */
    this.player.update(dt, controls);
    if (this.player.stepEvent) this.audio.footstep(this.player.isSprinting);
    if (this.player.flashlightChanged) {
      this.audio.flashlight(this.player.flashlightOn);
      if (this.player.batteryDead) this.hud.showToast('Flashlight battery depleted');
    }

    this.map?.update(this.player);
    this.lumen.update(dt, this.player.position);
    this.lumenKey.update(dt, this.player.position);

    /* ---- creature */
    this.creature.update(dt, {
      player: this.player,
      onCatch: () => this._caught(),
      onAlert: () => this._onDetected(),
    });
    // a catch this frame has started the kill sequence (see _caught)
    if (this.state !== 'playing') return;

    /*
     * Directional threat warning: where is it, and what did it just do?
     *
     * Guarded on the run still being live: the creature calls _caught() from
     * inside update(), which hides this indicator, and writing it again
     * unconditionally here would switch it straight back on over the game-over
     * screen.
     */
    if (this.state === 'playing') {
      const cue = this.creature.cue;
      this.hud.setThreat({
        active: this.creature.nearPlayer,
        angle: this._threatBearing(),
        distance: this.creature.distanceToPlayer,
        chase: this.creature.mode === 'chase',
        cue: cue.age < CUE_FRESH ? cue.kind : null,
      });
    }

    /* ---- objectives + interactions */
    this.objectives.update(dt, this.player);
    if (controls.consumeAction('interact')) {
      this.objectives.interact(this.player);
    }

    /* ---- world + HUD */
    this.level.update(dt, this.camera.position, this.camera);

    this.tension = Math.max(
      this.creature.detection,
      Math.max(0, 1 - this.creature.distanceToPlayer / ENEMY.sightRange)
    );
    this.audio.setTension(this.creature.mode === 'chase' ? Math.max(0.55, this.tension) : this.tension);
    this.audio.update(dt);

    this.hud.setStamina(this.player.staminaRatio);
    this.hud.setBattery(this.player.batteryRatio, this.player.flashlightOn);
    this.hud.setLumen(this.lumen);
    this.hud.setTimer(this.timer);
    this.hud.setTension(this.creature.mode === 'chase' ? Math.max(0.5, this.tension) : this.tension);
    this.hud.update(dt);
  }

  /* ------------------------------- endings -------------------------------- */

  /**
   * Place the world LUMEN MAINTENANCE KEY on a reachable cell at least
   * minSpawnSteps away from the player, clear of the Warden and the exit key.
   * Called at the start of every run and again each time a surge expires.
   */
  _spawnLumenKey() {
    const from = worldToCell(this.player.position.x, this.player.position.z);
    const warden = worldToCell(this.creature.position.x, this.creature.position.z);
    const avoid = this._maintenanceSpot ? [warden, this._maintenanceSpot] : [warden];
    const cell = chooseLumenKeyCell({
      from,
      avoid,
      recent: this._recentLumenCells,
      recentRadius: LUMEN_KEY.recentRadius,
      minSteps: LUMEN_KEY.minSpawnSteps,
      clearance: LUMEN_KEY.clearance,
      filter: (candidate) => !this._inPlayerSight(candidate, LUMEN_KEY.viewRange),
    });
    if (!cell) {
      this.lumenKey.hide();
      return;
    }
    this.lumenKey.place(cell);
    this._recentLumenCells.push(cell);
    if (this._recentLumenCells.length > LUMEN_KEY.recentSpawns) this._recentLumenCells.shift();
  }

  /**
   * Hide this run's LUMEN MAINTENANCE KEY (the escape key) on an authored spot.
   * Preference order: reachable, far enough to be a search, out of the player's
   * sight, clear of the Warden, and not the spot used last. Each tier is only
   * used when the one before it has no candidates.
   */
  _placeMaintenanceKey() {
    const from = worldToCell(this.player.position.x, this.player.position.z);
    const warden = worldToCell(this.creature.position.x, this.creature.position.z);
    const dist = floorDistances(from);
    const stepsTo = (spot) => dist[spot.row * COLS + spot.col];
    const clearOfWarden = (spot) =>
      Math.abs(spot.col - warden.col) > LUMEN_KEY.clearance ||
      Math.abs(spot.row - warden.row) > LUMEN_KEY.clearance;
    const reachable = MAINTENANCE_SPOTS.filter((spot) => stepsTo(spot) >= 0);
    const far = reachable.filter((spot) => stepsTo(spot) >= MAINTENANCE_KEY.minSpawnSteps);
    const hidden = (spot) => !this._inPlayerSight(spot, MAINTENANCE_KEY.viewRange);
    const tiers = [
      far.filter((spot) => clearOfWarden(spot) && spot !== this._maintenanceSpot && hidden(spot)),
      far.filter((spot) => clearOfWarden(spot) && hidden(spot)),
      far.filter((spot) => clearOfWarden(spot)),
      far,
      reachable,
    ];
    const pool = tiers.find((tier) => tier.length) || MAINTENANCE_SPOTS;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    this._maintenanceSpot = spot;
    this.level.placeKey(spot);
  }

  /** True when a cell lies within `range` metres of the player and in their line of sight. */
  _inPlayerSight(cell, range) {
    const player = this.player.position;
    const { x, z } = cellToWorld(cell.col, cell.row);
    return (
      Math.hypot(x - player.x, z - player.z) < range &&
      hasLineOfSight(player.x, player.z, x, z)
    );
  }

  /** Called by Objectives when the player presses E on the world key. */
  _pickUpLumenKey() {
    if (this.state !== 'playing' || !this.lumenKey.visible || this.lumen.carried) return;
    this.lumenKey.hide();
    this.lumen.pickUp();
    this.audio.pickup();
    this.hud.showToast('Lumen key found — press R to equip it');
  }

  _toggleLumenEquip() {
    const result = this.lumen.toggleEquip();
    if (result === 'none') this.hud.showToast('No LUMEN MAINTENANCE KEY — search the facility');
    else if (result === 'surge') this.hud.showToast('Lumen surge is already running');
    else if (result === 'equipped') this.hud.showToast('Lumen key equipped — Q starts the surge');
    else this.hud.showToast('Lumen key stowed');
  }

  _activateLumen() {
    const result = this.lumen.activate();
    if (result === 'started') this.hud.showToast(`LUMEN SURGE · ${LUMEN.duration} seconds`);
    else if (result === 'missing') this.hud.showToast('No LUMEN MAINTENANCE KEY — find one first');
    else if (result === 'unequipped') this.hud.showToast('Equip the LUMEN MAINTENANCE KEY first (R)');
    // 'active': the surge is already burning; pressing again must not reset it
  }

  /** The surge ran out: the key is spent, so search for the next one. */
  _onLumenExpired() {
    this.hud.showToast('The Lumen surge has faded — the key is spent');
    this._spawnLumenKey();
  }

  _onDetected() {
    this.detections += 1;
    this.hud.showToast('It has seen you');
  }

  /**
   * Capture: lock the player and start the kill sequence once. The Warden
   * lunges and grips on the loop (see _updateCaught); GAME OVER only appears
   * when the sequence finishes (see _finishCatch).
   */
  _caught() {
    if (this.state !== 'playing') return;
    this.controls.setEnabled(false);
    this.controls.exitPointerLock();
    this.audio.setTension(0);
    this.audio.caught();
    this.lumen.stop();
    this.lumenKey.hide();
    this.hud.setLumen({ active: false });
    this.hud.setDamage(true);
    this.hud.setPrompt(null);
    this.hud.setThreat({});
    this.layer.classList.add('is-caught');
    if (this.dom.captureHint) this.dom.captureHint.hidden = true;
    this._catchT = 0;
    this._impacted = false;
    this._shake = 0;
    this._catchFrom.copy(this.camera.position);
    this._catchCam.copy(this._killCameraPosition());
    this._setCatchBasis();
    this.setState('caught');
    if (!CATCH.enabled) {
      this._finishCatch();
      return;
    }
    this.creature.beginCatch(this._catchCam, CATCH);
  }

  /**
   * Where the kill lens sits: the player's eye pulled back along the line from
   * the Warden, stopping short of any wall, so the face never meets the lens.
   */
  _killCameraPosition() {
    const eye = this.camera.position;
    const warden = this.creature.group.position;
    const dx = eye.x - warden.x;
    const dz = eye.z - warden.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    let back = 0;
    for (let s = 0.1; s <= CATCH.pullback + 1e-6; s += 0.1) {
      // probe half a metre past the lens so the camera keeps clear of wall edges
      if (isSolidAt(eye.x + ux * (s + 0.5), eye.z + uz * (s + 0.5))) break;
      back = s;
    }
    return new THREE.Vector3(eye.x + ux * back, eye.y, eye.z + uz * back);
  }

  /** Sideways and vertical axes of the kill lens; shake moves only along these. */
  _setCatchBasis() {
    const fwd = new THREE.Vector3().subVectors(this.creature.headPosition, this._catchCam).normalize();
    this._catchRight.crossVectors(fwd, WORLD_UP).normalize();
    this._catchUp.crossVectors(this._catchRight, fwd).normalize();
  }

  /** Drives the kill sequence: rush, impact flash, dolly, zoom, shake, hold, fade. */
  _updateCaught(dt) {
    this._catchT += dt;
    if (!this._impacted && this._catchT >= CATCH.lungeTime) {
      this._impacted = true;
      this._shake = CATCH.shake * this._shakeScale;
      this._flashAmt = this.reducedMotion ? 0 : 0.8;
      this.audio.growl(1);
    }
    this._shake *= Math.exp(-dt * 9);
    this._flashAmt *= Math.exp(-dt * 7);
    this._setFlash(this._flashAmt);

    // the Warden owns its body through the catch (no sensing, no steering)
    this.creature.updateCatch(dt);

    // dolly from the player's eye to the kill lens (a cut when reduced motion is on)
    const dollyTime = this.reducedMotion ? 0.0001 : CATCH.dollyTime;
    const k = clamp(this._catchT / dollyTime, 0, 1);
    const e = k * k * (3 - 2 * k);
    this.camera.position.lerpVectors(this._catchFrom, this._catchCam, e);

    // shake sideways and vertically only, so the lens never moves into the Warden
    const amp = this._shake;
    this.camera.position
      .addScaledVector(this._catchRight, (Math.random() * 2 - 1) * amp)
      .addScaledVector(this._catchUp, (Math.random() * 2 - 1) * amp * 0.6);

    // zoom in as the face arrives; reduced motion keeps most of the field of view
    const zoom = clamp(this._catchT / CATCH.lungeTime, 0, 1) * (this.reducedMotion ? 0.4 : 1);
    this.camera.fov = this._baseFov + (CATCH.zoomFov - this._baseFov) * zoom;
    this.camera.updateProjectionMatrix();
    // aim a little below the head's centre so the jaw and teeth stay inside the frame
    const aim = this.creature.headPosition;
    this.camera.lookAt(aim.x, aim.y - CATCH.aimDrop, aim.z);

    const fadeStart = CATCH.lungeTime + CATCH.holdTime - CATCH.fadeTime;
    this._showCaughtText(
      this._catchT >= CATCH.lungeTime + CATCH.textDelay && this._catchT < fadeStart
    );
    this._setFade(clamp((this._catchT - fadeStart) / CATCH.fadeTime, 0, 1));
    this.level.update(dt, this.camera.position, this.camera);
    this.hud.update(dt);

    if (this.creature.catchFinished) this._finishCatch();
  }

  _finishCatch() {
    if (this.state !== 'caught') return;
    this._stopLoop();
    this._showCaughtText(false);
    this._setFade(1);
    this.setState('dead', {
      time: this.timer,
      hasKey: this.objectives.hasKey,
      detections: this.detections,
    });
  }

  /**
   * Put the lens, zoom, veils and caption back to normal. Runs at the start of
   * every run, so a restart after the kill sequence begins from a clean view.
   */
  _resetCatchView() {
    this.layer.classList.remove('is-caught');
    this._flashAmt = 0;
    this._setFlash(0);
    this._setFade(0);
    this._showCaughtText(false);
    if (this._baseFov && this.camera) {
      this.camera.fov = this._baseFov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Show or hide the CAUGHT YOU caption; only touches the DOM on change. */
  _showCaughtText(on) {
    if (on === this._textShown) return;
    this._textShown = on;
    if (!this._caughtText) this._caughtText = this.layer.querySelector('#caught-text');
    if (this._caughtText) this._caughtText.hidden = !on;
  }

  /** Full-screen black for the cinematic fade. Lives inside the game layer, above the HUD. */
  _setFade(alpha) {
    if (!this._fade) {
      if (alpha <= 0) return;
      this._fade = this._makeVeil('#000', 15);
    }
    this._fade.style.opacity = String(alpha);
  }

  /** Red impact flash, inside the game layer and under the fade. */
  _setFlash(alpha) {
    if (!this._flash) {
      if (alpha <= 0) return;
      this._flash = this._makeVeil('rgba(170, 8, 16, 0.9)', 14);
    }
    this._flash.style.opacity = String(alpha);
  }

  _makeVeil(background, zIndex) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      inset: '0',
      background,
      opacity: '0',
      pointerEvents: 'none',
      zIndex: String(zIndex),
    });
    this.layer.appendChild(el);
    return el;
  }

  _beginFinale() {
    if (this._finale !== null) return;
    this._finale = 0;
    this.lumen.stop();
    this.lumenKey.hide();
    this.hud.setLumen({ active: false });
    this._finaleStart.copy(this.camera.position);
    this.controls.setEnabled(false);
    this.hud.setPrompt(null);
    this.hud.setThreat({});
    this.hud.showToast('The lift is opening — get in');
    this.audio.setTension(0);
  }

  _updateFinale(dt) {
    this._finale += dt;
    const raw = Math.min(1, this._finale / FINALE_DURATION);
    const ease = raw * raw * (3 - 2 * raw);
    const door = this.level.exitDoor.position;
    const targetZ = door.z - 0.6;
    this.camera.position.set(
      lerp(this._finaleStart.x, door.x, ease),
      PLAYER.eyeHeight + Math.sin(ease * Math.PI) * 0.06,
      lerp(this._finaleStart.z, targetZ, ease)
    );
    this.camera.lookAt(door.x, 1.55, door.z);

    if (raw >= 1) {
      this._stopLoop();
      this.audio.victory();
      this.setState('won', {
        time: this.timer,
        stamina: Math.round(this.player.staminaRatio * 100),
        detections: this.detections,
      });
    }
  }

  /* ------------------------------ pointer lock ---------------------------- */

  _onPointerLockChange(locked) {
    if (locked) {
      if (this.dom.captureHint) this.dom.captureHint.hidden = true;
      return;
    }
    if (this.state === 'playing' && !this.touchEnabled && !this.map?.isOpen && !this.cctv?.isOpen) {
      if (this.dom.captureHint) this.dom.captureHint.hidden = false;
    }
  }

  /* ------------------------------- fullscreen ----------------------------- */

  _requestFullscreen() {
    const element = this.layer;
    const request = element.requestFullscreen || element.webkitRequestFullscreen;
    if (!request) return; // iOS Safari: menus still work, gameplay stays windowed
    try {
      const result = request.call(element, { navigationUI: 'hide' });
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      /* fullscreen is a nicety, never a requirement */
    }
  }

  /* -------------------------------- quality ------------------------------- */

  applyQuality(name) {
    const quality = QUALITY[name];
    if (!quality) return;
    this.qualityName = name;
    this.quality = quality;
    store.set('quality', name);
    if (!this.initialized) return;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap));
    if (this.renderer.shadowMap.enabled !== quality.shadows) {
      this.renderer.shadowMap.enabled = quality.shadows;
      this.scene.traverse((child) => {
        if (child.isMesh || child.isPoints) {
          const material = child.material;
          if (Array.isArray(material)) material.forEach((m) => (m.needsUpdate = true));
          else if (material) material.needsUpdate = true;
        }
      });
    }
    this.player.quality = quality;
    this.player.setShadows(quality.shadows);
    this.level.applyQuality(quality);
    if (this.creature.glow) this.creature.glow.visible = quality.name === 'high';
    if (this.scene.fog) this.scene.fog.density = quality.fogDensity;
    this._resize();
    if (this.state === 'paused') this.renderer.render(this.scene, this.camera);
  }

  setMuted(muted) {
    this.audio.setMuted(muted);
    store.set('muted', muted);
    if (this.dom.onMuteChange) this.dom.onMuteChange(muted);
  }

  /* --------------------------------- resize ------------------------------- */

  _resize() {
    if (!this.renderer) return;
    const width = Math.max(1, this.layer.clientWidth || window.innerWidth);
    const height = Math.max(1, this.layer.clientHeight || window.innerHeight);
    this.map?._resizeDimensions?.();
    if (width === this._lastWidth && height === this._lastHeight) return;
    this._lastWidth = width;
    this._lastHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.cctv?.setAspect(width / height);
    // widen the field of view on very tall/narrow phone screens
    const portrait = height > width;
    this.camera.fov = this.touchEnabled ? (portrait ? 82 : 76) : 72;
    this.camera.updateProjectionMatrix();
  }

  _updateRotateHint() {
    const hint = this.dom.overlays?.rotateHint;
    if (!hint) return;
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const show =
      this.touchEnabled && portrait && this.state === 'playing' && !this._rotateDismissed;
    hint.hidden = !show;
  }

  /* ------------------------------ QA / debug ------------------------------ */

  /* --------------------------- threat indicator --------------------------- */

  /**
   * Degrees clockwise from straight ahead to the creature, taken from the
   * camera's own axes so it stays correct whether the view is driven by the
   * mouse, a touch drag or the arrow keys. 0 is directly in front, +90 is to
   * your right, ±180 is behind you.
   */
  _threatBearing() {
    if (!this._threatForward) {
      this._threatForward = new THREE.Vector3();
      this._threatRight = new THREE.Vector3();
      this._threatTo = new THREE.Vector3();
    }
    // Read the quaternion rather than matrixWorld: the camera's world matrix is
    // only refreshed at render time, so this frame's view would not be in it.
    const forward = this._threatForward
      .set(0, 0, -1)
      .applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    const right = this._threatRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    const to = this._threatTo.subVectors(this.creature.position, this.camera.position);
    to.y = 0;
    if (forward.lengthSq() < 1e-6 || to.lengthSq() < 1e-6) return 0;
    forward.normalize();
    right.normalize();
    to.normalize();
    return (Math.atan2(right.dot(to), forward.dot(to)) * 180) / Math.PI;
  }

  /**
   * Deterministic single step. The animation loop calls update() on every
   * frame; QA and automated checks can drive the identical code path with a
   * fixed delta instead of relying on requestAnimationFrame timing.
   */
  step(dt = 1 / 60) {
    if (!this.initialized) return false;
    // same split as the rAF loop: the kill sequence advances while 'caught'
    if (this.state === 'caught') this._updateCaught(Math.min(MAX_DELTA, dt));
    else if (this.state === 'playing') this.update(Math.min(MAX_DELTA, dt));
    else return false;
    this.renderer.render(this.scene, this._viewCamera());
    return true;
  }

  teleport(col, row) {
    this.player.teleport(col, row);
  }

  teleportCreature(col, row) {
    this.creature.reset({ col, row });
  }

  interact() {
    return this.objectives.interact(this.player);
  }

  get debug() {
    return {
      state: this.state,
      timer: Number(this.timer.toFixed(2)),
      playerCell: this.level && this.player ? this._cellOf(this.player.position) : null,
      hasKey: this.objectives ? this.objectives.hasKey : false,
      exitUnlocked: this.objectives ? this.objectives.exitUnlocked : false,
      doorOpen: this.level ? Number(this.level.exitDoor.getOpen().toFixed(2)) : 0,
      flashlight: this.player ? this.player.flashlightOn : false,
      lumen: this.lumen
        ? {
            carried: this.lumen.carried,
            equipped: this.lumen.equipped,
            active: this.lumen.active,
            remaining: Number(this.lumen.remaining.toFixed(2)),
            strength: Number(this.lumen.strength.toFixed(2)),
          }
        : null,
      stamina: this.player ? Number(this.player.staminaRatio.toFixed(2)) : 0,
      battery: this.player ? Number(this.player.batteryRatio.toFixed(2)) : 0,
      creature: this.creature
        ? {
            mode: this.creature.mode,
            detection: Number(this.creature.detection.toFixed(2)),
            distance: Number(this.creature.distanceToPlayer.toFixed(2)),
            near: this.creature.nearPlayer,
            bearing: Number(this._threatBearing().toFixed(1)),
            cue: this.creature.cue.age < CUE_FRESH ? this.creature.cue.kind : null,
            pathLength: this.creature.path.length,
            clipping: this.creature.clipping,
            recovering: this.creature.recovering,
            x: Number(this.creature.position.x.toFixed(2)),
            z: Number(this.creature.position.z.toFixed(2)),
          }
        : null,
      detections: this.detections,
    };
  }

  _cellOf(position) {
    return worldToCell(position.x, position.z);
  }

  /** The camera the frame is drawn from: the CCTV feed while the console is open. */
  _viewCamera() {
    return this.cctv?.isOpen ? this.cctv.camera : this.camera;
  }

  dispose() {
    this._stopLoop();
    this.cctv?.dispose();
    this.controls?.detach();
    this.touch?.disable();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onOrientation);
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('keydown', this._onMenuKey);
    this.level?.dispose();
    this.creature?.dispose();
    this.lumen?.dispose();
    this.lumenKey?.dispose();
    this.renderer?.dispose();
    this.initialized = false;
  }
}
