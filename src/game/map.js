/* ==========================================================================
   THE LAST EXIT — facility map
   Fog-of-war discovery over the real level grid, drawn two ways: a circular
   minimap during play and a full-screen navigation map. Both read one shared
   discovery store that lasts for the whole run.

   This module never reads the creature. It only receives the player's
   position and facing, and it has no code path that draws anything else
   that moves. Keys, the exit and other secrets are never marked either: the
   map only shows what the player has actually seen.
   ========================================================================== */

import { CELL } from './config.js';
import { COLS, GRID, ROWS, cellToWorld, isSolid, currentMapConfig } from './level.js';

/** Cells the player can make out from where they stand (line of sight applies). */
const SIGHT_RADIUS = 7;
/** Cells from the minimap centre to its rim. */
const MINIMAP_RADIUS = 8;
/** Full-map zoom levels, as multiples of the fit-to-screen scale. */
const ZOOM_STEPS = [1, 1.5, 2.25, 3.4];
/** Line-of-sight samples per cell along a sight ray. */
const SAMPLES_PER_CELL = 3;

/* ------------------------------ named areas ------------------------------ */

/**
 * Real rooms and corridors from the level's own layout notes (level.js header).
 * `rect` is inclusive [col0, row0, col1, row1] in grid cells. The first match
 * wins; any walkable cell outside every rect is reported as a plain corridor.
 */
const AREAS = [
  { name: 'GENERATOR ROOM', ward: 'WEST BLOCK', rect: [5, 5, 9, 8] },
  { name: 'LABORATORY', ward: 'WEST BLOCK', rect: [12, 5, 15, 8] },
  { name: 'THEATRE', ward: 'WEST BLOCK', rect: [5, 11, 9, 15] },
  { name: 'WARD 9', ward: 'WEST BLOCK', rect: [12, 11, 15, 15] },
  { name: 'WEST CORRIDOR', ward: 'WEST BLOCK', rect: [2, 3, 3, 19] },
  { name: 'EAST CORRIDOR', ward: 'WEST BLOCK', rect: [17, 3, 18, 18] },
  { name: 'NORTH CORRIDOR', ward: 'WEST BLOCK', rect: [2, 2, 20, 2] },
  { name: 'NORTH CORRIDOR', ward: 'EAST WING', rect: [21, 2, 36, 2] },
  { name: 'MULTI-BED WARD', ward: 'EAST WING', rect: [22, 4, 34, 6] },
  { name: 'HALL', ward: 'EAST WING', rect: [22, 7, 34, 8] },
  { name: 'PATIENT ROOMS', ward: 'EAST WING', rect: [22, 9, 34, 10] },
  { name: 'PATIENT ROOMS', ward: 'EAST WING', rect: [22, 16, 28, 18] },
  { name: "NURSES' STATION", ward: 'EAST WING', rect: [30, 16, 34, 18] },
  { name: 'MEDICAL STORAGE', ward: 'EAST WING', rect: [36, 16, 38, 18] },
  { name: 'SERVICE CORRIDOR', ward: 'SOUTH SECTION', rect: [2, 20, 32, 20] },
  { name: 'UTILITY ROOM', ward: 'SOUTH SECTION', rect: [2, 22, 6, 24] },
  { name: 'UTILITY ROOM', ward: 'SOUTH SECTION', rect: [12, 22, 16, 24] },
  { name: 'UTILITY ROOM', ward: 'SOUTH SECTION', rect: [24, 22, 28, 24] },
];

const ORIGIN = cellToWorld(0, 0);
const CELLS = COLS * ROWS;

/* ----------------------- precomputed grid properties --------------------- */

const SOLID = new Uint8Array(CELLS);
const DOOR = new Uint8Array(CELLS);
const AREA_AT = new Array(CELLS);
let FLOOR_TOTAL = 0;
let activeAreas = AREAS;
const WARD_BOXES = new Map();

function wardForCell(col, row) {
  if (row >= 19) return 'SOUTH SECTION';
  return col >= 21 ? 'EAST WING' : 'WEST BLOCK';
}

const corridorFallback = new Map();
function fallbackArea(col, row) {
  const ward = wardForCell(col, row);
  if (!corridorFallback.has(ward)) corridorFallback.set(ward, { name: 'CORRIDOR', ward, rect: null });
  return corridorFallback.get(ward);
}

export function rebuildMapGrid(config = currentMapConfig) {
  const areas = (config && config.AREAS) || AREAS;
  activeAreas = areas;

  SOLID.fill(0);
  DOOR.fill(0);
  AREA_AT.length = 0;
  FLOOR_TOTAL = 0;
  WARD_BOXES.clear();

  for (const area of activeAreas) {
    const [c0, r0, c1, r1] = area.rect;
    const box = WARD_BOXES.get(area.ward) || [Infinity, Infinity, -Infinity, -Infinity];
    box[0] = Math.min(box[0], c0);
    box[1] = Math.min(box[1], r0);
    box[2] = Math.max(box[2], c1);
    box[3] = Math.max(box[3], r1);
    WARD_BOXES.set(area.ward, box);
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      SOLID[idx] = isSolid(col, row) ? 1 : 0;
      DOOR[idx] = GRID[row][col] === 'D' ? 1 : 0;
      if (!SOLID[idx]) FLOOR_TOTAL++;
      const area = activeAreas.find(
        (a) => col >= a.rect[0] && col <= a.rect[2] && row >= a.rect[1] && row <= a.rect[3]
      );
      AREA_AT[idx] = area || fallbackArea(col, row);
    }
  }
}

// Initial build
rebuildMapGrid(currentMapConfig);

const LABEL_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Split text into lines no wider than maxWidth, breaking only between words. */
function wrapWords(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draw a room name centred on (x, y) in screen pixels. The text wraps and shrinks
 * to fit its footprint; long, narrow rooms (corridors) read along their length.
 */
function drawRoomLabel(ctx, text, x, y, lengthPx, thicknessPx, vertical, color) {
  let size = 12;
  let lines = [text];
  for (; size >= 7; size -= 0.5) {
    ctx.font = `600 ${size}px ${LABEL_FONT}`;
    lines = wrapWords(ctx, text, lengthPx * 0.92);
    if (lines.length * size * 1.2 <= thicknessPx * 0.92) break;
  }
  // The loop may stop at its floor size; make sure the font matches what we measured.
  ctx.font = `600 ${Math.max(size, 7)}px ${LABEL_FONT}`;
  const lineHeight = Math.max(size, 7) * 1.2;
  ctx.save();
  ctx.translate(x, y);
  if (vertical) ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = color;
  const top = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.strokeText(line, 0, top + i * lineHeight);
    ctx.fillText(line, 0, top + i * lineHeight);
  });
  ctx.restore();
}

/** Fractional grid position of a world point (inverse of cellToWorld). */
function cellFromWorld(x, z, out = { col: 0, row: 0 }) {
  out.col = (x - ORIGIN.x) / CELL;
  out.row = (z - ORIGIN.z) / CELL;
  return out;
}

/** True when no solid cell lies between two cells. Walls at the ends are fine. */
function hasSight(c0, r0, c1, r1) {
  const dc = c1 - c0;
  const dr = r1 - r0;
  const steps = Math.max(Math.abs(dc), Math.abs(dr)) * SAMPLES_PER_CELL;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const c = Math.round(c0 + dc * t);
    const r = Math.round(r0 + dr * t);
    if (c === c1 && r === r1) continue;
    if (SOLID[r * COLS + c]) return false;
  }
  return true;
}

const COLOR = {
  wallMemory: 'rgba(0, 214, 226, 0.26)',
  wallNow: 'rgba(130, 255, 248, 0.78)',
  floorMemory: 'rgba(0, 190, 210, 0.07)',
  floorNow: 'rgba(0, 226, 240, 0.2)',
  door: 'rgba(200, 255, 250, 0.72)',
  label: 'rgba(170, 250, 255, 0.92)',
  labelExplored: 'rgba(150, 240, 248, 0.7)',
  labelUnseen: 'rgba(120, 220, 230, 0.4)',
  labelHalo: 'rgba(2, 8, 14, 0.9)',
  wardLabel: 'rgba(95, 243, 255, 0.95)',
  wallUnseen: 'rgba(0, 214, 226, 0.12)',
  wallExplored: 'rgba(110, 245, 240, 0.5)',
  floorExplored: 'rgba(0, 226, 240, 0.14)',
  floorUnseen: 'rgba(0, 190, 210, 0.03)',
  doorUnseen: 'rgba(200, 255, 250, 0.14)',
  player: '#b8fdff',
};

/* --------------------------------- class --------------------------------- */

export class FacilityMap {
  /**
   * @param {object} dom  { minimap: {root, canvas, label}, full: {root, canvas, location, ward, percent, status} }
   * @param {object} handlers { onClose(): void }
   */
  constructor(dom, handlers = {}) {
    this.dom = dom;
    this.handlers = handlers;
    this.isOpen = false;

    this.discovered = new Uint8Array(CELLS);
    this.visible = new Uint8Array(CELLS);
    this._visibleList = [];
    this.discoveredFloor = 0;
    this._playerKey = -1;
    this._lastArea = undefined;

    this._zoom = 0;
    this._follow = true;
    this._panCol = 0;
    this._panRow = 0;
    this._scale = 1;
    this._drag = null;

    this._playerCell = { col: 0, row: 0 };
    this._minimapSize = 0;
    this._fullW = 0;
    this._fullH = 0;
    this._beamGrad = null;
    this._beamH = 0;
    this._scanPattern = null;

    this._minimapCtx = dom.minimap.canvas.getContext('2d');
    this._fullCtx = dom.full.canvas.getContext('2d');
    this._bind();
    this._setReadouts(null);
  }

  _resizeDimensions() {
    this._minimapSize = 0;
    this._fullW = 0;
    this._fullH = 0;
  }

  rebuildGrid(config) {
    rebuildMapGrid(config || currentMapConfig);
    this._resizeDimensions();
  }

  /** Forget everything discovered and reveal the player's surroundings. Call on a new run. */
  reset(player) {
    rebuildMapGrid(currentMapConfig);
    this.discovered.fill(0);
    this.visible.fill(0);
    this._visibleList.length = 0;
    this.discoveredFloor = 0;
    this._playerKey = -1;
    this._lastArea = undefined;
    this._follow = true;
    this._zoom = 0;
    this._resizeDimensions();
    this.observe(player);
    this.update(player);
  }

  /** Reveal cells in the player's line of sight. Cheap: only redone when the player changes cell. */
  observe(player) {
    const p = cellFromWorld(player.position.x, player.position.z, this._playerCell);
    const pc = Math.round(p.col);
    const pr = Math.round(p.row);
    if (pc < 0 || pr < 0 || pc >= COLS || pr >= ROWS) return;
    const key = pr * COLS + pc;
    if (key === this._playerKey) return;
    this._playerKey = key;

    for (const i of this._visibleList) this.visible[i] = 0;
    this._visibleList.length = 0;

    const R = SIGHT_RADIUS;
    for (let r = pr - R; r <= pr + R; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = pc - R; c <= pc + R; c++) {
        if (c < 0 || c >= COLS) continue;
        const dc = c - pc;
        const dr = r - pr;
        if (dc * dc + dr * dr > R * R + R) continue;
        if (!hasSight(pc, pr, c, r)) continue;
        const idx = r * COLS + c;
        this.visible[idx] = 1;
        this._visibleList.push(idx);
        if (!this.discovered[idx]) {
          this.discovered[idx] = 1;
          if (!SOLID[idx]) this.discoveredFloor++;
        }
      }
    }
  }

  /** Per-frame update: discovery and the readouts that depend on the player's area. */
  update(player) {
    this.observe(player);
    const area = AREA_AT[this._playerKey] || null;
    if (area !== this._lastArea) {
      this._lastArea = area;
      this._setReadouts(area);
    }
  }

  /** Draw whichever view is live. Called once per rendered frame while playing. */
  render(player) {
    const time = performance.now() / 1000;
    if (this.isOpen) this._renderFull(player, time);
    else this._renderMinimap(player, time);
  }

  open(player) {
    if (this.isOpen) return;
    this.isOpen = true;
    // Open on the whole facility, fitted and centred. The centre button re-follows the player.
    this._follow = false;
    this._zoom = 0;
    this._panCol = (COLS - 1) / 2;
    this._panRow = (ROWS - 1) / 2;
    this.dom.full.root.hidden = false;
    this.dom.minimap.root.setAttribute('aria-expanded', 'true');
    this._renderFull(player, performance.now() / 1000);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._drag = null;
    this.dom.full.root.hidden = true;
    this.dom.minimap.root.setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------- readouts ------------------------------- */

  _percent() {
    if (!FLOOR_TOTAL) return 0;
    return Math.floor((this.discoveredFloor / FLOOR_TOTAL) * 100);
  }

  _setReadouts(area) {
    const hasArea = Boolean(area);
    const location = hasArea ? area.name : 'UNCHARTED';
    const ward = hasArea ? area.ward : 'NO SIGNAL';
    const percent = `${this._percent()}%`;
    const full = this.dom.full;
    setText(full.location, location);
    setText(full.ward, ward);
    setText(full.percent, percent);
    setText(full.wardPanel, ward);
    setText(full.percentPanel, percent);
    setText(this.dom.minimap.label, hasArea ? `${area.ward} · ${area.name}` : 'NO SIGNAL');
  }

  /* -------------------------------- minimap ------------------------------- */

  _renderMinimap(player, time) {
    const canvas = this.dom.minimap.canvas;
    const ctx = this._minimapCtx;

    let size = this._minimapSize;
    if (!size) {
      size = canvas.clientWidth || 136;
      this._minimapSize = size;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.round(size * dpr);
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
    }
    if (!size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = size;
    const H = S / 2;
    const p = cellFromWorld(player.position.x, player.position.z, this._playerCell);
    const R = MINIMAP_RADIUS;
    const k = H / R;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(H, H, H, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(2, 10, 16, 0.86)';
    ctx.fillRect(0, 0, S, S);

    // World rotates so the player's facing points up the screen.
    ctx.translate(H, H);
    ctx.rotate(player.yaw);
    ctx.scale(k, k);
    ctx.translate(-p.col, -p.row);

    const pc = Math.round(p.col);
    const pr = Math.round(p.row);
    const reach = R + 1;
    for (let r = pr - reach; r <= pr + reach; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = pc - reach; c <= pc + reach; c++) {
        if (c < 0 || c >= COLS) continue;
        const idx = r * COLS + c;
        if (!this.discovered[idx]) continue;
        const now = this.visible[idx] === 1;
        if (SOLID[idx]) ctx.fillStyle = now ? COLOR.wallNow : COLOR.wallMemory;
        else if (DOOR[idx]) ctx.fillStyle = COLOR.door;
        else ctx.fillStyle = now ? COLOR.floorNow : COLOR.floorMemory;
        ctx.fillRect(c - 0.5, r - 0.5, 1.02, 1.02);
      }
    }
    ctx.restore();

    // Sweep, pulse and scanlines sit above the map but inside the disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(H, H, H, 0, Math.PI * 2);
    ctx.clip();
    const sweep = (time * 1.1) % (Math.PI * 2);
    ctx.translate(H, H);
    ctx.rotate(sweep);
    if (!this._beamGrad || this._beamH !== H) {
      this._beamH = H;
      const beam = ctx.createLinearGradient(0, 0, 0, -H);
      beam.addColorStop(0, 'rgba(120, 255, 248, 0.0)');
      beam.addColorStop(1, 'rgba(120, 255, 248, 0.16)');
      this._beamGrad = beam;
    }
    ctx.fillStyle = this._beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-H * 0.22, -H);
    ctx.lineTo(H * 0.22, -H);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-sweep);

    if (!this._scanPattern) {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 4;
      pCanvas.height = 4;
      const pCtx = pCanvas.getContext('2d');
      pCtx.fillStyle = 'rgba(120, 255, 248, 0.035)';
      pCtx.fillRect(0, 0, 4, 1);
      this._scanPattern = ctx.createPattern(pCanvas, 'repeat');
    }
    if (this._scanPattern) {
      ctx.fillStyle = this._scanPattern;
      ctx.fillRect(-H, -H, S, S);
    }
    ctx.restore();

    // Marker: a pulse ring and a forward-pointing arrow at the centre.
    const pulse = (time * 0.9) % 1;
    ctx.save();
    ctx.translate(H, H);
    ctx.strokeStyle = `rgba(150, 255, 250, ${(1 - pulse) * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLOR.player;
    ctx.strokeStyle = 'rgba(0, 40, 48, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Neon rim.
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 230, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(H, H, H - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------- full map ------------------------------- */

  _renderFull(player, time) {
    const canvas = this.dom.full.canvas;
    const ctx = this._fullCtx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = this._fullW;
    let h = this._fullH;
    if (!w || !h) {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      this._fullW = w;
      this._fullH = h;
      if (w && h) {
        const pw = Math.round(w * dpr);
        const ph = Math.round(h * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }
      }
    }
    if (!w || !h) return;

    const p = cellFromWorld(player.position.x, player.position.z, this._playerCell);
    const fit = Math.min(w / (COLS + 2), h / (ROWS + 2));
    const k = fit * ZOOM_STEPS[this._zoom];
    this._scale = k;
    const cx = this._follow ? p.col : clamp(this._panCol, 0, COLS - 1);
    const cy = this._follow ? p.row : clamp(this._panRow, 0, ROWS - 1);
    this._panCol = cx;
    this._panRow = cy;

    // Cell units from here on: 1 unit = one grid cell.
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (w / 2 - cx * k), dpr * (h / 2 - cy * k));
    ctx.clearRect(-COLS, -ROWS, COLS * 3, ROWS * 3);
    ctx.fillStyle = 'rgba(2, 8, 14, 0.94)';
    ctx.fillRect(-COLS, -ROWS, COLS * 3, ROWS * 3);

    const visLeft = Math.max(0, Math.floor(cx - w / 2 / k) - 1);
    const visRight = Math.min(COLS - 1, Math.ceil(cx + w / 2 / k) + 1);
    const visTop = Math.max(0, Math.floor(cy - h / 2 / k) - 1);
    const visBottom = Math.min(ROWS - 1, Math.ceil(cy + h / 2 / k) + 1);

    // Background scan grid across the view. It is generic, so it reveals no layout.
    ctx.strokeStyle = 'rgba(0, 240, 230, 0.05)';
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    for (let c = visLeft; c <= visRight + 1; c++) {
      ctx.moveTo(c - 0.5, visTop - 0.5);
      ctx.lineTo(c - 0.5, visBottom + 0.5);
    }
    for (let r = visTop; r <= visBottom + 1; r++) {
      ctx.moveTo(visLeft - 0.5, r - 0.5);
      ctx.lineTo(visRight + 0.5, r - 0.5);
    }
    ctx.stroke();

    // The whole real layout is drawn. Explored tiles are bright; unexplored tiles are dim.
    for (let r = visTop; r <= visBottom; r++) {
      for (let c = visLeft; c <= visRight; c++) {
        const idx = r * COLS + c;
        const seen = this.discovered[idx] === 1;
        const now = this.visible[idx] === 1;
        if (SOLID[idx]) {
          ctx.fillStyle = !seen ? COLOR.wallUnseen : now ? COLOR.wallNow : COLOR.wallExplored;
        } else if (DOOR[idx]) {
          ctx.fillStyle = seen ? COLOR.door : COLOR.doorUnseen;
        } else {
          ctx.fillStyle = !seen ? COLOR.floorUnseen : now ? COLOR.floorNow : COLOR.floorExplored;
        }
        ctx.fillRect(c - 0.46, r - 0.46, 0.92, 0.92);
      }
    }

    // Labels are drawn in screen pixels so they stay legible at every zoom level.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._drawLabels(ctx, w, h, cx, cy, k);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (w / 2 - cx * k), dpr * (h / 2 - cy * k));
    this._drawPlayer(ctx, p, player.yaw, k, time);

    // Neon frame in screen space.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = 'rgba(0, 240, 230, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  /**
   * Every ward and room is labelled, explored or not, so the whole facility can be
   * read at a glance. Unexplored names are dimmer. Screen-space coordinates (CSS px).
   */
  _drawLabels(ctx, w, h, cx, cy, k) {
    const current = AREA_AT[this._playerKey];
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = COLOR.labelHalo;
    ctx.textBaseline = 'middle';

    // Ward headings sit just above their block, or below it for blocks at the bottom.
    ctx.textAlign = 'left';
    const wardPx = clamp(k * 0.5, 7, 11);
    ctx.font = `700 ${wardPx}px ${LABEL_FONT}`;
    for (const [ward, box] of WARD_BOXES) {
      const row = box[1] < 10 ? box[1] - 0.9 : box[3] + 1;
      const sx = w / 2 + (box[0] - 0.42 - cx) * k;
      const sy = h / 2 + (row - cy) * k;
      ctx.fillStyle = areaDiscovered(this.discovered, box) ? COLOR.wardLabel : COLOR.labelUnseen;
      ctx.strokeText(ward, sx, sy);
      ctx.fillText(ward, sx, sy);
    }

    // Room names, centred on each room's footprint.
    ctx.textAlign = 'center';
    for (const area of activeAreas) {
      const [c0, r0, c1, r1] = area.rect;
      const rw = c1 - c0 + 1;
      const rh = r1 - r0 + 1;
      const vertical = rh >= rw * 2;
      const sx = w / 2 + ((c0 + c1) / 2 - cx) * k;
      const sy = h / 2 + ((r0 + r1) / 2 - cy) * k;
      let color = COLOR.labelUnseen;
      if (area === current) color = COLOR.label;
      else if (areaDiscovered(this.discovered, area.rect)) color = COLOR.labelExplored;
      drawRoomLabel(ctx, area.name, sx, sy, (vertical ? rh : rw) * k, (vertical ? rw : rh) * k, vertical, color);
    }
  }

  _drawPlayer(ctx, p, yaw, k, time) {
    const pulse = (time * 0.9) % 1;
    ctx.save();
    ctx.translate(p.col, p.row);
    ctx.strokeStyle = `rgba(150, 255, 250, ${(1 - pulse) * 0.6})`;
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    ctx.arc(0, 0, 0.35 + pulse * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    // The grid is not rotated here, so the arrow turns by -yaw to match forward (-sin yaw, -cos yaw).
    ctx.rotate(-yaw);
    ctx.fillStyle = COLOR.player;
    ctx.shadowColor = 'rgba(120, 255, 248, 0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -0.42);
    ctx.lineTo(0.3, 0.3);
    ctx.lineTo(0, 0.12);
    ctx.lineTo(-0.3, 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---------------------------- interaction ------------------------------- */

  _bind() {
    const full = this.dom.full;
    const canvas = full.canvas;
    this.dom.minimap.root.addEventListener('click', () => this.handlers.onOpen?.());
    full.close?.addEventListener('click', () => this.handlers.onClose?.());
    full.zoomIn?.addEventListener('click', () => this._zoomBy(1));
    full.zoomOut?.addEventListener('click', () => this._zoomBy(-1));
    full.centre?.addEventListener('click', () => {
      this._follow = true;
    });
    window.addEventListener('resize', () => this._resizeDimensions());

    // The overlay swallows pointer input so it never reaches look, movement or pause.
    full.root.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      if (event.target !== canvas) return;
      this._drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
      canvas.setPointerCapture?.(event.pointerId);
    });
    full.root.addEventListener('pointermove', (event) => {
      if (!this._drag || event.pointerId !== this._drag.id) return;
      const dx = event.clientX - this._drag.x;
      const dy = event.clientY - this._drag.y;
      this._drag.x = event.clientX;
      this._drag.y = event.clientY;
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      this._follow = false;
      this._panCol -= dx / this._scale;
      this._panRow -= dy / this._scale;
    });
    const endDrag = (event) => {
      if (this._drag && event.pointerId === this._drag.id) this._drag = null;
    };
    full.root.addEventListener('pointerup', endDrag);
    full.root.addEventListener('pointercancel', endDrag);
    full.root.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });
    full.root.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    full.root.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this._zoomBy(event.deltaY < 0 ? 1 : -1);
      },
      { passive: false }
    );
  }

  _zoomBy(step) {
    this._zoom = Math.max(0, Math.min(ZOOM_STEPS.length - 1, this._zoom + step));
  }
}

/* -------------------------------- utilities ------------------------------ */

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function setText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

function areaDiscovered(discovered, rect) {
  const [c0, r0, c1, r1] = rect;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const idx = r * COLS + c;
      if (discovered[idx] && !SOLID[idx]) return true;
    }
  }
  return false;
}
