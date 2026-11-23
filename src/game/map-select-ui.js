/* ==========================================================================
   THE LAST EXIT — Map Selection UI Controller
   Handles sector deployment selection, animated mini-previews, and keyboard nav.
   ========================================================================== */

import { store } from './config.js';

export class MapSelectUI {
  constructor({ root, onStart, onClose }) {
    this.root = root;
    this.onStart = onStart;
    this.onClose = onClose;

    this.cards = Array.from(root.querySelectorAll('.map-card'));
    this.enterBtn = root.querySelector('#btn-map-select-enter');
    this.backBtn = root.querySelector('#btn-map-select-back');
    this.previewCanvases = Array.from(root.querySelectorAll('[data-preview-map]'));

    this.selectedMapId = store.get('selectedMap', 'facility');
    this.isOpen = false;
    this._animId = null;
    this._time = 0;

    this._initEvents();
    this.selectMap(this.selectedMapId, false);
  }

  _initEvents() {
    this.cards.forEach((card, index) => {
      const mapId = card.dataset.map;
      card.addEventListener('click', () => {
        this.selectMap(mapId);
      });
      card.addEventListener('dblclick', () => {
        this.selectMap(mapId);
        this.confirmSelection();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectMap(mapId);
          this.confirmSelection();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = this.cards[(index + 1) % this.cards.length];
          next?.focus();
          this.selectMap(next.dataset.map);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = this.cards[(index - 1 + this.cards.length) % this.cards.length];
          prev?.focus();
          this.selectMap(prev.dataset.map);
        }
      });
    });

    this.enterBtn?.addEventListener('click', () => this.confirmSelection());
    this.backBtn?.addEventListener('click', () => this.close());

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === '1') {
        this.selectMap('facility');
      } else if (e.key === '2') {
        this.selectMap('sewers');
      } else if (e.key === '3') {
        this.selectMap('archive');
      } else if (e.key === 'Enter') {
        this.confirmSelection();
      }
    });
  }

  selectMap(mapId, save = true) {
    this.selectedMapId = mapId;
    if (save) store.set('selectedMap', mapId);

    this.cards.forEach((card) => {
      const isSelected = card.dataset.map === mapId;
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-checked', String(isSelected));
      if (isSelected) {
        card.setAttribute('tabindex', '0');
      } else {
        card.setAttribute('tabindex', '-1');
      }
    });
  }

  confirmSelection() {
    this.close();
    if (this.onStart) this.onStart(this.selectedMapId);
  }

  open() {
    this.isOpen = true;
    this.root.hidden = false;
    document.body.classList.add('is-map-selecting');
    const selectedCard = this.cards.find((c) => c.dataset.map === this.selectedMapId);
    selectedCard?.focus?.();
    this._startPreviews();
  }

  close() {
    this.isOpen = false;
    this.root.hidden = true;
    document.body.classList.remove('is-map-selecting');
    this._stopPreviews();
    if (this.onClose) this.onClose();
  }

  _startPreviews() {
    if (this._animId) return;
    const loop = (t) => {
      this._time = t * 0.001;
      this._renderPreviews();
      if (this.isOpen) {
        this._animId = requestAnimationFrame(loop);
      }
    };
    this._animId = requestAnimationFrame(loop);
  }

  _stopPreviews() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  _renderPreviews() {
    const t = this._time;

    this.previewCanvases.forEach((canvas) => {
      const type = canvas.dataset.previewMap;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (type === 'facility') {
        // Sublevel 4: Medical Facility (Cold blue grid + rotating radar sweep + red emergency dot)
        ctx.fillStyle = '#050a10';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(56, 120, 180, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Radar sweep
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.42;

        ctx.strokeStyle = 'rgba(63, 216, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        const sweepAngle = (t * 2.5) % (Math.PI * 2);
        ctx.strokeStyle = 'rgba(63, 216, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
        ctx.stroke();

        // Pulsing red emergency alert beacon
        const redPulse = Math.sin(t * 5) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 40, 60, ${0.4 + redPulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx + 45, cy - 15, 4 + redPulse * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(63, 216, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(cx - 30, cy + 20, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'sewers') {
        // Sublevel 7: Drainage Network (Murky green + bio-luminescent water ripples + slithering wave)
        ctx.fillStyle = '#030805';
        ctx.fillRect(0, 0, w, h);

        // Concentric water ripples
        ctx.lineWidth = 1.2;
        for (let r = 0; r < 4; r++) {
          const ripR = ((t * 25 + r * 30) % 90) + 10;
          const alpha = 1 - ripR / 100;
          ctx.strokeStyle = `rgba(50, 200, 100, ${alpha * 0.25})`;
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, ripR * 1.4, ripR * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Sinusoidal creature path (S-curve crawling simulation)
        ctx.strokeStyle = 'rgba(70, 255, 140, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 20; x < w - 20; x += 4) {
          const y = h / 2 + Math.sin(x * 0.06 - t * 4) * 14;
          if (x === 20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Bioluminescent spores
        for (let i = 0; i < 6; i++) {
          const px = ((i * 47 + t * 12) % (w - 40)) + 20;
          const py = ((i * 31 + Math.sin(t + i) * 15) % (h - 20)) + 10;
          ctx.fillStyle = `rgba(100, 255, 160, ${0.4 + Math.sin(t * 3 + i) * 0.3})`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 'archive') {
        // Sublevel 1: Research Archive (Warm amber sepia + vertical library stack pillars + floating dust)
        ctx.fillStyle = '#0a0805';
        ctx.fillRect(0, 0, w, h);

        // Vertical book stacks / columns
        ctx.fillStyle = 'rgba(180, 130, 70, 0.08)';
        for (let col = 30; col < w - 20; col += 35) {
          ctx.fillRect(col, 10, 18, h - 20);
        }

        // Warm flickering hanging incandescent light
        const flick = 0.8 + Math.sin(t * 12) * 0.08 + Math.sin(t * 29) * 0.05;
        const grad = ctx.createRadialGradient(w / 2, 25, 4, w / 2, 25, 80);
        grad.addColorStop(0, `rgba(255, 200, 110, ${flick * 0.8})`);
        grad.addColorStop(0.4, `rgba(220, 150, 60, ${flick * 0.3})`);
        grad.addColorStop(1, 'rgba(10, 8, 5, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Dust motes drifting
        for (let i = 0; i < 14; i++) {
          const dx = (i * 23 + Math.sin(t * 0.5 + i) * 20) % w;
          const dy = (i * 17 + t * (4 + (i % 3))) % h;
          ctx.fillStyle = `rgba(255, 220, 150, ${0.2 + (i % 5) * 0.1})`;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }
}
