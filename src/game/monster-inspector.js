/* ==========================================================================
   THE LAST EXIT — 3D Monster Inspector (Turntable Viewer)
   Pure 3D interactive stage to inspect all three specialized game monsters
   with full 360-degree orbital rotation, zoom, animation kinematics,
   and studio lighting.
   ========================================================================== */

import * as THREE from 'three';
import { loadWardenModel, WardenRig, WARDEN_UNIFORMS } from './warden-model.js';
import { loadCrawlerModel, buildCrawlerModel, CrawlerRig } from './creatures/crawler-model.js';
import { loadArchivistModel, buildArchivistModel, ArchivistRig } from './creatures/archivist-model.js';
import { QUALITY } from './config.js';

export class MonsterInspector {
  constructor({ container, site, wardenModelPromise, onExit }) {
    this.container = container;
    this.site = site;
    this.canvas = container ? container.querySelector('#inspector-canvas') : null;
    this.wardenModelPromise = wardenModelPromise;
    this.onExit = onExit || (() => {});

    this.isOpen = false;
    this.currentMonsterId = 'warden';
    this.animMode = 'walk';
    this.autoRotate = true;
    this.lightPreset = 'studio';

    this._initialized = false;
    this._activeInstance = null;
    this._raf = null;
    this._time = 0;
    this._phase = 0;

    this._spherical = { radius: 4.8, theta: 0.4, phi: 1.25 };
    this._target = new THREE.Vector3(0, 0.9, 0);
    this._isDragging = false;
    this._isPanning = false;
    this._prevMouse = { x: 0, y: 0 };

    if (this.container && this.canvas) {
      this._bindEvents();
    }
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06090e);
    this.scene.fog = new THREE.FogExp2(0x06090e, 0.05);

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 80);
    this._updateCamera();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Platform / Stage
    const stageGeo = new THREE.CylinderGeometry(3.5, 3.6, 0.25, 48);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      roughness: 0.8,
      metalness: 0.25,
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.125;
    stage.receiveShadow = true;
    this.scene.add(stage);

    const ringGeo = new THREE.RingGeometry(3.2, 3.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x2af588, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0x283848, 0.9);
    this.scene.add(this.ambientLight);

    this.mainLight = new THREE.DirectionalLight(0xe8f2fa, 1.8);
    this.mainLight.position.set(4, 7, 5);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.scene.add(this.mainLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    this.rimLight.position.set(-5, 4, -4);
    this.scene.add(this.rimLight);

    this.spotLight = new THREE.SpotLight(0xfff5e6, 0, 20, Math.PI / 6, 0.35, 1.6);
    this.spotLight.position.set(0, 1.8, 4.5);
    this.spotLight.target.position.set(0, 0.9, 0);
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    this._applyLightPreset();
  }

  _applyLightPreset() {
    if (this.lightPreset === 'flashlight') {
      this.ambientLight.intensity = 0.15;
      this.mainLight.intensity = 0.2;
      this.rimLight.intensity = 0.15;
      this.spotLight.intensity = 4.2;
    } else {
      this.ambientLight.intensity = 1.0;
      this.mainLight.intensity = 1.8;
      this.rimLight.intensity = 1.2;
      this.spotLight.intensity = 0;
    }
  }

  _updateCamera() {
    const s = this._spherical;
    const sinPhiRadius = Math.sin(s.phi) * s.radius;
    this.camera.position.set(
      this._target.x + sinPhiRadius * Math.sin(s.theta),
      this._target.y + Math.cos(s.phi) * s.radius,
      this._target.z + sinPhiRadius * Math.cos(s.theta)
    );
    this.camera.lookAt(this._target);
  }

  _bindEvents() {
    const c = this.canvas;

    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('pointerdown', (e) => {
      this._prevMouse.x = e.clientX;
      this._prevMouse.y = e.clientY;
      if (e.button === 2) {
        this._isPanning = true;
      } else {
        this._isDragging = true;
      }
      c.setPointerCapture(e.pointerId);
    });

    c.addEventListener('pointermove', (e) => {
      const dx = e.clientX - this._prevMouse.x;
      const dy = e.clientY - this._prevMouse.y;
      this._prevMouse.x = e.clientX;
      this._prevMouse.y = e.clientY;

      if (this._isDragging) {
        this._spherical.theta -= dx * 0.007;
        this._spherical.phi = THREE.MathUtils.clamp(
          this._spherical.phi - dy * 0.007,
          0.15,
          Math.PI / 2 + 0.08
        );
        this._updateCamera();
      } else if (this._isPanning) {
        const factor = this._spherical.radius * 0.0015;
        this._target.y += dy * factor;
        this._updateCamera();
      }
    });

    const stopDrag = (e) => {
      this._isDragging = false;
      this._isPanning = false;
      try {
        c.releasePointerCapture(e.pointerId);
      } catch {}
    };
    c.addEventListener('pointerup', stopDrag);
    c.addEventListener('pointercancel', stopDrag);

    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this._spherical.radius = THREE.MathUtils.clamp(
          this._spherical.radius + e.deltaY * 0.004,
          1.8,
          9.5
        );
        this._updateCamera();
      },
      { passive: false }
    );

    // UI Buttons
    this.container.querySelectorAll('[data-inspector-monster]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container
          .querySelectorAll('[data-inspector-monster]')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.loadMonster(btn.dataset.inspectorMonster);
      });
    });

    this.container.querySelectorAll('[data-inspector-anim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container
          .querySelectorAll('[data-inspector-anim]')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.animMode = btn.dataset.inspectorAnim;
      });
    });

    this.container.querySelectorAll('[data-inspector-light]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container
          .querySelectorAll('[data-inspector-light]')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.lightPreset = btn.dataset.inspectorLight;
        this._applyLightPreset();
      });
    });

    const autoBtn = this.container.querySelector('#btn-inspector-autorotate');
    autoBtn?.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      autoBtn.classList.toggle('is-active', this.autoRotate);
    });

    const resetCamBtn = this.container.querySelector('#btn-inspector-resetcam');
    resetCamBtn?.addEventListener('click', () => {
      this._spherical = { radius: 4.8, theta: 0.4, phi: 1.25 };
      this._target.set(0, 0.9, 0);
      this._updateCamera();
    });

    const closeBtn = this.container.querySelector('#btn-inspector-close');
    closeBtn?.addEventListener('click', () => this.close());

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') this.close();
      else if (e.code === 'Digit1') this.loadMonster('warden');
      else if (e.code === 'Digit2') this.loadMonster('crawler');
      else if (e.code === 'Digit3') this.loadMonster('archivist');
      else if (e.code === 'Space') {
        e.preventDefault();
        this.autoRotate = !this.autoRotate;
        autoBtn?.classList.toggle('is-active', this.autoRotate);
      }
    });

    window.addEventListener('resize', () => {
      if (!this.isOpen) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  async loadMonster(monsterId = 'warden') {
    this.currentMonsterId = monsterId;

    // Clean up current instance
    if (this._activeInstance) {
      this.scene.remove(this._activeInstance.object);
      if (this._activeInstance.dispose) this._activeInstance.dispose();
      this._activeInstance = null;
    }

    // Update Telemetry Header
    const titleEl = this.container.querySelector('#inspector-creature-title');
    const badgeEl = this.container.querySelector('#inspector-creature-badge');
    const descEl = this.container.querySelector('#inspector-creature-desc');

    if (monsterId === 'crawler') {
      const crawler = await loadCrawlerModel(QUALITY.high);
      crawler.object.position.set(0, 0, 0);
      this.scene.add(crawler.object);
      this._activeInstance = {
        type: 'crawler',
        object: crawler.object,
        rig: new CrawlerRig(crawler),
        dispose: crawler.dispose,
      };

      if (titleEl) titleEl.textContent = 'THE CRAWLER';
      if (badgeEl) badgeEl.textContent = 'SUBLEVEL 7 · DRAINAGE SEWERS';
      if (descEl) {
        descEl.textContent =
          '10-segmented subterranean worm predator (4.5m total length). Eyeless spade-armored carapace with articulated dual mandibles and pulsing bioluminescent emerald veins. Continuous transverse S-curve body waves.';
      }
      this._target.set(0, 0.4, 0);
      this._spherical.radius = 5.2;
    } else if (monsterId === 'archivist') {
      const archivist = await loadArchivistModel(QUALITY.high);
      archivist.object.position.set(0, 0, 0);
      this.scene.add(archivist.object);
      this._activeInstance = {
        type: 'archivist',
        object: archivist.object,
        rig: new ArchivistRig(archivist),
        dispose: archivist.dispose,
      };

      if (titleEl) titleEl.textContent = 'THE ARCHIVIST';
      if (badgeEl) badgeEl.textContent = 'SUBLEVEL 1 · RESEARCH ARCHIVE';
      if (descEl) {
        descEl.textContent =
          'Towering 2.5m winged demonic phantom with a 4.8m wingspan. Massive bat wings with high-frequency flap physics and predatory engulfing wing flare, clawed arms, swept horns, piercing yellow eyes, and digitigrade stride.';
      }
      this._target.set(0, 1.45, 0);
      this._spherical.radius = 5.2;
    } else {
      // The Warden
      const warden = await loadWardenModel();
      const wardenObj = warden.object;
      wardenObj.position.x = 0;
      wardenObj.position.z = 0;
      this.scene.add(wardenObj);

      this._activeInstance = {
        type: 'warden',
        object: wardenObj,
        mesh: warden.mesh,
        rig: new WardenRig(),
        dispose: () => {},
      };

      if (titleEl) titleEl.textContent = 'THE WARDEN';
      if (badgeEl) badgeEl.textContent = 'SUBLEVEL 4 · MEDICAL FACILITY';
      if (descEl) {
        descEl.textContent =
          'Heavily muscled quadruped horror with pale necrotic corpse skin, charcoal rib contours, obsidian claws, and metallic spinal braces. Prowling 4-legged gait with natural shoulder lurching and visceral maws.';
      }
      this._target.set(0, 0.9, 0);
      this._spherical.radius = 4.8;
    }

    this._updateCamera();
  }

  open(initialMonsterId = 'warden') {
    if (!this.container || !this.canvas) return;

    this.isOpen = true;
    this.container.hidden = false;
    if (this.site) this.site.classList.add('is-hidden');
    document.body.classList.add('is-playing');

    if (!this._initialized) {
      this._initThree();
      this._initialized = true;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    // Sync active button
    this.container.querySelectorAll('[data-inspector-monster]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.inspectorMonster === initialMonsterId);
    });

    this.loadMonster(initialMonsterId);
    this._startLoop();
  }

  close() {
    this.isOpen = false;
    if (this.container) this.container.hidden = true;
    if (this.site) this.site.classList.remove('is-hidden');
    document.body.classList.remove('is-playing');
    this._stopLoop();
    if (this._activeInstance) {
      this.scene.remove(this._activeInstance.object);
      if (this._activeInstance.dispose) this._activeInstance.dispose();
      this._activeInstance = null;
    }
    this.onExit();
  }

  _startLoop() {
    if (this._raf !== null) return;
    let lastT = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;

      this._update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isOpen) {
        this._raf = requestAnimationFrame(loop);
      }
    };

    this._raf = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _update(dt) {
    if (this.autoRotate && !this._isDragging && !this._isPanning) {
      this._spherical.theta += dt * 0.35;
      this._updateCamera();
    }

    if (!this._activeInstance) return;

    if (this.animMode !== 'freeze') {
      this._time += dt;
      const speed = this.animMode === 'aggro' ? 1.4 : this.animMode === 'idle' ? 0.05 : 0.85;
      this._phase += dt * (this.animMode === 'aggro' ? 8.5 : this.animMode === 'idle' ? 1.8 : 4.5);

      const rig = this._activeInstance.rig;
      const isAggro = this.animMode === 'aggro';

      if (this._activeInstance.type === 'crawler') {
        rig.update(dt, {
          phase: this._phase,
          speed,
          time: this._time,
          lunge: isAggro,
          grab: isAggro,
          lookYaw: 0,
        });
      } else if (this._activeInstance.type === 'archivist') {
        rig.update(dt, {
          phase: this._phase,
          speed,
          time: this._time,
          lunge: isAggro,
          grab: isAggro,
          lookYaw: 0,
        });
      } else if (this._activeInstance.type === 'warden') {
        WARDEN_UNIFORMS.uTwitch.value = isAggro ? 0.8 : 0;
        rig.update(
          dt,
          {
            speed,
            phase: this._phase,
            settle: 1,
            time: this._time,
            lunge: isAggro ? 0.8 : 0,
            grab: isAggro ? 0.6 : 0,
            rear: 0,
            raise: 0,
            yawRate: 0,
            lookYaw: 0,
            headPitch: 0,
            tilt: 0,
          },
          10
        );
      }
    }
  }
}
