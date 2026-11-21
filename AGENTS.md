# AGENTS.md — THE LAST EXIT

Permanent working instructions for **any** AI coding agent (or human) that touches this project.
Read this file first, every session.

---

## 0. What this project is

**THE LAST EXIT** — a first-person 3D survival-horror escape game delivered as a responsive
website. Vite + vanilla JavaScript + Three.js. No framework, no external art or audio assets:
textures are painted into `<canvas>` at runtime and every sound is synthesised with the Web Audio
API.

**Project root:** `C:\Users\MD Rehan\Desktop\the-last-exit`

> ⚠️ **Workspace warning — this keeps happening.** The session workspace is repeatedly opened with its
> project root set to `C:\Users\MD Rehan\Desktop\luma\app`, the unrelated **LUMA** project, instead of
> this one. On 2026-10-16 it was observed LUMA-rooted, briefly corrected, and then reverted to LUMA
> again. **Always confirm with `pwd` / your tools' default cwd before writing anything.**
>
> - **Fast disambiguation:** this project is **Vite + vanilla JS** (`vite.config.js`, `index.html`,
>   `scripts/check-map.mjs`, `src/game/`). LUMA is **Next.js** (`next.config.ts`, `tsconfig.json`,
>   `components.json`, `src/app/`). If you see the Next.js markers, you are in the wrong tree.
> - Relative paths, `reveal_file` and the Preview panel follow the *workspace* root, not this project.
>   Until the workspace root is corrected, address this project with **absolute paths**
>   (`C:\Users\MD Rehan\Desktop\the-last-exit\...`).
> - **Never create, edit or delete anything inside the LUMA folder.**

---

## 1. Hard rules

1. **Inspect before editing.** Read the existing implementation of every file you intend to change,
   plus `PROJECT_HANDOFF.md` and `GAME_REQUIREMENTS.md`.
2. **Never rebuild the game from scratch** without explicit approval.
3. **Never delete or replace existing functionality** that is not part of the requested change.
4. **Never modify unrelated projects.** Especially not LUMA.
5. **Work incrementally.** Prefer many small, focused, reversible changes over rewrites.
6. **Preserve the existing architecture and dependencies** where practical. The module layout
   (`config → level → player/enemy/interactions → game → main`) and the "one tuning constant lives
   in `config.js`" convention are load-bearing; follow them.
7. **Do not add paid services, API keys, CDNs or network dependencies** without explicit approval.
   This project is deliberately fully offline and asset-free; keep it that way.
8. **Ask for approval before large architectural changes** (new engine, new build tool, framework
   migration, bundling strategy change).
9. **Do not delete `node_modules/` or `dist/`**, do not reset Git history, and do not replace
   config files unnecessarily.
10. **Do not rewrite working modules merely to improve code style.**

---

## 2. Truth and evidence rules

- **Never claim a feature works without evidence.** State which of these you actually did:
  1. read the source, 2. ran a successful build, 3. exercised it in a running browser,
  4. tested it on a real mobile device, 5. did not verify.
- **Report what you tested and what remains unverified.** "The build passed" is not "the feature
  works".
- **Never mark a requirement COMPLETE from the existence of code alone.** A requirement is only
  COMPLETE when you have observed the behaviour.
- If a check fails, **report the failure before attempting a significant fix**.
- Keep **desktop and mobile** in mind for every change. A change that only works with a keyboard is
  an incomplete change.

---

## 3. Verify your work

Run these after any meaningful change (all from the project root):

```bash
npm run check:map     # facility map sanity: connectivity, spawn/key/exit/enemy reachability
npm run build         # production build must succeed
npm run dev           # http://127.0.0.1:5178 — then actually play it
```

- `npm run check:map` **must print `PASS`** and exit 0. It catches map typos that would make the
  game unwinnable.
- After changing the map, pathing, collision or the key/exit, re-run the map check *and* replay the
  run in a browser.
- There is **no automated unit-test suite.** Do not claim "tests pass" — there are none. The map
  check is the only automated check.
- The game exposes a QA surface at `window.__lastExit` (see §5) — use it for deterministic checks
  instead of eyeballing.
- **`npm run build` is byte-for-byte reproducible.** Rebuilding the unchanged source yields identical
  content hashes in `dist/`. If a rebuild changes a `dist/` hash, the source genuinely changed — that
  makes `dist/` hashes a reliable drift detector.

---

## 4. Documentation duties (do this automatically, do not be asked)

- **Update `PROJECT_HANDOFF.md` after every meaningful implementation change.** Append to its change
  log with: what changed, files modified, bugs fixed, tests actually performed and their results,
  remaining issues, and the new next recommended task.
- **Update `GAME_REQUIREMENTS.md`** whenever a requirement's status changes, and whenever you
  discover a requirement that the document is missing.
- **Keep `PROJECT_FILE_LIST.txt`** in sync when files are added, moved or deleted.
- The **source code is authoritative**. The handoff records the latest known state. The requirements
  file preserves the intended feature set. Do not rely on conversation history for continuity.

---

## 5. Session start checklist

1. Read `AGENTS.md` (this file).
2. Read `PROJECT_HANDOFF.md`.
3. Read `GAME_REQUIREMENTS.md`.
4. Inspect the current source of every file relevant to the requested task.
5. Confirm the documented state still matches the code; correct the docs if it does not.
6. Continue from the latest **verified** state. Do not redo completed work.

---

## 6. Project conventions (follow these)

- **ES modules, `type: "module"`, Vite.** Import with explicit `.js` extensions.
- **Two-space indentation, single quotes, semicolons.** File-header comment block explaining the
  module's responsibility.
- **All gameplay tuning numbers live in `src/game/config.js`.** Never scatter magic numbers through
  gameplay modules.
- **Everything is delta-time based.** `update(dt)` must behave identically at 30, 60 or 120 fps.
  Never assume a fixed frame step.
- **The tile grid is the single source of truth** for collision, path-finding and line-of-sight
  (`src/game/level.js`). Keep them consistent — do not add a second collision system.
- **DOM writes belong to `hud.js`/`main.js`.** Gameplay modules call `hud.*` methods; they must not
  poke the DOM directly.
- **Input is funnelled through `src/game/input.js`** (`Controls`), so keyboard, mouse and touch share
  one code path. Add new schemes by feeding that object, not by branching in the game loop.
- **Quality tiers:** respect `QUALITY.high` / `QUALITY.low` and `applyQuality()`. New visual features
  must degrade gracefully on the `low` tier.
- **Guard optional browser APIs.** Pointer Lock, Fullscreen and Web Audio can all be denied — those
  paths already fail soft; keep it that way.
- **Everything must remain procedurally generated.** No binary art/audio assets.

---

## 7. Known pitfalls

- `window.__lastExit.state` and `.debug` are **getters, not functions** (`__lastExit.state`, not
  `__lastExit.state()`).
- The pause menu and the game loop share the Escape key — while running, the loop owns it.
- `isTouchDevice()` can be pinned for QA with `?touch=1` / `?touch=0`. Note that this switches the
  *game logic* only; the touch-specific HUD layout is driven by the CSS `@media (pointer: coarse)`
  query and will therefore **not** apply when touch is forced on a mouse-driven desktop. See
  `PROJECT_HANDOFF.md` → Known issues (BUG-2).
- **`Game._rotateDismissed` is read from `localStorage` once, in the constructor**, and the `Game`
  instance is kept for the life of the page. Clearing `localStorage` therefore does **not** reset it —
  subsequent runs reuse the old value. Set `game._rotateDismissed = false` to actually test it. Watch
  for this pattern (constructor-time settings read) when writing any test.
- **`window.__lastExit.game` is `null` until the first PLAY**, because the `Game` object is created
  lazily. Capture `game` *after* starting a run, not before.

---

## 8. Backup and restore

An independent, hash-verified snapshot lives **outside** the project folder:

```
C:\Users\MD Rehan\Desktop\the-last-exit-backup-2026-10-16
```

- Contains 31 project files + `MANIFEST.sha256` + `BACKUP_INFO.txt`. Only `node_modules/` is excluded
  (reproducible with `npm install` from the included `package-lock.json`).
- **Verify the snapshot** (Git Bash):
  ```bash
  cd "C:/Users/MD Rehan/Desktop/the-last-exit-backup-2026-10-16"
  sha256sum -c MANIFEST.sha256     # expect "OK" for all 31 entries, exit 0
  ```
- **Detect source drift** since the snapshot: derive the manifest from the live source and diff it
  against the backup's. Any difference is an edit made after the snapshot.
- **Restore:** copy the files back, then `npm install`. `dist/` is included, so `npm run preview` works
  without a rebuild once dependencies are installed.
- **This project has no Git history, so that folder is the only rollback point.** Do not delete or move
  it. If you make meaningful changes, tell the user the snapshot is now stale rather than silently
  leaving it inconsistent.
