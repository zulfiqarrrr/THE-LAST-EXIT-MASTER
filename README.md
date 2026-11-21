# THE LAST EXIT

A first-person 3D survival-horror escape game that runs in the browser, on desktop and mobile.

Built with **Vite + vanilla JavaScript + Three.js**. There are no external art or audio assets:
textures are painted onto `<canvas>` at runtime and every sound is synthesised with the Web Audio
API. The only binary asset is the player character model (`public/models/warden.glb`).

## Play

The game is a static site, so it can be hosted anywhere:

- **Locally:** `npm install` then `npm run dev`, and open the printed URL (default `http://127.0.0.1:5178`).
- **Any static host:** `npm run build` and upload the `dist` folder.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Look around (click the screen to capture the cursor) |
| Arrow keys | Look around without mouse capture |
| `Shift` | Sprint — burns stamina, and it is loud |
| `E` | Interact — take the key, open the exit, use the CCTV console |
| `F` | Toggle the flashlight |
| `R` | Equip or stow the Lumen key |
| `Q` | Lumen Surge — 45 seconds of cyan light without the torch |
| `M` | Open the facility map (`Esc` closes it) |
| `N` | Mute all audio |
| `Esc` | Pause / release the cursor |

On phones and tablets an on-screen stick, look area and action buttons replace the keyboard and mouse.

While the CCTV console is open, `1`–`9` pick a feed, `NEXT`/`PREV` cycle them and `Esc` or `E` exits.

## Features

- Procedural hospital: main corridor, west block, east wing, ward rooms, service corridors, storage,
  the security room and a generator room, with 3D props throughout.
- Discoverable full-screen facility map with named wards, plus a circular minimap centred on the player.
- Random flickering lights and red emergency lighting driven by the generator.
- CCTV security room with a live console: six real camera feeds rendered from the scene.
- Two separate key systems — the Maintenance Key opens the exit, the Lumen Key powers the
  flashlight and the **Lumen Surge**, which lasts 45 seconds.
- A stalking Warden enemy, stamina, a flashlight battery and a touch layout for mobile.

## Project layout

```
index.html            markup for the site shell, HUD, overlays, map and CCTV console
src/main.js           app bootstrap, quality detection, QA hooks (window.__lastExit)
src/game/game.js      game loop, state machine, input routing
src/game/level.js     hospital geometry, lights, collisions, flicker and emergency lighting
src/game/map.js       facility map and minimap
src/game/cctv.js      surveillance cameras and console
src/game/enemy.js     the Warden
src/game/lumen.js     Lumen key, flashlight and surge
src/game/player.js    movement and stamina
src/game/hud.js       HUD updates
src/game/input.js     keyboard, pointer and touch binding
src/game/touch.js     on-screen controls
src/styles/           base, site, game UI and responsive CSS
scripts/check-map.mjs headless check that every ward and room cell is reachable
docs/                 requirements, handoff notes and agent instructions
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run check:map` | Verify the level map is fully connected |

Requires Node.js 18 or newer.
