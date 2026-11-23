import * as facility from '../src/game/maps/map-facility.js';
import * as sewers from '../src/game/maps/map-sewers.js';
import * as archive from '../src/game/maps/map-archive.js';

const maps = [facility, sewers, archive];
const SOLID_CHARS = new Set(['#', 'X', 'B', 'E', 'K', 'T']);

for (const m of maps) {
  console.log(`Checking ${m.ID} (${m.NAME})...`);
  const rows = m.MAP_ROWS;
  if (rows.length !== 27) throw new Error(`${m.ID}: expected 27 rows, got ${rows.length}`);
  for (let r = 0; r < 27; r++) {
    if (rows[r].length !== 41) throw new Error(`${m.ID} row ${r} length is ${rows[r].length}`);
  }

  const grid = rows.map((r) => r.split(''));
  let start = null;
  const exit = [];
  const beds = [];
  const trolleys = [];
  const floors = [];

  for (let r = 0; r < 27; r++) {
    for (let c = 0; c < 41; c++) {
      const ch = grid[r][c];
      if (ch === 'S') start = { col: c, row: r };
      if (ch === 'E') exit.push({ col: c, row: r });
      if (ch === 'K') beds.push({ col: c, row: r });
      if (ch === 'T') trolleys.push({ col: c, row: r });
      if (!SOLID_CHARS.has(ch)) floors.push({ col: c, row: r });
    }
  }

  if (!start) throw new Error(`${m.ID}: missing S`);
  if (exit.length < 2) throw new Error(`${m.ID}: missing E`);
  if (beds.length < 8) throw new Error(`${m.ID}: expected at least 8 K, got ${beds.length}`);
  if (trolleys.length < 2) throw new Error(`${m.ID}: expected at least 2 T, got ${trolleys.length}`);

  // Flood fill
  const seen = new Set();
  const q = [start];
  seen.add(`${start.col},${start.row}`);
  while (q.length) {
    const cur = q.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (nc < 0 || nr < 0 || nc >= 41 || nr >= 27) continue;
      if (SOLID_CHARS.has(grid[nr][nc])) continue;
      const id = `${nc},${nr}`;
      if (!seen.has(id)) {
        seen.add(id);
        q.push({ col: nc, row: nr });
      }
    }
  }

  const orphans = floors.filter((f) => !seen.has(`${f.col},${f.row}`));
  if (orphans.length > 0) {
    throw new Error(`${m.ID}: ${orphans.length} unreachable floor cells: ${orphans.map((o) => `${o.col},${o.row}`).join(' ')}`);
  }

  console.log(`  ✓ ${m.ID} PASSED! (${floors.length} floor cells connected)`);
}
