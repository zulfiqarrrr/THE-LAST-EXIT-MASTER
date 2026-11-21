/**
 * Facility sanity check — run with `npm run check:map`.
 *
 * Verifies that the authored tile map is rectangular, fully connected from the
 * player spawn, and that the key, the exit approach and the creature spawn are
 * all reachable. Catches map typos before they become "the game is impossible".
 */
import {
  MAP_ROWS,
  COLS,
  ROWS,
  GRID,
  FLOOR_CELLS,
  MAINTENANCE_SPOTS,
  findPath,
  isSolid,
  tileAt,
  cellToWorld,
} from '../src/game/level.js';

let failures = 0;
const ok = (label) => console.log(`  \u2713 ${label}`);
const fail = (label) => {
  failures += 1;
  console.error(`  \u2717 ${label}`);
};
const assert = (condition, label) => (condition ? ok(label) : fail(label));

console.log('THE LAST EXIT — facility map check\n');

// The facility is 41 x 27 cells, anchored so the original exit stays at cells (6,4) and (7,4).
assert(COLS === 41 && ROWS === 27, `map is ${COLS}x${ROWS} (expected 41x27)`);
const badRows = MAP_ROWS.map((row, i) => (row.length === COLS ? null : i + 1)).filter(Boolean);
assert(badRows.length === 0, `every row is ${COLS} characters${badRows.length ? ` (off: ${badRows})` : ''}`);

const start = FLOOR_CELLS.find((c) => tileAt(c.col, c.row) === 'S');
assert(Boolean(start), 'player spawn (S) exists');
assert(MAINTENANCE_SPOTS.length >= 2, `maintenance key has ${MAINTENANCE_SPOTS.length} hiding spots`);
const spotsOnFloor = MAINTENANCE_SPOTS.filter((s) => !isSolid(s.col, s.row) && tileAt(s.col, s.row) !== 'D');
assert(spotsOnFloor.length === MAINTENANCE_SPOTS.length, 'every maintenance key spot is open floor (not a wall or doorway)');

// Flood fill from the spawn.
const seen = new Set();
const queue = [start];
seen.add(`${start.col},${start.row}`);
while (queue.length) {
  const cell = queue.shift();
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nc = cell.col + dc;
    const nr = cell.row + dr;
    const id = `${nc},${nr}`;
    if (isSolid(nc, nr) || seen.has(id)) continue;
    seen.add(id);
    queue.push({ col: nc, row: nr });
  }
}
const unreachable = FLOOR_CELLS.filter((c) => !seen.has(`${c.col},${c.row}`));
assert(unreachable.length === 0, `all ${FLOOR_CELLS.length} walkable cells are reachable${unreachable.length ? ` (orphans: ${unreachable.map((c) => `${c.col},${c.row}`).join(' ')})` : ''}`);

const unreachableSpots = MAINTENANCE_SPOTS.filter((s) => findPath(start, s).length === 0);
assert(unreachableSpots.length === 0, `every maintenance key spot is reachable from the spawn${unreachableSpots.length ? ` (blocked: ${unreachableSpots.map((s) => `${s.col},${s.row}`).join(' ')})` : ''}`);
for (const fixture of FLOOR_CELLS.filter((c) => tileAt(c.col, c.row) === 'L')) {
  assert(findPath(start, fixture).length > 0, `ceiling light at ${fixture.col},${fixture.row} is reachable`);
}
for (const door of FLOOR_CELLS.filter((c) => tileAt(c.col, c.row) === 'D')) {
  assert(findPath(start, door).length > 0, `doorway at ${door.col},${door.row} is reachable`);
}

const exitCells = [];
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) if (GRID[row][col] === 'E') exitCells.push({ col, row });
}
assert(exitCells.length >= 2, `blast door occupies ${exitCells.length} cells`);
const exitIsOriginal = exitCells.length === 2 && exitCells.every((c) => c.row === 4 && (c.col === 6 || c.col === 7));
assert(exitIsOriginal, 'blast door stays at its original cells (6,4) and (7,4)');

// Ward dressing: beds and trolleys must sit on walkable floor with open neighbours.
const wardBeds = [];
const wardTrolleys = [];
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    if (GRID[row][col] === 'K') wardBeds.push({ col, row });
    if (GRID[row][col] === 'T') wardTrolleys.push({ col, row });
  }
}
assert(wardBeds.length >= 8, `ward has ${wardBeds.length} beds (expected at least 8)`);
assert(wardTrolleys.length >= 2, `ward has ${wardTrolleys.length} trolleys`);
// Beds and trolleys are solid, so findPath() cannot target them directly. Instead the
// prop counts as reachable when at least one open neighbour can be reached from the spawn.
const STEP_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const propReachable = (c) =>
  STEP_DIRS.some(([dc, dr]) => !isSolid(c.col + dc, c.row + dr) && findPath(start, { col: c.col + dc, row: c.row + dr }).length > 0);
const unreachableProps = [...wardBeds, ...wardTrolleys].filter((c) => !propReachable(c));
assert(unreachableProps.length === 0, `every bed and trolley cell is reachable${unreachableProps.length ? ` (blocked: ${unreachableProps.map((c) => `${c.col},${c.row}`).join(' ')})` : ''}`);
const pinnedProps = [...wardBeds, ...wardTrolleys].filter(
  (c) => STEP_DIRS.filter(([dc, dr]) => !isSolid(c.col + dc, c.row + dr)).length < 2,
);
assert(pinnedProps.length === 0, `every bed and trolley has two open sides${pinnedProps.length ? ` (pinned: ${pinnedProps.map((c) => `${c.col},${c.row}`).join(' ')})` : ''}`);
const approach = exitCells.map((c) => ({ col: c.col, row: c.row + 1 }));
const reachable = approach.filter((c) => !isSolid(c.col, c.row) && findPath(start, c).length > 0);
assert(reachable.length === exitCells.length, 'every blast-door cell has a walkable approach from the spawn');

const enemy = { col: 7, row: 7 };
assert(!isSolid(enemy.col, enemy.row), 'creature spawn is walkable');
const enemyBlocked = MAINTENANCE_SPOTS.filter((s) => findPath(enemy, s).length === 0);
assert(enemyBlocked.length === 0, 'creature can path from its spawn to every maintenance key spot');

const spawnWorld = cellToWorld(start.col, start.row);
console.log(`\n  world size: ${(COLS * 3).toFixed(0)}m x ${(ROWS * 3).toFixed(0)}m, spawn at (${spawnWorld.x}, ${spawnWorld.z})`);
console.log(`  blast door world cells: ${exitCells.map((c) => { const w = cellToWorld(c.col, c.row); return `(${w.x}, ${w.z})`; }).join(' ')}`);
console.log(`  walkable cells: ${FLOOR_CELLS.length} of ${COLS * ROWS}\n`);
console.log(MAP_ROWS.map((row) => `  ${row}`).join('\n'));

console.log(`\n${failures === 0 ? 'PASS' : `FAIL — ${failures} problem(s)`}`);
process.exit(failures === 0 ? 0 : 1);
