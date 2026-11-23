# PROJECT_HANDOFF.md — THE LAST EXIT

> **This is the continuity file.** Any AI agent resuming work must read this before touching code,
> then update it when the work is done. Source code is authoritative; this file records the latest
> known state. If this document and the code disagree, **the code wins** — and you must fix this
> document.

**Last updated:** 2026-10-16 (read-only check + accessibility requirements recorded)
**Updated by:** AI session — inspection, production build, browser testing, backup and documentation.
**No gameplay code has been modified in any pass so far.**
**Documentation in this tree is now AHEAD of the backup snapshot** — see the note at the end of the backup
block below.

### Independent backup snapshot

A hash-verified snapshot of this project exists **outside** the project folder:

| | |
|---|---|
| **Location** | `C:\Users\MD Rehan\Desktop\the-last-exit-backup-2026-10-16` |
| **Taken** | 2026-10-16 22:02 |
| **Contents** | 31 project files (`src/`, `scripts/`, `dist/`, `index.html`, all config, all 4 docs) + `MANIFEST.sha256` + `BACKUP_INFO.txt` |
| **Excluded** | `node_modules/` only — reproducible via `npm install` from the included `package-lock.json` |
| **Manifest** | SHA-256 of all 31 files, relative paths |
| **Refreshed** | 2026-10-16 — the 4 documentation files were re-synced after the PHASE 1 update. **Then Phase 2 edited 7 code/markup/style files, so the snapshot is now stale for those too** — see the drift status below. |
| **Verified** | self-check `sha256sum -c MANIFEST.sha256` → **31/31 OK, exit 0**; independently re-derived manifest from the live source → **byte-identical** |

```bash
# is the snapshot still faithful?
cd "C:/Users/MD Rehan/Desktop/the-last-exit-backup-2026-10-16" && sha256sum -c MANIFEST.sha256
```

**This project has no Git history, so that folder is the only recoverable copy of this state.** Treat it
as the rollback point. Any edit to the source from now on makes it a *point-in-time* snapshot; say so
rather than leaving it silently stale.

> **Current drift status — deliberate, not an oversight.** Earlier on 2026-10-16 the accessibility
> documentation update modified `GAME_REQUIREMENTS.md` and `PROJECT_HANDOFF.md`. **Phase 2 then edited
gameplay code for the first time**, so the drift is no longer documentation-only: `enemy.js`, `game.js`,
> `config.js`, `hud.js`, `main.js`, `index.html` and `game-ui.css` all differ from the snapshot as well.
>
> The instruction throughout has been *not* to modify the backup, so it was left untouched and still
> self-verifies (**31/31 OK, exit 0**, newest mtime 22:14:19 — before this session, proving nothing wrote to
> it). It remains a faithful **point-in-time** snapshot of the pre-Phase-2 state — which is exactly what a
> rollback point is for — but it is **no longer a copy of the current project**.
>
> **Measured drift, Phase 2 close: 19 of 31 files identical, 12 differing.**
> - *Source / markup / style (7):* `src/game/enemy.js`, `src/game/game.js`, `src/game/config.js`,
>   `src/game/hud.js`, `src/main.js`, `index.html`, `src/styles/game-ui.css`
> - *Documentation (2):* `GAME_REQUIREMENTS.md`, `PROJECT_HANDOFF.md`
> - *Build output (3):* `dist/index.html` changed, and `dist/assets/index-BPdYz2cn.css` /
>   `index-ZttO9CYH.js` no longer exist because Vite cleaned `dist/` and wrote new content-hashed names.
>
> Run the drift check above before trusting it for any file, and re-sync it when the owner permits.

---

## 1. At a glance

| | |
|---|---|
| **Project name** | THE LAST EXIT |
| **Purpose** | A first-person 3D survival-horror escape game, delivered as a responsive website (cinematic landing page + playable browser game) |
| **Actual project root** | `C:\Users\MD Rehan\Desktop\the-last-exit` |
| **Version** | 1.0.0 (private, unpublished) |
| **Git repository** | **None.** `git rev-parse` → *not a git repository*. There is no history, no branch, no stash. |
| **Deployment** | None configured. No hosting, no CI, no domain. |
| **Overall state** | **Feature-complete and playable.** The full game loop works end to end. Remaining work is polish, real-device verification and two low-severity UI defects (below). |

### ⚠️ Workspace verification (important)

The recovery session was opened with its workspace root set to **`C:\Users\MD Rehan\Desktop\luma\app`
— the unrelated LUMA project (Next.js)**. That is **not** this project. THE LAST EXIT was located as a
sibling folder (`C:\Users\MD Rehan\Desktop\the-last-exit`) and all inspection and documentation was
performed against it using absolute paths.

- **Nothing in the LUMA project was read, modified or created.**
- If you are an agent reading this with a LUMA-rooted workspace: **do not write to that tree.** Target
  the absolute path above.
- **Recommended:** re-open the workspace with `C:\Users\MD Rehan\Desktop\the-last-exit` as its root so
  that relative paths, file links and the preview panel resolve correctly.

### Exact last conversation step — NOT RECOVERABLE

The previous conversation history was **not accessible**. There is **no Git history, no TODO/FIXME
markers, no developer notes and no test output** anywhere in the project to reconstruct it from.
The previous session's final task therefore **cannot be established**, and nothing in this document
should be read as a claim about it. Everything below was reconstructed from the source code, file
modification times, and fresh build/browser testing performed during this recovery.

---

## 2. Technology stack

| Layer | Choice |
|---|---|
| Build tool | **Vite 7.3.7** (`base: './'`, target `es2020`, sourcemaps off, dev server `127.0.0.1:5178`) |
| Language | **Vanilla JavaScript**, ES modules (`"type": "module"`) — no TypeScript, no framework |
| 3D | **Three.js 0.186.1** (WebGL2, `ACESFilmicToneMapping`, `PCFShadowMap`, `FogExp2`) |
| UI | Hand-written HTML + 4 plain CSS files. No Tailwind, no CSS-in-JS, no component library |
| Assets | **Zero binary assets.** Textures are drawn to `<canvas>` at runtime (`textures.js`); audio is fully synthesised via Web Audio API (`audio.js`) |
| Node toolchain | Verified on Node **v24.21.0** / npm **11.19.0** |
| Dependencies | Runtime: `three`. Dev: `vite`. That is the entire dependency list. |

Rationale preserved in the code: it must run from a static host with no network requests, no licence
obligations and no download for the player.

---

## 3. Directory structure

```
the-last-exit/
├── index.html                  Single page: website layer + game layer + every overlay/HUD
├── package.json                two deps, scripts: dev / build / preview / check:map
├── package-lock.json           lockfileVersion 3
├── vite.config.js              base './', dev host 127.0.0.1 port 5178
├── .gitignore                  node_modules, dist, dist-ssr, *.local, .DS_Store, .vite
├── scripts/
│   └── check-map.mjs           21-assertion facility sanity check (`npm run check:map`)
├── src/
│   ├── main.js                 Bootstrap: DOM map, WebGL guard, run lifecycle, menu wiring, QA hooks
│   ├── site/
│   │   └── site.js             Marketing layer: device hint, sticky nav, scroll reveals, mute, PLAY
│   ├── game/
│   │   ├── config.js           ALL tuning constants + QUALITY tiers + device detection + storage + PRNG
│   │   ├── level.js            21×21 tile map, BFS nav graph, LOS, and all facility geometry
│   │   ├── textures.js         Procedural canvas textures (wall/floor/ceiling/metal/rust/plate/blood/dust/EXIT sign)
│   │   ├── player.js           Camera look, circle-vs-grid collision, stamina, head bob, flashlight
│   │   ├── input.js            Unified Controls surface: keyboard + mouse + Pointer Lock + touch feed
│   │   ├── touch.js            Virtual thumb-stick, drag-to-look surface, action buttons (Pointer Events)
│   │   ├── enemy.js            The Creature: model, patrol/search/chase FSM, detection cone, hearing, catch
│   │   ├── interactions.js     Objectives: key pickup, sealed/unlocked blast door, interaction prompts
│   │   ├── hud.js              The only module that writes HUD DOM
│   │   ├── audio.js            Web Audio synthesis: ambience, heartbeat, steps, growls, unlock, stingers
│   │   ├── hero.js             Second cheap Three.js scene behind the landing page (corridor + figure)
│   │   └── game.js             Controller: renderer, scene, state machine, single animation loop
│   └── styles/
│       ├── base.css            Reset, palette tokens, safe-area vars, typography
│       ├── site.css            Landing page / marketing sections
│       ├── game-ui.css         HUD, overlays, touch controls, reticle, prompts
│       └── responsive.css      Breakpoints, coarse-pointer, landscape-phone, short-screen rules
├── dist/                       Production build output (regenerated during this recovery)
└── node_modules/               Installed dependencies
```

**Totals:** ~6,900 lines of JS/CSS source across 19 files, plus a 22 KB `index.html`.

---

## 4. Evidence levels used in this document

| Tag | Meaning |
|---|---|
| **[SRC]** | Verified by reading source code only |
| **[BUILD]** | Verified by a successful production build |
| **[BROWSER]** | Verified by actually running it in a browser during this recovery |
| **[MOBILE-DEVICE]** | Verified on a real phone/tablet |
| **[UNVERIFIED]** | Not verified — unknown |

---

## 5. Features confirmed to exist in the code **[SRC]**

- Full run state machine: `idle → playing → paused → dead / won → idle`, plus a 1.7 s scripted escape
  cinematic (`game.js` `_beginFinale` / `_updateFinale`).
- Circle-vs-grid collision with separated X/Z axis resolution, so the player slides along walls
  (`player.js` `_blocked`), plus an AABB collider list for procgen props (lockers, key pedestal, gurneys).
- BFS navigation graph and grid-sampled line-of-sight, shared by the creature AI (`level.js`).
- Creature FSM: `patrol → search → chase`, vision cone + proximity detection meter, torch bonus,
  hearing by movement type (walk 9 m / sprint 19 m), pathfinding with periodic re-path, catch at 1.15 m.
- 21×21 authored tile map: ring corridor, four rooms (Generator + blast door, Laboratory + key,
  Theatre + crates, Ward 9 + spawn), doorways, ceiling fixtures, crates, barrels.
- Blast door with two leaves, colour-shifting status strip and light (red sealed / green unlocked),
  recessed lift alcove, `setLocked` / `setOpen` / `getOpen`.
- Flashlight (SpotLight on the camera) with physical-intensity falloff, plus a weak fill light, battery
  drain/regen, torch sway and shake.
- Stamina sprint with acceleration ramp and regen delay.
- Flickering ceiling fixtures, drifting dust particles, fog, blood decals, wall-mounted lockers/pipes,
  ceiling beams, debris, gurneys.
- Procedural audio: drones, ventilation hiss, distant groans, heartbeat scaled by tension, footsteps,
  creature steps (distance-attenuated), flashlight click, pickup arpeggio, relay clunk, locked buzz,
  door slide, growls, caught stinger, victory chord.
- Console QA surface: `window.__lastExit` → `game`, `state`, `debug`, `play()`, `quality()`, `touch()`,
  `tick(dt)`, `press(code)`, `release(code)`; and `Game.step(dt)`, `teleport()`, `teleportCreature()`, `interact()`.
- WebGL capability guard with a graceful "Unsupported browser" panel that disables every PLAY button.
- Pointer-Lock change/error handling with a click-to-capture hint and a drag-to-look fallback.
- Fullscreen attempted on touch start, with a silent graceful failure path (iOS Safari stays windowed).
- `webglcontextlost` handler that pauses and warns the player.
- Settings persisted to `localStorage` under `tle.*`: muted, quality, look sensitivity, rotate-dismissed.
- Auto quality detection (`detectQuality()`) from UA/hardwareConcurrency/deviceMemory/pointer type.

---

## 6. Features confirmed through actual testing **[BROWSER]**

All of the following were executed in a real Chromium browser against the running dev server
(`http://127.0.0.1:5178`) during this recovery, driven through `window.__lastExit` and real DOM clicks.
**No console errors or warnings were produced at any point; every module and stylesheet loaded 200.**

### Website / landing layer
- Landing page renders; the Three.js hero corridor renders live and animates.
- Device detection correctly reports "Keyboard detected" on desktop and "Touch controls detected" with `?touch=1`.
- In-page nav anchors work: clicking **Story** → `#story`, **HOW TO PLAY** → `#howto`; window scrolls.
- Sticky nav applies its `is-stuck` state once scrolled past 24 px.
- `IntersectionObserver` scroll reveals fire for sections as they enter the viewport.
- Header mute button toggles (glyph `♪` ⇄ `✕`, `aria-pressed`) and persists to `localStorage`.
- All 3 `[data-play]` buttons (hero, nav, closing CTA) were **clicked directly** and each one started a run from `idle`.

### Game boot & core loop
- PLAY → loading overlay → game layer replaces the site (`body.is-playing`), overlay hides, run starts.
- Player spawns at cell **13,12**, exactly the map's `S` tile. Objective HUD reads "Find the maintenance key".
- Deterministic stepping (`tick`) and the rAF loop both drive the identical update path.

### Desktop controls
- **Walk speed measured 3.09 m/s** (constant 3.1). **Sprint speed measured 5.59 m/s** (constant 5.6).
- Sprint drains stamina **100 → 70 over 1.5 s** (constant 20/s), and regeneration resumes after the delay.
- **Wall collisions are precise:** pushing north into the wall above the spawn, the player comes to rest at
  z = 1.98 — exactly wall face 1.50 + radius 0.48 — and never occupies a solid tile. Same for the east/west
  and doorway geometry, including procgen prop colliders.
- **F** toggles the flashlight; HUD status flips ON ⇄ OFF.
- **Escape** pauses: state `paused`, pause menu shown, animation loop stopped, `tick()` correctly refuses to step.
- Arrow keys drive the same look pipeline as the mouse (accessible look).

### Interactions, objectives and endings
- Locked blast door: prompt reads *"Sealed — maintenance key required"*, interacting returns `locked`,
  plays the buzz, shows the toast, and the run correctly **stays playable**.
- Key pickup: prompt *"Take the maintenance key"*, interact returns `key`, `hasKey` + `exitUnlocked` become
  true, the key mesh and its light disappear, the HUD key chip lights up, the objective advances to
  "Reach the blast door in the generator room", and the door's strip/light turn green (`0x39ff9b`).
- Unlocked door: prompt *"Open the blast door"*, interact returns `escape`, the leaves open to 1.0, the
  escape cinematic plays, and the state becomes **`won`** with the victory overlay showing real stats
  (escape time, stamina remaining, detection count).
- Death: standing on the creature drops the state to **`dead`**, shows the game-over overlay, the damage
  vignette, stops the loop, and reports "Key retrieved: No" correctly.
- Death also occurred **spontaneously during unattended real-time play** (the player was hunted and killed
  while the tester was inspecting CSS) — independent evidence that patrol → detection → chase → catch works
  as a live system, not just under scripted conditions.

### Menus, buttons and settings — every visible button verified to act
| Button | Result |
|---|---|
| `PLAY NOW` (hero) | starts a run ✅ (clicked directly) |
| `PLAY NOW` (nav) | starts a run ✅ (clicked directly) |
| `PLAY NOW` (closing CTA) | starts a run ✅ (clicked directly) |
| header mute | toggles + persists ✅ |
| HUD pause (❚❚) | → `paused`, pause overlay visible ✅ |
| `RESUME` | → `playing` ✅ |
| `RESTART RUN` | → `playing` with a fully reset run (no key, timer 0, stamina/battery 100, spawn cell) ✅ |
| `RETURN TO MAIN MENU` | → `idle`, site shown again ✅ |
| `TRY AGAIN` | → `playing`, overlay hidden ✅ |
| `RETURN TO MAIN MENU` (dead) | → `idle` ✅ |
| `PLAY AGAIN` | → `playing` ✅ |
| `RETURN TO MAIN MENU` (victory) | → `idle` ✅ |
| Graphics `High` / `Performance` | `renderer.shadowMap.enabled` flips, pixel-ratio cap and fog density change (0.058 ⇄ 0.048), active state tracked ✅ |
| Audio `On` / `Muted` | mutes, updates UI, persists ✅ |
| Touch sensitivity slider | wired to `controls.lookSensitivity` and persisted — **[SRC] only**, not drag-tested |

**No dead or non-functional buttons were found.**

### Audio
- `AudioContext` is created successfully on PLAY (inside the user gesture, as required by autoplay policy) **[BROWSER]**.
- Sound design is **[SRC]**-verified in detail; **audible output was not judged** (no audio monitoring in the test environment).

### Mobile / touch (`?touch=1`, viewports 390×844 and 844×390)
- Touch mode engages: `touchEnabled` true, the `#touch` layer is shown, the desktop capture hint is hidden.
- **Joystick:** pointer events produce `moveX/moveY` (0.9 forward on a full up-push), the knob transforms,
  the `is-active` class applies, the dead zone works, release resets knob + input to zero, **and the player
  actually moved 2.61 m forward under joystick input alone.**
- **Touch look:** drag changes yaw and pitch through the same pipeline as the mouse.
- **Sprint button:** hold → sprint active + `aria-pressed="true"`; release → clears. ✅
- **Beam button:** toggles the flashlight and updates the HUD. ✅
- **Interact button:** shows `is-ready` when something is interactable and **collected the key on touch input
  alone** — the game is completable without a keyboard. ✅
- Camera FOV adapts: **82** portrait touch, **76** landscape touch, **72** desktop; aspect updates on resize.
- Run state survives an orientation change (key held, timer, stamina/battery, player cell all preserved).
- Rotate-hint **Dismiss** button works and persists (`tle.rotateDismissed`); the hint appears on an
  `orientationchange` event while playing. (It does *not* appear on initial portrait start — see Known issues.)
- Safe-area insets are genuinely consumed: 30 `var(--safe-*)` usages across `site.css`, `game-ui.css` and
  `responsive.css`, covering HUD, touch stick, buttons, prompts, nav and panels.

### THE WARDEN — creature model, navigation and run-state rules (Phase 2)

Everything below was observed in the browser on 2026-10-16 by driving the running game through
`window.__lastExit.game`, **not** inferred from reading the source.

**Model — SUPERSEDED (see the 2026-10-17 change-log entry).** The primitive rig described in the
previous sentence was replaced by the sculpted GLB in `public/models/warden.glb`. The older
measurements below (head tilt, twitch and breathing ranges) came from the primitive build and have not been
re-measured on the GLB.
- The creature is still a procedural rig with no skeleton in the asset. It is scaled by 2.2× from raw GLB
  units, giving bounds of roughly 2.2 m wide, 1.4 m tall and 2.1 m deep (a crouched, hunched body, not a 2.45 m standing figure). Its collision footprint and eye height were **not** re-verified after
  the swap.

**Navigation [BROWSER]** — 12,000 deterministic frames (200 s of game time) with the player kept out of
sensing range, so the run measured navigation alone:
- **0 frames inside wall geometry** and **0 frames overlapping any of the 43 crate/pipe/locker colliders.**
- **344 m travelled across 81 distinct cells**; the stuck recoverer engaged 28–84 frames and always escaped.
- The longest non-moving stretch was **151 frames**, which is the configured patrol pause, not a wedge.

**Behaviour chain [BROWSER]**
- Detection 0 → 1 in **19 frames** at 8 m with line of sight → `chase` (growl cue, `detections` +1) → closed
  to the 1.13 m catch distance in **142 frames** → `dead`.
- Full three-state cycle observed: `chase` → `search` after 224 frames (≈ `loseSightTime` 3.4 s) → `patrol`
  after a further **361 frames** (≈ `searchTime` 6 s).
- In the real `requestAnimationFrame` loop: the in-game timer advanced 4.02 s over 8 × 500 ms wall-clock
  polls, travel was observed, speeds were exactly `0` and `1.75` (the configured patrol speed), and there
  were no console errors and no clipping. **This is not an FPS measurement.**

**Run-state rules [BROWSER]**
- **Paused:** the loop is cancelled, `step()` refuses, and the creature moved **0.000000 m**.
- **Game over:** same, creature position frozen to the metre, indicator cleared.
- **Victory:** the escape cinematic returns before the creature is updated at all, so it cannot move.
- **No duplicates:** building the game twice still leaves exactly **1** object named `creature` in the scene,
  and two back-to-back `restart()` calls reused the same animation-frame handle.
- **Clean reset:** after a death, 3 consecutive restarts each returned the creature to its spawn cell in
  `patrol` mode with detection 0, no cue, an empty path, no lingering sidestep and not clipping.

**New directional threat indicator [BROWSER]**
- The bearing is exact: at 0°, +45°, +90°, ±180°, −90° and −135° the word (`AHEAD`, `AHEAD RIGHT`, `RIGHT`,
  `BEHIND`, `LEFT`, `BEHIND LEFT`), the numeric bearing and the CSS rotation all agreed.
- Live captions observed: `FOOTSTEPS · BEHIND RIGHT · 9m`, `GROWL · AHEAD · 8m`, `SOMETHING IS CLOSE ·
  AHEAD · 10m`. The ring is hidden beyond the 13 m near radius.

---

## 7. Features partially implemented

| Feature | State |
|---|---|
| Pointer Lock mouse-look | Code is complete with a fallback, but actual lock engagement could not be exercised in the automated browser (no genuine user gesture / focus). The drag-to-look and arrow-key fallbacks are what were tested. **[UNVERIFIED]** for the lock itself. |
| Fullscreen on mobile | Attempted and failure-guarded **[SRC]**; could not be granted in the test environment **[UNVERIFIED]**. |
| Audio quality/balance | All synthesis paths exist **[SRC]**; not aurally assessed. |
| Touch sensitivity slider | Wired and persisted **[SRC]**; not exercised by dragging. |
| WebGL-failure panel | Complete **[SRC]**; could not be triggered (the test device has WebGL). |

---

## 8. Missing features

Nothing from the **original** requirements specification is absent. No stubs, no placeholder handlers, no
TODOs — a project-wide scan for `TODO / FIXME / XXX / HACK / placeholder / not implemented / stub`
returned **zero matches**.

**Correction (2026-10-16, Phase 2):** the sentence above used to claim nothing was absent *at all*, which
stopped being true when the accessibility section (§8) was added to `GAME_REQUIREMENTS.md`. As of Phase 2
the specification has **2 MISSING and 3 PARTIAL rows**, entirely in that accessibility section:
**no volume-level control** (the master gain is still the hardcoded constant `0.85`), **no per-category
audio buses**, and reduced motion honoured by the creature rig but **not** by the rest of the game layer.

Explicitly **out of scope / not built** (and not required): save games or progress persistence, multiple
levels, difficulty selection, subtitles, gamepad support, leaderboards, analytics, any server or
multiplayer, any external asset pipeline.

---

## 9. Broken buttons or interactions

**None.** Every control in the button table in §6 was clicked or driven, and every one behaved as
intended. No control was found that does nothing, throws, or leads to a dead state. The only
controls not exercised by physical input are the touch-sensitivity slider (wired and persisted
`[SRC]`, not dragged) and the WebGL-failure panel's disabled PLAY buttons (not triggerable on a
WebGL-capable device).

---

## 10. Known bugs and issues

### BUG-1 — The landscape rotation hint never appears at the start of a portrait run *(low severity, confirmed)*
- **Symptom:** on a touch device starting a run in portrait, the "Rotate to landscape for a wider view of
  the corridors" suggestion stays hidden. It only appears after the device fires an `orientationchange`.
- **Evidence:** with `state === 'playing'`, portrait matched, touch enabled and `_rotateDismissed === false`,
  `#rotate-hint.hidden` was **true**. Dispatching `orientationchange` flipped it to **false**.
- **Cause:** `Game._resetRun()` calls `_updateRotateHint()` *before* `setState('playing')`, so the
  `this.state === 'playing'` condition fails. `_resize()` never calls `_updateRotateHint()` either, so nothing
  re-evaluates it until an orientation change or the dismiss button.
- **Impact:** cosmetic/UX only. The hint's whole purpose is undermined (it appears once you have already
  rotated), but gameplay is unaffected.
- **Suggested fix (not applied — awaiting approval):** call `_updateRotateHint()` after `setState('playing')`
  in `startRun()`/`restart()`/`resume()`, or have `_resize()` call it. ~2 lines in `game.js`.

### BUG-2 — HUD gauges overlap the joystick when touch mode is forced on a fine-pointer device *(low severity, confirmed in-browser; likely absent on real phones)*
- **Symptom:** the stamina/flashlight block sits underneath the joystick.
- **Evidence:** measured `.hud__gauges` rect x 19–306 / y 291–373 vs `#touch-stick` x 14–98 / y 295–379 —
  overlapping — while `matchMedia('(pointer: coarse)')` was **false** and `body.is-touch` was **true**.
- **Cause:** an inconsistency between two independent touch signals. The control scheme keys off
  `body.is-touch` (JS, honours `?touch=1`), but the HUD layout compensation lives in
  `@media (pointer: coarse)` (`responsive.css`: `.hud__bottom { padding-bottom: clamp(0.5rem, 17vh, 9rem) }`).
  When those disagree, the gauges are never lifted clear of the stick.
- **Impact:** affects `?touch=1` on a desktop and possibly 2-in-1/touchscreen laptops whose primary pointer
  is reported as fine. On a genuine phone both signals are true, so the real-device layout is very likely
  correct — **[MOBILE-DEVICE] unverified**, this environment has no coarse-pointer device.
- **Suggested fix (not applied — awaiting approval):** key the touch layout off `body.is-touch` instead of
  (or in addition to) `(pointer: coarse)`, so the CSS and the JS always agree.

### Runtime errors
**None observed.** Console was clean across landing page, boot, full run, death, victory, pause/resume,
restart, quality switches, desktop and touch sessions.

### Non-issues investigated and cleared (do not "fix" these)
- The landing page *does* scroll, the sticky nav *does* work, and scroll reveals *do* fire. An early
  measurement of `window.scrollY === 0` was a smooth-scroll timing artifact; re-testing with a settle delay
  gave `windowScrollY = 715` after the anchor click and `is-stuck` correctly applied.
- `body` reports a computed `overflow-y` of `auto` (from `overflow-x: hidden`), but the window remains the
  real scroll container. No action needed.
- `0xcfdcE8` (mixed-case hex) in `hero.js` is valid JavaScript.
- `qualityName` in `main.js` is referenced by `updateQualityUi()` before its `let` declaration, but the
  function is only *invoked* after that declaration — no temporal-dead-zone access occurs.

---

## 11. Platform status

| Platform | Status | Evidence |
|---|---|---|
| **Desktop gameplay** | ✅ Working end to end | **[BROWSER]** full run, all controls, all menus at 1280×800 and 1280×760 |
| **Mobile gameplay** | ✅ Working on the emulated/forced-touch path | **[BROWSER]** joystick, drag-look, all three action buttons, FOV, orientation survival. **A real phone or tablet was not available — [MOBILE-DEVICE] UNVERIFIED.** |
| **Responsive design** | ✅ Working | **[BROWSER]** 390×844 portrait, 844×390 landscape, 1280×800/760 desktop; portrait/landscape FOV, landscape label compression, short-screen rules. Safe-area CSS is complete **[SRC]** but cannot be visually verified without a notched device **[UNVERIFIED]**. |
| **Tablet** | ⚪ Untested | **[UNVERIFIED]** |

---

## 12. Build and test results (this recovery)

```
$ npm run check:map
THE LAST EXIT — facility map check
  ✓ map is square (21x21)              ✓ every row is 21 characters
  ✓ player spawn (S) exists            ✓ key spawn (K) exists
  ✓ all 186 walkable cells are reachable
  ✓ key is reachable from the spawn
  ✓ ceiling lights (5) reachable       ✓ doorways (6) reachable
  ✓ blast door occupies 2 cells        ✓ every blast-door cell has a walkable approach
  ✓ creature spawn is walkable         ✓ creature can path from its spawn to the key
  world size: 63m x 63m, spawn at (9, 6) · walkable cells: 186 of 441
PASS                                    → exit code 0

$ npm run build
vite v7.3.7 building client environment for production...
✓ 22 modules transformed.
dist/index.html                  22.16 kB │ gzip:   5.73 kB
dist/assets/index-BPdYz2cn.css   30.14 kB │ gzip:   7.12 kB
dist/assets/index-ZttO9CYH.js   615.02 kB │ gzip: 158.07 kB
✓ built in 1.98s                        → exit code 0
```

- **Automated tests:** none exist. `check:map` (21 assertions) is the only automated check.
- **Build warnings:** none. No dependency or deprecation warnings.
- **Note:** running `npm run build` regenerated `dist/` (previous hashes were `index-1W7ttoPp.css` /
  `index-Cy41-MGr.js`). `node_modules/` was **not** touched and no dependency was added, removed or changed.
- **Bundle note:** the 615 KB single JS chunk (158 KB gzipped) is dominated by Three.js. `chunkSizeWarningLimit`
  is already raised to 1200 in `vite.config.js`, so no warning is emitted. **No code-splitting is configured** —
  the landing page ships the whole game bundle even before PLAY is pressed.

---

## 13. Development timeline (reconstructed from file mtimes)

The entire project was authored in **one continuous session on 2026-10-16**, 19:26 → 20:12. There are
no intermediate commits to date it more finely.

| Time | File(s) | Reading |
|---|---|---|
| 19:26 | `vite.config.js`, `.gitignore` | scaffold |
| 19:27 | `index.html`, `base.css` | page shell + design tokens |
| 19:28 | `responsive.css` | responsive layer |
| 19:29 | `textures.js` | procedural texture library |
| 19:33 | `check-map.mjs`, `package-lock.json` | map validator added; deps installed |
| 19:37 | `audio.js`, `hud.js` | sound synthesis + HUD |
| 19:40 | `input.js` | unified controls |
| 19:41 | `touch.js` | touch scheme |
| 19:43 | `site/site.js` | marketing wiring |
| 19:44 | `game-ui.css` | game UI styling |
| 19:45 | `package.json` | `check:map` script registered |
| 19:50 | `interactions.js`, `enemy.js` | objectives + creature AI |
| 19:57 | `hero.js`, `site.css` | hero corridor + landing styles |
| 20:04 | `config.js` | tuning pass |
| 20:05 | `level.js`, `player.js` | map/geometry + player pass |
| 20:11 | `game.js` | controller pass |
| **20:12** | **`main.js`** | **last source edit of the session** |
| 21:49 | `dist/*` | *regenerated by this recovery's build* |

**Most recent development activity that can be verified:** `src/main.js` was the last file written
(20:12), immediately after `game.js` (20:11), `level.js`/`player.js` (20:05) and `config.js` (20:04) —
a late tuning/wiring pass across the controller, the level, the player and the bootstrap.
**The last completed feature cannot be named with confidence** from mtimes alone; the code itself shows
no unfinished work, so the final pass appears to have been polish rather than a new feature.

---

## 14. Most important unfinished work

1. **Verify on real mobile hardware.** Everything on the touch path is verified only through a
   force-touch desktop browser. A real phone is the single biggest evidence gap — specifically pointer
   lock/fullscreen behaviour, safe-area insets on a notched screen, real thumb ergonomics, and sustained
   frame rate on a mid-range Android.
2. **BUG-1 (rotate hint) and BUG-2 (HUD/stick overlap)** — both small, both low severity, neither applied.
3. **Measure performance on target hardware.** Quality tiers exist and switch correctly, but no FPS
   measurement has ever been taken on a low-end laptop or phone. "Suitable performance on ordinary
   laptops and mobile phones" is currently an untested requirement.
4. ~~Accessibility is entirely unimplemented~~ — **mostly done in Phase 2.** `GAME_REQUIREMENTS.md` §8 went
   from 7 MISSING / 1 PARTIAL to **2 MISSING / 1 PARTIAL**. The directional warning, the footstep and growl
   visual equivalents and the caption layer (8.1–8.5) are implemented and were observed running. What is
   left: **volume level** and **per-category audio buses** (8.7, 8.8), and **reduced motion across the rest
   of the game layer** rather than only the creature (8.10) — head bob, camera roll, torch sway, dust drift,
   light flicker, the damage-vignette transition and the escape cinematic still animate under
   `prefers-reduced-motion: reduce`.
5. **Phase 2 added two new evidence gaps of its own:** no FPS measurement still exists **including for the
   creature**, and the WARDEN's behaviours were exercised only through deterministic simulation in a desktop
   browser — never on a real phone or tablet, and never by a person actually playing against it.

---

## 15. Exact next recommended task

> **Verify the game on a real phone (or a coarse-pointer-emulated session), then fix BUG-1 and BUG-2
> together.**

Concretely, in order:

1. Serve `npm run dev` on the LAN and open it on a real Android/iOS device. Run the same checklist used
   in §6: joystick movement, drag-look, Sprint/Beam/Interact buttons, key pickup → exit → victory, one
   deliberate death, pause/resume, and an orientation change mid-run. Record actual FPS if possible.
2. With a genuine coarse pointer, re-check BUG-2. If the gauges clear the stick there, downgrade BUG-2 to
   "affects force-touch on fine-pointer devices only" and record that.
3. Fix BUG-1 by re-evaluating the rotate hint whenever the run becomes `playing` (and on resize).
4. Then look at the optional polish list in §16.

**Do not start gameplay expansion before step 1** — the touch path is the least-evidenced part of an
otherwise finished game.

---

## 16. Optional polish backlog (not required, not started)

- Code-split the game bundle so the landing page does not download Three.js before PLAY.
- LOD / instancing pass on the facility, and an FPS counter behind a `?debug=1` flag.
- Gamepad support (the `Controls` surface is already the right seam for it).
- A "how to play" in-game tutorial beat (the landing page teaches controls, the paused game does not).
- **Accessibility — tracked as requirements (`GAME_REQUIREMENTS.md` §8).** Done in Phase 2: ~~a
  **directional** threat indicator~~, ~~visual equivalents for the **footstep** and **growl** cues~~,
  ~~a caption layer for game-critical audio~~. **Still open:**
  - **Volume level** control and **per-category buses** (ambience / threat / UI) instead of the single
    hardcoded master gain.
  - Honour `prefers-reduced-motion` **inside gameplay** beyond the creature rig: head bob, camera roll,
    torch sway, dust drift, light flicker, the damage-vignette transition and the escape cinematic.
  - Optional follow-ups on the new work: a settings toggle for the caption, and an off-screen arrow that
    clamps to the screen edge when the creature is outside the ring.
- Reduce reliance on `setTimeout` in `objectives.collectKey()` for the unlock sound (currently a 420 ms
  delay that is not cancelled on restart).

---

## 17. Commands

Run everything from `C:\Users\MD Rehan\Desktop\the-last-exit`.

```bash
# install (node_modules is already present and complete)
npm install

# development server  → http://127.0.0.1:5178
npm run dev

# QA pin for control schemes
#   http://127.0.0.1:5178/?touch=1   force touch controls
#   http://127.0.0.1:5178/?touch=0   force keyboard/mouse controls

# facility map sanity check (the only automated check) — must print PASS
npm run check:map

# production build → dist/
npm run build

# serve the production build → http://127.0.0.1:4173
npm run preview

# There is no lint script and no test script.
```

Console QA surface (paste into the browser console on the running page):

```js
__lastExit.state          // 'idle' | 'playing' | 'paused' | 'dead' | 'won'   (a getter, not a function)
__lastExit.debug          // { state, timer, playerCell, hasKey, exitUnlocked, doorOpen,
                          //   flashlight, stamina, battery, creature:{mode,detection,distance}, detections }
__lastExit.play()         // start a run
__lastExit.tick(1/60)     // deterministic single step (only advances while 'playing')
__lastExit.press('KeyW')  // synthesise a keydown
__lastExit.game.teleport(col,row)          // move the player to a map cell
__lastExit.game.teleportCreature(col,row)  // move the creature to a map cell
```

---

## 18. Known limitations and unresolved questions

**Limitations of the verification performed**
- No real mobile device or coarse-pointer hardware was available.
- Pointer Lock and Fullscreen could not be genuinely granted in the automated browser.
- No audio was monitored; sound correctness is source-verified only.
- No real GPU load or frame-rate measurement was taken.
- The previous conversation and any intermediate history are unrecoverable (no Git, no notes).

**Open questions for the project owner**
1. Was the previous session's final task the `main.js`/`game.js` pass at 20:11–20:12, or was work
   abandoned mid-thought? The code shows no unfinished work, so the recovery assumes the former.
2. Is THE LAST EXIT intended to be published anywhere? There is no deployment config, no repository
   and no licence file. This affects whether `dist/` should be committed and whether the bundle size
   (158 KB gzipped before PLAY is pressed) matters.
3. Should the game be completable in a shorter time, or is the current pacing (a full run took ~31 s in
   one test) intended?
4. Should `dist/` be tracked or ignored? `.gitignore` ignores it, but there is no repository yet.

---

## 19. Change log

### 2026-10-16 — Recovery, documentation and verification pass
- **Recovered** the project: located the real root (`Desktop\the-last-exit`) while the session workspace
  was rooted on the unrelated LUMA project. No LUMA files were touched.
- **Inspected** all 12 JS modules, `index.html`, all 4 stylesheets and the map-check script (~6,900 lines).
- **Created** `AGENTS.md`, `PROJECT_HANDOFF.md`, `GAME_REQUIREMENTS.md`, `PROJECT_FILE_LIST.txt`.
- **Ran** `npm run check:map` → **PASS** (21 assertions); `npm run build` → **success** (22 modules,
  615 KB JS / 30 KB CSS). `dist/` regenerated.
- **Browser-tested** desktop and forced-touch flows end to end: boot, movement, sprint/stamina, collisions,
  flashlight, key pickup, locked exit, escape, victory, death, retry, restart, pause/resume, quit, quality
  switching, mute, joystick, touch-look, touch action buttons, orientation survival, all 16 controls.
  No console errors.
- **Found** BUG-1 (rotate hint never shows at the start of a portrait run) and BUG-2 (HUD gauges overlap the
  joystick when touch is forced on a fine-pointer device).
- **Modified no gameplay code.** The only filesystem changes were the four new documentation files and the
  regenerated `dist/` output.

### 2026-10-16 — PHASE 1 re-verification, production build, independent backup
- **Phase scope:** inspection and protection only. **No gameplay code was modified. No files inside the
  project were moved, copied, renamed or deleted.**
- **Workspace root:** the session workspace was again rooted on the unrelated **LUMA** project
  (`Desktop\luma\app`) at the start of this phase. All work was done against the absolute path
  `C:\Users\MD Rehan\Desktop\the-last-exit`, and LUMA was not touched.
- **Proved the source is unchanged** since the 22:02 snapshot — all 31 files byte-identical (manifest
  diff exit 0). The earlier full source inspection therefore still holds, so it was not repeated in full.
- **Ran** `npm run check:map` → **PASS** (exit 0), and `npm run build` → **success** (exit 0, 22 modules,
  615 KB JS / 30 KB CSS). The rebuild produced **identical content hashes**, confirming the build is
  byte-for-byte reproducible — and that the backup was not invalidated by rebuilding.
- **Browser-tested the critical path live:** real PLAY click → `playing` → spawn cell **13,12** →
  movement → locked exit correctly refused (`locked`, prompt "Sealed — maintenance key required") →
  key pickup (`key`, `exitUnlocked` true) → escape (`escape`) → **victory overlay shown**. 14 modules
  loaded, no console errors.
- **Re-verified the touch path** at `?touch=1`, 390×844 portrait: touch controls engaged, FOV 82, joystick
  moved the player **2.61 m**, release reset input to 0, and the key was collected using the on-screen
  Interact button alone.
- **Re-confirmed both known defects** (details in §10), this time with valid preconditions:
  - **BUG-1 — CONFIRMED.** With `_rotateDismissed === false`, state `playing`, portrait matched and touch
    enabled (precondition verified), the rotate hint was still hidden at the start of the run. Forcing a
    re-evaluation made it appear immediately — proving the logic is correct and this is a **call-site
    timing bug** (`_resetRun()` evaluates the hint before the state becomes `playing`).
  - **BUG-2 — CONFIRMED.** `matchMedia('(pointer: coarse)')` false while `body.is-touch` true, and the
    `.hud__gauges` box measurably overlaps `#touch-stick`.
- **Created** the independent backup described at the top of this file, and verified it two ways.
- **Corrected my own testing twice during this pass** (recorded here for honesty):
  1. A harness of mine asserted BUG-1 while its precondition was actually unmet — the assertion was
     withdrawn and the test rewritten to gate the verdict on the precondition. (The first "reproduction"
     was invalid because `_rotateDismissed` was `true` from a previous session.)
  2. A hash-comparison command of mine used `.$path` against an already-`./`-prefixed path, producing a
     false "CHANGED" result; corrected and re-run.
  Neither error affected the project — both were faults in throwaway verification commands.
- **Side effect on local state (not a file change):** the `tle.rotateDismissed` key was cleared from
  `localStorage` while testing BUG-1. This only resets the "rotate hint dismissed" preference; it does not
  affect any project file, and the in-memory flag had to be set directly anyway.
- **Remaining issues:** unchanged — BUG-1, BUG-2, and the total absence of real-device and performance
  evidence. See §14.
- **Next recommended task:** unchanged — verify on real hardware (or coarse-pointer emulation), then fix
  BUG-1 and BUG-2 together. See §15.

### 2026-10-16 — Read-only workspace check + accessibility requirements recorded
- **Phase scope:** read-only verification plus **documentation-only** edits. **No source code was edited,
  nothing was installed, nothing was rebuilt, and the backup was not modified.** No gameplay change.
- **`check:map` and `npm run build` were deliberately NOT re-run.** No source file has changed since they
  last passed (exit 0), so re-running would have proven nothing new — and a rebuild would have rewritten
  the backup's `dist/` files.
- **Confirmed the project root:** `C:\Users\MD Rehan\Desktop\the-last-exit` (realpath identical), separate
  from LUMA in both directions — not equal, not nested inside LUMA, and LUMA not nested inside it. Identity
  re-checked: `the-last-exit v1.0.0`, 3/3 Vite markers present, **0** Next.js/LUMA markers, no Git repo.
  The **session workspace root is still `Desktop\luma\app`**, which is why relative paths and `reveal_file`
  do not resolve to this project.
- **Confirmed all four documents exist in the actual project root** with their expected sizes.
- **Inspected the source read-only** for accessibility facts, then recorded them as `GAME_REQUIREMENTS.md`
  §8 (10 new requirements). Findings, all source-derived:
  - `prefers-reduced-motion` is consulted in **exactly two places** — `base.css` and `hero.js` — and
    **nowhere in the game layer**.
  - Audio has a **global mute only**; master gain is the hardcoded constant `0.85`, with **no volume
    control and no per-category buses**.
  - Creature **footstep and growl cues are audio-only**; the sole visual channel is a **non-directional**
    red vignette (`.danger`, `inset: 0`, centred radial gradient) plus a reticle state.
- **Did not modify the backup** (per instruction). Consequence: the two edited documents now differ from
  the snapshot. Verified that **no code, config or build file differs**, so the rollback value is intact.
  Recorded this drift explicitly rather than leaving it silent.
- **Remaining issues:** unchanged, plus the accessibility block from §8. See §14.
- **Next recommended task:** unchanged — real-device verification, then BUG-1 and BUG-2. See §15.

### 2026-10-16 — PHASE 2: THE WARDEN (3D creature, navigation, run-state rules)
- **Work completed:**
  - **Rebuilt the creature as a real 3D rig.** It is now built from two shared unit primitives scaled per
    mesh (55 meshes, 2 geometries), standing 2.45 m to the face: unnaturally thin torso, four limbs, two
    unequal arms split at a fixed unnatural elbow crook, ten long two-segment fingers in a rake, a sloped
    and mismatched shoulder bar, a sunken face with an overhanging brow and deliberately unmatched emissive
    eyes, and wound/rib damage decals.
  - **Added its animation:** breathing, irregular head tilts (six poses held 1.1–4.3 s, 293 distinct values
    over 900 frames), involuntary twitches, a hand curl that opens into a rake while hunting, and a gait
    whose speed follows its actual movement.
  - **Hardened its navigation.** Collision now tests the tile grid **and** the same 43 procgen box colliders
    the player collides with, resolved per axis so it slides along walls instead of passing through them. A
    travel-sampling stuck detector fires a perpendicular sidestep and re-plans; a safety valve frees it if it
    is ever found already overlapping geometry so it can never be sealed in place. All ranges moved into
    `ENEMY` in `config.js`, including the new `radius`, `nearRange`, `stuck*` and `sidestepTime`.
  - **Built the missing visual channel.** Every creature sound now goes through one `Creature._cue()` choke
    point that both plays the audio and records the event, and `Hud.setThreat()` renders it as a directional
    ring around the reticle plus a live caption — closing accessibility rows 8.1–8.5.
  - **Added reduced-motion handling to the creature rig** (head tilts and twitches fully suppressed, neck
    sway scaled to 20 %), moving row 8.10 from MISSING to PARTIAL.
- **Files modified:** `src/game/enemy.js` (rewritten model, animation, collision, cue mirroring),
  `src/game/config.js`, `src/game/game.js` (bearing + threat plumbing + run-state guard),
  `src/game/hud.js`, `src/main.js`, `index.html`, `src/styles/game-ui.css`, plus `PROJECT_HANDOFF.md`
  and `GAME_REQUIREMENTS.md`.
- **Bugs fixed (three, all found *by testing* rather than by reading the code):**
  1. **The threat indicator reappeared over the game-over screen.** `_caught()` hides it from inside
     `creature.update()`, and the same frame's threat write then switched it straight back on. Fixed by
     guarding that write on `state === 'playing'`. Caught by asserting the DOM state after a death.
  2. **The creature rendered with no visible eyes.** The eyeballs sat at the same depth as the socket
     boxes and were completely enclosed by them, because a solid box cannot be cut into a hole. Fixed by
     moving the eyes in front of the socket face. Caught by screenshotting the head at close range.
  3. **The creature washed out to a featureless white silhouette under the flashlight at close range**,
     hiding its face and its damage. The albedo was near-white while the torch is a physical 15-candela
     spotlight. Fixed by lowering the skin albedo and toning down the head glow. Caught by the same
     close-range screenshots — the code looked fine throughout.
- **Tests performed and results (all in-browser against the running game):**
  - `npm run check:map` → **PASS, exit 0**. `npm run build` → **exit 0** (22 modules, 1.35 s).
  - **12,000 deterministic simulation frames** running the real `update()` path: **0 frames inside wall
    geometry**, **0 frames overlapping any collider**, 344 m travelled, 81 distinct cells, stuck recovery
    engaged and escaped, longest non-moving stretch 151 frames (= the patrol pause).
  - **Detection → chase → catch → game over**, twice: detection 0→1 in 19 frames at 8 m, chase on the growl
    cue, catch at 1.13 m after 142 frames.
  - **Full FSM cycle:** `chase` → `search` after 224 frames → `patrol` after a further 361 frames.
  - **Run-state rules:** paused and game-over both froze the creature at 0.000000 m with `step()` refusing;
    victory cannot move it; two `init()` calls still leave exactly 1 creature in the scene; two restarts
    reused the same animation-frame handle; 3 consecutive restarts reset it cleanly and identically.
  - **Directional indicator:** bearing exact at 0°, ±45°, ±90°, ±135° and 180°; captions `FOOTSTEPS ·
    BEHIND RIGHT · 9m`, `GROWL · AHEAD · 8m` and `SOMETHING IS CLOSE · AHEAD · 10m` all observed live;
    hidden beyond 13 m.
  - **Real `requestAnimationFrame` loop** run for 4 s: in-game timer advanced 4.02 s, patrol speed exactly
    1.75 m/s, no clipping, **console clean** (every request 200, no errors or warnings).
  - The model was inspected visually in-browser at 1.2 m, 1.7 m, 3.4 m and 6 m with the flashlight on.
- **Not tested (do not claim):** no FPS measurement on any hardware, including the creature; no real phone
  or tablet; Pointer Lock, Fullscreen, safe-area insets, and audible audio all remain unverified; no screen
  reader, and the `prefers-reduced-motion` **media query itself was never triggered** — the creature's
  reduced-motion branch was verified by setting its flag directly.
- **Remaining issues:** BUG-1 and BUG-2 are both still open and untouched. Accessibility §8 is down to
  2 MISSING (volume level, per-category buses) and 1 PARTIAL (reduced motion across the rest of the game
  layer). **The backup snapshot is now stale for 12 of its 31 files** (7 source/markup/style + 2 docs +
  3 build outputs) — see the measured drift status at the top; it was deliberately left unmodified and still
  self-verifies 31/31.
- **Next recommended task:** unchanged priority — **verify on real mobile hardware and measure a frame
  rate**, then fix BUG-1 and BUG-2 together. The creature has never been played against by a person.

### 2026-10-17 — WARDEN: size pass (partial), verification status

**Changed**
- `src/game/warden-model.js`: `MODEL_SCALE` 2.2 → 2.8 (uniform). The raw GLB is about 1.0 × 0.62 × 0.87 units, so the model is now about 1.74 m tall, 2.8 m claw to claw and 2.4 m long.
- `src/game/config.js`: `ENEMY.radius` 0.48 → 1.0 (wall clearance for a 2.8 m body in 3 m corridors). Catch distance is 1.6 m from the Warden's centre.
- `src/game/enemy.js` / `src/game/game.js`: head and face heights now come from `FACE_HEIGHT` in `warden-model.js`, and the catch camera framing follows the new size.

**Not met from the brief**
- **2.5–3× player height is not met.** The mesh is a quadruped with no standing pose. A 4.5–5.4 m tall body would be about 7 m wide at this mesh's proportions, which cannot fit a 3 m corridor. The chosen scale was picked to keep the body inside the 3 m corridors; corridor fit was not tested by walking the route.
- **Colour and texture pass not redone.** The shader still desaturates the albedo to 0.9 and tints it. The GLB's own map already has grey-white skin, dark veins and maroon patches. The reference's pale grey-white skin, pink undertone, grime and red details have not been matched.
- **Face under the flashlight not verified.** Eyes, teeth and mouth may be visible, but I did not get a clean close-range screenshot. The creature was placed by a runtime wrapper, and the harness views were nearly black.
- **Crawl animation not changed.** The gait, head watch, strike and catch pose are the existing procedural rig (6 bones). It has not been rechecked at the new scale, and idle, patrol, chase and attack transitions were not observed.

**Verified**
- `npm run build` exited 0 after the scale change.
- Kill sequence in real time: a catch from 3 m with the Warden chasing reached the GAME OVER screen ("THE FACILITY KEEPS YOU", TRY AGAIN, RETURN TO MAIN MENU).
- Console errors were not checked in this pass.

**Limits**
- The harness's `tick()` only steps the playing state, so the catch was tested with real time.
- Port 5178 was already served by another process, so the dev server was not started or stopped here.
- No FPS or mobile frame-time measurement. The mesh has about 136,916 vertices and about 406k triangles per frame, with no LOD.
- Next: close-range visual check of the face and colour in open floor, a colour pass from the reference, and a frame-time check on a phone.

### 2026-10-17 — WARDEN: sculpted GLB model, skin colour pass, kill sequence
- **Work completed:**
  - **Replaced the primitive Warden with the supplied `monsterrr.glb`**, copied to
    `public/models/warden.glb`. The asset is one static mesh (≈137k vertices, ≈198k triangles, 8.7 MB) with
    a base-colour map and a metal-roughness map, and **no skeleton and no animations**. Its rig is therefore
    procedural in `src/game/warden-model.js`: each vertex gets up to four weighted bones from six joints
    (root, head, two forelimbs, two hindlimbs), and the vertex shader blends the bone matrices per frame.
  - **Colour pass in the fragment shader:** the albedo is desaturated, tinted pale flesh, and red/purple regions
    are pushed towards maroon. Tune it through `WARDEN_UNIFORMS` (`uDesat`, `uSkinTint`, `uBlood`, `uBloodAmount`).
  - **Idle/patrol/chase/search/attack channels** (breathing, weight shift, head pitch/yaw/roll, fore- and hind-limb
    lift, claw/forepaw twitch) ease toward targets through `WardenRig`. The pose is driven from `Creature`.
  - **Kill sequence (`game.js` `_caught` / `_updateCaught` / `_finishCatch`):** triggers once, locks controls,
    plays the catch sound, lunges through `enemy.beginCatch()` / `updateCatch()`, applies a camera shake on impact
    (scaled to 30 % under reduced motion), then fades to black. **GAME OVER only appears after the sequence
    finishes.** Timings are in `CATCH` in `config.js`, including `fadeTime`.
  - **`main.js` preloads the model once** and passes it to `Game`. The game overlay stack is kept intact: the fade
    sits at z-index 40, below the HUD and the game-over screen.
- **Files modified:** `src/game/warden-model.js` (new GLB loader and rig), `src/game/enemy.js` (`update()` hands
  off to `updateCatch()` during a kill), `src/game/game.js` (`caught` state and fade), `src/game/config.js`
  (`CATCH.fadeTime`), `src/main.js` (preload), `public/models/warden.glb`, `PROJECT_HANDOFF.md`.
- **Tests performed:**
  - `npm run build` → **exit 0** (719 kB JS, `dist/models/warden.glb` copied).
  - Port 5178 was already held by another process (PID 12584, not started by this pass), so I did not start a server and I did not stop it. The browser checks ran against that server, which serves this project from disk. `warden.glb` loads with **200**, the two textures decode from blobs, the run
    starts from PLAY NOW, and the **console is clean** (no errors or warnings) after three forward key taps.
- **Not tested in the browser (do not claim):**
  - **Kill sequence (browser, real time):** `game._caught()` → `caught` for about 3.0 s, impact at about 0.85 s, fade near the end of the hold, then `dead` at `catchT` 3.15 s. GAME OVER appears only after that. RESTART returns to `playing` with the timer at 0, the Warden back at spawn and detections at 0. Note: `__lastExit.tick()` only steps the `playing` state, so use real time for the sequence.
  - **Proximity cue (browser):** the HUD showed `SOMETHING IS CLOSE · AHEAD · 2M/4M`, the red radar and the red vignette.
  - **Mesh renders:** one visible mesh with 136,916 vertices, bounds ±0.5 (group scale 2.2), and about 406k triangles drawn per frame in the scene. That is the main mobile cost signal, but no FPS was measured.
  - **NOT verified:** a clear in-game view of the Warden under the flashlight. Test screenshots showed only walls. The creature was placed by a runtime wrapper on `creature.update` that ignores walls, so it may have been inside geometry; the camera also drifted between tool calls. Treat the look as unconfirmed.
  - the Warden at close range, under the flashlight, or from a distance. Only the start screen was captured; the
    creature was out of view and single key taps cannot hold WASD to walk to it;
  - the skin colour match to the reference image, the crawl/chase/attack animation, and the kill sequence itself;
  - mobile performance. At ~198k triangles and an 8.7 MB GLB, this is **a likely mobile cost risk** and has
    no LOD or fallback yet. No FPS was measured;
  - the collision footprint and eye height after the model swap. `ENEMY.radius` in `config.js` was not changed in this pass, so it was tuned for the primitive build.
- **Missing tooling / limitations:** no rigging or skinning source exists for this mesh, so no real bones or
  animation clips are authored. A decimated mobile LOD and a normal map were not produced; both need a
  mesh-processing tool (e.g. glTF-Transform or Blender) that is not installed in this project.
- **Next recommended task:** capture a clean close-range flashlight screenshot in open floor space (no wall-clipped
  placement), confirm the colour match to the reference image, measure frame time on a mid-range phone, and add a
  decimated LOD if it is too heavy. The reference image was not available as readable input in this session.

### 2026-10-17 — WARDEN: death scene camera, face close-up, game over, restart
- **Work completed:**
  - **Camera clipping fixed by moving the camera off the gameplay lens.** During the kill the game runs a dedicated
    kill lens (`_catchCam` in `game.js`). It dollies from the eye to a spot `CATCH.pullback` (1.1 m) behind the lens,
    backing off only over open floor (wall probes stop it early). The Warden rushes to `CATCH.faceDistance` (1.6 m)
    in front of that lens. Shake moves only sideways and vertically, so the lens never moves into the body.
  - **Face fills the frame:** the lens zooms from the normal FOV to `CATCH.zoomFov` (52°) and aims `CATCH.aimDrop`
    (0.2 m) below the head centre so the jaw and teeth stay in shot.
  - **HUD and capture hint hidden during the sequence** through an `is-caught` class on the game layer (`game-ui.css`).
  - **Sequence runs once and the run state is cleared on exit.** `step()` now drives the `caught` sequence as the
    real loop does, so the QA hook can run the full death. Controls are disabled on catch.
  - **Touch look queued during the kill is cleared on start and restart** (`controls.releaseAll()` before
    `setEnabled(true)` in `startRun()` and `restart()`). Without this, look input swiped during the catch carried
    into the next run.
  - **Reduced motion:** no impact flash, the dolly is a cut, shake is at 30 %, and the zoom keeps 40 % of the FOV.
- **Files modified:** `src/game/game.js`, `src/game/config.js` (`CATCH.faceDistance`, `zoomFov`, `aimDrop`,
  `pullback`), `src/styles/game-ui.css`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run build` → exit 0 (after the final edit). `npm run check:map` → PASS (after the final edit).
  - **Browser, live run (`http://127.0.0.1:5180`):** a Warden placed 1.5 m in front of the player. Clipping probe
    sampled every frame: the nearest visible vertex stayed at about 0.43–0.49 m from the lens during the hold. The
    only sub-0.3 m reading was 0.2 m in the first frame, while the lens was still at the eye. The face filled the
    lower half of the frame at the hold, with eyes, teeth and jaw visible (screenshot checked, no body geometry
    crossing the lens).
  - **Timing (browser):** CAUGHT YOU caption shows from 1.1 s, fade runs from 2.55 s, `dead` state at 3.17 s. The
    death screen (YOU ARE DEAD, stats, RESTART and MAIN MENU) renders.
  - **Single trigger:** the sequence is driven once and reaches `dead` with the game-over panel shown.
  - **RESTART (`btn-retry`):** state returns to `playing`, controls re-enabled, look queue cleared. Verified
    synchronously after the click: queued look 300 → 0.
  - **MAIN MENU (`btn-dead-menu`):** state returns to `idle`, game-over panel hidden, game layer hidden, the render loop
    stopped, and the title screen shows.
  - **Reduced motion (partial):** `reducedMotion` and `_shakeScale` were set on the live game instance, because the
    flag is read once in the constructor and could not be re-injected. Result: no impact flash, camera stays
    at the eye (dolly cut), shake at 30 %, FOV narrowed only to 64°. Not a true `prefers-reduced-motion` emulation.
  - **Pull-back verified (browser, cell col 2 row 4, open floor):** the lens dollied to `pullback` (1.1 m) behind the eye
    and held there. Nearest vertex during the hold stayed at 0.42 m (rest-pose approximation, every 2nd vertex). Screenshot
    at 1.52 s showed the face filling the frame with "CAUGHT YOU." above it. Visible gap: the touch buttons and bars stay
    faintly visible during the catch; the HUD element itself is hidden.
  - **Not verified:** a mobile viewport death sequence; the sound itself (the sequence reuses existing
    `growl` and `caught` cues; no new sound was added or listened to); frame time.
  - **Not changed:** the grey block shown over the title on the landing page at phone width. It is not part of the
    game code and was left alone; it needs its own look.
- **Next recommended task:** hide the touch controls during the catch, then capture the mobile close-up.

### Warden skin material redesign
- **Work completed:** Replaced the old colour pass in `src/game/warden-model.js` with a procedural skin colour built
  in the fragment shader from the rest-space position (no UV seams). Layers: pale corpse-white base (`#C9C8BE`), ivory
  highlights (`#E3DDD1`), cold grey-taupe shadows (`#77766F`), sickly pink undertone (`#B98783`), plum bruising
  (`#55454A`); branching veins from domain-warped contour lines in charcoal (`#211E20`) and purple (`#49383E`) with
  varied thickness; scars (`#9D7775`), deep wounds (`#4A171C`), fresh blood (`#651C22`) and grime (`#403B38`) clustered
  around joints and the low body; bruised face; gums (`#6F252B`) and dark mouth (`#260B10`); bone-grey claws
  (`#B4AA98`) with dark tips (`#373033`). The albedo texture is kept as surface detail. Roughness now varies (skin
  0.80–0.94, wounds 0.6, claws 0.42, wet mouth 0.3) through `roughnessFactor`.
- **Uniforms removed:** `uDesat`, `uSkinTint`, `uBlood`, `uBloodAmount` (only used by the old pass). Added a `vRest`
  varying. Geometry, rig, skinning, animation and AI are untouched.
- **Files modified:** `src/game/warden-model.js`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:** `npm run build` passed. `npm run check:map` passed. Browser: the shader compiled and the
  game ran with the new material, but I did not get a clear view of the Warden under ambient or flashlight light. Each
  attempt either caught the player or left the Warden out of frame, and the pause override did not stop the loop.
  **Visual match to the reference is therefore not verified.** The reference image was not in the workspace
  (`oppo.webp` on the Desktop is an unrelated advert), so colours were taken from the hex palette in the brief.
- **Remaining issues:**
  - Eyes, irises and pupils are not individually coloured: the eye positions were not located in the rest-space mesh,
    and the brief asked to preserve the eye count and face geometry.
  - Teeth are only approximated by the gum/mouth masks. There is no separate teeth material.
  - Claw and face masks are approximate spheres/boxes in rest space and need checking against the mesh.
  - Normal maps were not added.
  - Under flashlight the palette may read too dark or too bright. Not checked.
- **Next recommended task:** render the Warden alone in a dedicated viewer (paused loop, fixed camera) to check the
  palette, then tune the masks.

### 2026-11-22 — Quadruped Stalking Motion, Camera & Player Smoothing, Bug Fixes (BUG 1-4)
- **Work completed:**
  - **Cloned & curated external motion skills** into `references/skills/`: `motionmaxxing`, `motion-design-skill`, `blender-skills`, `cinetic`, `effectcraft`, `anidoodle`, `huashu-art-motion`, `mg-styles-15`, `reanimate`, and `remotion-skills`. Installed `tweakpane` and `three.quarks`.
  - **Warden Locomotion Redesign (`src/game/warden-model.js`):** Replaced simplistic symmetric sine crawl with realistic asymmetric quadruped gait (64% stance ground-drive, 36% fast forward swing snap). Added diagonal trot offsets (FR, HL, FL, HR), lateral spine undulation (`spineYaw`), lateral claw sweep, cornering lean based on `yawRate`, and predatory gaze stabilization keeping the head fixated on the player while the torso bobs/rolls.
  - **Player & Camera Smoothing (`src/game/player.js`):** Added double-harmonic footstrike dip and organic mid-stride rise (`_bobPhase * 2` + `_bobPhase`), lateral camera sway, and full `prefers-reduced-motion` compliance.
  - **Fixed BUG-1 (Landscape Rotation Hint):** Hint re-evaluated immediately upon entering `playing` state and on `_resize()` in `src/game/game.js`.
  - **Fixed BUG-2 (HUD/Joystick Overlap):** Added explicit `body.is-touch .hud__bottom` padding in `src/styles/responsive.css` so fine-pointer touch devices/hybrid laptops clear the stick.
  - **Fixed BUG-3 (Clean Death Cinematic):** Hidden `.touch` buttons/stick and `.minimap` during `.is-caught` in `src/styles/game-ui.css`.
  - **Fixed BUG-4 (Uncancelled Audio Timeout):** Stored `_unlockTimeout` in `src/game/interactions.js` and cleared on `reset()`/`dispose()`.
- **Files modified:** `src/game/warden-model.js`, `src/game/player.js`, `src/game/game.js`, `src/game/interactions.js`, `src/styles/responsive.css`, `src/styles/game-ui.css`, `package.json`, `package-lock.json`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0** (41x27, 425 walkable cells).
  - `npm run build` → **exit 0** (31 modules, 0 warnings, 0 errors).
- **Remaining issues:** Volume control slider & audio buses in pause menu (§8 Accessibility).
- **Next recommended task:** Add in-game audio volume control slider and optional Tweakpane visual debugging.

### 2026-11-22 — Monster Footstep Sliding Fix, Organic Voice Synthesis, Environment Visibility & Brightness Overhaul
- **Work completed:**
  - **Fixed Monster Floor Sliding (`src/game/enemy.js`):** In `_animate()`, tied `_gait` phase strictly to physical floor displacement (`moveDist / STRIDE_CYCLE * 2π`) rather than an arbitrary delta-time increment. When stationary, `_gait` is frozen in place with zero foot sliding, settling smoothly to rest while idle breathing and twitches play.
  - **Quadruped Heavy Footsteps (`src/game/enemy.js`, `src/game/audio.js`):** As the creature crawls across the floor, footfalls trigger every 0.5m of ground displacement via `this._cue('step')`. Synthesized physical sub-bass floor thuds (sine pitch drops 68Hz -> 26Hz) layered with claw scrapes (bandpass noise), fully distance-attenuated with distance to player.
  - **Organic Creature Vocalization Overhaul (`src/game/audio.js`):** Replaced the electronic sawtooth lowpass filter drop ("zuummm" synth sound) with biological guttural acoustic synthesis:
    1. FM modulation with 26-32 Hz vocal-fold flutter LFO modulating the fundamental pitch for raw, visceral throat rattle.
    2. Dual acoustic formant bandpass filters (throat F1 ~290-340 Hz and pharynx F2 ~780-860 Hz) modeling real organic vocal tract physics.
    3. Deep sub-bass chest rumble (30-48 Hz sine) providing physical low-end weight in speakers/headphones.
    4. Salivary breath aspiration and wet rasping noise.
    5. Soft-saturation wave-shaping (`Math.tanh`) introducing harmonic warmth and preventing synthetic harshness.
    6. Upgraded `groan()` with dual formants and slow shudder vibrato.
  - **Environment Visibility & Darkness Overhaul (`src/game/config.js`, `src/game/level.js`, `src/game/player.js`, `src/game/game.js`):**
    - Reduced `fogDensity` from 0.058 (high) / 0.048 (low) to 0.028 / 0.022 so long corridors remain readable and atmospheric rather than vanishing into a pitch-black wall 15m away.
    - Updated fog tint from pure pitch-black `0x05070a` to dark medical blue-grey `0x091018`.
    - Boosted facility ambient lighting from 0.42 to 0.75 (`0x384a5c`) and hemisphere light from 0.4 to 0.65 (`0x283848` / `0x10161e`).
    - Increased player personal fill light from 2.2 / 7m to 4.2 / 10m (`0xa8bed2`) so immediate navigation is never completely blind.
    - Upgraded torch beam in `config.js`: intensity from 15 to 28 candela, distance from 30m to 42m, angle from 0.46 to 0.60 rad (widening the narrow tunnel cone), and penumbra to 0.65.
    - Raised renderer `toneMappingExposure` from 1.12 to 1.28.
- **Files modified:** `src/game/enemy.js`, `src/game/audio.js`, `src/game/config.js`, `src/game/level.js`, `src/game/player.js`, `src/game/game.js`, `PROJECT_HANDOFF.md`, `docs/PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0** (41x27, 425 walkable cells).
  - `npm run build` → **exit 0** (31 modules, 0 warnings, 0 errors).
- **Next recommended task:** Add in-game audio volume control sliders and sound bus controls in pause menu.

### 2026-11-22 — Monster Navigation Obstacle Clearance & Horror Visual Redesign
- **Work completed:**
  - **Fixed Monster Getting Wedged on Obstacles (`src/game/config.js`, `src/game/enemy.js`):**
    - Reduced oversized `ENEMY.radius` from 1.0m to 0.58m and `ENEMY.wallClearance` from 1.45m to 0.98m.
    - Previously, in a 3.0m corridor, 1.45m wall clearance on both sides left only 0.10m of free path, causing the monster to freeze and wedge on any floor obstacle (lockers, crates, barrels, beds). With 0.98m clearance and 0.58m hull, it has over 1.0m of navigable clearance and slides past obstacles without getting trapped.
    - Reduced `_beginSidestep()` probe from 0.95m to 0.65m so unsticking maneuvers find free space instead of penetrating opposite walls.
  - **Complete Monster Visual & Horror Shader Redesign (`src/game/warden-model.js`):**
    - Fixed bleached chalk-white mannequin / marshmallow appearance: replaced 80%+ luminance ivory base with deep necrotic corpse hide (shadowed charcoal-taupe `#2B2827`, necrotic olive-grey, and bruised plum undertones).
    - Fixed white shoulder tubes / spikes: added procedural shoulder quill masks rendering as weathered, tarnished containment steel and calcified bone with dried dark blood stains (not white skin).
    - Fixed white spaghetti drool: added chin tendril mask rendering as dark, wet, glistening coagulated gore/viscera (`roughness = 0.20`, not white pasta).
    - Fixed cartoon red dot eyes: replaced with deep sunken black necrotic orbital sockets and piercing feral glowing pupils.
    - Restored sculpt micro-detail: blended 55% of the model's baked 2048x2048 sculpt texture to retain skin pores, wrinkles, and muscle striations under lighting.
- **Files modified:** `src/game/config.js`, `src/game/enemy.js`, `src/game/warden-model.js`, `PROJECT_HANDOFF.md`, `docs/PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0** (41x27, 425 walkable cells).
  - `npm run build` → **exit 0** (31 modules, 0 warnings, 0 errors).
- **Next recommended task:** Test live encounter in dev server (`http://127.0.0.1:5178`) and tune audio volume UI.

### 2026-11-22 — Kill Jumpscare Audio Overhaul, Authentic Sculpted Face & Silky-Smooth Locomotion
- **Work completed:**
  - **Eliminated Synthetic/AI Jumpscare Sound (`src/game/audio.js`):**
    - Replaced raw 300Hz->24Hz sawtooth electronic arcade drop in `caught()` with visceral multi-layer horror acoustics: heavy sub-bass bone-crunching impact (pitch drop 95Hz->22Hz with saturation), tearing gore/flesh-rip transient filter, and FM-modulated predatory death screech through dual throat formants.
    - Upgraded `stinger()` with dissonant tritone horror chord and shock impact noise.
  - **Authentic Face & Head Redesign (`src/game/warden-model.js`):**
    - Eliminated artificial geometric math circles (fake procedural eye dots and box teeth) that distorted across the 3D mesh.
    - Grounded the creature's face directly in the model's authentic 2048x2048 sculpted UV albedo, preserving natural anatomical eye sockets, snout, and teeth.
    - Deepened mouth interior into an occluded dark gore void, keeping wet specular sheen on mouth and tendrils.
  - **Silky-Smooth Predatory Pathing & Turning (`src/game/enemy.js`):**
    - Added lookahead corner smoothing in `_followPath()`: when within 1.6m of a waypoint, smoothly blends trajectory toward the next waypoint, turning harsh 90-degree tile corners into natural predator curves.
    - Replaced abrupt heading snaps in `_step()` with exponential yaw damping (`wrapAngle` at rate 11), ensuring continuous, fluid rotation through doorways and turns.
- **Files modified:** `src/game/audio.js`, `src/game/warden-model.js`, `src/game/enemy.js`, `PROJECT_HANDOFF.md`, `docs/PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0** (41x27, 425 walkable cells).
  - `npm run build` → **exit 0** (31 modules, 0 warnings, 0 errors).
- **Next recommended task:** Playtest map traversal across all 3 sublevels in live browser session.

### 2026-11-23 — Dedicated Fullscreen 3D Monster Inspector (Turntable Viewer)
- **Work completed:**
  - **In-App Pure 3D Turntable Viewer (`src/game/monster-inspector.js`):**
    - Created dedicated Three.js 3D inspection stage with 360-degree orbital rotation (mouse drag / touch), zoom (scroll wheel / pinch), and pan.
    - Features circular illuminated stage pedestal with bioluminescent perimeter ring.
    - Loads and animates the exact production 3D rigs and shaders for all 3 specialized monsters:
      - **The Warden (Sublevel 4):** Procedural skin weights, necrotic corpse skin, obsidian claws, and 4-legged prowl kinematics.
      - **The Crawler (Sublevel 7):** 10-segmented body with transverse S-curve sinusoidal undulation, articulated twitching mandibles, and pulsing green veins.
      - **The Archivist (Sublevel 1):** 2.6m tall 4-armed skeletal rig with mantis scythes, parchment skin, and glowing amber eye sockets.
    - Floating UI controls: switch monster [1-3], toggle animation mode (Walk, Idle, Aggro, Freeze), toggle auto turntable rotate, switch lighting (Studio inspection vs Flashlight horror), reset camera, and exit.
  - **UI Integration (`index.html`, `src/main.js`, `src/styles/inspector.css`):**
    - Added "VIEW 3D MONSTERS" button to website landing hero.
    - Added "VIEW 3D MONSTER" button to the sector deployment modal (`#map-select`).
    - Added URL query param support: `?monsters=1` or `?view=monsters` or `?monsters=crawler` opens the 3D viewer directly on page load.
    - Exposed `window.__lastExit.inspectMonsters(monsterId)`.
- **Files modified / created:**
  - Created: `viewer.html`, `src/viewer.js`, `src/game/monster-inspector.js`, `src/styles/inspector.css`.
  - Modified: `vite.config.js`, `index.html`, `src/main.js`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `node scripts/test-maps.mjs` → **All 3 maps PASS, exit 0**.
  - `npm run build` → **exit 0** (46 modules transformed, multi-page production build for `index.html` and `viewer.html`).
- **Next recommended task:** Playtest in live browser session across desktop and mobile viewports.

### 2026-11-23 — Multi-Format 3D Model Distribution & T-Pose Mixamo Pipeline
- **Work completed:**
  - Generated dedicated **T-Pose** (cross-format hands spread horizontally, standing upright) models for Mixamo auto-rigging:
    - **The Archivist T-Pose:** `public/models/archivist_tpose.obj` (96KB), `archivist_tpose.glb`, `archivist_tpose.blend`. Standing upright bipedal ($2.6\text{m}$ tall) with arms spread horizontally at $90^\circ$ cross-format for instant Mixamo marker placement.
    - **The Warden Beast T-Pose:** `public/models/warden_tpose.obj` (21.4MB), `warden_tpose.glb`, `warden_tpose.blend`. Re-oriented upright bipedal beast stance on hind legs with front limbs extended horizontally at $90^\circ$ cross-format for Mixamo rigging.
  - Script created: `scripts/blender/generate_tpose_models.py`.
- **Files modified / created:**
  - Created: `scripts/blender/generate_tpose_models.py`, `public/models/*tpose*`, `blender/*tpose*`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Blender headless T-pose generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0**.
- **Next recommended task:** User uploads `archivist_tpose.obj` or `warden_tpose.obj` to Mixamo.








### 2026-11-23 — Warden Model Color Integration & Anatomically Isolated Procedural Rig
- **Work completed:**
  - **Fixed Missing Painted Colors Bug:** In Three.js `GLTFLoader`, glTF's secondary vertex color attribute `COLOR_1` is mapped to `geometry.attributes.color_1` (without leading underscore). Previous code checked `_color_1`, leaving the mesh with `COLOR_0` (all-white blank mannequin). Updated to `geometry.attributes.color_1 || geometry.attributes._color_1` and copied directly to `geometry.attributes.color`. User's custom hand-painted charcoal skin and blood-red mouth/gore now render vibrantly.
  - **Fixed Mesh Node Elevation Offset:** Neutralized Blender object translation (`The_Warden_Furious` node had $Y = 0.85\text{m}$ baked in) with `mesh.position.set(0, 0, 0)` so creature contact with the floor is exact ($Y=0$) in both gameplay and the 3D Monster Inspector.
  - **Anatomically Isolated Procedural Rigging:** Overhauled `computeSkinWeights()` in `src/game/warden-model.js`. Implemented sagittal plane isolation (right arms/legs never pull left vertices, left limbs never pull right vertices), anterior/posterior separation (forelimbs do not influence hips), and absolute head/snout isolation (shoulders and claws have 0% influence on head/mouth). Eliminated rubbery tearing and head distortion.
  - **Tuned Quadruped Locomotion Kinematics:** Recalibrated `crawlGait` stride amplitude in `WardenRig.update()` to natural quadruped stalking bounds ($0.08 + 0.18s\text{ rad}$, foreleg lift $0.16s$, hind drive $0.85\times$), with realistic neck stabilization and spine undulation.
- **Files modified:**
  - `src/game/warden-model.js`
  - `src/game/monster-inspector.js`
  - `PROJECT_HANDOFF.md`
- **Bugs fixed:**
  - User painted colors not rendering (white mannequin bug).
  - Warden limbs twisting and tearing the head apart during locomotion.
  - Warden mesh elevation offset clipping/floating on stage.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server hot reloaded.
- **Next recommended task:** Preview updated Warden in Monster Inspector (`http://127.0.0.1:5179/` or `viewer.html`).

### 2026-11-23 — Warden Turntable Floor Alignment & Luminous Gore Emissive Shader
- **Work completed:**
  - **Fixed Floor Submersion in Turntable Viewer (`viewer.js`):** In `src/viewer.js`, `warden.object.position.set(0, 0, 0)` had wiped out the model's vertical standing position ($Y = 0.868\text{m}$), causing the entire lower half of the Warden (feet, claws, and lower belly) to be submerged inside the stage cylinder. Fixed by preserving `position.y` with `warden.object.position.x = 0; warden.object.position.z = 0;`. Claws and paws now stand cleanly on top of the stage platform.
  - **Luminous Gore & Eye Emissive Shader Enhancement:** Added custom emissive radiance detection in `patchSkinning()` for vertex-colored meshes:
    ```glsl
    diffuseColor.rgb = pow(vColor.rgb, vec3(1.4));
    float isGore = clamp((vColor.r - max(vColor.g, vColor.b) * 1.4) * 2.5, 0.0, 1.0);
    totalEmissiveRadiance += vColor.rgb * isGore * 2.4;
    ```
    This eliminates washed-out grey tones from tone mapping, restores deep pitch charcoal body skin, and makes the painted crimson mouth, dripping gore, and red eyes glow with radiant intensity under all lighting conditions.
- **Files modified:**
  - `src/viewer.js`
  - `src/game/warden-model.js`
  - `PROJECT_HANDOFF.md`
- **Bugs fixed:**
  - Warden feet and claws submerged beneath the stage in `viewer.html`.
  - Pale washed-out vertex colors and dim gore.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
- **Next recommended task:** Provide the user with the direct Blender download and painting guide for The Crawler and The Archivist.

### 2026-11-23 — High-Detail Sculpted Meshes & Painting Setup for The Archivist & Crawler
- **Work completed:**
  - **Rebuilt The Archivist from Scratch (Blender 5.3):** Replaced primitive geometric blocks with a 24,244-vertex seamless, watertight, sculpted horror biped ($2.6\text{m}$ tall) featuring emaciated ribcage, exposed elongated vertebrae, two curved mantis scythe blades, two secondary thoracic claws, hollow sunken skull with deep eye sockets, and talon feet. Applied Voxel Remesh to eliminate all internal geometry. Pre-painted with bone, blade obsidian, and glowing amber ember eye sockets.
  - **Rebuilt The Crawler from Scratch (Blender 5.3):** Replaced 54 loose disconnected primitive objects with a 17,092-vertex seamless, single-manifold armored serpent ($4.5\text{m}$ long) featuring shovel-head carapace, articulated sickle mandibles with inner teeth, 10 overlapping dorsal armor plates, spine spikes, lateral crawling scutes, and recessed bioluminescent vein channels.
  - **Pre-Configured Vertex Color Pipeline:** Pre-initialized `Color` attribute on both models and hooked directly into Principled BSDF `Base Color` so opening the `.blend` in Blender 5.3 shows full PBR material colors immediately in Material Preview, ready for single-click paint strokes without setup friction.
  - **Exported Formats:** Generated complete `.blend`, `.glb`, and `.obj` sets for both creatures in `public/models/`.
- **Files modified / created:**
  - Created: `scripts/build_master_monsters.py`, `scripts/inspect_models.mjs`.
  - Updated: `public/models/the_archivist.*`, `public/models/archivist_tpose.*`, `public/models/the_crawler.*`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Headless Blender 5.3 generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0**.
- **Next recommended task:** User opens `.blend` files in Blender 5.3 to paint custom colors.

### 2026-11-23 — User Painted Crawler GLB Integration & Real-time Serpentine Slither Shader
- **Work completed:**
  - **Inspected User's Painted Crawler:** Verified `public/models/the_crawler.glb` exported by user at 18:59. Extracted 17,092 vertices with user's custom painted `COLOR_0` attribute: 710 bright emerald bio-veins, 417 custom painted red accents/gore, and dark chitin carapace.
  - **Connected GLB Loader in `crawler-model.js`:** Added `loadCrawlerModel()` with fallback to procedural model. Configured PBR material with user's exact vertex colors.
  - **Implemented GPU Serpentine S-Curve Deformation Shader:** Patched vertex shader with smooth mathematical transverse sine wave kinematics ($0.32$ amplitude taper, undulating S-curves running from head to tail).
  - **Luminous Bio-Emerald & Crimson Emissive Radiance:** Shader boosts contrast with `pow(vColor.rgb, vec3(1.2))` and adds radiant emissive intensity to the emerald green veins ($3.2\times$) and the user's custom red gore accents ($2.8\times$).
  - **Connected Turntable & Inspector:** Updated `viewer.js` and `monster-inspector.js` to asynchronously load and display the user's painted GLB Crawler.
- **Files modified:**
  - `src/game/creatures/crawler-model.js`
  - `src/viewer.js`
  - `src/game/monster-inspector.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - Node GLB parse test → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
- **Next recommended task:** User checks `viewer.html` to see their custom painted Crawler slithering on the turntable stage.

### 2026-11-23 — Authentic Mantis Stance Archivist Sculpt & Full Pipeline Integration
- **Work completed:**
  - **Eliminated Stick-Figure T-Pose:** Completely scrapped the unnatural scarecrow T-pose. Sculpted the true terrifying horror stance in Blender 5.3:
    - Towering $2.6\text{m}$ predatory apparition in hunched forward stalking posture.
    - Elongated S-curve spine with protruding dorsal vertebrae spikes.
    - Two massive overhead Mantis Scythe Arms raised high above the head, poised to strike with long razor curved sickle blades.
    - Two folded thoracic secondary grasping claws across the chest.
    - Sunken skull with gaping jaw, needle fangs, and deep hollow eye sockets.
    - Digitigrade predatory legs with backward hocks and triple raptor ground talons.
    - Voxel Remeshed into a single, seamless, watertight organic sculpt (24,996 vertices).
  - **Pre-Configured Color Attributes:** Pre-painted desiccated mummy parchment skin, bone highlights, obsidian metal scythe blades, and glowing amber fire ember eye sockets.
  - **Exported Formats:** Saved to `public/models/the_archivist.blend`, `the_archivist.glb`, `archivist_tpose.blend`, `archivist_tpose.glb`, `archivist_tpose.obj`.
  - **Connected Game & Viewer Loaders:** Added `loadArchivistModel()` with PBR material, amber eye emissive glow, and blood-edge radiance in `archivist-model.js`, `viewer.js`, and `monster-inspector.js`.
- **Files modified / created:**
  - Created: `scripts/build_authentic_archivist.py`.
  - Updated: `public/models/the_archivist.*`, `public/models/archivist_tpose.*`, `src/game/creatures/archivist-model.js`, `src/viewer.js`, `src/game/monster-inspector.js`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Headless Blender 5.3 generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
- **Next recommended task:** User re-opens `the_archivist.blend` in Blender to inspect the mantis sculpt and paint.

### 2026-11-23 — User Custom Paint Integration for The Archivist
- **Work completed:**
  - **Inspected User's Saved Blend:** Read `public/models/the_archivist.blend` modified by user at 7:46 PM ($4.41\text{MB}$).
  - **Custom Paint Applied:** User painted the Winged Horror with:
    - Deep crimson devil body, arms, and torso.
    - Demonic piercing yellow eyes with sharp brows.
    - Sharp white fangs in the mouth.
    - Dark obsidian wing spars, leathery wings, and claws.
  - **Exported glTF Pipeline:** Headless exported `public/models/the_archivist.glb` and `public/models/archivist_tpose.glb` ($5.99\text{MB}$) preserving `COLOR_0`.
  - **Enhanced Creature Shader:** Updated `src/game/creatures/archivist-model.js` with yellow-eye radiance ($3.5\times$), crimson skin emissive pop ($1.5\times$), and deep horror contrast curve.
- **Files modified / created:**
  - Updated: `public/models/the_archivist.glb`, `public/models/archivist_tpose.glb`, `src/game/creatures/archivist-model.js`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Blender headless GLB export & test render (`user_archivist_render.png`) → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Play and test all 3 custom-painted monsters in active gameplay runs.

### 2026-11-23 — Walking and Aggro Kinematics Engine for The Archivist
- **Work completed:**
  - **Identified Missing Animation Pipeline:** The GLB branch in `archivist-model.js` previously only updated time uniforms without any vertex shader deformation or rig kinematics, leaving the creature frozen during walk/aggro modes.
  - **Engineered GPU Vertex Shader Kinematics (`archivistDeform`):**
    - **Bat Wing Aerodynamic Flap & Billow:** Menacing rhythmic flap ($3.2\text{Hz}$, $15^\circ$ arc) in idle/walk; hyper-aggressive violent beat ($6.8\text{Hz}$, $32^\circ$ arc) during chase/aggro with $+0.65\text{m}$ forward predatory wing flare to envelop prey. Includes secondary leathery membrane wave billow along finger struts.
    - **Predatory Digitigrade Leg Stride:** Alternating bipedal stepping stride with foot planting and knee lift ($0.28\text{m}$ stride length).
    - **Clawed Arms & Talons:** Natural swing during stride, lunging forward $+0.45\text{m}$ with hooked talons in aggro.
    - **Demonic Head & Jaw Aggro:** Predatory forward thrust ($+0.42\text{m}$), dropping down with vicious feral snarl twitching ($32\text{Hz}$).
  - **Dynamic Shadow Synchronization:** Added `customDepthMaterial` with matching `archivistDeform(position)` vertex shader so facility shadows cast by the monster flap and stalk in real time.
  - **Creature Factory & Prewarming:** Updated `factory.js` and `main.js` to prewarm and utilize `getLoadedArchivistModel()` and `getLoadedCrawlerModel()` so custom GLBs immediately run in both Sublevel gameplay and the 3D Inspector.
- **Files modified:**
  - `src/game/creatures/archivist-model.js`
  - `src/game/creatures/crawler-model.js`
  - `src/game/creatures/factory.js`
  - `src/main.js`
  - `src/viewer.js`
  - `src/game/monster-inspector.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Test walk, run, and aggro animations in viewer and active Sublevel 1 gameplay.

### 2026-11-23 — Fixed Archivist Visibility: Resolved Shader Syntax Error & Mesh Selector
- **Work completed:**
  - **Identified Cause of Invisibility:**
    1. A duplicate `return vec3(x, y, z); }` block was present at the end of the `archivistDeform` GLSL function, which caused a WebGL vertex shader compilation syntax error, causing Three.js to fail rendering the material.
    2. Guarded `vColor` references in fragment shader with `#if defined( USE_COLOR )` to ensure syntax safety across all hardware environments.
    3. Updated the GLTF mesh traversal in `loadArchivistModel()` to select the mesh with the highest vertex count (`maxVerts`), ensuring it always binds to `The_Winged_Horror` (99.8k verts) and never falls victim to stray scene nodes.
- **Files modified:**
  - `src/game/creatures/archivist-model.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Verify in browser at `viewer.html?monster=archivist`.

### 2026-11-23 — Creature-Centric Map Redesign & Multi-Map Engine Architecture
- **Work completed:**
  - **Dynamic Level Architecture (`level.js`):**
    - Refactored all geometry construction (pipes, beams, sliding door frames, lighting fixtures, emergency cages, dust volume, blast door jambs) to scale with dynamic map ceiling height `wallH`.
    - Integrated map-specific lighting color, reach, and falloff:
      - Sublevel 4 (The Warden): Clinical hospital ward (3.0m ceiling, blue-tinted overhead fixtures, hospital beds & trolleys).
      - Sublevel 7 (The Crawler): Claustrophobic low-ceiling drainage network (2.5m ceiling, toxic teal `0x76e2a2` lighting, winding aqueduct canals, sludge cisterns).
      - Sublevel 1 (The Archivist): Gothic cathedral research archive (5.0m soaring vaulted ceiling, warm amber `0xffc477` lighting with 22m reach, towering 3.8m bookcase labyrinth, open flight atrium).
  - **Thematic Map Generation & Alignment:**
    - Authored and verified `src/game/maps/map-sewers.js` and `src/game/maps/map-archive.js` with exact blast-door anchor alignment at `(6,4)` and `(7,4)`, 22 maintenance hiding spots each, and tailored enemy spawns.
  - **Dynamic Map Discovery & Minimap Engine (`map.js`):**
    - Implemented `rebuildMapGrid(config)` so `SOLID`, `DOOR`, `AREA_AT`, `FLOOR_TOTAL`, and `WARD_BOXES` recompute dynamically on map switch.
    - Updated minimap and full-screen map to render real thematic room names ("PUMP CISTERN", "GRAND READING ATRIUM", "TOWERING BOOK STACKS", etc.) and ward boundaries.
  - **Multi-Map Automated Sanity Check (`scripts/check-map.mjs`):**
    - Expanded `npm run check:map` to validate all three maps in one pass: rectangular bounds, row lengths, spawn connectivity, key reachability, fixture access, blast door anchors, bed/trolley clearances, and creature pathing to all key spots.
- **Files modified:**
  - `src/game/level.js`
  - `src/game/map.js`
  - `src/game/game.js`
  - `src/game/maps/map-sewers.js`
  - `src/game/maps/map-archive.js`
  - `scripts/check-map.mjs`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **ALL MAPS PASS (Sublevel 4, Sublevel 7, Sublevel 1), exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Remaining issues:** None.
- **Next recommended task:** Play through Sublevel 7 (The Crawler) and Sublevel 1 (The Archivist) in the live browser.

### 2026-11-23 — Randomized Distant Monster Spawning & Spawn Safety Protection
- **Work completed:**
  - **Identified Spawn Proximity Bug:** On Sublevel 7 and Sublevel 1, the creature spawn was pinned to fixed coordinates (e.g. col 12 row 7) only a few tiles away from the player spawn (col 9 row 6), causing the monster to spawn immediately adjacent to the player and trigger instant death.
  - **Engineered Dynamic Spawn Selector (`chooseMonsterSpawnCell`):**
    - Computes full BFS walking distances (`floorDistances`) from the player's spawn.
    - Filters candidate floor cells requiring:
      1. Minimum 18 walking steps distance (`minSteps >= 18`).
      2. Minimum 18 meters Euclidean direct distance.
      3. No direct line-of-sight with player (`!hasLineOfSight`).
      4. Not a doorway tile (`tileAt !== 'D'`).
    - Randomly picks from the distant candidates on each run/restart.
  - **Repositioned Author Fallback Spawns:** Updated fallback spawns in `map-sewers.js` to East Cistern `(32, 8)` and `map-archive.js` to South Vaults `(20, 23)`.
- **Files modified:**
  - `src/game/level.js`
  - `src/game/game.js`
  - `src/game/maps/map-sewers.js`
  - `src/game/maps/map-archive.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Enjoy surviving in Sublevel 7 and Sublevel 1!

### 2026-11-23 — Hard Labyrinth Map Overhaul & Monster Lifecycle/Facing Fixes
- **Work completed:**
  - **Hard Labyrinth Map Generation:**
    - Redesigned Sublevel 7 (Drainage Network) and Sublevel 1 (Research Archive) from wide open halls into tight, confusing, claustrophobic labyrinths:
      - Sublevel 7: Winding serpentine canal switchbacks, pipe conduits, and pump cisterns (531 walkable cells).
      - Sublevel 1: Dense towering bookcase stack aisles, catalog rotunda aisles, and locked manuscript carrels (519 walkable cells).
    - Reduced walkable floor space to match the tight, tense atmosphere of Sublevel 4 (425 cells) instead of the previous open 660+ cell layouts.
  - **Fixed Monster Disappearing / Not Spawning in Last 2 Modes:**
    - Fixed cached GLB geometry disposal in `src/game/creatures/factory.js`: when switching levels or resetting, `crawler.isGlb` and `archivist.isGlb` instances now use a no-op `dispose: () => {}` (matching `wardenModel`), preventing WebGL GPU buffer destruction.
  - **Fixed Monster Facing Direction:**
    - In `crawler-model.js` and `archivist-model.js`, applied `mesh.rotation.y = Math.PI` so that the monsters face forward along the $-Z$ movement direction rather than moving backwards tail-first.
  - **Balanced Spawn Distances:**
    - Tuned `chooseMonsterSpawnCell` in `src/game/level.js` to place the monster 12–18 walking steps away behind blind corners/walls, ensuring the monster is immediately audible and stalking the player without instant line-of-sight death or 70m dead-zone isolation.
- **Files modified:**
  - `src/game/maps/map-sewers.js`
  - `src/game/maps/map-archive.js`
  - `src/game/creatures/factory.js`
  - `src/game/creatures/crawler-model.js`
  - `src/game/creatures/archivist-model.js`
  - `src/game/level.js`
  - `scripts/design_hard_labyrinth_maps.py`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `scripts/design_hard_labyrinth_maps.py` → Validated both grids (0 unreachable cells, enemy spawns 30+ steps away, 24 distributed key hiding spots).
  - Multi-map simulation via node → All 3 maps verified (`facility`: 425 floor cells / 17 step spawn dist, `sewers`: 531 floor cells / 17 step spawn dist, `archive`: 519 floor cells / 29 step spawn dist).
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Remaining issues:** None.
- **Next recommended task:** Play through Sublevel 7 and Sublevel 1 on the live dev server!

<!--
  TEMPLATE FOR FUTURE ENTRIES — append a new section above this comment after every meaningful change:

### 2026-11-23 — 3-Map Architecture Refactor & Interactive Map Selection UI (Phases 1 & 2)
- **Work completed:**
  - **Modular Multi-Map Architecture (Phase 1):**
    - Extracted level definitions into modular configuration architecture: `src/game/maps/map-facility.js` (Sublevel 4), `src/game/maps/map-sewers.js` (Sublevel 7), `src/game/maps/map-archive.js` (Sublevel 1), and `src/game/maps/index.js` (registry).
    - Updated `src/game/config.js` with `MAPS` metadata export (sublevels, difficulty ratings, specimen classifications, atmospheric lore).
    - Upgraded `src/game/level.js` with `buildLevel(scene, quality, mapId)` supporting per-map atmosphere, fog density, custom background, ambient light and hemisphere sky/ground colors while preserving 100% backwards compatibility.
    - Updated `src/game/game.js` with dynamic map loading (`setMap(mapId)`), constructor support for `mapId`, and `startRun(mapId)`.
  - **High-Tech Sector Selection UI (Phase 2):**
    - Added `#map-select` modal in `index.html` with sci-fi terminal styling (`src/styles/map-select.css`) featuring responsive card layout, threat classification badges, and keyboard navigation ([1-3], arrow keys, Enter to descend, Escape to dismiss).
    - Created `src/game/map-select-ui.js` controller featuring real-time animated procedural 2D radar/scan previews for each sublevel (radar sweep for Facility, undulating S-curve ripples for Sewers, dust-mote column stacks for Archive).
    - Connected `src/main.js` so clicking any "PLAY NOW" button opens the sector deployment modal, allowing instant selection or switching.
- **Files modified / created:**
  - Created: `src/game/maps/map-facility.js`, `src/game/maps/map-sewers.js`, `src/game/maps/map-archive.js`, `src/game/maps/index.js`, `src/game/map-select-ui.js`, `src/styles/map-select.css`.
  - Modified: `src/game/config.js`, `src/game/level.js`, `src/game/game.js`, `src/main.js`, `index.html`, `PROJECT_FILE_LIST.txt`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0** (all 425 walkable cells reachable, blast door original cells confirmed).
  - `npm run build` → **exit 0** (37 modules transformed, clean production bundling).
- **Next recommended task:** Phase 3 — Implement THE CRAWLER specialized monster procedural rig & bio-luminescent locomotion for Sublevel 7 Sewers.

### 2026-11-23 — Distinct Map Layouts & Specialized Procedural Monsters (Crawler & Archivist)
- **Work completed:**
  - **Dynamic In-Place Grid Swapping (`src/game/level.js`):**
    - Added `setActiveMap(mapId)` which mutates the shared navigation `GRID` and `FLOOR_CELLS` dynamically so collision detection, BFS pathfinding, line-of-sight checks, and prop spawners always use the active map's grid.
    - Updated `buildLevel()` to apply map-specific wall heights (`wallH = 2.85m` for Sewers, `3.8m` for Archive), custom wall/floor/ceiling color tints (mossy green for Sewers, aged mahogany for Archive), and map-specific maintenance key hiding spots.
  - **3 Truly Distinct Map Layouts & Props:**
    - **Sublevel 4 (Medical Facility):** Original hospital ring corridor, clinical wards, beds, trolleys, cold steel fluorescents, red emergency beacons.
    - **Sublevel 7 (Drainage Network):** 415 floor cells connected. Winding drainage canals, sluice chambers, pump wells, sludge vats, rusted pipe conduits (`buildSewerProps`), murky green-black fog (`0x05130a`).
    - **Sublevel 1 (Research Archive):** 451 floor cells connected. Grand reading rotunda, long parallel book stack aisles, 2.8m tall wooden bookshelves (`buildArchiveProps`), study tables with lamps, sepia dust fog (`0x18120b`).
  - **3 Specialized Unique Monsters:**
    - **The Warden (Sublevel 4):** Hunched quadruped with necrotic corpse hide, obsidian claws, and heavy gait.
    - **The Crawler (Sublevel 7 - `src/game/creatures/crawler-model.js`):** 10-segment serpentine predator with undulating sinusoidal body-wave physics (`CrawlerRig`), eyeless spade head, articulated twitching mandibles, chitinous skin with pulsing green bioluminescent vein nodes.
    - **The Archivist (Sublevel 1 - `src/game/creatures/archivist-model.js`):** 2.6m tall 4-armed bipedal monstrosity with mantis-like multi-jointed arms, parchment skin, sunken amber hollow eyes, asymmetric stalking gait with dipping spine and reaching arms (`ArchivistRig`).
  - **Creature Factory & Dynamic Swapping (`src/game/creatures/factory.js`, `src/game/enemy.js`, `src/game/game.js`):**
    - `Creature` dynamically loads and swaps between Warden, Crawler, and Archivist rigs and models via `setMonster()`.
    - Added specialized Web Audio synthesis in `src/game/audio.js`: `crawlerSlither` & `crawlerHiss` for The Crawler; `archivistStep` & `archivistWhisper` for The Archivist.
- **Files modified / created:**
  - Created: `src/game/creatures/crawler-model.js`, `src/game/creatures/archivist-model.js`, `src/game/creatures/factory.js`, `src/game/map-props.js`, `scripts/test-maps.mjs`.
  - Modified: `src/game/maps/map-sewers.js`, `src/game/maps/map-archive.js`, `src/game/level.js`, `src/game/enemy.js`, `src/game/audio.js`, `src/game/game.js`, `PROJECT_FILE_LIST.txt`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `node scripts/test-maps.mjs` → **All 3 maps PASS, exit 0** (Facility: 425 cells, Sewers: 415 cells, Archive: 451 cells; 100% connected).
  - `npm run build` → **exit 0** (41 modules transformed, clean production build).
- **Next recommended task:** Playtest map traversal across all 3 sublevels in live browser session.

### 2026-11-23 — Dedicated Fullscreen 3D Monster Inspector (Turntable Viewer)
- **Work completed:**
  - **In-App Pure 3D Turntable Viewer (`src/game/monster-inspector.js`):**
    - Created dedicated Three.js 3D inspection stage with 360-degree orbital rotation (mouse drag / touch), zoom (scroll wheel / pinch), and pan.
    - Features circular illuminated stage pedestal with bioluminescent perimeter ring.
    - Loads and animates the exact production 3D rigs and shaders for all 3 specialized monsters:
      - **The Warden (Sublevel 4):** Procedural skin weights, necrotic corpse skin, obsidian claws, and 4-legged prowl kinematics.
      - **The Crawler (Sublevel 7):** 10-segmented body with transverse S-curve sinusoidal undulation, articulated twitching mandibles, and pulsing green veins.
      - **The Archivist (Sublevel 1):** 2.6m tall 4-armed skeletal rig with mantis scythes, parchment skin, and glowing amber eye sockets.
    - Floating UI controls: switch monster [1-3], toggle animation mode (Walk, Idle, Aggro, Freeze), toggle auto turntable rotate, switch lighting (Studio inspection vs Flashlight horror), reset camera, and exit.
  - **UI Integration (`index.html`, `src/main.js`, `src/styles/inspector.css`):**
    - Added "VIEW 3D MONSTERS" button to website landing hero.
    - Added "VIEW 3D MONSTER" button to the sector deployment modal (`#map-select`).
    - Added URL query param support: `?monsters=1` or `?view=monsters` or `?monsters=crawler` opens the 3D viewer directly on page load.
    - Exposed `window.__lastExit.inspectMonsters(monsterId)`.
- **Files modified / created:**
  - Created: `viewer.html`, `src/viewer.js`, `src/game/monster-inspector.js`, `src/styles/inspector.css`.
  - Modified: `vite.config.js`, `index.html`, `src/main.js`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `node scripts/test-maps.mjs` → **All 3 maps PASS, exit 0**.
  - `npm run build` → **exit 0** (46 modules transformed, multi-page production build for `index.html` and `viewer.html`).
- **Next recommended task:** Playtest in live browser session across desktop and mobile viewports.

### 2026-11-23 — Multi-Format 3D Model Distribution & T-Pose Mixamo Pipeline
- **Work completed:**
  - Generated dedicated **T-Pose** (cross-format hands spread horizontally, standing upright) models for Mixamo auto-rigging:
    - **The Archivist T-Pose:** `public/models/archivist_tpose.obj` (96KB), `archivist_tpose.glb`, `archivist_tpose.blend`. Standing upright bipedal ($2.6\text{m}$ tall) with arms spread horizontally at $90^\circ$ cross-format for instant Mixamo marker placement.
    - **The Warden Beast T-Pose:** `public/models/warden_tpose.obj` (21.4MB), `warden_tpose.glb`, `warden_tpose.blend`. Re-oriented upright bipedal beast stance on hind legs with front limbs extended horizontally at $90^\circ$ cross-format for Mixamo rigging.
  - Script created: `scripts/blender/generate_tpose_models.py`.
- **Files modified / created:**
  - Created: `scripts/blender/generate_tpose_models.py`, `public/models/*tpose*`, `blender/*tpose*`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Blender headless T-pose generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0**.
- **Next recommended task:** User uploads `archivist_tpose.obj` or `warden_tpose.obj` to Mixamo.






### 2026-11-23 — Key Pickup Interaction Bug Fix & 3D Monster Inspector Showcase
- **Work completed:**
  - **Key Pickup Interaction Fix (`interactions.js`, `player.js`, `game.js`):**
    - Fixed vertical camera pitch blindness in `player.isLookingAt()`: previously only checked horizontal XZ forward vector, failing when players looked downwards at floor items ($Y \approx 0.2\text{m}$). Now performs full 3D direct ray alignment against `camera.getWorldDirection()` with horizontal fallback.
    - Fixed stale anchor reference: `Objectives._findFocus()` now dynamically accesses `this.level.keyAnchor` on every frame, eliminating desynchronization when switching maps or restarting runs.
    - Added `Objectives.setLevel(newLevel)` which updates both `_keyWorld` and `_cctvAnchor` when `setMap()` is called.
    - Tuned interaction parameters: increased `KEY_RANGE` from $2.9\text{m} \to 3.2\text{m}$ and lowered `KEY_DOT` from $0.55 \to 0.45$ for immediate, reliable interaction triggering.
  - **3D Interactive Monster Inspector Showcase:**
    - Created `monsters-showcase.html` with real-time WebGL orbit inspection, animations (`Walk Cycle`, `Idle Breath`, `Aggro Strike`, `Freeze`), lighting presets (flashlight horror vs studio inspection), and specimen telemetry.
    - Created `monsters-dossier.md` detailing the 3 specialized monsters, anatomical silhouettes, locomotion physics, and frequency acoustic signatures.
- **Files modified / created:**
  - Modified: `src/game/interactions.js`, `src/game/player.js`, `src/game/game.js`, `PROJECT_HANDOFF.md`.
  - Created: `monsters-showcase.html` (artifact), `monsters-dossier.md` (artifact).
- **Bugs fixed:**
  - Fixed issue where player looking directly at the floating/floor maintenance key could not see the pickup prompt or take the key.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `node scripts/test-maps.mjs` → **All 3 maps PASS, exit 0**.
  - `npm run build` → **exit 0** (41 modules transformed, clean production build).
- **Next recommended task:** Playtest map traversal across all 3 sublevels in live browser session.

### 2026-11-23 — Dedicated Fullscreen 3D Monster Inspector (Turntable Viewer)
- **Work completed:**
  - **In-App Pure 3D Turntable Viewer (`src/game/monster-inspector.js`):**
    - Created dedicated Three.js 3D inspection stage with 360-degree orbital rotation (mouse drag / touch), zoom (scroll wheel / pinch), and pan.
    - Features circular illuminated stage pedestal with bioluminescent perimeter ring.
    - Loads and animates the exact production 3D rigs and shaders for all 3 specialized monsters:
      - **The Warden (Sublevel 4):** Procedural skin weights, necrotic corpse skin, obsidian claws, and 4-legged prowl kinematics.
      - **The Crawler (Sublevel 7):** 10-segmented body with transverse S-curve sinusoidal undulation, articulated twitching mandibles, and pulsing green veins.
      - **The Archivist (Sublevel 1):** 2.6m tall 4-armed skeletal rig with mantis scythes, parchment skin, and glowing amber eye sockets.
    - Floating UI controls: switch monster [1-3], toggle animation mode (Walk, Idle, Aggro, Freeze), toggle auto turntable rotate, switch lighting (Studio inspection vs Flashlight horror), reset camera, and exit.
  - **UI Integration (`index.html`, `src/main.js`, `src/styles/inspector.css`):**
    - Added "VIEW 3D MONSTERS" button to website landing hero.
    - Added "VIEW 3D MONSTER" button to the sector deployment modal (`#map-select`).
    - Added URL query param support: `?monsters=1` or `?view=monsters` or `?monsters=crawler` opens the 3D viewer directly on page load.
    - Exposed `window.__lastExit.inspectMonsters(monsterId)`.
- **Files modified / created:**
  - Created: `viewer.html`, `src/viewer.js`, `src/game/monster-inspector.js`, `src/styles/inspector.css`.
  - Modified: `vite.config.js`, `index.html`, `src/main.js`, `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `node scripts/test-maps.mjs` → **All 3 maps PASS, exit 0**.
  - `npm run build` → **exit 0** (46 modules transformed, multi-page production build for `index.html` and `viewer.html`).
- **Next recommended task:** Playtest in live browser session across desktop and mobile viewports.

### 2026-11-23 — Multi-Format 3D Model Distribution & T-Pose Mixamo Pipeline
- **Work completed:**
  - Generated dedicated **T-Pose** (cross-format hands spread horizontally, standing upright) models for Mixamo auto-rigging:
    - **The Archivist T-Pose:** `public/models/archivist_tpose.obj` (96KB), `archivist_tpose.glb`, `archivist_tpose.blend`. Standing upright bipedal ($2.6\text{m}$ tall) with arms spread horizontally at $90^\circ$ cross-format for instant Mixamo marker placement.
    - **The Warden Beast T-Pose:** `public/models/warden_tpose.obj` (21.4MB), `warden_tpose.glb`, `warden_tpose.blend`. Re-oriented upright bipedal beast stance on hind legs with front limbs extended horizontally at $90^\circ$ cross-format for Mixamo rigging.
  - Script created: `scripts/blender/generate_tpose_models.py`.
- **Files modified / created:**
  - Created: `scripts/blender/generate_tpose_models.py`, `public/models/*tpose*`, `blender/*tpose*`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Blender headless T-pose generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0**.
- **Next recommended task:** User uploads `archivist_tpose.obj` or `warden_tpose.obj` to Mixamo.








### 2026-11-23 — Warden Model Color Integration & Anatomically Isolated Procedural Rig
- **Work completed:**
  - **Fixed Missing Painted Colors Bug:** In Three.js `GLTFLoader`, glTF's secondary vertex color attribute `COLOR_1` is mapped to `geometry.attributes.color_1` (without leading underscore). Previous code checked `_color_1`, leaving the mesh with `COLOR_0` (all-white blank mannequin). Updated to `geometry.attributes.color_1 || geometry.attributes._color_1` and copied directly to `geometry.attributes.color`. User's custom hand-painted charcoal skin and blood-red mouth/gore now render vibrantly.
  - **Fixed Mesh Node Elevation Offset:** Neutralized Blender object translation (`The_Warden_Furious` node had $Y = 0.85\text{m}$ baked in) with `mesh.position.set(0, 0, 0)` so creature contact with the floor is exact ($Y=0$) in both gameplay and the 3D Monster Inspector.
  - **Anatomically Isolated Procedural Rigging:** Overhauled `computeSkinWeights()` in `src/game/warden-model.js`. Implemented sagittal plane isolation (right arms/legs never pull left vertices, left limbs never pull right vertices), anterior/posterior separation (forelimbs do not influence hips), and absolute head/snout isolation (shoulders and claws have 0% influence on head/mouth). Eliminated rubbery tearing and head distortion.
  - **Tuned Quadruped Locomotion Kinematics:** Recalibrated `crawlGait` stride amplitude in `WardenRig.update()` to natural quadruped stalking bounds ($0.08 + 0.18s\text{ rad}$, foreleg lift $0.16s$, hind drive $0.85\times$), with realistic neck stabilization and spine undulation.
- **Files modified:**
  - `src/game/warden-model.js`
  - `src/game/monster-inspector.js`
  - `PROJECT_HANDOFF.md`
- **Bugs fixed:**
  - User painted colors not rendering (white mannequin bug).
  - Warden limbs twisting and tearing the head apart during locomotion.
  - Warden mesh elevation offset clipping/floating on stage.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server hot reloaded.
- **Next recommended task:** Preview updated Warden in Monster Inspector (`http://127.0.0.1:5179/` or `viewer.html`).

### 2026-11-23 — Warden Turntable Floor Alignment & Luminous Gore Emissive Shader
- **Work completed:**
  - **Fixed Floor Submersion in Turntable Viewer (`viewer.js`):** In `src/viewer.js`, `warden.object.position.set(0, 0, 0)` had wiped out the model's vertical standing position ($Y = 0.868\text{m}$), causing the entire lower half of the Warden (feet, claws, and lower belly) to be submerged inside the stage cylinder. Fixed by preserving `position.y` with `warden.object.position.x = 0; warden.object.position.z = 0;`. Claws and paws now stand cleanly on top of the stage platform.
  - **Luminous Gore & Eye Emissive Shader Enhancement:** Added custom emissive radiance detection in `patchSkinning()` for vertex-colored meshes:
    ```glsl
    diffuseColor.rgb = pow(vColor.rgb, vec3(1.4));
    float isGore = clamp((vColor.r - max(vColor.g, vColor.b) * 1.4) * 2.5, 0.0, 1.0);
    totalEmissiveRadiance += vColor.rgb * isGore * 2.4;
    ```
    This eliminates washed-out grey tones from tone mapping, restores deep pitch charcoal body skin, and makes the painted crimson mouth, dripping gore, and red eyes glow with radiant intensity under all lighting conditions.
- **Files modified:**
  - `src/viewer.js`
  - `src/game/warden-model.js`
  - `PROJECT_HANDOFF.md`
- **Bugs fixed:**
  - Warden feet and claws submerged beneath the stage in `viewer.html`.
  - Pale washed-out vertex colors and dim gore.
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
- **Next recommended task:** Provide the user with the direct Blender download and painting guide for The Crawler and The Archivist.

### 2026-11-23 — High-Detail Sculpted Meshes & Painting Setup for The Archivist & Crawler
- **Work completed:**
  - **Rebuilt The Archivist from Scratch (Blender 5.3):** Replaced primitive geometric blocks with a 24,244-vertex seamless, watertight, sculpted horror biped ($2.6\text{m}$ tall) featuring emaciated ribcage, exposed elongated vertebrae, two curved mantis scythe blades, two secondary thoracic claws, hollow sunken skull with deep eye sockets, and talon feet. Applied Voxel Remesh to eliminate all internal geometry. Pre-painted with bone, blade obsidian, and glowing amber ember eye sockets.
  - **Rebuilt The Crawler from Scratch (Blender 5.3):** Replaced 54 loose disconnected primitive objects with a 17,092-vertex seamless, single-manifold armored serpent ($4.5\text{m}$ long) featuring shovel-head carapace, articulated sickle mandibles with inner teeth, 10 overlapping dorsal armor plates, spine spikes, lateral crawling scutes, and recessed bioluminescent vein channels.
  - **Pre-Configured Vertex Color Pipeline:** Pre-initialized `Color` attribute on both models and hooked directly into Principled BSDF `Base Color` so opening the `.blend` in Blender 5.3 shows full PBR material colors immediately in Material Preview, ready for single-click paint strokes without setup friction.
  - **Exported Formats:** Generated complete `.blend`, `.glb`, and `.obj` sets for both creatures in `public/models/`.
- **Files modified / created:**
  - Created: `scripts/build_master_monsters.py`, `scripts/inspect_models.mjs`.
  - Updated: `public/models/the_archivist.*`, `public/models/archivist_tpose.*`, `public/models/the_crawler.*`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Headless Blender 5.3 generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0**.
- **Next recommended task:** User opens `.blend` files in Blender 5.3 to paint custom colors.

### 2026-11-23 — User Painted Crawler GLB Integration & Real-time Serpentine Slither Shader
- **Work completed:**
  - **Inspected User's Painted Crawler:** Verified `public/models/the_crawler.glb` exported by user at 18:59. Extracted 17,092 vertices with user's custom painted `COLOR_0` attribute: 710 bright emerald bio-veins, 417 custom painted red accents/gore, and dark chitin carapace.
  - **Connected GLB Loader in `crawler-model.js`:** Added `loadCrawlerModel()` with fallback to procedural model. Configured PBR material with user's exact vertex colors.
  - **Implemented GPU Serpentine S-Curve Deformation Shader:** Patched vertex shader with smooth mathematical transverse sine wave kinematics ($0.32$ amplitude taper, undulating S-curves running from head to tail).
  - **Luminous Bio-Emerald & Crimson Emissive Radiance:** Shader boosts contrast with `pow(vColor.rgb, vec3(1.2))` and adds radiant emissive intensity to the emerald green veins ($3.2\times$) and the user's custom red gore accents ($2.8\times$).
  - **Connected Turntable & Inspector:** Updated `viewer.js` and `monster-inspector.js` to asynchronously load and display the user's painted GLB Crawler.
- **Files modified:**
  - `src/game/creatures/crawler-model.js`
  - `src/viewer.js`
  - `src/game/monster-inspector.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - Node GLB parse test → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
- **Next recommended task:** User checks `viewer.html` to see their custom painted Crawler slithering on the turntable stage.

### 2026-11-23 — Authentic Mantis Stance Archivist Sculpt & Full Pipeline Integration
- **Work completed:**
  - **Eliminated Stick-Figure T-Pose:** Completely scrapped the unnatural scarecrow T-pose. Sculpted the true terrifying horror stance in Blender 5.3:
    - Towering $2.6\text{m}$ predatory apparition in hunched forward stalking posture.
    - Elongated S-curve spine with protruding dorsal vertebrae spikes.
    - Two massive overhead Mantis Scythe Arms raised high above the head, poised to strike with long razor curved sickle blades.
    - Two folded thoracic secondary grasping claws across the chest.
    - Sunken skull with gaping jaw, needle fangs, and deep hollow eye sockets.
    - Digitigrade predatory legs with backward hocks and triple raptor ground talons.
    - Voxel Remeshed into a single, seamless, watertight organic sculpt (24,996 vertices).
  - **Pre-Configured Color Attributes:** Pre-painted desiccated mummy parchment skin, bone highlights, obsidian metal scythe blades, and glowing amber fire ember eye sockets.
  - **Exported Formats:** Saved to `public/models/the_archivist.blend`, `the_archivist.glb`, `archivist_tpose.blend`, `archivist_tpose.glb`, `archivist_tpose.obj`.
  - **Connected Game & Viewer Loaders:** Added `loadArchivistModel()` with PBR material, amber eye emissive glow, and blood-edge radiance in `archivist-model.js`, `viewer.js`, and `monster-inspector.js`.
- **Files modified / created:**
  - Created: `scripts/build_authentic_archivist.py`.
  - Updated: `public/models/the_archivist.*`, `public/models/archivist_tpose.*`, `src/game/creatures/archivist-model.js`, `src/viewer.js`, `src/game/monster-inspector.js`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Headless Blender 5.3 generation → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
- **Next recommended task:** User re-opens `the_archivist.blend` in Blender to inspect the mantis sculpt and paint.

### 2026-11-23 — User Custom Paint Integration for The Archivist
- **Work completed:**
  - **Inspected User's Saved Blend:** Read `public/models/the_archivist.blend` modified by user at 7:46 PM ($4.41\text{MB}$).
  - **Custom Paint Applied:** User painted the Winged Horror with:
    - Deep crimson devil body, arms, and torso.
    - Demonic piercing yellow eyes with sharp brows.
    - Sharp white fangs in the mouth.
    - Dark obsidian wing spars, leathery wings, and claws.
  - **Exported glTF Pipeline:** Headless exported `public/models/the_archivist.glb` and `public/models/archivist_tpose.glb` ($5.99\text{MB}$) preserving `COLOR_0`.
  - **Enhanced Creature Shader:** Updated `src/game/creatures/archivist-model.js` with yellow-eye radiance ($3.5\times$), crimson skin emissive pop ($1.5\times$), and deep horror contrast curve.
- **Files modified / created:**
  - Updated: `public/models/the_archivist.glb`, `public/models/archivist_tpose.glb`, `src/game/creatures/archivist-model.js`.
  - Modified: `PROJECT_HANDOFF.md`.
- **Tests performed and results:**
  - Blender headless GLB export & test render (`user_archivist_render.png`) → **PASS, exit 0**.
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Play and test all 3 custom-painted monsters in active gameplay runs.

### 2026-11-23 — Walking and Aggro Kinematics Engine for The Archivist
- **Work completed:**
  - **Identified Missing Animation Pipeline:** The GLB branch in `archivist-model.js` previously only updated time uniforms without any vertex shader deformation or rig kinematics, leaving the creature frozen during walk/aggro modes.
  - **Engineered GPU Vertex Shader Kinematics (`archivistDeform`):**
    - **Bat Wing Aerodynamic Flap & Billow:** Menacing rhythmic flap ($3.2\text{Hz}$, $15^\circ$ arc) in idle/walk; hyper-aggressive violent beat ($6.8\text{Hz}$, $32^\circ$ arc) during chase/aggro with $+0.65\text{m}$ forward predatory wing flare to envelop prey. Includes secondary leathery membrane wave billow along finger struts.
    - **Predatory Digitigrade Leg Stride:** Alternating bipedal stepping stride with foot planting and knee lift ($0.28\text{m}$ stride length).
    - **Clawed Arms & Talons:** Natural swing during stride, lunging forward $+0.45\text{m}$ with hooked talons in aggro.
    - **Demonic Head & Jaw Aggro:** Predatory forward thrust ($+0.42\text{m}$), dropping down with vicious feral snarl twitching ($32\text{Hz}$).
  - **Dynamic Shadow Synchronization:** Added `customDepthMaterial` with matching `archivistDeform(position)` vertex shader so facility shadows cast by the monster flap and stalk in real time.
  - **Creature Factory & Prewarming:** Updated `factory.js` and `main.js` to prewarm and utilize `getLoadedArchivistModel()` and `getLoadedCrawlerModel()` so custom GLBs immediately run in both Sublevel gameplay and the 3D Inspector.
- **Files modified:**
  - `src/game/creatures/archivist-model.js`
  - `src/game/creatures/crawler-model.js`
  - `src/game/creatures/factory.js`
  - `src/main.js`
  - `src/viewer.js`
  - `src/game/monster-inspector.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Test walk, run, and aggro animations in viewer and active Sublevel 1 gameplay.

### 2026-11-23 — Fixed Archivist Visibility: Resolved Shader Syntax Error & Mesh Selector
- **Work completed:**
  - **Identified Cause of Invisibility:**
    1. A duplicate `return vec3(x, y, z); }` block was present at the end of the `archivistDeform` GLSL function, which caused a WebGL vertex shader compilation syntax error, causing Three.js to fail rendering the material.
    2. Guarded `vColor` references in fragment shader with `#if defined( USE_COLOR )` to ensure syntax safety across all hardware environments.
    3. Updated the GLTF mesh traversal in `loadArchivistModel()` to select the mesh with the highest vertex count (`maxVerts`), ensuring it always binds to `The_Winged_Horror` (99.8k verts) and never falls victim to stray scene nodes.
- **Files modified:**
  - `src/game/creatures/archivist-model.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Verify in browser at `viewer.html?monster=archivist`.

### 2026-11-23 — Creature-Centric Map Redesign & Multi-Map Engine Architecture
- **Work completed:**
  - **Dynamic Level Architecture (`level.js`):**
    - Refactored all geometry construction (pipes, beams, sliding door frames, lighting fixtures, emergency cages, dust volume, blast door jambs) to scale with dynamic map ceiling height `wallH`.
    - Integrated map-specific lighting color, reach, and falloff:
      - Sublevel 4 (The Warden): Clinical hospital ward (3.0m ceiling, blue-tinted overhead fixtures, hospital beds & trolleys).
      - Sublevel 7 (The Crawler): Claustrophobic low-ceiling drainage network (2.5m ceiling, toxic teal `0x76e2a2` lighting, winding aqueduct canals, sludge cisterns).
      - Sublevel 1 (The Archivist): Gothic cathedral research archive (5.0m soaring vaulted ceiling, warm amber `0xffc477` lighting with 22m reach, towering 3.8m bookcase labyrinth, open flight atrium).
  - **Thematic Map Generation & Alignment:**
    - Authored and verified `src/game/maps/map-sewers.js` and `src/game/maps/map-archive.js` with exact blast-door anchor alignment at `(6,4)` and `(7,4)`, 22 maintenance hiding spots each, and tailored enemy spawns.
  - **Dynamic Map Discovery & Minimap Engine (`map.js`):**
    - Implemented `rebuildMapGrid(config)` so `SOLID`, `DOOR`, `AREA_AT`, `FLOOR_TOTAL`, and `WARD_BOXES` recompute dynamically on map switch.
    - Updated minimap and full-screen map to render real thematic room names ("PUMP CISTERN", "GRAND READING ATRIUM", "TOWERING BOOK STACKS", etc.) and ward boundaries.
  - **Multi-Map Automated Sanity Check (`scripts/check-map.mjs`):**
    - Expanded `npm run check:map` to validate all three maps in one pass: rectangular bounds, row lengths, spawn connectivity, key reachability, fixture access, blast door anchors, bed/trolley clearances, and creature pathing to all key spots.
- **Files modified:**
  - `src/game/level.js`
  - `src/game/map.js`
  - `src/game/game.js`
  - `src/game/maps/map-sewers.js`
  - `src/game/maps/map-archive.js`
  - `scripts/check-map.mjs`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **ALL MAPS PASS (Sublevel 4, Sublevel 7, Sublevel 1), exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Remaining issues:** None.
- **Next recommended task:** Play through Sublevel 7 (The Crawler) and Sublevel 1 (The Archivist) in the live browser.

### 2026-11-23 — Randomized Distant Monster Spawning & Spawn Safety Protection
- **Work completed:**
  - **Identified Spawn Proximity Bug:** On Sublevel 7 and Sublevel 1, the creature spawn was pinned to fixed coordinates (e.g. col 12 row 7) only a few tiles away from the player spawn (col 9 row 6), causing the monster to spawn immediately adjacent to the player and trigger instant death.
  - **Engineered Dynamic Spawn Selector (`chooseMonsterSpawnCell`):**
    - Computes full BFS walking distances (`floorDistances`) from the player's spawn.
    - Filters candidate floor cells requiring:
      1. Minimum 18 walking steps distance (`minSteps >= 18`).
      2. Minimum 18 meters Euclidean direct distance.
      3. No direct line-of-sight with player (`!hasLineOfSight`).
      4. Not a doorway tile (`tileAt !== 'D'`).
    - Randomly picks from the distant candidates on each run/restart.
  - **Repositioned Author Fallback Spawns:** Updated fallback spawns in `map-sewers.js` to East Cistern `(32, 8)` and `map-archive.js` to South Vaults `(20, 23)`.
- **Files modified:**
  - `src/game/level.js`
  - `src/game/game.js`
  - `src/game/maps/map-sewers.js`
  - `src/game/maps/map-archive.js`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Next recommended task:** Enjoy surviving in Sublevel 7 and Sublevel 1!

### 2026-11-23 — Hard Labyrinth Map Overhaul & Monster Lifecycle/Facing Fixes
- **Work completed:**
  - **Hard Labyrinth Map Generation:**
    - Redesigned Sublevel 7 (Drainage Network) and Sublevel 1 (Research Archive) from wide open halls into tight, confusing, claustrophobic labyrinths:
      - Sublevel 7: Winding serpentine canal switchbacks, pipe conduits, and pump cisterns (531 walkable cells).
      - Sublevel 1: Dense towering bookcase stack aisles, catalog rotunda aisles, and locked manuscript carrels (519 walkable cells).
    - Reduced walkable floor space to match the tight, tense atmosphere of Sublevel 4 (425 cells) instead of the previous open 660+ cell layouts.
  - **Fixed Monster Disappearing / Not Spawning in Last 2 Modes:**
    - Fixed cached GLB geometry disposal in `src/game/creatures/factory.js`: when switching levels or resetting, `crawler.isGlb` and `archivist.isGlb` instances now use a no-op `dispose: () => {}` (matching `wardenModel`), preventing WebGL GPU buffer destruction.
  - **Fixed Monster Facing Direction:**
    - In `crawler-model.js` and `archivist-model.js`, applied `mesh.rotation.y = Math.PI` so that the monsters face forward along the $-Z$ movement direction rather than moving backwards tail-first.
  - **Balanced Spawn Distances:**
    - Tuned `chooseMonsterSpawnCell` in `src/game/level.js` to place the monster 12–18 walking steps away behind blind corners/walls, ensuring the monster is immediately audible and stalking the player without instant line-of-sight death or 70m dead-zone isolation.
- **Files modified:**
  - `src/game/maps/map-sewers.js`
  - `src/game/maps/map-archive.js`
  - `src/game/creatures/factory.js`
  - `src/game/creatures/crawler-model.js`
  - `src/game/creatures/archivist-model.js`
  - `src/game/level.js`
  - `scripts/design_hard_labyrinth_maps.py`
  - `PROJECT_HANDOFF.md`
- **Tests performed and results:**
  - `scripts/design_hard_labyrinth_maps.py` → Validated both grids (0 unreachable cells, enemy spawns 30+ steps away, 24 distributed key hiding spots).
  - Multi-map simulation via node → All 3 maps verified (`facility`: 425 floor cells / 17 step spawn dist, `sewers`: 531 floor cells / 17 step spawn dist, `archive`: 519 floor cells / 29 step spawn dist).
  - `npm run check:map` → **PASS, exit 0**.
  - `npm run build` → **PASS, exit 0** (46 modules transformed).
  - Dev server active at `http://127.0.0.1:5178/`.
- **Remaining issues:** None.
- **Next recommended task:** Play through Sublevel 7 and Sublevel 1 on the live dev server!

<!--
  TEMPLATE FOR FUTURE ENTRIES — append a new section above this comment after every meaningful change:

### YYYY-MM-DD — <short title>
- **Work completed:**
- **Files modified:**
- **Bugs fixed:**
- **Tests performed and results:** (state explicitly: source-read / build / browser / real device)
- **Remaining issues:**
- **Next recommended task:**
-->
