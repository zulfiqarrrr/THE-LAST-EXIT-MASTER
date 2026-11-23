"""
design_hard_labyrinth_maps.py — Builds tight, confusing, claustrophobic survival-horror labyrinth maps:
1. Sublevel 7 (Drainage Network): Winding serpentine canal maze, circular pump cisterns with central pillars, pipe switchbacks.
2. Sublevel 1 (Research Archive): Towering bookcase aisles (dense switchbacks), catalog rotunda columns, microfiche vault mazes.
Walkable cells: ~420-450 cells each (matching Sublevel 4's tight 425 cells).
"""

import os
from collections import deque

BASE_DIR = r"c:\Users\ASUS HN116WS\OneDrive\Desktop\game"
MAPS_DIR = os.path.join(BASE_DIR, "src", "game", "maps")

def validate_map_grid(name, rows, maintenance_spots, enemy_spawn):
    assert len(rows) == 27, f"{name}: Expected 27 rows, got {len(rows)}"
    for r_idx, r in enumerate(rows):
        assert len(r) == 41, f"{name} row {r_idx}: Expected 41 cols, got {len(r)}"
    
    # Blast door check
    assert rows[4][6] == 'E' and rows[4][7] == 'E', f"{name}: Blast door 'E' must be at (6,4) and (7,4)"

    # Spawn check
    spawn_count = sum(r.count('S') for r in rows)
    assert spawn_count == 1, f"{name}: Expected 1 'S', got {spawn_count}"
    
    # Locate spawn
    s_col, s_row = -1, -1
    for r_idx, r in enumerate(rows):
        if 'S' in r:
            s_col = r.index('S')
            s_row = r_idx
            break

    solid_chars = set(['#', 'X', 'B', 'E', 'K', 'T'])
    def is_solid(c, r):
        if c < 0 or c >= 41 or r < 0 or r >= 27:
            return True
        return rows[r][c] in solid_chars

    # Flood fill reachability from spawn
    queue = [(s_col, s_row)]
    visited = set([(s_col, s_row)])
    while queue:
        c, r = queue.pop(0)
        for dc, dr in [(1,0), (-1,0), (0,1), (0,-1)]:
            nc, nr = c + dc, r + dr
            if not is_solid(nc, nr) and (nc, nr) not in visited:
                visited.add((nc, nr))
                queue.append((nc, nr))

    unreachable_floors = []
    total_floors = 0
    for r in range(27):
        for c in range(41):
            if not is_solid(c, r):
                total_floors += 1
                if (c, r) not in visited:
                    unreachable_floors.append((c, r))
    assert len(unreachable_floors) == 0, f"{name}: Unreachable floor cells: {unreachable_floors}"

    # Blast door approach check
    exit_approaches = [(6, 5), (7, 5)]
    for ap in exit_approaches:
        assert ap in visited, f"{name}: Blast door approach {ap} not reachable"

    # Maintenance spots check
    assert len(maintenance_spots) >= 21, f"{name}: Expected at least 21 maintenance spots, got {len(maintenance_spots)}"
    for idx, spot in enumerate(maintenance_spots):
        c, r = spot['col'], spot['row']
        assert not is_solid(c, r), f"{name} spot {idx} at ({c},{r}) is solid"
        assert rows[r][c] != 'D', f"{name} spot {idx} at ({c},{r}) is on a doorway"
        assert (c, r) in visited, f"{name} spot {idx} at ({c},{r}) is not reachable"

    # Enemy spawn check
    ec, er = enemy_spawn['col'], enemy_spawn['row']
    assert not is_solid(ec, er), f"{name}: Enemy spawn ({ec},{er}) is solid"
    assert (ec, er) in visited, f"{name}: Enemy spawn ({ec},{er}) is not reachable from player spawn"

    # BFS distance from player to enemy spawn
    dist = {}
    q = deque([(s_col, s_row, 0)])
    dist[(s_col, s_row)] = 0
    while q:
        c, r, d = q.popleft()
        for dc, dr in [(1,0), (-1,0), (0,1), (0,-1)]:
            nc, nr = c + dc, r + dr
            if not is_solid(nc, nr) and (nc, nr) not in dist:
                dist[(nc, nr)] = d + 1
                q.append((nc, nr, d + 1))

    enemy_dist = dist.get((ec, er), -1)
    print(f"[{name}] Walkable cells: {total_floors}, Enemy spawn dist from player: {enemy_dist} steps")
    assert enemy_dist >= 10, f"{name}: Enemy spawn is too close to player ({enemy_dist} steps)"
    return total_floors

# --------------------------------------------------------------------------
# Map 2: SUBLEVEL 7 (DRAINAGE NETWORK)
# Claustrophobic pipe switchbacks, winding canals, circular pump cistern with central vats
# --------------------------------------------------------------------------
sewer_grid = [
    "#########################################", # 0
    "#########################################", # 1
    "##..........L.......#.......L..........##", # 2  North maintenance conduit
    "##.########.#######.#.#######.########.##", # 3
    "##.#..EE..#.#.....#.#.#.....#.#......#.##", # 4  Exit at (6,4),(7,4)
    "##.#.L....#.#.L.#.D...D.#.L.#.#..B...#.##", # 5
    "##.D...S..D.#...#.#####.#...#.D......D.##", # 6  Spawn at (7,6)
    "##.########.#####.#####.#####.########.##", # 7
    "##....#.....#.......#.......#.....#....##", # 8  Canal crossing
    "#####.#.#####.###.D.#.D.###.#####.#.#####", # 9
    "##....#.#...#.#...#...#...#.#...#.#....##", # 10 Pipe labyrinth
    "##.####.#.L.#.#.B.#.L.#.B.#.#.L.#.####.##", # 11
    "##.#....D...#.D...#...#...D.#...D....#.##", # 12
    "##.#.########.......D.......########.#.##", # 13 Central Sluice Hub
    "##.#....D...#.D...#...#...D.#...D....#.##", # 14
    "##.####.#.L.#.#...#...#...#.#.L.#.####.##", # 15
    "##....#.#...#.#.X.#.L.#.X.#.#...#.#....##", # 16
    "#####.#.#####.###.D.#.D.###.#####.#.#####", # 17
    "##....#.....#.......#.......#.....#....##", # 18
    "##.########.#####.D.#.D.#####.########.##", # 19
    "##........L...D...#...#...D...L........##", # 20 Interceptor spillway
    "###.#########.###.#...#.###.#########.###", # 21
    "###.#.......#...#.#.B.#.#...#.......#.###", # 22 Sediment tanks
    "###.#.B...X.D.L.#...D...#.L.D.X...B.#.###", # 23
    "###.#.......#...#.......#...#.......#.###", # 24
    "###.#########.#############.#########.###", # 25
    "#########################################", # 26
]

def generate_distributed_spots(grid):
    solid_or_door = set(['#', 'X', 'B', 'E', 'K', 'T', 'D', 'S'])
    candidates = []
    styles = ['floor', 'shelf', 'cabinet', 'desk']
    for r in range(2, 26):
        for c in range(2, 39):
            if grid[r][c] not in solid_or_door:
                candidates.append((c, r))
    step = max(1, len(candidates) // 24)
    spots = []
    for i in range(24):
        c, r = candidates[i * step]
        spots.append({"col": c, "row": r, "style": styles[i % len(styles)]})
    return spots

sewer_spots = generate_distributed_spots(sewer_grid)
sewer_enemy = {"col": 20, "row": 13} # Central Sluice Hub

# --------------------------------------------------------------------------
# Map 3: SUBLEVEL 1 (RESEARCH ARCHIVE)
# Dense towering book stack aisles (switchbacks), catalog rotunda columns, private vaults
# --------------------------------------------------------------------------
archive_grid = [
    "#########################################", # 0
    "#########################################", # 1
    "##..........L.......#.......L..........##", # 2  North gallery corridor
    "##.########.#######.#.#######.########.##", # 3
    "##.#..EE..#.#.....#.#.#.....#.#......#.##", # 4  Exit at (6,4),(7,4)
    "##.#.L....#.#.L.#.D...D.#.L.#.#..B...#.##", # 5
    "##.D...S..D.#...#.#####.#...#.D......D.##", # 6  Spawn at (7,6)
    "##.########.#####.#####.#####.########.##", # 7
    "##....#.....#.......#.......#.....#....##", # 8  Atrium ambulatory
    "#####.#.#####.###.D.#.D.###.#####.#.#####", # 9
    "##....#.#.X.#...#...#...#...#.X.#.#....##", # 10 Book stack rows
    "##.####.#...#.L.#.B.#.L.#...#...#.####.##", # 11
    "##.#....D.X.#.###...#...###.#.X.D....#.##", # 12
    "##.#.########...D...#...D...########.#.##", # 13 Catalog Rotunda
    "##.#....D.X.#.###...#...###.#.X.D....#.##", # 14
    "##.####.#...#.L.#...#...#.L.#...#.####.##", # 15
    "##....#.#.X.#...#...#...#...#.X.#.#....##", # 16
    "#####.#.#####.###.D.#.D.###.#####.#.#####", # 17
    "##....#.....#.......#.......#.....#....##", # 18
    "##.########.#####.D.#.D.#####.########.##", # 19
    "##........L...D...#...#...D...L........##", # 20 Gallery promenade
    "###.#########.###.#...#.###.#########.###", # 21
    "###.#.......#...#.#.T.#.#...#.......#.###", # 22 Rare manuscript vaults
    "###.#.B...T.D.L.#...D...#.L.D.T...B.#.###", # 23
    "###.#.......#...#.......#...#.......#.###", # 24
    "###.#########.#############.#########.###", # 25
    "#########################################", # 26
]

archive_spots = generate_distributed_spots(archive_grid)
archive_enemy = {"col": 18, "row": 13} # Catalog Rotunda Aisle

print("--- Validating New Hard Labyrinth Maps ---")
validate_map_grid("Sublevel 7 (Sewers)", sewer_grid, sewer_spots, sewer_enemy)
validate_map_grid("Sublevel 1 (Archive)", archive_grid, archive_spots, archive_enemy)

# Write to src/game/maps/map-sewers.js
sewer_content = f"""/* ==========================================================================
   THE LAST EXIT — Map 2: SUBLEVEL 7 (Drainage Network)
   Tailored for THE CRAWLER:
   - Claustrophobic pipe switchbacks & winding aqueduct canal labyrinth
   - Circular pump cisterns with central sludge vats breaking sightlines
   - Low oppressive 2.5m ceiling height
   ========================================================================== */

export const ID = 'sewers';
export const NAME = 'SUBLEVEL 7';
export const SUBTITLE = 'DRAINAGE NETWORK';
export const MONSTER_ID = 'crawler';
export const MONSTER_NAME = 'THE CRAWLER';
export const TAGLINE = 'The drainage tunnels are sealed off on all maps. Someone opened them.';
export const WALL_HEIGHT = 2.5;

export const MAP_ROWS = {repr(sewer_grid)};

export const MAINTENANCE_SPOTS = {repr(sewer_spots)};

export const AREAS = [
  {{ name: 'PUMP CISTERN ALPHA', ward: 'WEST CONDUIT', rect: [2, 3, 9, 7] }},
  {{ name: 'SLUICE CONTROL', ward: 'CENTRAL HUB', rect: [11, 4, 18, 7] }},
  {{ name: 'INFLOW INTERCHANGE', ward: 'CENTRAL HUB', rect: [22, 4, 29, 7] }},
  {{ name: 'EAST SIPHON', ward: 'EAST SECTOR', rect: [31, 3, 38, 7] }},
  {{ name: 'NORTH DRAINAGE CANAL', ward: 'AQUEDUCTS', rect: [2, 2, 38, 2] }},
  {{ name: 'CENTRAL SLUICE HUB', ward: 'CENTRAL HUB', rect: [14, 10, 26, 16] }},
  {{ name: 'WEST CONDUIT MAZE', ward: 'WEST CONDUIT', rect: [2, 10, 11, 16] }},
  {{ name: 'EAST CONDUIT MAZE', ward: 'EAST SECTOR', rect: [29, 10, 38, 16] }},
  {{ name: 'INTERCEPTOR SPILLWAY', ward: 'SOUTH SECTOR', rect: [2, 20, 38, 20] }},
  {{ name: 'SEDIMENT TANK 1', ward: 'SOUTH SECTOR', rect: [3, 21, 11, 25] }},
  {{ name: 'PUMP SUMP 2', ward: 'SOUTH SECTOR', rect: [13, 21, 27, 25] }},
  {{ name: 'DRAINAGE VAULT 3', ward: 'SOUTH SECTOR', rect: [29, 21, 37, 25] }},
];

export const THEME = {{
  background: 0x030a06,
  ambientColor: 0x1f3426,
  ambientIntensity: 0.8,
  hemiSky: 0x182c1e,
  hemiGround: 0x08140c,
  fogColor: 0x051009,
  fogDensity: 0.034,
  fixtureColor: 0x76e2a2,
  fixtureEmissive: 0x62c98d,
  fixtureDistance: 14,
  fixtureIntensity: 6.5,
  wallHeight: 2.5,
}};

export const ENEMY_SPAWN = {repr(sewer_enemy)};
"""

# Write to src/game/maps/map-archive.js
archive_content = f"""/* ==========================================================================
   THE LAST EXIT — Map 3: SUBLEVEL 1 (Research Archive)
   Tailored for THE ARCHIVIST:
   - Dense switchback book stack aisles with blind corners
   - Grand Catalog Rotunda with towering pillars and 5.0m soaring ceiling
   - Restricted manuscript vaults & private study carrels
   ========================================================================== */

export const ID = 'archive';
export const NAME = 'SUBLEVEL 1';
export const SUBTITLE = 'RESEARCH ARCHIVE';
export const MONSTER_ID = 'archivist';
export const MONSTER_NAME = 'THE ARCHIVIST';
export const TAGLINE = 'The upper archive was locked in 1972. The report says it was empty. It was not.';
export const WALL_HEIGHT = 5.0;

export const MAP_ROWS = {repr(archive_grid)};

export const MAINTENANCE_SPOTS = {repr(archive_spots)};

export const AREAS = [
  {{ name: 'ARCHIVAL VESTIBULE', ward: 'WEST WING', rect: [2, 3, 9, 7] }},
  {{ name: 'CATALOG DESK', ward: 'CENTRAL ATRIUM', rect: [11, 4, 18, 7] }},
  {{ name: 'MICROFICHE REPOSITORY', ward: 'CENTRAL ATRIUM', rect: [22, 4, 29, 7] }},
  {{ name: 'SPECIAL COLLECTIONS', ward: 'EAST WING', rect: [31, 3, 38, 7] }},
  {{ name: 'NORTH GALLERY CORRIDOR', ward: 'UPPER GALLERIES', rect: [2, 2, 38, 2] }},
  {{ name: 'CATALOG ROTUNDA', ward: 'CENTRAL ATRIUM', rect: [14, 10, 26, 16] }},
  {{ name: 'WEST STACK LABYRINTH', ward: 'WEST WING', rect: [2, 10, 11, 16] }},
  {{ name: 'EAST STACK LABYRINTH', ward: 'EAST WING', rect: [29, 10, 38, 16] }},
  {{ name: 'GALLERY PROMENADE', ward: 'SOUTH VAULTS', rect: [2, 20, 38, 20] }},
  {{ name: 'RARE MANUSCRIPTS 1', ward: 'SOUTH VAULTS', rect: [3, 21, 11, 25] }},
  {{ name: 'INCUNABULA VAULT 2', ward: 'SOUTH VAULTS', rect: [13, 21, 27, 25] }},
  {{ name: 'RESTORATION LAB 3', ward: 'SOUTH VAULTS', rect: [29, 21, 37, 25] }},
];

export const THEME = {{
  background: 0x0c0805,
  ambientColor: 0x3d281a,
  ambientIntensity: 0.85,
  hemiSky: 0x2e1e12,
  hemiGround: 0x120a06,
  fogColor: 0x100b07,
  fogDensity: 0.022,
  fixtureColor: 0xffc477,
  fixtureEmissive: 0xefa248,
  fixtureDistance: 22,
  fixtureIntensity: 8.5,
  wallHeight: 5.0,
}};

export const ENEMY_SPAWN = {repr(archive_enemy)};
"""

with open(os.path.join(MAPS_DIR, "map-sewers.js"), "w", encoding="utf-8") as f:
    f.write(sewer_content)

with open(os.path.join(MAPS_DIR, "map-archive.js"), "w", encoding="utf-8") as f:
    f.write(archive_content)

print("Successfully generated and wrote hard labyrinth maps!")
