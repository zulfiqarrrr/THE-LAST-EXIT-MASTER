/* ==========================================================================
   THE LAST EXIT — procedural textures
   Everything is painted into <canvas> at runtime: no external image assets,
   no network requests, no licensing. Textures are cached and shared.
   ========================================================================== */

import * as THREE from 'three';
import { mulberry32 } from './config.js';

const cache = new Map();

function createCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function makeTexture(key, size, paint, { repeatX = 1, repeatY = 1 } = {}) {
  if (cache.has(key)) return cache.get(key);
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}

/** Speckled grime overlay used by most surfaces. */
function speckle(ctx, size, count, random, alpha, radius = 2) {
  for (let i = 0; i < count; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = random() * radius + 0.4;
    const shade = random() < 0.6 ? 0 : 255;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha * random()})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function streaks(ctx, size, random, count, color) {
  for (let i = 0; i < count; i += 1) {
    const x = random() * size;
    const w = 1 + random() * 6;
    const top = random() * size * 0.5;
    const h = size * (0.15 + random() * 0.6);
    const grad = ctx.createLinearGradient(0, top, 0, top + h);
    grad.addColorStop(0, `${color}${(0.28 * random() + 0.08).toFixed(2)})`);
    grad.addColorStop(1, `${color}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, top, w, h);
  }
}

/* ------------------------------- surfaces -------------------------------- */

export function wallTexture() {
  return makeTexture('wall', 512, (ctx, size) => {
    const random = mulberry32(9182);
    ctx.fillStyle = '#2b2f33';
    ctx.fillRect(0, 0, size, size);
    // vertical panel seams every 128px
    for (let x = 0; x <= size; x += 128) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - 2, 0, 4, size);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 2, 0, 1, size);
    }
    // horizontal concrete lift lines
    for (let y = 0; y <= size; y += 256) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y, size, 3);
    }
    // patches of discoloured paint
    for (let i = 0; i < 46; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const r = 14 + random() * 70;
      ctx.fillStyle = `rgba(${40 + random() * 26},${44 + random() * 22},${40 + random() * 18},${
        0.06 + random() * 0.14
      })`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.4 + random()), random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    streaks(ctx, size, random, 26, 'rgba(48,26,14,');
    streaks(ctx, size, random, 12, 'rgba(10,12,10,');
    speckle(ctx, size, 2600, random, 0.16, 2.4);
  }, { repeatX: 1, repeatY: 1 });
}

export function floorTexture() {
  return makeTexture('floor', 512, (ctx, size) => {
    const random = mulberry32(3311);
    ctx.fillStyle = '#242729';
    ctx.fillRect(0, 0, size, size);
    const tile = 128;
    for (let ty = 0; ty < size; ty += tile) {
      for (let tx = 0; tx < size; tx += tile) {
        const shade = 30 + Math.floor(random() * 22);
        ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 1})`;
        ctx.fillRect(tx + 2, ty + 2, tile - 4, tile - 4);
        // grout
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = 3;
        ctx.strokeRect(tx + 1.5, ty + 1.5, tile - 3, tile - 3);
        // corner wear
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(tx + 6, ty + 6, tile - 22, 2);
      }
    }
    for (let i = 0; i < 34; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const r = 20 + random() * 90;
      ctx.fillStyle = `rgba(12,10,9,${0.08 + random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + random() * 0.8), random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, size, 2200, random, 0.2, 2);
  }, { repeatX: 10, repeatY: 10 });
}

export function ceilingTexture() {
  return makeTexture('ceiling', 256, (ctx, size) => {
    const random = mulberry32(7225);
    ctx.fillStyle = '#1a1d20';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x <= size; x += 64) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 1, 0, 3, size);
    }
    for (let y = 0; y <= size; y += 64) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, y - 1, size, 3);
    }
    for (let i = 0; i < 20; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const r = 12 + random() * 40;
      ctx.fillStyle = `rgba(60,45,30,${0.05 + random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, size, 900, random, 0.18, 2);
  }, { repeatX: 14, repeatY: 14 });
}

export function metalTexture() {
  return makeTexture('metal', 256, (ctx, size) => {
    const random = mulberry32(555);
    ctx.fillStyle = '#33383c';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i += 1) {
      const y = random() * size;
      ctx.strokeStyle = `rgba(255,255,255,${0.01 + random() * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (random() - 0.5) * 3);
      ctx.stroke();
    }
    streaks(ctx, size, random, 16, 'rgba(74,40,18,');
    speckle(ctx, size, 900, random, 0.22, 2);
  });
}

export function rustTexture() {
  return makeTexture('rust', 256, (ctx, size) => {
    const random = mulberry32(4242);
    ctx.fillStyle = '#3a2b21';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const r = 4 + random() * 34;
      ctx.fillStyle = `rgba(${110 + random() * 50},${58 + random() * 28},${20 + random() * 20},${
        0.06 + random() * 0.22
      })`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, size, 1400, random, 0.24, 2.6);
  });
}

export function plateTexture() {
  return makeTexture('plate', 256, (ctx, size) => {
    const random = mulberry32(8080);
    ctx.fillStyle = '#3d4247';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, size - 16, size - 16);
    for (const [x, y] of [[24, 24], [size - 24, 24], [24, size - 24], [size - 24, size - 24]]) {
      ctx.fillStyle = '#1c1f22';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    streaks(ctx, size, random, 12, 'rgba(60,34,16,');
    speckle(ctx, size, 700, random, 0.2, 2);
  });
}

export function bloodDecalTexture() {
  return makeTexture('blood', 256, (ctx, size) => {
    const random = mulberry32(66);
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 22; i += 1) {
      const x = size / 2 + (random() - 0.5) * size * 0.62;
      const y = size / 2 + (random() - 0.5) * size * 0.62;
      const r = 6 + random() * 44;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${90 + random() * 60},4,8,${0.32 + random() * 0.4})`);
      grad.addColorStop(0.7, 'rgba(52,2,4,0.18)');
      grad.addColorStop(1, 'rgba(30,1,2,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + random() * 0.7), random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // drips
    for (let i = 0; i < 10; i += 1) {
      const x = size / 2 + (random() - 0.5) * size * 0.4;
      const y = size / 2 + (random() - 0.5) * size * 0.3;
      ctx.strokeStyle = `rgba(70,3,6,${0.25 + random() * 0.3})`;
      ctx.lineWidth = 1 + random() * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 10, y + 10 + random() * 60);
      ctx.stroke();
    }
  });
}

export function dustTexture() {
  return makeTexture('dust', 64, (ctx, size) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, 'rgba(220,230,240,0.35)');
    grad.addColorStop(1, 'rgba(200,220,240,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });
}

export function exitSignTexture(text = 'EXIT') {
  return makeTexture(`sign-${text}`, 256, (ctx, size) => {
    ctx.fillStyle = '#0d0f10';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#2a2e32';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.fillStyle = '#ff3b45';
    ctx.font = 'bold 92px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + 4);
  });
}

/** Dispose everything created by this module (used on a full teardown). */
export function disposeTextures() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
