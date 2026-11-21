/* ==========================================================================
   THE LAST EXIT — hero corridor
   A second, cheap Three.js scene: a dark corridor the main menu floats over.
   It uses the same procedural textures as the game, renders at a capped pixel
   ratio and pauses whenever it is off screen or the game is running.
   ========================================================================== */

import * as THREE from 'three';
import { WALL_H, mulberry32 } from './config.js';
import * as TEX from './textures.js';

const CORRIDOR_LENGTH = 78;
const CORRIDOR_WIDTH = 6.4;

export class HeroScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.raf = null;
    this.lastTime = 0;
    this.elapsed = 0;
    this.reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        powerPreference: 'low-power',
        stencil: false,
        alpha: false,
      });
    } catch {
      this.failed = true;
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // the hero sits behind a dark vignette, so it renders a little hot
    this.renderer.toneMappingExposure = 1.45;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040506);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.085);

    this.camera = new THREE.PerspectiveCamera(66, 1, 0.1, 120);
    this.camera.position.set(0, 1.6, 1);

    this._build();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();

    // Pause rendering while the hero is scrolled away.
    if (typeof IntersectionObserver === 'function') {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            this.visible = entry.isIntersecting;
            if (entry.isIntersecting && !this.running && this.wanted) this._startLoop();
            else if (!entry.isIntersecting) this._stopLoop();
          }
        },
        { threshold: 0.02 }
      );
      this.observer.observe(canvas);
    }
    this.visible = true;
  }

  _build() {
    const rng = mulberry32(5150);
    const root = new THREE.Group();
    this.scene.add(root);

    const wallMat = new THREE.MeshStandardMaterial({
      map: TEX.wallTexture(),
      roughness: 0.97,
      metalness: 0.02,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      map: TEX.floorTexture(),
      roughness: 0.92,
      metalness: 0.05,
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      map: TEX.ceilingTexture(),
      roughness: 1,
      metalness: 0,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      map: TEX.metalTexture(),
      color: 0x9aa1a8,
      roughness: 0.6,
      metalness: 0.6,
    });
    const rustMat = new THREE.MeshStandardMaterial({
      map: TEX.rustTexture(),
      roughness: 0.9,
      metalness: 0.3,
    });
    this.materials = [wallMat, floorMat, ceilMat, metalMat, rustMat];

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -CORRIDOR_LENGTH / 2 + 8;
    root.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH),
      ceilMat
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WALL_H, floor.position.z);
    root.add(ceiling);

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_LENGTH, WALL_H), wallMat);
      wall.position.set((side * CORRIDOR_WIDTH) / 2, WALL_H / 2, floor.position.z);
      wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      root.add(wall);
    }

    // Ribs and arches give the corridor depth cues.
    const pillarGeo = new THREE.BoxGeometry(0.55, WALL_H, 0.9);
    const arches = new THREE.Group();
    for (let z = 20; z > -CORRIDOR_LENGTH + 8; z -= 6.2) {
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(pillarGeo, wallMat);
        pillar.position.set((side * (CORRIDOR_WIDTH - 0.5)) / 2, WALL_H / 2, z);
        arches.add(pillar);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_WIDTH - 1, 0.45, 0.6), metalMat);
      beam.position.set(0, WALL_H - 0.4, z);
      arches.add(beam);
    }
    root.add(arches);

    // Occasional crates, lockers and pipes.
    for (let i = 0; i < 14; i += 1) {
      const z = 18 - i * 5.6 - rng() * 2;
      const side = rng() < 0.5 ? -1 : 1;
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.2 + rng() * 0.8, 1.1 + rng() * 0.6, 1.2),
        rustMat
      );
      crate.position.set(side * (CORRIDOR_WIDTH / 2 - 1.1), crate.geometry.parameters.height / 2, z);
      crate.rotation.y = rng() * 0.6;
      root.add(crate);
      if (rng() < 0.5) {
        const locker = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.5), metalMat);
        locker.position.set(-side * (CORRIDOR_WIDTH / 2 - 0.35), 1.05, z - 2.2);
        root.add(locker);
      }
    }

    // Ceiling fixtures with flickering light.
    this.lights = [];
    for (let i = 0; i < 6; i += 1) {
      const z = 16 - i * 10;
      const housingMat = new THREE.MeshStandardMaterial({
        color: 0x1a1d20,
        emissive: 0xa9c8e0,
        emissiveIntensity: 1.1,
        roughness: 0.4,
      });
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.5), housingMat);
      housing.position.set(0, WALL_H - 0.18, z);
      root.add(housing);
      const light = new THREE.PointLight(0xb9d3e8, 26, 22, 1.7);
      light.position.set(0, WALL_H - 0.5, z);
      root.add(light);
      this.lights.push({
        light,
        material: housingMat,
        base: 26,
        phase: rng() * 10,
        speed: 2 + rng() * 3.4,
        dying: i % 3 === 1,
      });
      this.materials.push(housingMat);
    }

    // A red emergency glow deep in the corridor.
    this.redLight = new THREE.PointLight(0xff2b2b, 16, 28, 1.9);
    this.redLight.position.set(0, 2.1, -22);
    root.add(this.redLight);
    const redHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x220607,
        emissive: 0xff2222,
        emissiveIntensity: 2.6,
      })
    );
    redHousing.position.set(0, 2.6, -23.6);
    root.add(redHousing);
    this.redHousing = redHousing;
    this.materials.push(redHousing.material);

    // Something standing very still at the end of the corridor.
    const figureMat = new THREE.MeshStandardMaterial({
      color: 0x121011,
      roughness: 0.95,
      transparent: true,
      opacity: 0,
    });
    this.figureMaterial = figureMat;
    this.figure = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.5, 0.4), figureMat);
    torso.position.y = 1.75;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.42), figureMat);
    head.position.y = 2.68;
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.05, 0.34), figureMat);
    legs.position.y = 0.52;
    const arms = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.22), figureMat);
    arms.position.y = 1.82;
    this.figure.add(torso, head, legs, arms);
    this.figure.position.set(0.4, 0, -24);
    this.figure.rotation.y = Math.PI;
    root.add(this.figure);

    // Dust motes drifting through the light.
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (rng() - 0.5) * CORRIDOR_WIDTH;
      positions[i * 3 + 1] = rng() * (WALL_H - 0.3) + 0.15;
      positions[i * 3 + 2] = 20 - rng() * CORRIDOR_LENGTH;
    }
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.07,
      map: TEX.dustTexture(),
      color: 0xcfdcE8,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(dustMat);
    this.dust = new THREE.Points(this.dustGeo, dustMat);
    this.dust.frustumCulled = false;
    root.add(this.dust);

    this.ambient = new THREE.AmbientLight(0x2a3646, 0.8);
    root.add(this.ambient);
  }

  /* ------------------------------- lifecycle ------------------------------ */

  start() {
    this.wanted = true;
    if (this.failed) return;
    this.canvas.classList.add('is-ready');
    if (this.visible !== false) this._startLoop();
  }

  stop() {
    this.wanted = false;
    this._stopLoop();
  }

  /** Called by the app when the game layer takes over the screen. */
  suspend() {
    this._stopLoop();
  }

  resume() {
    if (this.wanted && this.visible !== false) this._startLoop();
  }

  _startLoop() {
    if (this.raf !== null || this.failed) return;
    this.lastTime = 0;
    this.raf = window.requestAnimationFrame(this._loop);
  }

  _stopLoop() {
    if (this.raf === null) return;
    window.cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  _loop = (time) => {
    this.raf = window.requestAnimationFrame(this._loop);
    const dt = this.lastTime === 0 ? 0.016 : Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.elapsed += dt;
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  _update(dt) {
    const t = this.elapsed;

    if (!this.reducedMotion) {
      // slow dolly down the corridor; the corridor runs from z=+8 to z=-70,
      // so wrapping at -28 keeps the camera well inside the geometry (fog
      // hides the seam completely).
      this.camera.position.z -= dt * 1.15;
      if (this.camera.position.z < -28) this.camera.position.z = 1;
      this.camera.position.x = Math.sin(t * 0.17) * 0.34;
      this.camera.position.y = 1.6 + Math.sin(t * 0.31) * 0.05;
      this.camera.rotation.z = Math.sin(t * 0.23) * 0.014;
      this.camera.rotation.y = Math.sin(t * 0.11) * 0.06;
    }

    for (const entry of this.lights) {
      const a = Math.sin(t * entry.speed + entry.phase);
      const b = Math.sin(t * entry.speed * 2.7 + entry.phase * 1.6);
      let value = 0.72 + 0.28 * ((a * 0.6 + b * 0.4) * 0.5 + 0.5);
      if (entry.dying && Math.sin(t * 2.4 + entry.phase * 3) * Math.sin(t * 8.9 + entry.phase) > 0.7) {
        value *= 0.12;
      }
      entry.light.intensity = entry.base * value;
      entry.material.emissiveIntensity = 0.3 + value * 1.2;
    }

    this.redLight.intensity = 13 + Math.sin(t * 1.7) * 4;

    // the figure fades in a few seconds' walk ahead, then is gone again
    const cycleIndex = Math.floor(t / 26);
    if (cycleIndex !== this._cycleIndex) {
      this._cycleIndex = cycleIndex;
      const ahead = this.camera.position.z - (20 + Math.random() * 7);
      this.figure.position.set(0.4, 0, ahead);
      this.redLight.position.z = ahead + 1.6;
      if (this.redHousing) this.redHousing.position.z = ahead;
    }
    const cycle = (t % 26) / 26;
    let opacity = 0;
    if (cycle > 0.3 && cycle < 0.42) opacity = (cycle - 0.3) / 0.06;
    else if (cycle >= 0.42 && cycle < 0.5) opacity = 1;
    else if (cycle >= 0.5 && cycle < 0.56) opacity = 1 - (cycle - 0.5) / 0.06;
    this.figureMaterial.opacity = Math.max(0, Math.min(0.92, opacity));
    this.figure.rotation.y = Math.PI + Math.sin(t * 0.6) * 0.12;
    this.figure.position.x = 0.4 + Math.sin(t * 0.4) * 0.4;

    const positions = this.dustGeo.getAttribute('position');
    for (let i = 0; i < positions.count; i += 1) {
      let y = positions.getY(i) + Math.sin(t * 0.6 + i) * 0.0016;
      if (y > WALL_H - 0.2) y = 0.2;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  }

  resize() {
    if (this.failed || !this.renderer) return;
    const parent = this.canvas.parentElement || document.body;
    const width = Math.max(1, parent.clientWidth || window.innerWidth);
    const height = Math.max(1, parent.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.raf === null) this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._stopLoop();
    this.observer?.disconnect();
    window.removeEventListener('resize', this._onResize);
    this.scene?.traverse((child) => {
      if (child.isMesh || child.isPoints) child.geometry?.dispose();
    });
    for (const material of this.materials || []) material.dispose?.();
    this.renderer?.dispose();
  }
}
