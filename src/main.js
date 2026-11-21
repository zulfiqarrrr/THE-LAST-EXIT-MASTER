/* ==========================================================================
   THE LAST EXIT — application bootstrap
   Connects the website layer, the game layer and every menu. The Game object
   is created on the first PLAY press so the landing page stays light.
   ========================================================================== */

import { AudioEngine } from './game/audio.js';
import { Hud, formatTime } from './game/hud.js';
import { HeroScene } from './game/hero.js';
import { Game } from './game/game.js';
import { loadWardenModel } from './game/warden-model.js';
import { LOOK, QUALITY, detectQuality, isTouchDevice, setForcedTouch, store } from './game/config.js';
import { setupSite } from './site/site.js';

const get = (selector) => document.querySelector(selector);

// ?touch=1 | ?touch=0 pins the control scheme (QA + tablets with keyboards).
try {
  const params = new URLSearchParams(window.location.search);
  const touchParam = params.get('touch');
  if (touchParam === '1' || touchParam === 'true') setForcedTouch(true);
  else if (touchParam === '0' || touchParam === 'false') setForcedTouch(false);
} catch {
  /* no query support: fall back to detection */
}

/* --------------------------------- DOM ---------------------------------- */

const dom = {
  site: get('#site'),
  layer: get('#game-layer'),
  canvas: get('#game-canvas'),
  heroCanvas: get('#hero-canvas'),
  heroHint: get('#hero-device-hint'),
  controlNote: get('#control-note'),
  nav: get('#sitenav'),
  playButtons: Array.from(document.querySelectorAll('[data-play]')),
  muteButtons: [get('#site-mute')].filter(Boolean),
  hud: {
    root: get('#hud'),
    objective: get('#hud-objective'),
    objectiveWrapper: get('#hud-objective')?.closest('.hud__objective') || null,
    timer: get('#hud-timer'),
    stamina: get('#gauge-stamina'),
    battery: get('#gauge-battery'),
    flashState: get('#hud-flash-state'),
    key: get('#hud-key'),
    danger: get('#danger'),
    damage: get('#damage'),
    threat: get('#threat'),
    threatArrow: get('#threat-arrow'),
    threatCaption: get('#threat-caption'),
    reticle: get('#reticle'),
    prompt: get('#prompt'),
    toast: get('#toast'),
    interactButton: get('#btn-interact'),
    flashButton: get('#btn-flash'),
    lumenButton: get('#hud-lumen'),
    lumenTime: get('#hud-lumen-time'),
    lumenFill: get('#gauge-lumen'),
    lumenTouch: get('#btn-lumen'),
    lumenTouchLabel: get('#btn-lumen .tbtn__label'),
  },
  touch: {
    root: get('#touch'),
    stick: get('#touch-stick'),
    knob: get('#touch-knob'),
    look: get('#touch-look'),
    sprintButton: get('#btn-sprint'),
    interactButton: get('#btn-interact'),
    flashButton: get('#btn-flash'),
    lumenButton: get('#btn-lumen'),
  },
  overlays: {
    loading: get('#loading'),
    loadingText: get('#loading-text'),
    loadbar: get('#loadbar-fill'),
    pause: get('#pause-menu'),
    pauseObjective: get('#pause-objective'),
    pauseHint: get('#pause-hint'),
    gameover: get('#gameover'),
    deadTime: get('#dead-time'),
    deadKey: get('#dead-key'),
    deadNote: get('#dead-note'),
    victory: get('#victory'),
    winTime: get('#win-time'),
    winStamina: get('#win-stamina'),
    winDetections: get('#win-detections'),
    rotateHint: get('#rotate-hint'),
    rotateDismiss: get('#btn-rotate-dismiss'),
    webglError: get('#webgl-error'),
    webglErrorText: get('#webgl-error-text'),
  },
  captureHint: get('#capture-hint'),
  map: {
    minimap: { root: get('#minimap'), canvas: get('#minimap-canvas'), label: get('#minimap-label') },
    full: {
      root: get('#facility-map'),
      canvas: get('#fmap-canvas'),
      location: get('#fmap-location'),
      ward: get('#fmap-ward'),
      percent: get('#fmap-percent'),
      wardPanel: get('#fmap-ward-panel'),
      percentPanel: get('#fmap-percent-panel'),
      close: get('#fmap-close'),
      zoomIn: get('#fmap-zoom-in'),
      zoomOut: get('#fmap-zoom-out'),
      centre: get('#fmap-centre'),
    },
    touchButton: get('#btn-map'),
  },
  touchLookX: get('#look-sensitivity'),
  touchLookY: get('#look-sensitivity-y'),
  touchLookReset: get('#btn-touch-reset'),
  mouseSensitivity: get('#mouse-sensitivity'),
  mouseSensitivityVal: get('#mouse-sensitivity-val'),
  mouseReset: get('#btn-mouse-reset'),
  pauseButton: get('#btn-pause'),
  qualityButtons: Array.from(document.querySelectorAll('[data-quality]')),
  muteSegments: Array.from(document.querySelectorAll('[data-mute]')),
};

/* ------------------------------ WebGL guard ----------------------------- */

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

function fail(reason) {
  const overlay = dom.overlays.webglError;
  if (dom.overlays.webglErrorText && reason) dom.overlays.webglErrorText.textContent = reason;
  overlay.hidden = false;
  for (const button of dom.playButtons) {
    button.disabled = true;
    button.title = 'WebGL is required to play THE LAST EXIT';
  }
}

const webglOk = supportsWebGL();
if (!webglOk) {
  fail(
    'THE LAST EXIT renders real-time 3D, which needs WebGL. Enable hardware acceleration in your browser settings, update your browser, or try another one — then reload the page.'
  );
}

/* --------------------------------- boot --------------------------------- */

const audio = new AudioEngine();
const hud = new Hud(dom.hud);
let hero = null;
let game = null;
let starting = false;
let lastFocused = null;

const storedMuted = store.get('muted', false);
audio.setMuted(storedMuted);
const storedQuality = store.get('quality', detectQuality());
if (dom.touchLookX) dom.touchLookX.value = String(store.get('touchLookX', LOOK.touchDefault));
if (dom.touchLookY) dom.touchLookY.value = String(store.get('touchLookY', LOOK.touchDefault));

const site = setupSite({
  dom,
  audio,
  onPlay: () => startGame(),
  onToggleMute: (muted) => applyMute(muted),
});

function applyMute(muted) {
  audio.setMuted(muted);
  store.set('muted', muted);
  site.setMutedUi(muted);
  for (const button of dom.muteSegments) {
    button.classList.toggle('is-active', button.dataset.mute === (muted ? 'on' : 'off'));
  }
}
applyMute(storedMuted);

function updateQualityUi() {
  for (const button of dom.qualityButtons) {
    button.classList.toggle('is-active', button.dataset.quality === qualityName);
  }
}
let qualityName = QUALITY[storedQuality] ? storedQuality : 'high';
updateQualityUi();

/* ------------------------------ hero scene ------------------------------ */

if (webglOk) {
  hero = new HeroScene(dom.heroCanvas);
  if (!hero.failed) hero.start();
}

/* ------------------------------ game lifecycle -------------------------- */

function showOverlay(element, focusTarget) {
  if (!element) return;
  lastFocused = document.activeElement;
  element.hidden = false;
  if (focusTarget) window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 40);
}

function hideOverlay(element) {
  if (!element) return;
  element.hidden = true;
}

function setBodyPlaying(playing) {
  document.body.classList.toggle('is-playing', playing);
  document.documentElement.classList.toggle('is-playing', playing);
  if (playing) {
    dom.site?.classList.add('is-hidden');
    dom.layer.hidden = false;
    dom.touch.root.hidden = !isTouchDevice();
    document.activeElement?.blur?.();
  } else {
    dom.site?.classList.remove('is-hidden');
    dom.layer.hidden = true;
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }
  dom.layer.classList.toggle('is-fading-in', playing);
}

function handleState(state, payload = {}) {
  switch (state) {
    case 'idle':
      setBodyPlaying(false);
      hideOverlay(dom.overlays.loading);
      hideOverlay(dom.overlays.pause);
      hideOverlay(dom.overlays.gameover);
      hideOverlay(dom.overlays.victory);
      hideOverlay(dom.overlays.rotateHint);
      hero?.resume();
      break;

    case 'playing':
      setBodyPlaying(true);
      hideOverlay(dom.overlays.loading);
      hideOverlay(dom.overlays.pause);
      hideOverlay(dom.overlays.gameover);
      hideOverlay(dom.overlays.victory);
      hud.setDamage(false);
      hero?.suspend();
      if (dom.captureHint) dom.captureHint.hidden = isTouchDevice();
      break;

    case 'paused': {
      const objective = game?.objectives.hasKey
        ? 'Objective: reach the blast door in the generator room'
        : 'Objective: find the maintenance key in the laboratory';
      if (dom.overlays.pauseObjective) dom.overlays.pauseObjective.textContent = objective;
      if (dom.overlays.pauseHint) {
        dom.overlays.pauseHint.textContent = isTouchDevice()
          ? 'Thumb stick to move, drag the screen to look, hold Sprint to run.'
          : 'Click Resume (or press Esc) then click the screen to capture the mouse again.';
      }
      updateQualityUi();
      showOverlay(dom.overlays.pause, get('#btn-resume'));
      break;
    }

    case 'dead':
      if (dom.overlays.deadTime) dom.overlays.deadTime.textContent = formatTime(payload.time || 0);
      if (dom.overlays.deadKey) dom.overlays.deadKey.textContent = payload.hasKey ? 'Yes' : 'No';
      if (dom.overlays.deadNote) {
        dom.overlays.deadNote.textContent = payload.hasKey
          ? 'You had the key. It still had the corridors.'
          : 'It heard you before it saw you.';
      }
      showOverlay(dom.overlays.gameover, get('#btn-retry'));
      break;

    case 'won':
      if (dom.overlays.winTime) dom.overlays.winTime.textContent = formatTime(payload.time || 0);
      if (dom.overlays.winStamina) dom.overlays.winStamina.textContent = `${payload.stamina ?? 0}%`;
      if (dom.overlays.winDetections) {
        dom.overlays.winDetections.textContent = String(payload.detections ?? 0);
      }
      showOverlay(dom.overlays.victory, get('#btn-again'));
      break;

    default:
      break;
  }
}

function ensureGame(warden) {
  if (game) return game;
  game = new Game({
    canvas: dom.canvas,
    layer: dom.layer,
    hud,
    audio,
    dom: { ...dom, onMuteChange: (muted) => applyMute(muted) },
    quality: qualityName,
    onStateChange: handleState,
    warden,
  });
  game.applyQuality(qualityName);
  return game;
}

let prewarmPromise = null;
function prewarmGame() {
  if (prewarmPromise) return prewarmPromise;
  prewarmPromise = (async () => {
    try {
      const warden = await loadWardenModel();
      const instance = ensureGame(warden);
      await instance.prepare();
      return instance;
    } catch (err) {
      console.warn('[THE LAST EXIT] background prewarm deferred:', err);
      return null;
    }
  })();
  return prewarmPromise;
}

async function startGame() {
  if (starting) return;
  // never restart a run that is already active
  if (game && (game.state === 'playing' || game.state === 'paused' || game.state === 'caught')) return;
  if (!webglOk) {
    fail();
    return;
  }

  // The AudioContext must be created inside the user gesture.
  audio.init();
  audio.setMuted(store.get('muted', false));

  hideOverlay(dom.overlays.gameover);
  hideOverlay(dom.overlays.victory);
  hideOverlay(dom.overlays.pause);

  // If game is already pre-warmed and prepared, launch IMMEDIATELY inside the user gesture.
  // This guarantees pointer lock succeeds immediately with zero startup delay.
  if (game && game._prepared) {
    dom.overlays.loading.hidden = true;
    game.startRun();
    return;
  }

  // If resources are still loading, show a lightweight loading indicator without fake progression.
  starting = true;
  dom.overlays.loading.hidden = false;
  if (dom.overlays.loadingText) dom.overlays.loadingText.textContent = 'Descending…';
  if (dom.overlays.loadbar) {
    dom.overlays.loadbar.classList.add('is-indeterminate');
    dom.overlays.loadbar.style.width = '100%';
  }

  try {
    const warden = await loadWardenModel();
    const instance = ensureGame(warden);
    await instance.prepare();
    dom.overlays.loading.hidden = true;
    instance.startRun();
  } catch (error) {
    console.error('[THE LAST EXIT] failed to start', error);
    fail(
      `The facility could not be built on this device: ${
        error && error.message ? error.message : 'unknown error'
      }`
    );
    dom.overlays.loading.hidden = true;
  } finally {
    starting = false;
    dom.overlays.loading.hidden = true;
    if (dom.overlays.loadbar) {
      dom.overlays.loadbar.classList.remove('is-indeterminate');
      dom.overlays.loadbar.style.width = '0%';
    }
  }
}

/* ------------------------------- menu wiring ---------------------------- */

dom.pauseButton?.addEventListener('click', () => game?.pause());
get('#btn-resume')?.addEventListener('click', () => game?.resume());
get('#btn-restart')?.addEventListener('click', () => game?.restart());
get('#btn-quit')?.addEventListener('click', () => game?.quitToMenu());
get('#btn-retry')?.addEventListener('click', () => game?.restart());
get('#btn-dead-menu')?.addEventListener('click', () => game?.quitToMenu());
get('#btn-again')?.addEventListener('click', () => game?.restart());
get('#btn-win-menu')?.addEventListener('click', () => game?.quitToMenu());

for (const button of dom.qualityButtons) {
  button.addEventListener('click', () => {
    qualityName = button.dataset.quality;
    updateQualityUi();
    game?.applyQuality(qualityName);
    if (dom.overlays.pauseHint) {
      dom.overlays.pauseHint.textContent =
        qualityName === 'low'
          ? 'Performance mode: shadows off, capped resolution, fewer particles.'
          : 'High quality: dynamic shadows, more particles and lights.';
    }
  });
}

for (const button of dom.muteSegments) {
  button.addEventListener('click', () => applyMute(button.dataset.mute === 'on'));
}

// While a run is active the game loop owns this shortcut; on the website the
// bootstrap handles it so M works everywhere except mid-run double toggles.
window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyN') return;
  if (game && game.state === 'playing') return;
  applyMute(!audio.muted);
});

// Keep the pause menu in sync if the player is caught mid-pause.
dom.canvas?.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  game?.pause();
  hud.showToast('Graphics context lost — reload the page to continue');
});

window.addEventListener('pagehide', () => game?.pause());

// Prewarm the Warden and game instance immediately in the background so PLAY starts instantly.
prewarmGame();

/* ------------------------------ QA / debug ------------------------------ */

window.__lastExit = {
  get game() {
    return game;
  },
  get state() {
    return game ? game.state : 'idle';
  },
  get debug() {
    return game ? game.debug : { state: 'idle' };
  },
  play: () => startGame(),
  quality: () => qualityName,
  touch: () => isTouchDevice(),
  /** deterministic stepping for automated checks (fixed delta, no rAF) */
  tick: (dt = 1 / 60) => (game ? game.step(dt) : false),
  press: (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })),
  release: (code) => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })),
};
