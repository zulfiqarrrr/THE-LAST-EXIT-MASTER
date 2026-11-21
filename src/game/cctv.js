/* ==========================================================================
   THE LAST EXIT — CCTV surveillance
   Fixed cameras on real hospital floor cells. Each feed is the live scene
   seen through its own PerspectiveCamera; the game renders that camera while
   the console is open. Nothing here reads the Warden's position: the feeds
   show only what the lenses see.
   ========================================================================== */

import * as THREE from 'three';
import { cellToWorld } from './level.js';

/** Metres above the floor: mounted high, under the 3.2 m ceiling. */
const MOUNT_HEIGHT = 2.55;
/** Metres above the floor the lens aims at (roughly chest height). */
const AIM_HEIGHT = 1.15;
const FEED_FOV = 58;
/** Seconds of static shown after switching feeds. */
const SWITCH_STATIC = 0.34;
/** Random interference bursts arrive every GLITCH_MIN..GLITCH_MAX seconds. */
const GLITCH_MIN = 28;
const GLITCH_MAX = 60;
const GLITCH_TIME = 0.5;
const CLOCK_EVERY = 0.25;
/**
 * The feeds sit in corridors that the flashlight never reaches, so a small lamp
 * rides in front of the lens while the console is open. It is off otherwise,
 * so gameplay lighting is untouched.
 */
const FEED_LAMP_INTENSITY = 24;
const FEED_LAMP_DISTANCE = 10;

/**
 * Fixed surveillance cameras. `cell` is where the lens sits and `aim` is the
 * cell it looks at, both as [col, row] on the level grid (see level.js).
 */
export const CCTV_CAMERAS = [
  { id: 'CAM 01', name: 'MAIN CORRIDOR', cell: [19, 2], aim: [35, 2] },
  { id: 'CAM 02', name: 'GENERAL WARD', cell: [22, 4], aim: [30, 4] },
  { id: 'CAM 03', name: 'PATIENT WING HALL', cell: [19, 14], aim: [36, 14] },
  { id: 'CAM 04', name: 'PATIENT ROOM', cell: [30, 16], aim: [34, 17] },
  { id: 'CAM 05', name: 'SERVICE CORRIDOR', cell: [32, 20], aim: [20, 20] },
  { id: 'CAM 06', name: 'STORAGE ROOM', cell: [28, 23], aim: [24, 23] },
];

const nextGlitchDelay = () => GLITCH_MIN + Math.random() * (GLITCH_MAX - GLITCH_MIN);

export class CctvSystem {
  /**
   * @param {object} options
   * @param {HTMLElement} options.root   the `#cctv` overlay element
   * @param {() => void} options.onExit  called when the player leaves the console
   */
  constructor({ root, scene, onExit }) {
    this.root = root;
    this.scene = scene || null;
    this.onExit = onExit || (() => {});
    this.isOpen = false;
    this.index = 0;
    this.camera = new THREE.PerspectiveCamera(FEED_FOV, 1, 0.05, 90);
    this.lamp = new THREE.PointLight(0xe6f7ff, 0, FEED_LAMP_DISTANCE, 2);
    this.lamp.castShadow = false;
    if (this.scene) this.scene.add(this.lamp);

    this.feeds = CCTV_CAMERAS.map((feed) => {
      const at = cellToWorld(feed.cell[0], feed.cell[1]);
      const to = cellToWorld(feed.aim[0], feed.aim[1]);
      return {
        ...feed,
        position: new THREE.Vector3(at.x, MOUNT_HEIGHT, at.z),
        target: new THREE.Vector3(to.x, AIM_HEIGHT, to.z),
      };
    });

    this._staticT = 0;
    this._glitchIn = nextGlitchDelay();
    this._clockT = 0;

    this._queryDom();
    this._onClick = (event) => this._handleClick(event);
    this.root.addEventListener('click', this._onClick);
    this.root.hidden = true;
  }

  _queryDom() {
    const root = this.root;
    this.elId = root.querySelector('[data-cctv-id]');
    this.elName = root.querySelector('[data-cctv-name]');
    this.elCount = root.querySelector('[data-cctv-count]');
    this.elSignal = root.querySelector('[data-cctv-signal]');
    this.elClock = root.querySelector('[data-cctv-clock]');
    this.elNoise = root.querySelector('[data-cctv-noise]');
    const holder = root.querySelector('[data-cctv-cams]');
    this.elButtons = this.feeds.map((feed, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cctv__cam-btn';
      button.dataset.cctv = 'cam';
      button.dataset.index = String(i);
      button.textContent = String(i + 1).padStart(2, '0');
      button.title = `${feed.id} — ${feed.name}`;
      button.setAttribute('aria-label', `${feed.id} ${feed.name}`);
      holder.appendChild(button);
      return button;
    });
  }

  _handleClick(event) {
    const control = event.target.closest?.('[data-cctv]');
    if (!control || !this.root.contains(control)) return;
    const action = control.dataset.cctv;
    if (action === 'cam') this.select(Number(control.dataset.index));
    else if (action === 'prev') this.prev();
    else if (action === 'next') this.next();
    else if (action === 'exit') this.onExit();
  }

  /** Show the console. The caller owns input capture and pointer lock. */
  open(aspect = 16 / 9) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setAspect(aspect);
    this.lamp.intensity = FEED_LAMP_INTENSITY;
    this.root.hidden = false;
    this._staticT = SWITCH_STATIC;
    this._glitchIn = nextGlitchDelay();
    this._clockT = 0;
    this._showFeed();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.lamp.intensity = 0;
    this.root.hidden = true;
    this._staticT = 0;
    this._setNoise(false);
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  select(index) {
    const count = this.feeds.length;
    const next = ((index % count) + count) % count;
    if (next === this.index && this.isOpen) return;
    this.index = next;
    if (this.isOpen) {
      this._staticT = SWITCH_STATIC;
      this._showFeed();
    }
  }

  next() {
    this.select(this.index + 1);
  }

  prev() {
    this.select(this.index - 1);
  }

  /** Advance the static bursts and the clock. Feeds themselves render from the scene. */
  update(dt) {
    if (!this.isOpen) return;
    if (this._staticT > 0) this._staticT = Math.max(0, this._staticT - dt);
    this._glitchIn -= dt;
    if (this._glitchIn <= 0) {
      this._staticT = Math.max(this._staticT, GLITCH_TIME);
      this._glitchIn = nextGlitchDelay();
    }
    const interfering = this._staticT > 0;
    this._setNoise(interfering);
    this._clockT -= dt;
    if (this._clockT <= 0) {
      this._clockT = CLOCK_EVERY;
      this.elClock.textContent = new Date().toTimeString().slice(0, 8);
    }
    if (this.elSignal) {
      this.elSignal.textContent = interfering ? 'SIGNAL INTERFERENCE' : 'LIVE';
      this.elSignal.classList.toggle('is-weak', interfering);
    }
  }

  _showFeed() {
    const feed = this.feeds[this.index];
    this.camera.position.copy(feed.position);
    this.camera.lookAt(feed.target);
    this.camera.updateMatrixWorld();
    // the lamp hangs just in front of the lens and lights the view it looks at
    this.lamp.position.copy(feed.position).lerp(feed.target, 0.15);
    this.elId.textContent = feed.id;
    this.elName.textContent = feed.name;
    this.elCount.textContent = `${this.index + 1} / ${this.feeds.length}`;
    this.elButtons.forEach((button, i) => {
      const active = i === this.index;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  _setNoise(on) {
    if (this.elNoise) this.elNoise.hidden = !on;
  }

  dispose() {
    this.root.removeEventListener('click', this._onClick);
    if (this.scene) this.scene.remove(this.lamp);
    const holder = this.root.querySelector('[data-cctv-cams]');
    if (holder) holder.textContent = '';
    this.elButtons = [];
    this.isOpen = false;
  }
}
