/* ==========================================================================
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

export const MAP_ROWS = ['#########################################', '#########################################', '##..........L.......#.......L..........##', '##.########.#######.#.#######.########.##', '##.#..EE..#.#.....#.#.#.....#.#......#.##', '##.#.L....#.#.L.#.D...D.#.L.#.#..B...#.##', '##.D...S..D.#...#.#####.#...#.D......D.##', '##.########.#####.#####.#####.########.##', '##....#.....#.......#.......#.....#....##', '#####.#.#####.###.D.#.D.###.#####.#.#####', '##....#.#.X.#...#...#...#...#.X.#.#....##', '##.####.#...#.L.#.B.#.L.#...#...#.####.##', '##.#....D.X.#.###...#...###.#.X.D....#.##', '##.#.########...D...#...D...########.#.##', '##.#....D.X.#.###...#...###.#.X.D....#.##', '##.####.#...#.L.#...#...#.L.#...#.####.##', '##....#.#.X.#...#...#...#...#.X.#.#....##', '#####.#.#####.###.D.#.D.###.#####.#.#####', '##....#.....#.......#.......#.....#....##', '##.########.#####.D.#.D.#####.########.##', '##........L...D...#...#...D...L........##', '###.#########.###.#...#.###.#########.###', '###.#.......#...#.#.T.#.#...#.......#.###', '###.#.B...T.D.L.#...D...#.L.D.T...B.#.###', '###.#.......#...#.......#...#.......#.###', '###.#########.#############.#########.###', '#########################################'];

export const MAINTENANCE_SPOTS = [{'col': 2, 'row': 2, 'style': 'floor'}, {'col': 23, 'row': 2, 'style': 'shelf'}, {'col': 29, 'row': 3, 'style': 'cabinet'}, {'col': 29, 'row': 4, 'style': 'desk'}, {'col': 19, 'row': 5, 'style': 'floor'}, {'col': 11, 'row': 6, 'style': 'shelf'}, {'col': 23, 'row': 7, 'style': 'cabinet'}, {'col': 22, 'row': 8, 'style': 'desk'}, {'col': 21, 'row': 9, 'style': 'floor'}, {'col': 23, 'row': 10, 'style': 'shelf'}, {'col': 19, 'row': 11, 'style': 'cabinet'}, {'col': 17, 'row': 12, 'style': 'desk'}, {'col': 18, 'row': 13, 'style': 'floor'}, {'col': 19, 'row': 14, 'style': 'shelf'}, {'col': 17, 'row': 15, 'style': 'cabinet'}, {'col': 11, 'row': 16, 'style': 'desk'}, {'col': 5, 'row': 17, 'style': 'floor'}, {'col': 14, 'row': 18, 'style': 'shelf'}, {'col': 37, 'row': 18, 'style': 'cabinet'}, {'col': 12, 'row': 20, 'style': 'desk'}, {'col': 36, 'row': 20, 'style': 'floor'}, {'col': 13, 'row': 22, 'style': 'shelf'}, {'col': 7, 'row': 23, 'style': 'cabinet'}, {'col': 35, 'row': 23, 'style': 'desk'}];

export const AREAS = [
  { name: 'ARCHIVAL VESTIBULE', ward: 'WEST WING', rect: [2, 3, 9, 7] },
  { name: 'CATALOG DESK', ward: 'CENTRAL ATRIUM', rect: [11, 4, 18, 7] },
  { name: 'MICROFICHE REPOSITORY', ward: 'CENTRAL ATRIUM', rect: [22, 4, 29, 7] },
  { name: 'SPECIAL COLLECTIONS', ward: 'EAST WING', rect: [31, 3, 38, 7] },
  { name: 'NORTH GALLERY CORRIDOR', ward: 'UPPER GALLERIES', rect: [2, 2, 38, 2] },
  { name: 'CATALOG ROTUNDA', ward: 'CENTRAL ATRIUM', rect: [14, 10, 26, 16] },
  { name: 'WEST STACK LABYRINTH', ward: 'WEST WING', rect: [2, 10, 11, 16] },
  { name: 'EAST STACK LABYRINTH', ward: 'EAST WING', rect: [29, 10, 38, 16] },
  { name: 'GALLERY PROMENADE', ward: 'SOUTH VAULTS', rect: [2, 20, 38, 20] },
  { name: 'RARE MANUSCRIPTS 1', ward: 'SOUTH VAULTS', rect: [3, 21, 11, 25] },
  { name: 'INCUNABULA VAULT 2', ward: 'SOUTH VAULTS', rect: [13, 21, 27, 25] },
  { name: 'RESTORATION LAB 3', ward: 'SOUTH VAULTS', rect: [29, 21, 37, 25] },
];

export const THEME = {
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
};

export const ENEMY_SPAWN = {'col': 18, 'row': 13};
