/* ==========================================================================
   THE LAST EXIT — THE WARDEN
   A hunched, quadrupedal monster (the sculpted GLB in warden-model.js) that
   patrols the ring corridor, hears the player, spots them through its own
   vision cone and navigates the same BFS graph the level exposes. Movement is
   collision-aware, a stuck detector keeps it from grinding against geometry,
   and the animation (gait, weight shift, head watch, twitches, forelimb
   strike) is driven by WardenRig. The kill sequence in beginCatch() takes the
   camera's target and plays the grab before the game over.
   ========================================================================== */

import * as THREE from 'three';
import { ENEMY, clamp, damp, mulberry32 } from './config.js';
import { FACE_HEIGHT, WARDEN_UNIFORMS, WardenRig } from './warden-model.js';
import {
  cellToWorld,
  findPath,
  hasLineOfSight,
  isSolidAt,
  randomFloorCell,
  worldToCell,
} from './level.js';

/**
 * World heights of the face, in metres: the point a flashlight has to hit.
 * The Warden crawls with its head low and rears up to grab, so the face rises.
 */
const RIG = { faceY: FACE_HEIGHT, rearFaceY: FACE_HEIGHT + 0.6 };
/** Distance at which a chase starts a forelimb strike, and the gap between strikes. */
const STRIKE = { range: 2.6, cooldown: 1.6 };
/** Distance at which the head starts to turn towards the player. */
const WATCH_RANGE = 16;

const TWO_PI = Math.PI * 2;
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Creature {
  /**
   * @param {{scene, level, quality, audio, model}} options `model` is the shared,
   * already-loaded Warden from loadWardenModel(). The creature attaches it but
   * never owns or disposes it.
   */
  constructor({ scene, level, quality, audio, model }) {
    this.scene = scene;
    this.level = level;
    this.quality = quality;
    this.audio = audio;
    this.random = mulberry32(1337);

    this.group = new THREE.Group();
    this.group.name = 'creature';
    this.model = model.object;
    // the quality preset decides whether the sculpted body casts shadows
    model.mesh.castShadow = !!quality.shadows;
    this.group.add(this.model);
    this.rig = new WardenRig();

    this.mode = 'patrol';
    this.detection = 0;
    this.path = [];
    this.waitTimer = 1.5;
    this.repathTimer = 0;
    this.lostTimer = 0;
    this.lastKnown = null;
    this.caught = false;
    this.moving = false;
    this.speed = 0;
    this.distanceToPlayer = Infinity;
    /** true while the player is inside the warning radius — drives the HUD cue */
    this.nearPlayer = false;
    /**
     * The last sound the creature made, mirrored as plain data so the HUD can
     * caption it. Every audible cue goes through _cue(), so the visual warning
     * can never drift out of sync with the audio one.
     */
    this.cue = { kind: null, intensity: 0, age: Infinity };
    /**
     * Vestibular safety: when the player asks for reduced motion the creature
     * stops snapping its head around and twitching. The tilt is information on
     * a screen the player is watching, but it is exactly the kind of large,
     * unpredictable movement that triggers motion sickness.
     */
    this.reducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._gait = 0;
    this._stepDistance = 0;
    this._growlTimer = 4;
    this._yaw = 0;
    this._elapsed = 0;
    this._facing = new THREE.Vector3();
    this._targetCell = { col: 7, row: 7 };

    /* ---- animation state ---- */
    this._resetAnimation();

    /* ---- now-stronger navigation state ---- */
    this._intended = false;
    this._sidestep = { x: 0, z: 0 };
    this._sidestepTime = 0;
    this._stuckTimer = 0;
    this._stuckTravel = 0;
    this._stuckX = 0;
    this._stuckZ = 0;

    scene.add(this.group);
  }

  /* --------------------------------- model -------------------------------- */

  /* --------------------------------- state -------------------------------- */

  reset(cell) {
    const position = cellToWorld(cell.col, cell.row);
    this.group.position.set(position.x, 0, position.z);
    this.group.visible = true;
    this.mode = 'patrol';
    this.detection = 0;
    this.path = [];
    this.waitTimer = 2.5;
    this.repathTimer = 0;
    this.lostTimer = 0;
    this.lastKnown = null;
    this.caught = false;
    this.moving = false;
    this.speed = 0;
    this._yaw = 0;
    this._gait = 0;
    this._stepDistance = 0;
    this._growlTimer = 6;
    this.group.rotation.y = 0;
    this.nearPlayer = false;

    this._resetAnimation();
    this.cue.kind = null;
    this.cue.intensity = 0;
    this.cue.age = Infinity;

    // navigation state — a restart must not inherit a mid-recovery pose or state
    this._intended = false;
    this._sidestepTime = 0;
    this._sidestep = { x: 0, z: 0 };
    this._stuckTimer = 0;
    this._stuckTravel = 0;
    this._stuckX = this.group.position.x;
    this._stuckZ = this.group.position.z;
  }

  /**
   * Animation and steering-pose state. Shared by the constructor and reset() so
   * a restart never inherits a mid-strike, mid-twitch or mid-catch pose.
   */
  _resetAnimation() {
    this._bodyYaw = this._yaw;
    this._prevYaw = this._yaw;
    this._yawRate = 0;
    this._speedRatio = 0;
    this._settle = 0;
    this._strike = 0;
    this._strikeCooldown = 0;
    this._tilt = 0;
    this._tiltTarget = 0;
    this._tiltTimer = 0;
    this._twitch = 0;
    this._twitchTimer = 2;
    this._faceLift = 0;
    this._catch = null;
    this.rig.reset();
    WARDEN_UNIFORMS.uTwitch.value = 0;
    this.group.rotation.y = this._yaw;
  }

  get position() {
    return this.group.position;
  }

  get headPosition() {
    return (this._headWorld || (this._headWorld = new THREE.Vector3()))
      .copy(this.group.position)
      .setY(RIG.faceY + this._faceLift);
  }

  /* ---------------------------------- sound ------------------------------- */

  /**
   * Fire one of the creature's sounds. Recording the event alongside playing it
   * is what gives the HUD caption something to render: without this the visual
   * warning would have to guess when a growl happened.
   */
  _cue(kind, intensity = 1) {
    this.cue.kind = kind;
    this.cue.intensity = intensity;
    this.cue.age = 0;
    if (kind === 'growl') this.audio.growl(intensity);
    else this.audio.creatureStep(this.distanceToPlayer);
  }

  /* -------------------------------- steering ------------------------------ */

  _cell() {
    return worldToCell(this.group.position.x, this.group.position.z);
  }

  _repath(targetCell) {
    this.path = findPath(this._cell(), targetCell);
    this.repathTimer = ENEMY.repathInterval;
  }

  _pickPatrolTarget() {
    const from = this._cell();
    const cell = randomFloorCell(this.random, (candidate) => {
      const distance = Math.abs(candidate.col - from.col) + Math.abs(candidate.row - from.row);
      if (distance <= 5 || distance >= 26) return false;
      // do not aim for a standing spot that is inside a locker or a crate
      const point = cellToWorld(candidate.col, candidate.row);
      return !this._blocked(point.x, point.z);
    });
    this._repath(cell);
    if (!this.path.length) this.waitTimer = 0.6;
  }

  /** Steer straight towards a world point. */
  _steer(targetX, targetZ, speed, dt) {
    const dx = targetX - this.group.position.x;
    const dz = targetZ - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.0001) return true;
    this._step(dx / distance, dz / distance, speed, dt);
    return distance < 0.4;
  }

  /**
   * Collision-aware step, resolved per axis so the Warden slides along walls
   * instead of passing through them (or wedging in a corner).
   */
  _step(dirX, dirZ, speed, dt) {
    this._intended = true;
    const step = speed * dt;
    const x = this.group.position.x;
    const z = this.group.position.z;
    let moved = false;

    /*
     * Safety valve. If the Warden is ever found already overlapping geometry —
     * spawned on a crate, or a collider added underneath it — collision is
     * ignored until it is clear again. Without this it would be sealed in
     * place: every axis step would be rejected and the stuck recoverer would
     * have no open direction to sidestep into.
     */
    // tested at the body radius, not the wider wall clearance: near a wall the
    // clearance is always violated, which would switch collision off there
    const trapped = this._blocked(x, z, ENEMY.radius);

    const nextX = x + dirX * step;
    if (trapped || !this._blocked(nextX, z)) {
      this.group.position.x = nextX;
      moved = true;
    }
    const nextZ = z + dirZ * step;
    if (trapped || !this._blocked(this.group.position.x, nextZ)) {
      this.group.position.z = nextZ;
      moved = true;
    }

    this._yaw = Math.atan2(-dirX, -dirZ);
    this.speed = moved ? speed : 0;
    this.moving = moved;
    return moved;
  }

  /**
   * True when the Warden's body disc would overlap solid geometry. Walls come
   * from the tile grid; crates, pipes and lockers are box colliders on the
   * level. Both are tested, exactly as the player's collision does, so the
   * creature cannot walk through a cabinet the player has to walk around.
   */
  _blocked(x, z, wallClearance = ENEMY.wallClearance) {
    // the wider clearance is for walls only: see ENEMY.wallClearance
    if (isSolidAt(x, z)) return true;
    /*
     * Exact circle-vs-tile test. Sampling a ring of points misses wall corners
     * that fall between samples, so instead every solid tile near the body is
     * checked for its true distance to the clearance circle.
     */
    const lo = worldToCell(x - wallClearance, z - wallClearance);
    const hi = worldToCell(x + wallClearance, z + wallClearance);
    const half = (cellToWorld(1, 0).x - cellToWorld(0, 0).x) / 2;
    for (let row = lo.row - 1; row <= hi.row + 1; row += 1) {
      for (let col = lo.col - 1; col <= hi.col + 1; col += 1) {
        const tile = cellToWorld(col, row);
        if (!isSolidAt(tile.x, tile.z)) continue;
        const dx = Math.max(Math.abs(x - tile.x) - half, 0);
        const dz = Math.max(Math.abs(z - tile.z) - half, 0);
        if (dx * dx + dz * dz < wallClearance * wallClearance) return true;
      }
    }
    const radius = ENEMY.radius;
    const colliders = this.level.colliders;
    if (!colliders) return false;
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Stuck detection: if the Warden barely moved while actively trying to, it is
   * grinding against geometry. Accumulate travel over a window and compare.
   */
  _trackStuck(dt) {
    const x = this.group.position.x;
    const z = this.group.position.z;
    this._stuckTimer += dt;
    this._stuckTravel += Math.hypot(x - this._stuckX, z - this._stuckZ);
    this._stuckX = x;
    this._stuckZ = z;

    if (this._stuckTimer < ENEMY.stuckCheckInterval) return;
    const travel = this._stuckTravel;
    this._stuckTimer = 0;
    this._stuckTravel = 0;
    if (travel < ENEMY.stuckMinDistance) this._recover();
  }

  /** Pick an open perpendicular direction and slide along it for a moment. */
  _beginSidestep() {
    const forwardX = -Math.sin(this._yaw);
    const forwardZ = -Math.cos(this._yaw);
    const options = [
      { x: -forwardZ, z: forwardX },
      { x: forwardZ, z: -forwardX },
      { x: forwardX, z: forwardZ },
    ];
    for (const option of options) {
      const probe = 0.95;
      const px = this.group.position.x + option.x * probe;
      const pz = this.group.position.z + option.z * probe;
      if (!this._blocked(px, pz)) {
        this._sidestep = option;
        this._sidestepTime = ENEMY.sidestepTime;
        return;
      }
    }
    this._sidestepTime = 0;
  }

  /** Break out of a corner: sidestep, then re-plan from the current cell. */
  _recover() {
    this._beginSidestep();
    if (this.mode === 'chase') {
      this.path = [];
      const target = this.lastKnown
        ? worldToCell(this.lastKnown.x, this.lastKnown.z)
        : this._cell();
      this._repath(target);
      this.repathTimer = ENEMY.repathInterval * 0.5;
    } else {
      this.path = [];
      this.waitTimer = 0;
      this._pickPatrolTarget();
    }
  }

  /** Sound with no sight: walk to where it came from and search there. */
  _investigate() {
    this.mode = 'search';
    this.lostTimer = 0;
    this.waitTimer = ENEMY.searchTime;
    if (this.lastKnown) this._repath(worldToCell(this.lastKnown.x, this.lastKnown.z));
  }

  _followPath(speed, dt) {
    if (!this.path.length) return false;
    const waypoint = this.path[0];
    const target = cellToWorld(waypoint.col, waypoint.row);
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < ENEMY.waypointRadius) {
      this.path.shift();
      if (!this.path.length) return false;
    }
    this._step(dx / (distance || 1), dz / (distance || 1), speed, dt);
    return true;
  }

  /* -------------------------------- perception ---------------------------- */

  _sense(player) {
    const px = player.position.x;
    const pz = player.position.z;
    const dx = px - this.group.position.x;
    const dz = pz - this.group.position.z;
    const distance = Math.hypot(dx, dz);

    const los = distance < ENEMY.sightRange && hasLineOfSight(
      this.group.position.x,
      this.group.position.z,
      px,
      pz
    );

    // in front of the creature? (angle between facing and target)
    const facingX = -Math.sin(this._yaw);
    const facingZ = -Math.cos(this._yaw);
    const cos = distance > 0.001 ? (facingX * dx + facingZ * dz) / distance : 1;
    const inCone = distance < 3.6 || cos > Math.cos(ENEMY.sightFov);

    const torchOnPlayer = player.flashlightOn;
    const torchOnCreature =
      torchOnPlayer && player.isLookingAt(this.headPosition, 0.55) && distance < 20;

    const hearingRange = player.isMoving
      ? player.isSprinting
        ? ENEMY.hearingSprint
        : ENEMY.hearingWalk
      : 0;
    const heard = distance < hearingRange;

    return { distance, los, inCone, heard, torchOnCreature, px, pz };
  }

  /* ------------------------------- animation ------------------------------ */

  /**
   * Drive the rig from behaviour. The gait follows speed, the body eases
   * towards its heading instead of snapping, the head watches the player (or
   * is raised and sweeps while searching), the body shudders now and then, and
   * the forelimbs strike when a chase closes in.
   */
  _animate(dt, sense) {
    const t = this._elapsed;
    const calm = this.reducedMotion ? 0.3 : 1;

    // the body turns towards its heading; the yaw rate drives the lean into a turn
    this._bodyYaw += wrapAngle(this._yaw - this._bodyYaw) * (1 - Math.exp(-7 * dt));
    this.group.rotation.y = this._bodyYaw;
    const turn = dt > 0 ? wrapAngle(this._yaw - this._prevYaw) / dt : 0;
    this._prevYaw = this._yaw;
    this._yawRate = damp(this._yawRate, turn, 8, dt);

    // gait: the crawl cycle runs faster the harder the creature is moving
    const ratio = clamp(this.speed / ENEMY.chaseSpeed, 0, 1);
    this._speedRatio = damp(this._speedRatio, ratio, 6, dt);
    this._settle = damp(this._settle, this.moving ? 1 : 0, 5, dt);
    this._gait += dt * (1.2 + 5.2 * this._speedRatio);

    // forelimb strike: a sudden lunge once a chase is close, then a short recovery
    this._strikeCooldown = Math.max(0, this._strikeCooldown - dt);
    if (this.mode === 'chase' && sense.distance < STRIKE.range && this._strikeCooldown <= 0) {
      this._strike = 1;
      this._strikeCooldown = STRIKE.cooldown;
    }
    this._strike = damp(this._strike, 0, 4.5, dt);

    // head: fixes on the player when chasing or close, sweeps while searching
    const bearing = Math.atan2(-(sense.px - this.group.position.x), -(sense.pz - this.group.position.z));
    const relative = wrapAngle(bearing - this._bodyYaw);
    const watch =
      this.mode === 'chase' ? 1 : clamp(1 - sense.distance / WATCH_RANGE, 0, 1) * 0.7;
    const searching = this.mode === 'search' && !this.moving;
    let lookYaw = clamp(relative, -1.1, 1.1) * watch + Math.sin(t * 0.55) * 0.08 * calm;
    if (searching) lookYaw = Math.sin(t * 0.9) * 0.9;

    // irregular head tilts and the odd twitch, both softened for reduced motion
    this._tiltTimer -= dt;
    if (this._tiltTimer <= 0) {
      this._tiltTarget = (this.random() * 2 - 1) * 0.3 * calm;
      this._tiltTimer = 1.5 + this.random() * 3;
    }
    this._tilt = damp(this._tilt, this._tiltTarget, 1.6, dt);

    this._twitchTimer -= dt;
    if (this._twitchTimer <= 0) {
      this._twitch = 1;
      this._twitchTimer = this.reducedMotion ? 5 + this.random() * 4 : 1.2 + this.random() * 3.2;
    }
    this._twitch = damp(this._twitch, 0, 7, dt);
    WARDEN_UNIFORMS.uTwitch.value = this.reducedMotion ? 0 : this._twitch;

    this.rig.update(dt, {
      phase: this._gait,
      speed: this._speedRatio,
      settle: this._settle,
      yawRate: this._yawRate,
      time: t,
      headPitch: 0,
      lookYaw,
      tilt: this._tilt,
      raise: searching ? 1 : 0,
      lunge: this._strike,
      grab: 0,
      rear: 0,
    });
  }

  /* --------------------------------- catch -------------------------------- */

  /**
   * Begin the kill sequence. The Warden rushes to `faceDistance` short of the
   * kill camera's lens, then rears up with its face to the camera. The game
   * drives the camera and ends the sequence; the creature only owns its body.
   * @param {{x:number, z:number}} target the kill camera's floor position
   * @param {{lungeTime:number, faceDistance:number, chatter:number, holdTime:number}} timing
   */
  beginCatch(target, timing) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    const ux = dx / distance;
    const uz = dz / distance;
    // rush to faceDistance short of the lens; if already closer, hold rather than step back
    const stop = Math.min(timing.faceDistance, distance);
    this._catch = {
      t: 0,
      lungeTime: timing.lungeTime,
      holdTime: timing.holdTime,
      chatter: timing.chatter,
      fromX: this.group.position.x,
      fromZ: this.group.position.z,
      toX: target.x - ux * stop,
      toZ: target.z - uz * stop,
      yaw: Math.atan2(-ux, -uz),
    };
    this.moving = false;
    this.speed = 0;
    this._yaw = this._catch.yaw;
    this._cue('growl', 1);
  }

  /**
   * Advance the kill sequence. The lunge runs for `lungeTime`; the grip closes
   * as the strike lands and the Warden rears up. The chatter shudders through
   * the head during the hold.
   */
  updateCatch(dt) {
    const c = this._catch;
    if (!c) return;
    c.t += dt;
    this._elapsed += dt;

    const p = clamp(c.t / c.lungeTime, 0, 1);
    const ease = 1 - (1 - p) ** 3;
    this.group.position.x = c.fromX + (c.toX - c.fromX) * ease;
    this.group.position.z = c.fromZ + (c.toZ - c.fromZ) * ease;
    this._bodyYaw = c.yaw;
    this.group.rotation.y = c.yaw;

    const free = 1 - clamp((c.t - c.lungeTime) / 0.45, 0, 1); // the crawl stops at the grip
    const grip = 1 - free;
    const rear = clamp((c.t - c.lungeTime * 0.8) / 0.9, 0, 1);
    this._gait += dt * 9 * free;
    this._speedRatio = damp(this._speedRatio, free, 8, dt);
    this._settle = damp(this._settle, free, 8, dt);
    this._faceLift = rear * (RIG.rearFaceY - RIG.faceY);

    const shudder = c.t > c.lungeTime ? Math.sin(c.t * 47) * c.chatter * 0.07 : 0;
    this.rig.update(dt, {
      phase: this._gait,
      speed: this._speedRatio,
      settle: this._settle,
      yawRate: 0,
      time: this._elapsed,
      headPitch: shudder,
      lookYaw: shudder * 0.6,
      tilt: 0,
      raise: 0,
      lunge: free,
      grab: grip,
      rear,
    });
    WARDEN_UNIFORMS.uTwitch.value = 0;
  }

  /** True once the lunge, grip and hold have all played out. */
  get catchFinished() {
    const c = this._catch;
    return c !== null && c.t >= c.lungeTime + c.holdTime;
  }

  /* --------------------------------- update ------------------------------- */

  update(dt, { player, onCatch, onAlert }) {
    // a running kill sequence owns the body: no sensing, no steering
    if (this._catch) {
      this.updateCatch(dt);
      return;
    }
    this._elapsed += dt;
    if (this.cue.age !== Infinity) this.cue.age += dt;
    const sense = this._sense(player);
    this.distanceToPlayer = sense.distance;

    /* ---- detection meter */
    let heardNow = false;
    if (sense.los && sense.inCone) {
      const proximity = 1 + (1 - Math.min(1, sense.distance / ENEMY.sightRange)) * 1.2;
      const torch = sense.torchOnCreature ? ENEMY.torchBonus : 1;
      this.detection = Math.min(1, this.detection + ENEMY.detectRate * proximity * torch * dt);
      this.lastKnown = { x: sense.px, z: sense.pz };
    } else if (sense.heard) {
      // a sound is suspicion, not sight: it is capped below a full chase
      this.detection = Math.min(ENEMY.suspicionCap, this.detection + ENEMY.detectRate * 0.5 * dt);
      this.lastKnown = { x: sense.px, z: sense.pz };
      heardNow = true;
    } else {
      this.detection = Math.max(0, this.detection - 0.55 * dt);
    }

    if (this.detection >= 1 && this.mode !== 'chase') {
      this.mode = 'chase';
      this.lostTimer = 0;
      this._cue('growl', 1);
      if (onAlert) onAlert();
    }

    // a sound it cannot see the source of: go and look where it came from
    if (heardNow && this.mode === 'patrol') this._investigate();

    /* ---- movement per mode */
    this.moving = false;
    this.speed = 0;
    this._intended = false;
    this.nearPlayer = sense.distance <= ENEMY.nearRange;

    if (this._sidestepTime > 0) {
      // pressed against geometry: slide out of it before resuming the plan
      this._sidestepTime -= dt;
      this._step(this._sidestep.x, this._sidestep.z, ENEMY.investigateSpeed, dt);
    } else if (this.mode === 'chase') {
      this.repathTimer -= dt;
      const direct = sense.los && sense.distance < 9 && hasLineOfSight(
        this.group.position.x,
        this.group.position.z,
        sense.px,
        sense.pz
      );
      if (direct) {
        this._steer(sense.px, sense.pz, ENEMY.chaseSpeed, dt);
      } else {
        const playerCell = worldToCell(sense.px, sense.pz);
        const changed =
          playerCell.col !== this._targetCell.col || playerCell.row !== this._targetCell.row;
        if (this.repathTimer <= 0 || changed || !this.path.length) {
          this._targetCell = playerCell;
          this._repath(playerCell);
        }
        this._followPath(ENEMY.chaseSpeed, dt);
      }

      if (sense.los) this.lostTimer = 0;
      else this.lostTimer += dt;
      if (this.lostTimer > ENEMY.loseSightTime) {
        this.mode = 'search';
        this.lostTimer = 0;
        this.waitTimer = ENEMY.searchTime;
        if (this.lastKnown) {
          this._repath(worldToCell(this.lastKnown.x, this.lastKnown.z));
        } else {
          this._pickPatrolTarget();
        }
      }

      this._growlTimer -= dt;
      if (this._growlTimer <= 0) {
        this._growlTimer = 3.5 + this.random() * 3;
        this._cue('growl', 0.8);
      }
    } else if (this.mode === 'search') {
      this.waitTimer -= dt;
      this.repathTimer -= dt;
      if (heardNow) {
        // still hearing the player: keep following their latest sound
        this.waitTimer = ENEMY.searchTime;
        if (this.repathTimer <= 0 && this.lastKnown) {
          this._repath(worldToCell(this.lastKnown.x, this.lastKnown.z));
        }
      }
      const atTarget =
        this.lastKnown &&
        Math.hypot(this.lastKnown.x - this.group.position.x, this.lastKnown.z - this.group.position.z) < 1.2;

      if (this.detection >= 1) {
        this.mode = 'chase';
        this.lostTimer = 0;
        this._cue('growl', 1);
        if (onAlert) onAlert();
      } else if (atTarget || this.waitTimer <= 0 || !this.path.length) {
        // sweep slowly around the area, then go back to patrolling
        if (this.waitTimer <= 0) {
          this.mode = 'patrol';
          this.waitTimer = 0.5;
          this.lastKnown = null;
        } else {
          this._yaw += dt * 0.9;
          this._growlTimer -= dt;
          if (this._growlTimer <= 0) {
            this._growlTimer = 5 + this.random() * 4;
            this._cue('growl', 0.55);
          }
        }
      } else {
        this._followPath(ENEMY.investigateSpeed, dt);
      }
    } else {
      // patrol
      this.waitTimer -= dt;
      if (this.waitTimer > 0 && !this.path.length) {
        this._yaw += dt * 0.22;
      } else if (!this._followPath(ENEMY.patrolSpeed, dt)) {
        this.waitTimer = 0.8 + this.random() * 2.4;
        this._pickPatrolTarget();
      }
    }

    /* ---- stuck detection: never let it grind against a wall forever ---- */
    if (this._intended) {
      this._trackStuck(dt);
    } else {
      this._stuckTimer = 0;
      this._stuckTravel = 0;
      this._stuckX = this.group.position.x;
      this._stuckZ = this.group.position.z;
    }

    /* ---- catch check */
    if (!this.caught && sense.distance <= ENEMY.catchDistance) {
      this.caught = true;
      onCatch();
    }

    // a catch in this frame has already taken over the body (see beginCatch)
    if (!this._catch) this._animate(dt, sense);
  }

  /**
   * QA hook: the rig's centre is currently inside wall geometry. Automated
   * checks assert this stays false; a human can only ever judge clipping by
   * eye over a few seconds, which is exactly the wrong sample size.
   */
  get clipping() {
    return isSolidAt(this.group.position.x, this.group.position.z);
  }

  /** QA hook: a recovery sidestep is in progress right now. */
  get recovering() {
    return this._sidestepTime > 0;
  }

  /** Unit vector pointing where the creature is looking. */
  getFacing() {
    return this._facing.set(-Math.sin(this._yaw), 0, -Math.cos(this._yaw));
  }

  dispose() {
    this.scene.remove(this.group);
    // the Warden model and its textures are shared (see loadWardenModel) and stay cached
  }
}
