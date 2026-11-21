/* ==========================================================================
   THE LAST EXIT — website wiring
   Everything that belongs to the marketing layer: device detection hints,
   the sticky nav, every PLAY button, the mute toggle and scroll reveals.
   ========================================================================== */

import { isTouchDevice } from '../game/config.js';

export function setupSite({ dom, audio, onPlay, onToggleMute }) {
  const touch = isTouchDevice();

  // Let CSS know which control scheme the visitor gets.
  document.documentElement.classList.add('js');
  document.body.classList.toggle('is-touch', touch);

  const hint = dom.heroHint;
  if (hint) {
    hint.innerHTML = touch
      ? '<strong>Touch controls detected</strong> — thumb stick, drag-to-look and action buttons will appear on screen.'
      : '<strong>Keyboard detected</strong> — WASD to move, click to capture the mouse, F for the flashlight, Esc to pause.';
  }

  const note = dom.controlNote;
  if (note) {
    note.textContent = touch
      ? 'Your device reports a touch screen, so THE LAST EXIT will start with the thumb stick, drag-to-look area and large action buttons. A keyboard still works if you connect one.'
      : 'Your device reports a keyboard and pointer, so THE LAST EXIT will start in mouse-look mode with WASD movement. Touch controls appear automatically on touch screens.';
  }

  // ------------------------------- nav ------------------------------------
  const nav = dom.nav;
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------------------------- scroll reveals ----------------------------
  const reveals = document.querySelectorAll('.section__inner');
  if (!reveals.length) {
    /* nothing to reveal */
  } else if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }

  // ------------------------------- audio ----------------------------------
  const setMutedUi = (muted) => {
    for (const button of dom.muteButtons) {
      button.setAttribute('aria-pressed', String(muted));
      const glyph = button.querySelector('.icon-btn__glyph');
      if (glyph) glyph.textContent = muted ? '✕' : '♪';
    }
  };

  for (const button of dom.muteButtons) {
    button.addEventListener('click', () => {
      if (onToggleMute) onToggleMute(!audio.muted);
    });
  }
  setMutedUi(audio.muted);

  // -------------------------------- play ----------------------------------
  for (const button of dom.playButtons) {
    button.addEventListener('click', () => onPlay());
  }

  return { touch, setMutedUi };
}
