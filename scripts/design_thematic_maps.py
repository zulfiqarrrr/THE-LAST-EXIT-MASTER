"""
design_thematic_maps.py — Generates and validates creature-tailored 41x27 maps:
1. Sublevel 7 (Sewers) for The Crawler: Winding aqueducts, pump cisterns, sluice gates.
2. Sublevel 1 (Archive) for The Archivist: Grand vaulted reading atrium, towering book stacks.
"""

import os

BASE_DIR = r"c:\Users\ASUS HN116WS\OneDrive\Desktop\game"
MAPS_DIR = os.path.join(BASE_DIR, "src", "game", "maps")

def validate_map_grid(name, rows, maintenance_spots):
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

    # Solid definition
    solid_chars = set(['#', 'X', 'B', 'E', 'K', 'T'])
    def is_solid(c, r):
        if c < 0 or c >= 41 or r < 0 or r >= 27:
            return True
        return rows[r][c] in solid_chars

    # Flood fill reachability
    queue = [(s_col, s_row)]
    visited = set([(s_col, s_row)])
    while queue:
        c, r = queue.pop(0)
        for dc, dr in [(1,0), (-1,0), (0,1), (0,-1)]:
            nc, nr = c + dc, r + dr
            if not is_solid(nc, nr) and (nc, nr) not in visited:
                visited.add((nc, nr))
                queue.append((nc, nr))

    # All walkable floor cells must be reached
    unreachable_floors = []
    for r in range(27):
        for c in range(41):
            if not is_solid(c, r) and (c, r) not in visited:
                unreachable_floors.append((c, r))
    assert len(unreachable_floors) == 0, f"{name}: Unreachable floor cells: {unreachable_floors}"

    # Blast door approach check: cells at (6,5) or (7,5) or (5,4) or (8,4) must be visited
    exit_approaches = [(6, 5), (7, 5), (5, 4), (8, 4), (6, 3), (7, 3)]
    reachable_approaches = [pt for pt in exit_approaches if pt in visited]
    assert len(reachable_approaches) > 0, f"{name}: Exit blast door approach must be walkable from spawn!"

    # Maintenance spots check
    assert len(maintenance_spots) >= 21, f"{name}: Expected at least 21 maintenance spots, got {len(maintenance_spots)}"
    for idx, spot in enumerate(maintenance_spots):
        c, r = spot['col'], spot['row']
        assert not is_solid(c, r), f"{name}: Spot {idx} at ({c},{r}) is on solid wall/prop!"
        assert (c, r) in visited, f"{name}: Spot {idx} at ({c},{r}) is unreachable from spawn!"

    print(f"✓ {name} VALIDATION PASSED: 41x27, all {len(visited)} walkable cells connected, {len(maintenance_spots)} valid spots!")

def generate_sewers():
    # 41 x 27 Sublevel 7 (Drainage Network)
    # Winding aqueduct tunnels, large circular cisterns, pump basins, sluice gates.
    # Exit 'EE' at (6,4) and (7,4). Spawn 'S' at (9,6).
    grid = [list('#' * 41) for _ in range(27)]

    # Draw North Drainage Canal (Row 2, cols 2-38)
    for c in range(2, 39):
        grid[2][c] = '.'
    grid[2][16] = 'L'
    grid[2][28] = 'L'

    # West Sluice & Exit Bay (Rows 3-6, cols 2-8)
    for r in range(3, 7):
        for c in range(2, 9):
            grid[r][c] = '.'
    # Blast door at (6,4) and (7,4)
    grid[4][6] = 'E'
    grid[4][7] = 'E'
    grid[5][5] = 'L'
    grid[6][2] = 'D' # Sluice gate into west aqueduct

    # West Winding Conduit (Rows 7-19, cols 2-4)
    for r in range(7, 20):
        grid[r][2] = '.'
        grid[r][3] = '.'
    grid[8][2] = 'L'
    grid[14][2] = 'L'

    # Central Inflow Basin & Sluice (Rows 5-8, cols 8-16)
    for r in range(5, 9):
        for c in range(8, 17):
            grid[r][c] = '.'
    grid[6][9] = 'S' # Player Spawn
    grid[6][13] = 'L'
    grid[5][11] = 'D'

    # Serpentine Canal Eastbound (Rows 7-9, cols 16-24)
    for r in range(7, 10):
        for c in range(16, 25):
            grid[r][c] = '.'
    grid[8][20] = 'L'
    grid[8][24] = 'D'

    # Grand Octagonal Cistern & Pump Vats (Rows 4-12, cols 25-38)
    for r in range(4, 13):
        for c in range(25, 39):
            grid[r][c] = '.'
    grid[6][31] = 'L'
    grid[10][31] = 'L'
    # Sludge Vats ('B') and Pumps ('T') in the cistern
    grid[5][27] = 'B'
    grid[5][35] = 'B'
    grid[11][27] = 'B'
    grid[11][35] = 'B'
    grid[8][31] = 'T'
    grid[8][26] = 'T'
    grid[8][36] = 'T'

    # Sluice Gate South from Cistern
    grid[12][31] = 'D'

    # Southern Overflow Canal (Rows 13-19, cols 29-33)
    for r in range(13, 20):
        for c in range(29, 34):
            grid[r][c] = '.'
    grid[16][31] = 'L'

    # Central Pump Station & Pipe Mazes (Rows 11-19, cols 8-26)
    for r in range(11, 20):
        for c in range(8, 27):
            grid[r][c] = '.'
    grid[13][12] = 'L'
    grid[13][22] = 'L'
    grid[17][17] = 'L'
    # Heavy valve lockers ('X') and secondary pumps ('B')
    grid[13][10] = 'X'
    grid[13][18] = 'X'
    grid[17][10] = 'B'
    grid[17][24] = 'B'
    grid[15][14] = 'T'
    grid[15][20] = 'T'

    # Connect central station to west conduit
    for c in range(4, 9):
        grid[14][c] = '.'
    grid[14][6] = 'D'

    # Connect central station to southern overflow canal
    for c in range(26, 30):
        grid[16][c] = '.'
    grid[16][28] = 'D'

    # Bottom Treatment Interceptor Canal (Row 20, cols 2-38)
    for c in range(2, 39):
        grid[20][c] = '.'
    grid[20][10] = 'L'
    grid[20][24] = 'L'

    # South Pump Chambers (Rows 21-25, cols 2-38)
    for r in range(21, 26):
        # Chamber 1 (cols 3-9)
        for c in range(3, 10):
            grid[r][c] = '.'
        # Chamber 2 (cols 14-22)
        for c in range(14, 23):
            grid[r][c] = '.'
        # Chamber 3 (cols 27-37)
        for c in range(27, 38):
            grid[r][c] = '.'
    
    # Doors into south chambers
    grid[21][6] = 'D'
    grid[21][18] = 'D'
    grid[21][32] = 'D'

    # South chamber props
    grid[23][6] = 'B'
    grid[23][18] = 'T'
    grid[23][32] = 'B'
    grid[24][8] = 'X'
    grid[24][20] = 'X'
    grid[24][34] = 'X'

    # Convert to string rows
    str_rows = ["".join(r) for r in grid]

    # 21 Thematic Sewer Maintenance Spots (floor, shelf, desk, cabinet)
    spots = [
        {'col': 2, 'row': 2, 'style': 'floor'},
        {'col': 12, 'row': 2, 'style': 'floor'},
        {'col': 24, 'row': 2, 'style': 'floor'},
        {'col': 36, 'row': 2, 'style': 'shelf'},
        {'col': 3, 'row': 5, 'style': 'floor'},
        {'col': 8, 'row': 5, 'style': 'desk'},
        {'col': 16, 'row': 6, 'style': 'floor'},
        {'col': 2, 'row': 10, 'style': 'shelf'},
        {'col': 2, 'row': 18, 'style': 'floor'},
        {'col': 28, 'row': 6, 'style': 'floor'},
        {'col': 34, 'row': 6, 'style': 'shelf'},
        {'col': 29, 'row': 10, 'style': 'cabinet'},
        {'col': 37, 'row': 10, 'style': 'floor'},
        {'col': 31, 'row': 14, 'style': 'floor'},
        {'col': 31, 'row': 18, 'style': 'shelf'},
        {'col': 12, 'row': 12, 'style': 'desk'},
        {'col': 22, 'row': 12, 'style': 'cabinet'},
        {'col': 17, 'row': 18, 'style': 'floor'},
        {'col': 4, 'row': 23, 'style': 'floor'},
        {'col': 16, 'row': 23, 'style': 'shelf'},
        {'col': 29, 'row': 23, 'style': 'cabinet'},
        {'col': 36, 'row': 24, 'style': 'floor'}
    ]

    validate_map_grid("SUBLEVEL 7 (Sewers)", str_rows, spots)
    return str_rows, spots

def generate_archive():
    # 41 x 27 Sublevel 1 (Research Archive)
    # Grand open high-vaulted reading atrium, tall bookcase stack alleys, catalog vaults.
    # Exit 'EE' at (6,4) and (7,4). Spawn 'S' at (9,6).
    grid = [list('#' * 41) for _ in range(27)]

    # North Vault Corridor (Row 2, cols 2-38)
    for c in range(2, 39):
        grid[2][c] = '.'
    grid[2][14] = 'L'
    grid[2][28] = 'L'

    # West Archival Entrance & Exit Bay (Rows 3-6, cols 2-8)
    for r in range(3, 7):
        for c in range(2, 9):
            grid[r][c] = '.'
    grid[4][6] = 'E'
    grid[4][7] = 'E'
    grid[5][5] = 'L'
    grid[6][4] = 'D'

    # West Preservation Corridor (Rows 7-19, cols 2-4)
    for r in range(7, 20):
        grid[r][2] = '.'
        grid[r][3] = '.'
    grid[10][2] = 'L'
    grid[16][2] = 'L'

    # Vestibule & Spawn (Rows 5-8, cols 8-15)
    for r in range(5, 9):
        for c in range(8, 16):
            grid[r][c] = '.'
    grid[6][9] = 'S' # Player Spawn
    grid[6][12] = 'L'
    grid[6][15] = 'D' # Grand double doors into Great Atrium

    # =========================================================================
    # GRAND CENTRAL READING ATRIUM (Rows 4-15, cols 16-38)
    # A massive, high-vaulted (5.0m ceiling) open cathedral hall!
    # Perfect for The Archivist to spread its 5m wings and hover!
    # =========================================================================
    for r in range(4, 16):
        for c in range(16, 39):
            grid[r][c] = '.'
    grid[5][22] = 'L'
    grid[5][32] = 'L'
    grid[9][22] = 'L'
    grid[9][32] = 'L'
    grid[14][22] = 'L'
    grid[14][32] = 'L'

    # Grand Reading Tables ('B') & Card Catalog Consoles ('T')
    grid[6][20] = 'B'
    grid[6][26] = 'B'
    grid[6][34] = 'B'
    grid[10][20] = 'B'
    grid[10][26] = 'B'
    grid[10][34] = 'B'
    grid[8][23] = 'T'
    grid[8][30] = 'T'
    grid[12][23] = 'T'
    grid[12][30] = 'T'

    # South Stacks Labyrinth (Rows 11-19, cols 5-15)
    # Parallel towering bookcase rows ('X') for player stealth hiding!
    for r in range(10, 20):
        for c in range(5, 16):
            grid[r][c] = '.'
    grid[12][9] = 'L'
    grid[17][9] = 'L'
    # Tall Bookcase stacks ('X')
    grid[12][6] = 'X'
    grid[12][7] = 'X'
    grid[12][11] = 'X'
    grid[12][12] = 'X'
    grid[15][6] = 'X'
    grid[15][7] = 'X'
    grid[15][11] = 'X'
    grid[15][12] = 'X'
    grid[18][6] = 'X'
    grid[18][7] = 'X'
    grid[18][11] = 'X'
    grid[18][12] = 'X'

    # Connect West Corridor to Stacks Labyrinth
    for c in range(3, 6):
        grid[14][c] = '.'
    grid[14][4] = 'D'

    # Connect Stacks Labyrinth to Grand Atrium
    for c in range(15, 18):
        grid[12][c] = '.'
    grid[12][16] = 'D'

    # South Gallery Promenade (Row 20, cols 2-38)
    for c in range(2, 39):
        grid[20][c] = '.'
    grid[20][12] = 'L'
    grid[20][26] = 'L'
    # Door from Atrium into South Gallery
    grid[16][26] = '.'
    grid[17][26] = '.'
    grid[18][26] = '.'
    grid[19][26] = '.'
    grid[20][26] = '.'
    grid[18][26] = 'D'

    # South Archival Vault Rooms (Rows 21-25, cols 2-38)
    for r in range(21, 26):
        # Microfiche Vault (cols 3-10)
        for c in range(3, 11):
            grid[r][c] = '.'
        # Rare Manuscripts Vault (cols 14-23)
        for c in range(14, 24):
            grid[r][c] = '.'
        # Restoration Laboratory (cols 27-37)
        for c in range(27, 38):
            grid[r][c] = '.'

    grid[21][7] = 'D'
    grid[21][18] = 'D'
    grid[21][32] = 'D'

    grid[23][7] = 'B'
    grid[23][18] = 'B'
    grid[23][32] = 'T'
    grid[24][5] = 'X'
    grid[24][21] = 'X'
    grid[24][35] = 'X'

    str_rows = ["".join(r) for r in grid]

    # 21 Thematic Archival Maintenance Spots
    spots = [
        {'col': 2, 'row': 2, 'style': 'floor'},
        {'col': 14, 'row': 2, 'style': 'shelf'},
        {'col': 26, 'row': 2, 'style': 'floor'},
        {'col': 36, 'row': 2, 'style': 'shelf'},
        {'col': 3, 'row': 5, 'style': 'floor'},
        {'col': 10, 'row': 7, 'style': 'desk'},
        {'col': 14, 'row': 7, 'style': 'cabinet'},
        {'col': 2, 'row': 12, 'style': 'shelf'},
        {'col': 2, 'row': 18, 'style': 'floor'},
        {'col': 18, 'row': 6, 'style': 'floor'},
        {'col': 24, 'row': 6, 'style': 'desk'},
        {'col': 32, 'row': 6, 'style': 'shelf'},
        {'col': 37, 'row': 6, 'style': 'cabinet'},
        {'col': 18, 'row': 12, 'style': 'floor'},
        {'col': 28, 'row': 12, 'style': 'desk'},
        {'col': 36, 'row': 12, 'style': 'floor'},
        {'col': 9, 'row': 11, 'style': 'shelf'},
        {'col': 9, 'row': 16, 'style': 'shelf'},
        {'col': 5, 'row': 23, 'style': 'desk'},
        {'col': 19, 'row': 23, 'style': 'shelf'},
        {'col': 30, 'row': 23, 'style': 'cabinet'},
        {'col': 36, 'row': 24, 'style': 'floor'}
    ]

    validate_map_grid("SUBLEVEL 1 (Archive)", str_rows, spots)
    return str_rows, spots

def write_js_files():
    sewers_rows, sewers_spots = generate_sewers()
    archive_rows, archive_spots = generate_archive()

    sewers_content = f"""/* ==========================================================================
   THE LAST EXIT — Map 2: SUBLEVEL 7 (Drainage Network)
   Tailored for THE CRAWLER:
   - Winding aqueduct canals & claustrophobic pipe mazes
   - Grand circular pump cisterns with sludge vats
   - Low oppressive 2.5m ceiling height
   ========================================================================== */

export const ID = 'sewers';
export const NAME = 'SUBLEVEL 7';
export const SUBTITLE = 'DRAINAGE NETWORK';
export const MONSTER_ID = 'crawler';
export const MONSTER_NAME = 'THE CRAWLER';
export const TAGLINE = 'The drainage tunnels are sealed off on all maps. Someone opened them.';
export const WALL_HEIGHT = 2.5;

export const MAP_ROWS = {repr(sewers_rows)};

export const MAINTENANCE_SPOTS = {repr(sewers_spots)};

export const AREAS = [
  {{ name: 'PUMP CISTERN', ward: 'EAST CISTERN', rect: [25, 4, 38, 12] }},
  {{ name: 'SLUICE BASIN', ward: 'WEST SECTOR', rect: [2, 3, 8, 6] }},
  {{ name: 'WEST CONDUIT', ward: 'WEST SECTOR', rect: [2, 7, 4, 19] }},
  {{ name: 'INFLOW INTERCHANGE', ward: 'CENTRAL HUB', rect: [8, 5, 16, 8] }},
  {{ name: 'MAIN PUMP STATION', ward: 'CENTRAL HUB', rect: [8, 11, 26, 19] }},
  {{ name: 'NORTH DRAINAGE CANAL', ward: 'AQUEDUCTS', rect: [2, 2, 38, 2] }},
  {{ name: 'OVERFLOW CHANNEL', ward: 'EAST CISTERN', rect: [29, 13, 33, 19] }},
  {{ name: 'INTERCEPTOR CANAL', ward: 'SOUTH SECTOR', rect: [2, 20, 38, 20] }},
  {{ name: 'SEDIMENT TANK 1', ward: 'SOUTH SECTOR', rect: [3, 21, 9, 25] }},
  {{ name: 'PUMP CHAMBER 2', ward: 'SOUTH SECTOR', rect: [14, 21, 22, 25] }},
  {{ name: 'DRAINAGE VAULT 3', ward: 'SOUTH SECTOR', rect: [27, 21, 37, 25] }},
];

export const THEME = {{
  background: 0x030a06,
  ambientLight: 0x223828,
  hemiSky: 0x182c1e,
  hemiGround: 0x08140c,
  fog: 0x051009,
  fogDensity: 0.034,
}};
"""

    archive_content = f"""/* ==========================================================================
   THE LAST EXIT — Map 3: SUBLEVEL 1 (Research Archive)
   Tailored for THE ARCHIVIST:
   - Grand Central Reading Atrium with 5.0m soaring vaulted ceiling
   - Towering parallel bookcase labyrinths for player stealth cover
   - Rare manuscript vaults & catalog rotunda
   ========================================================================== */

export const ID = 'archive';
export const NAME = 'SUBLEVEL 1';
export const SUBTITLE = 'RESEARCH ARCHIVE';
export const MONSTER_ID = 'archivist';
export const MONSTER_NAME = 'THE ARCHIVIST';
export const TAGLINE = 'The upper archive was locked in 1972. The report says it was empty. It was not.';
export const WALL_HEIGHT = 5.0;

export const MAP_ROWS = {repr(archive_rows)};

export const MAINTENANCE_SPOTS = {repr(archive_spots)};

export const AREAS = [
  {{ name: 'GRAND READING ATRIUM', ward: 'CENTRAL ATRIUM', rect: [16, 4, 38, 15] }},
  {{ name: 'ARCHIVAL VESTIBULE', ward: 'WEST WING', rect: [8, 5, 15, 8] }},
  {{ name: 'EXHIBIT BAY', ward: 'WEST WING', rect: [2, 3, 8, 6] }},
  {{ name: 'PRESERVATION ALLEY', ward: 'WEST WING', rect: [2, 7, 4, 19] }},
  {{ name: 'TOWERING BOOK STACKS', ward: 'WEST WING', rect: [5, 10, 15, 19] }},
  {{ name: 'NORTH VAULT CORRIDOR', ward: 'UPPER GALLERIES', rect: [2, 2, 38, 2] }},
  {{ name: 'GALLERY PROMENADE', ward: 'SOUTH VAULTS', rect: [2, 20, 38, 20] }},
  {{ name: 'MICROFICHE VAULT', ward: 'SOUTH VAULTS', rect: [3, 21, 10, 25] }},
  {{ name: 'RARE MANUSCRIPTS', ward: 'SOUTH VAULTS', rect: [14, 21, 23, 25] }},
  {{ name: 'RESTORATION LAB', ward: 'SOUTH VAULTS', rect: [27, 21, 37, 25] }},
];

export const THEME = {{
  background: 0x0c0805,
  ambientLight: 0x3d281a,
  hemiSky: 0x2e1e12,
  hemiGround: 0x120a06,
  fog: 0x100b07,
  fogDensity: 0.022,
}};
"""

    with open(os.path.join(MAPS_DIR, "map-sewers.js"), "w", encoding="utf-8") as f:
        f.write(sewers_content)
    print("Wrote src/game/maps/map-sewers.js successfully!")

    with open(os.path.join(MAPS_DIR, "map-archive.js"), "w", encoding="utf-8") as f:
        f.write(archive_content)
    print("Wrote src/game/maps/map-archive.js successfully!")

if __name__ == '__main__':
    write_js_files()
