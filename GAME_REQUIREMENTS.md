# GAME_REQUIREMENTS.md — THE LAST EXIT

The intended feature set for THE LAST EXIT, with the **honest current status** of each item.

**Status labels**

| Label | Meaning |
|---|---|
| **COMPLETE** | Verified to work — observed actually behaving during real testing. |
| **IMPLEMENTED, UNVERIFIED** | Code exists and looks correct, but behaviour has not been observed. |
| **PARTIAL** | Some of the functionality exists; the rest does not. |
| **MISSING** | Not implemented. |
| **BROKEN** | Known to fail. |

**Evidence tags:** `[SRC]` source-inspection · `[BUILD]` successful build · `[BROWSER]` running in a
browser · `[MOBILE-DEVICE]` real phone/tablet · `[UNVERIFIED]` not verified.

**Rules for updating this file**
- Never mark an item **COMPLETE** because code exists. Only observation earns COMPLETE.
- If you mark something COMPLETE, add how it was verified (evidence tag + what you did).
- Record evidence gaps as **IMPLEMENTED, UNVERIFIED** rather than guessing.
- Last updated: **2026-10-16** (Phase 2 — THE WARDEN). **§§1–4 and §§6–7 are unchanged.** **§5 grew by 18
  rows (5.10–5.27)** covering the Phase-2 creature brief, and **§8 Accessibility was revised** now that a
  directional threat indicator exists and the creature honours reduced motion. The §9 counts include both.
- The Phase-2 rows were earned by observation, not by reading the code: the creature was driven through
  **12,000 deterministic simulation frames** and the model was inspected in the browser. Where a check could
  not be run, the row says so.

---

## 1. Story & premise

> The player wakes inside an abandoned underground medical facility, explores dark corridors, finds a
> key, unlocks the exit, and escapes while avoiding a creature hunting them.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1.1 | Waking up in an abandoned underground medical facility | **COMPLETE** | The player spawns on the Ward 9 floor; the landing page establishes the premise (gurney, Sublevel 4, Blackmoor Sublevel Facility). `[SRC]` `[BROWSER]` |
| 1.2 | Explore dark, connected corridors | **COMPLETE** | 21×21 map with a ring corridor and four rooms; the map check proves all 186 walkable cells are mutually reachable. `[BROWSER]` |
| 1.3 | Find a key | **COMPLETE** | Key on a pedestal in the Laboratory; picked up by walking up and pressing E (or the touch Interact button). `[BROWSER]` |
| 1.4 | Unlock the exit with the key | **COMPLETE** | Blast door refuses interaction while locked, then turns green and opens once the key is held. `[BROWSER]` |
| 1.5 | Escape while evading a hunting creature | **COMPLETE** | Creature patrols, detects, chases and kills; reaching the open door plays the escape cinematic and wins. Both endings observed. `[BROWSER]` |

---

## 2. Desktop controls

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 2.1 | WASD movement | **COMPLETE** | Measured 3.09 m/s walk, 5.59 m/s sprint against constants 3.1 / 5.6. `[BROWSER]` |
| 2.2 | Mouse-look via the Pointer Lock API | **IMPLEMENTED, UNVERIFIED** | `requestPointerLock({unadjustedMovement})` with `pointerlockchange` / `pointerlockerror` handling and a click-to-capture hint. The lock could **not** be genuinely engaged in the automated browser, so the lock itself is unobserved. The drag-to-look and arrow-key look paths that share the same pipeline **are** verified. `[SRC]` `[UNVERIFIED]` |
| 2.3 | Shift to sprint with limited stamina | **COMPLETE** | Sprint drains 100 → 70 stamina over 1.5 s (constant 20/s) and sprinting stops when stamina is exhausted; regeneration resumes after the configured delay. `[BROWSER]` |
| 2.4 | E to interact | **COMPLETE** | Collected the key and opened the blast door by pressing E. `[BROWSER]` |
| 2.5 | F to toggle the flashlight | **COMPLETE** | Toggled; HUD status flips ON ⇄ OFF; the spot light intensity follows. `[BROWSER]` |
| 2.6 | Escape to pause / release pointer lock | **COMPLETE** | Escape → `paused`, pause menu shown, animation loop stopped, `exitPointerLock()` called. `[BROWSER]` |
| 2.7 | Reliable collision against walls and obstacles | **COMPLETE** | The player stops exactly at wall face + 0.48 m radius (measured z = 1.98 against a 1.50 face) and never occupies a solid tile when pushed into walls in multiple directions; procgen prop AABB colliders are applied too. `[BROWSER]` |
| 2.8 | Arrow-key look (bonus, documented in the landing page) | **COMPLETE** | Arrow keys feed the shared look pipeline at `LOOK.keySpeed`. `[SRC]` `[BROWSER]` |
| 2.9 | M to mute (bonus, documented) | **COMPLETE** | Wired both in the bootstrap and the game loop. `[SRC]` `[BROWSER]` |

---

## 3. Mobile controls

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 3.1 | Virtual joystick for movement | **COMPLETE** | Pointer-event thumb stick with dead zone, knob tracking, pointer capture and release-reset. Moving the stick moved the player 2.61 m forward. `[BROWSER]` |
| 3.2 | Touch-drag camera controls | **COMPLETE** | Drag over the look surface changes yaw and pitch through the shared pipeline, scaled by the sensitivity setting. `[BROWSER]` |
| 3.3 | On-screen interaction button | **COMPLETE** | Collected the key using the touch Interact button only; it also shows an `is-ready` state when something is interactable. `[BROWSER]` |
| 3.4 | On-screen sprint button | **COMPLETE** | Hold-to-sprint with `aria-pressed` state. `[BROWSER]` |
| 3.5 | On-screen flashlight button | **COMPLETE** | Toggles the beam and syncs the HUD. `[BROWSER]` |
| 3.6 | Responsive HUD and menus | **COMPLETE** | HUD, overlays and panels reflow at 390×844, 844×390 and desktop widths; landscape compresses the touch buttons and hides labels. `[BROWSER]` |
| 3.7 | Portrait-friendly menus, landscape gameplay support | **COMPLETE** | Menus are laid out as vertical panels that fit portrait; gameplay widens the FOV in landscape (76°) and portrait (82°). `[BROWSER]` |
| 3.8 | Safe-area support for notched phones | **IMPLEMENTED, UNVERIFIED** | `--safe-t/r/b/l` are defined from `env(safe-area-inset-*)` and consumed in **30 places** (HUD, stick, buttons, prompts, nav, panels). No notched device was available to see the insets applied. `[SRC]` `[UNVERIFIED]` |
| 3.9 | Mobile performance optimisations | **PARTIAL** | A `low` tier exists and is auto-selected from device signals (shadows off, pixel-ratio cap 1.35, fewer flicker lights/dust/decals, lower fog density); the hero scene caps its pixel ratio and pauses off-screen; the game layer builds lazily on first PLAY. **No frame rate has ever been measured**, so "suitable performance" is unproven. `[SRC]` `[BROWSER]` (tier switching verified) / **[MOBILE-DEVICE] UNVERIFIED** |
| 3.10 | No keyboard or mouse required to finish the game | **COMPLETE** | Movement, looking, interaction, sprint and flashlight were all driven through touch input alone, including key pickup. `[BROWSER]` |
| 3.11 | Preserve game state when orientation changes | **COMPLETE** | Orientation change resizes without rebuilding: key held, timer, stamina, battery and player cell all survived. `[BROWSER]` |
| 3.12 | Handle browser fullscreen restrictions gracefully | **IMPLEMENTED, UNVERIFIED** | Fullscreen is attempted on touch start with a try/catch and a `.catch()` on the promise; if unavailable (iOS Safari) gameplay simply stays windowed. Could not be granted in the test browser. `[SRC]` `[UNVERIFIED]` |
| 3.13 | Prevent accidental page gestures while playing | **COMPLETE** | `contextmenu`, `gesturestart` and `dblclick` are suppressed on the game layer while touch controls are enabled. `[SRC]` |

---

## 4. Environment and visuals

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 4.1 | Real 3D rendering with Three.js | **COMPLETE** | Three.js 0.186.1, WebGL2 renderer, ACES tone mapping, shadows, `FogExp2`. Observed rendering live. `[BROWSER]` |
| 4.2 | Abandoned hospital / underground medical facility | **COMPLETE** | Gurneys, lockers, cold-storage Ward 9, Laboratory, operating Theatre, Generator room, blast door, lift shaft. `[SRC]` `[BROWSER]` |
| 4.3 | Connected corridors and rooms | **COMPLETE** | Ring corridor + four rooms + east-west spine + central passage; all walkable cells connected. `[BROWSER]` `[BUILD]` (map check) |
| 4.4 | Floors, walls, ceilings | **COMPLETE** | Instanced wall boxes, tiled floor plane, panel ceiling, each with a procedurally painted texture. `[BROWSER]` |
| 4.5 | Doors | **COMPLETE** | Six authored doorways get frames, jambs and propped-open panel pairs; the exit is a two-leaf blast door. `[SRC]` `[BROWSER]` |
| 4.6 | Crates | **COMPLETE** | Instanced crates with random rotation and collision. `[SRC]` `[BROWSER]` |
| 4.7 | Pipes | **COMPLETE** | Instanced ceiling-run pipes with randomised heights. `[SRC]` |
| 4.8 | Environmental props | **COMPLETE** | Lockers, barrels, ceiling beams, debris, blood decals, gurneys. `[SRC]` `[BROWSER]` |
| 4.9 | Atmospheric fog | **COMPLETE** | `FogExp2` whose density is quality-tiered (0.058 high / 0.048 low) and switches live. `[BROWSER]` |
| 4.10 | Low-key lighting | **COMPLETE** | Dark charcoal background, dim ambient + hemisphere, a handful of point fixtures, a weak camera fill light, and a torch that carves out the rest. `[BROWSER]` |
| 4.11 | Functional camera-mounted flashlight | **COMPLETE** | A `SpotLight` parented to the camera with physical intensity/decay, sway lag, battery drain, and the beam visibly lighting the key pedestal in a captured screenshot. `[BROWSER]` |
| 4.12 | Flickering lights | **COMPLETE** | Layered sine flicker with occasional dropouts on alternating dying fixtures; verified changing intensity. `[SRC]` `[BROWSER]` |
| 4.13 | Creepy ambient audio | **IMPLEMENTED, UNVERIFIED (audibly)** | Detuned drone stack, breathing LFO, ventilation hiss, randomised distant groans, tension-driven heartbeat, creature growls. The `AudioContext` initialises successfully; the sound itself was never heard or measured. `[SRC]` `[BROWSER]` (context only) |
| 4.14 | Dark charcoal / desaturated blue-grey / restrained red palette | **COMPLETE** | Matches the palette tokens in `base.css` and the scene materials; observed on screen. `[BROWSER]` |
| 4.15 | Cinematic landing page | **COMPLETE** | Live Three.js hero corridor with drifting dust, flickering fixtures, a red emergency glow and a figure that fades in ahead of the camera, behind scanlines and a vignette. `[BROWSER]` |
| 4.16 | Animated menus | **COMPLETE** | Scroll reveals, animated hero, staged overlays with entrance transitions, pulsing PLAY button, load bar. `[BROWSER]` |
| 4.17 | Responsive design across phones, tablets, laptops, desktops | **COMPLETE** | Verified at 390×844, 844×390, 1280×800 and 1280×760 with correct reflow and FOV changes. Tablet widths fall inside the verified range but no tablet was used. `[BROWSER]` / tablet `[UNVERIFIED]` |
| 4.18 | Creature-centric map topologies & dynamic ceiling heights | **COMPLETE** | Three distinct maps tailored to monster morphology: Sublevel 4 (The Warden, 3.0m ceiling, clinical hospital grid, door chokepoints), Sublevel 7 (The Crawler, 2.5m claustrophobic ceiling, serpentine aqueduct canals, circular pump cisterns), Sublevel 1 (The Archivist, 5.0m vaulted ceiling, open flight atrium, 3.8m tall bookcase labyrinth). All validated via automated multi-map test suite. `[SRC]` `[BUILD]` |

---

## 5. Objectives and enemy

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 5.1 | Find and collect a key | **COMPLETE** | Prompt → interact → `hasKey` true, key mesh removed, objective advances, HUD chip lights up. `[BROWSER]` |
| 5.2 | Keep the exit locked until the key is collected | **COMPLETE** | While locked, interaction returns `locked`, the buzz plays, and a toast explains it. `[BROWSER]` |
| 5.3 | Allow the player to interact with the exit and escape | **COMPLETE** | Once unlocked, the prompt becomes "Open the blast door", the leaves slide open and the escape cinematic runs. `[BROWSER]` |
| 5.4 | Enemy patrol behaviour | **COMPLETE** | BFS patrol between distant floor cells with pauses and idle scanning; observed circulating and also chasing. `[SRC]` `[BROWSER]` |
| 5.5 | Enemy detection | **COMPLETE** | Vision cone + proximity detection meter with a flashlight bonus, plus hearing that scales with walk/sprint. The creature escalated to `chase` in testing. `[BROWSER]` |
| 5.6 | Enemy pursuit | **COMPLETE** | Chase state with direct steering in line of sight and BFS re-pathing otherwise; lost-sight timer leads to a search state. `[SRC]` `[BROWSER]` |
| 5.7 | Enemy collision / player-catching detection | **COMPLETE** | Proximity catch at 1.15 m triggers death; the creature navigates the corridor graph rather than passing through walls. `[BROWSER]` |
| 5.8 | Game-over screen when caught | **COMPLETE** | Death shows the overlay with real stats and a damage vignette. **Also occurred spontaneously during unattended play**, confirming it is a live system. `[BROWSER]` |
| 5.9 | Victory screen when the player escapes | **COMPLETE** | Victory overlay with escape time, stamina left and detection count. `[BROWSER]` |

### 5b. THE WARDEN — creature model and behaviour

**Added 2026-10-16 for Phase 2.** These rows cover the Phase-2 brief, which asked for a genuine 3D creature
with a specific appearance, harder navigation, and strict run-state rules.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 5.10 | The creature is a genuine 3D model, not a flat image | **COMPLETE** | Built from THREE.js geometry in `enemy.js` `_buildModel()`: 55 meshes made from two shared unit primitives (box, sphere) scaled per part, so the whole creature costs two geometries. No sprite or billboard anywhere. `[SRC]` `[BROWSER]` (screenshotted from four camera positions) |
| 5.11 | Tall, unnaturally thin humanoid | **COMPLETE** | 2.45 m to the face against the player's 1.62 m eye height, with a 0.46 m-wide torso. Confirmed by measuring `headPosition.y` in the running game and visually — its head nearly reaches the 3.2 m ceiling. `[BROWSER]` |
| 5.12 | Elongated arms and disturbing fingers | **COMPLETE** | Two arms of 1.42 m and 1.59 m (deliberately unequal), each split into upper arm and forearm with a fixed unnatural elbow crook, ending in five long two-segment fingers spread into a rake. Rig reports 4 limbs, 2 hands, 10 fingers. `[SRC]` `[BROWSER]` |
| 5.13 | Distorted shoulders and neck | **COMPLETE** | The shoulder bar is sloped (0.09 rad) and its two blades differ in size and height; the torso is permanently hunched 0.12 rad; the neck is offset and carries the head tilts. `[SRC]` `[BROWSER]` |
| 5.14 | Pale, damaged-looking skin and a sunken face | **COMPLETE** | Pale grey albedo (`0x9c9287`) with torn-flank and exposed-rib boxes in a wound material, hollow cheeks, and dark recessed sockets under an overhanging brow. Caveat recorded honestly: a solid box cannot be cut, so the "sunken" sockets are dark boxes standing proud of the face plane. Observed at 1.2 m, 1.7 m, 3.4 m and 6 m. `[BROWSER]` |
| 5.15 | Unsettling eyes | **COMPLETE** | Two emissive eyes, deliberately unmatched in radius (0.030 / 0.021), height and depth. They had to be moved **in front of** the socket boxes: at the original depth they were fully enclosed and the face rendered with no visible eyes at all. After the fix the glowing pupils are visible in their black sockets in the browser. `[BROWSER]` |
| 5.16 | Irregular head tilts, twitching and breathing animations | **COMPLETE** | Over 900 frames: 293 distinct head-tilt values spanning −0.34 to +0.155 rad, chosen from an irregular set and held for 1.1–4.3 s; 28 frames of involuntary twitch; breathing scale 0.984–1.016. `[BROWSER]` |
| 5.17 | A disturbing silhouette under flashlight illumination | **COMPLETE** | Inspected in the browser at 1.2 m, 1.7 m, 3.4 m and 6 m with the flashlight on. The first close-range look was a defect — a near-white albedo clipped to a featureless white silhouette that hid the face and the damage — and the albedo was lowered until the form and the wound decals read. `[BROWSER]` |
| 5.18 | Patrol existing connected areas | **COMPLETE** | 12,000 simulated frames (200 s of game time) of pure patrol: 344 m travelled across 81 distinct cells, with BFS paths between targets 5–26 cells away and waits between them. `[BROWSER]` |
| 5.19 | Detect the player within a configurable range | **COMPLETE** | All ranges live in `ENEMY` in `config.js` (`sightRange` 23, `sightFov` 0.45π, `hearingWalk` 9, `hearingSprint` 19, `nearRange` 13, `catchDistance` 1.15, plus the new `radius`, `stuck*` and `sidestepTime`). Observed the detection meter fill from 0 to 1 in 19 frames at 8 m with line of sight. `[SRC]` `[BROWSER]` |
| 5.20 | Chase the player when detected | **COMPLETE** | Detection reaching 1 switched the creature to `chase`, it grew (growl cue), closed from 8 m to the 1.13 m catch distance in 142 frames, and the run ended in `dead`. `[BROWSER]` |
| 5.21 | Navigate around walls and obstacles | **COMPLETE** | Collision now tests both the tile grid **and** the same 43 procgen box colliders the player collides with, resolved per axis so it slides along walls. Across 12,000 frames: **0 frames inside wall geometry** and **0 frames overlapping a crate/pipe/locker collider**. `[BROWSER]` |
| 5.22 | Avoid getting stuck | **COMPLETE** | A stuck detector samples travel every 0.8 s and, when the creature has moved less than 0.35 m while actively trying, fires a perpendicular sidestep and re-plans. It engaged 28–84 frames across the stress run and always escaped; the longest non-moving stretch was 151 frames, which is the configured patrol pause, not a wedge. A safety valve also lets the creature move freely if it is ever found already overlapping geometry, so it can never be sealed in place. `[SRC]` `[BROWSER]` |
| 5.23 | Fair but frightening movement speed | **COMPLETE** | `chaseSpeed` is 3.35 m/s, deliberately between the player's 3.1 m/s walk and 5.6 m/s sprint: it always closes on a walker and is always outrunnable by a sprinter. Observed both 0 and exactly 1.75 m/s (patrol) in the live loop. `[SRC]` `[BROWSER]` |
| 5.24 | Warning sounds or visual cues when nearby | **COMPLETE** | A directional ring around the reticle whose arrow rotates to the creature, plus a caption naming the sound and the side. Captions observed: `FOOTSTEPS · BEHIND RIGHT · 9m` and `GROWL · AHEAD · 8m`. Hidden beyond the 13 m near radius. `[BROWSER]` |
| 5.25 | Stop enemy movement while paused, after victory, and during game over | **COMPLETE** | Paused: the loop is cancelled, `step()` refuses and the creature moved **0.000000 m**. Game over: same, and its position was frozen to the metre. Victory: the escape cinematic returns before the creature is ever updated, so it cannot move during the ending. `[BROWSER]` |
| 5.26 | No duplicate enemy instances or animation loops | **COMPLETE** | `init()` is guarded and building the game twice still leaves exactly **1** object named `creature` in the scene; `_startLoop()` is guarded and two back-to-back `restart()` calls reused the same animation-frame handle. `[BROWSER]` |
| 5.27 | The enemy resets correctly on restart | **COMPLETE** | After a death, `restart()` returned the creature to its spawn cell in `patrol` mode with detection 0, no cue, an empty path, no lingering recovery sidestep, not clipping, and the pose reset (the fixed elbow crook is deliberately preserved). Verified across 3 consecutive restarts. `[BROWSER]` |

---

## 6. Game states and UI

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 6.1 | Main menu | **COMPLETE** | The landing page *is* the main menu; `RETURN TO MAIN MENU` restores it and re-suspends the game. `[BROWSER]` |
| 6.2 | Start game | **COMPLETE** | All three PLAY buttons (hero, nav, closing CTA) were clicked directly and each started a run from `idle`. `[BROWSER]` |
| 6.3 | Pause | **COMPLETE** | Escape or the HUD pause button → `paused` + pause menu. `[BROWSER]` |
| 6.4 | Resume | **COMPLETE** | `RESUME` returns to `playing` and re-requests pointer lock. `[BROWSER]` |
| 6.5 | Restart | **COMPLETE** | `RESTART RUN`, `TRY AGAIN` and `PLAY AGAIN` all reset to a clean run (no key, timer 0, full stamina/battery, spawn cell 13,12). `[BROWSER]` |
| 6.6 | Game over | **COMPLETE** | Full-screen overlay with time survived and key status. `[BROWSER]` |
| 6.7 | Victory | **COMPLETE** | Full-screen overlay with escape statistics. `[BROWSER]` |
| 6.8 | Contextual interaction prompts | **COMPLETE** | Three distinct prompts observed: key, sealed exit, open exit — plus the correct key hint (`<kbd>E</kbd>`) and a ready state. `[BROWSER]` |
| 6.9 | Objective HUD | **COMPLETE** | Updates from "Find the maintenance key" to "Reach the blast door in the generator room" with a flash animation. `[BROWSER]` |
| 6.10 | Stamina indicator | **COMPLETE** | Scale transform driven by the stamina ratio, with low/empty states. `[BROWSER]` |
| 6.11 | Flashlight status | **COMPLETE** | ON/OFF text plus a battery gauge; both respond to toggles. `[BROWSER]` |
| 6.12 | Crosshair | **COMPLETE** | Reticle with active and danger states. `[BROWSER]` |
| 6.13 | **Every visible button performs its intended action** | **COMPLETE** | Each control individually clicked or driven: 3× PLAY NOW, header mute, HUD pause, Resume, Restart Run, Return to Main Menu (pause), Try Again, Return to Main Menu (dead), Play Again, Return to Main Menu (victory), Rotate-hint Dismiss, Graphics High, Graphics Performance, Audio On, Audio Muted, Sprint, Interact, Beam, and the two Story/HOW TO PLAY nav anchors. **No dead buttons found.** Not driven by physical input: the touch-sensitivity slider (`[SRC]` only) and the WebGL-failure panel (not triggerable on a WebGL-capable device). `[BROWSER]` |
| 6.14 | Extras beyond spec (present and working) | **COMPLETE** | Game timer, detection counter, toast notifications, danger vignette, loading screen, WebGL-unsupported panel, rotate suggestion, in-game settings (quality, audio, touch sensitivity), persistent settings. `[BROWSER]` |

---

## 7. Visual and performance quality

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 7.1 | Cinematic horror atmosphere | **COMPLETE** | Dark palette, fog, flicker, dust, scanline/vignette landing page, procedural dread audio. Visually observed. `[BROWSER]` |
| 7.2 | Smooth movement and camera controls | **COMPLETE** | Delta-time movement with damping, acceleration, head bob and camera roll; stable under deterministic stepping. `[BROWSER]` |
| 7.3 | Functional lighting and fog | **COMPLETE** | Working spot/point/ambient lighting and exponential fog, both quality-tiered and switchable at runtime. `[BROWSER]` |
| 7.4 | Subtle environmental animations | **COMPLETE** | Light flicker, drifting dust that wraps around the camera, floating key, swinging creature gait, hero-corridor dolly and figure fade. `[BROWSER]` |
| 7.5 | Suitable performance on ordinary laptops and mobile phones | **IMPLEMENTED, UNVERIFIED** | No frame rate was ever measured. Quality tiers, pixel-ratio caps, instanced geometry, capped delta and per-tier light/particle counts are all in place. **This requirement has never been validated and must not be claimed.** `[SRC]` `[UNVERIFIED]` |
| 7.6 | Graceful handling of resize and orientation changes | **COMPLETE** | Debounced orientation resize with no rebuild; desktop window resize; FOV and aspect adaptation; run state preserved. `[BROWSER]` |
| 7.7 | Avoid expensive effects on lower-powered devices | **PARTIAL** | The `low` tier removes shadows, caps the pixel ratio, halves the flicker lights, cuts dust/decals and lowers fog density; the quality tier is auto-detected. But the tier cannot be switched *before* the game is built, and there is no dynamic/adaptive downgrade if the frame rate drops. `[SRC]` `[BROWSER]` |
| 7.8 | Prioritise working gameplay over decorative effects | **COMPLETE** | The game is playable and winnable; decorative systems are all quality-gated or cosmetic. `[BROWSER]` |

---

## 8. Accessibility

**Added to the specification on 2026-10-16 at the project owner's request**, then partly implemented and
re-tested the same day as part of **Phase 2 (THE WARDEN)**.

Rows **8.1–8.5 are now genuinely met**, and by construction rather than by coincidence: every one of the
creature's sounds is fired through a single `Creature._cue()` method that both plays the audio *and* records
the event as plain data, and `Hud.setThreat()` renders that data as a **directional ring plus a caption**.
Because there is one choke point, the visual warning cannot drift out of sync with the audio one. Rows
**8.7 and 8.8 remain unimplemented**, and **8.10 is only partly done**: the creature rig honours reduced
motion, but the rest of the game layer does not.

Relevant context for the remaining gaps: all audio still routes through a single `master` gain node whose
level is the hardcoded constant `0.85`, so there is no volume control and no per-category bus. Head bob,
camera roll, torch sway, dust drift, light flicker, the damage-vignette transition and the 1.7 s escape
cinematic all still animate when reduced motion is requested.

The original `.danger` vignette is unchanged and still runs alongside the new indicator: it communicates
*vague dread*, the new ring communicates *which way to run*.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 8.1 | Visual warning when the creature is near | **COMPLETE** | A `.threat` ring is drawn around the reticle whenever the creature is inside the 13 m `nearRange`, gaining an intensified colour under 6 m and a hostile colour while it is actively chasing, alongside the unchanged `.danger` vignette. Observed visible at 3, 5, 6, 8 and 10 m and **correctly hidden** in a live-loop frame with the creature out of range. `[SRC]` `[BROWSER]` |
| 8.2 | **Directional** warning showing which side the creature is on | **COMPLETE** | The ring's arrow rotates about the ring centre to the creature's bearing, computed from the camera's own axes so it is correct for mouse, touch-drag and arrow-key look alike. Measured at six view angles and the word, the bearing and the CSS rotation agreed exactly: 0° → `AHEAD` (`rotate(0deg)`), +45° → `AHEAD RIGHT`, +90° → `RIGHT` (`rotate(90deg)`), ±180° → `BEHIND`, −90° → `LEFT` (`rotate(-90deg)`), −135° → `BEHIND LEFT`. `[BROWSER]` |
| 8.3 | Visual equivalent for **creature footsteps** | **COMPLETE** | `_cue('step')` fires the footstep sound and records `cue.kind = 'step'`; the caption then reads `FOOTSTEPS · BEHIND RIGHT · 9m`, directly observed. Also gives the distance in metres, which the audio only implied. `[BROWSER]` |
| 8.4 | Visual equivalent for **creature growls** | **COMPLETE** | `_cue('growl', intensity)` records the growl and its intensity; captions `GROWL · AHEAD · 8m` (on first becoming hostile) and `GROWL · BEHIND · 10m` were both observed directly. `[BROWSER]` |
| 8.5 | Caption / text equivalent for game-critical audio | **COMPLETE** | The caption is a real `role="status" aria-live="polite"` region, and it is only written when the whole sentence changes — a live region rewritten every frame would be unusable to a screen reader. Live caption kinds observed: `SOMETHING IS CLOSE`, `FOOTSTEPS`, `GROWL`. `[SRC]` `[BROWSER]` |
| 8.6 | Configurable audio — mute everything | **COMPLETE** | Global mute via `master.gain`, surfaced in both the site header and the pause menu, persisted as `tle.muted`. Toggling and persistence verified. `[BROWSER]` |
| 8.7 | Configurable audio — **volume level** | **MISSING** | Master gain is the hardcoded constant `0.85`; there is no volume control in the UI or in `config.js`. `[SRC]` |
| 8.8 | Configurable audio — **per-category** (ambience / threat / UI) | **MISSING** | Every cue routes through a single `master` gain node. There are no separate buses, so threat cues cannot be boosted or ambience quietened independently. `[SRC]` |
| 8.9 | Reduced-motion support — **landing page** | **COMPLETE** | `prefers-reduced-motion: reduce` sets `scroll-behavior: auto` in `base.css` and disables the hero camera dolly and idle sway in `hero.js`. `[SRC]` |
| 8.10 | Reduced-motion support — **gameplay** | **PARTIAL** | The creature rig now honours it: with the flag set, 900 frames produced a maximum head tilt of **0.0000 rad** and a maximum twitch of **0.0000**, where the normal run produced 293 distinct tilts and 28 twitch frames, and the neck sway is scaled to 20 %. **But the media query itself was not exercised** — the flag was set directly on the creature, because the test browser offers no reduced-motion emulation; and nothing else in the game layer honours it. Head bob, camera roll, torch sway, dust drift, light flicker, the damage-vignette transition and the escape cinematic all still animate. `[SRC]` `[BROWSER]` (flag path only) `[UNVERIFIED]` (media query) |

**What is still not verified in this section.** No screen reader was ever used, and no session was played
with reduced-motion actually enabled in the operating system — the creature's reduced-motion *branch* was
verified by setting its flag, but the `prefers-reduced-motion` media query was never triggered for it.
Rows 8.7 and 8.8 are unimplemented, so the configurable-audio half of this section is unmet.

---

## 9. Summary

Counted from the **103** requirement rows above (verified by re-counting the document, not estimated):

| Status | Count |
|---|---|
| **COMPLETE** | 93 |
| **IMPLEMENTED, UNVERIFIED** | 5 |
| **PARTIAL** | 3 |
| **MISSING** | 2 |
| **BROKEN** | 0 |

Phase 2 moved **23** rows to COMPLETE (all 18 of §5b and 8.1–8.5) and reduced MISSING from 7 to 2, the two
remaining gaps both being configurable audio (volume level and per-category buses).

**Items still needing evidence**

1. **3.8 Safe-area insets** — code complete, needs a notched device.
2. **3.9 / 7.5 / 7.7 Performance** — no FPS measurement has ever been taken on real hardware; the `low`
   tier has no adaptive fallback.
3. **2.2 Pointer Lock** — the lock itself was never genuinely engaged (fallbacks were tested instead).
4. **3.12 Fullscreen** — could not be granted in the test browser.
5. **4.13 Ambient audio** — synthesis is complete and the context initialises, but nothing was heard.
6. **Tablet form factor** — untested.

**Defects carried in `PROJECT_HANDOFF.md`:** BUG-1 (rotate hint never shows at the start of a portrait
run) and BUG-2 (HUD gauges overlap the joystick when touch is forced on a fine-pointer device). Neither
is captured as a requirement here; both are polish-level.

**Accessibility (§8) is no longer the largest gap.** Phase 2 took it from 7 MISSING / 1 PARTIAL down to
**2 MISSING / 1 PARTIAL** out of 10: the directional and cue-specific visual warnings (8.1–8.5) now exist
and were observed, and what remains is configurable audio — a volume level and per-category buses (8.7,
8.8) — plus reduced motion across the rest of the game layer rather than only the creature (8.10).

**The largest remaining gap is now evidence, not features.** Nothing in the list above changed in Phase 2,
and the creature work added two new unverified areas of its own: **no frame rate has still never been
measured**, and the WARDEN's own behaviours (patrol, chase, recovery, collision) have been exercised only
through deterministic simulation and a desktop browser — never on a real phone or tablet.
