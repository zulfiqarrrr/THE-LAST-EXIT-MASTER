/* ==========================================================================
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

export const MAP_ROWS = ['#########################################', '#########################################', '##..........L.......#.......L..........##', '##.########.#######.#.#######.########.##', '##.#..EE..#.#.....#.#.#.....#.#......#.##', '##.#.L....#.#.L.#.D...D.#.L.#.#..B...#.##', '##.D...S..D.#...#.#####.#...#.D......D.##', '##.########.#####.#####.#####.########.##', '##....#.....#.......#.......#.....#....##', '#####.#.#####.###.D.#.D.###.#####.#.#####', '##....#.#...#.#...#...#...#.#...#.#....##', '##.####.#.L.#.#.B.#.L.#.B.#.#.L.#.####.##', '##.#....D...#.D...#...#...D.#...D....#.##', '##.#.########.......D.......########.#.##', '##.#....D...#.D...#...#...D.#...D....#.##', '##.####.#.L.#.#...#...#...#.#.L.#.####.##', '##....#.#...#.#.X.#.L.#.X.#.#...#.#....##', '#####.#.#####.###.D.#.D.###.#####.#.#####', '##....#.....#.......#.......#.....#....##', '##.########.#####.D.#.D.#####.########.##', '##........L...D...#...#...D...L........##', '###.#########.###.#...#.###.#########.###', '###.#.......#...#.#.B.#.#...#.......#.###', '###.#.B...X.D.L.#...D...#.L.D.X...B.#.###', '###.#.......#...#.......#...#.......#.###', '###.#########.#############.#########.###', '#########################################'];

export const MAINTENANCE_SPOTS = [{'col': 2, 'row': 2, 'style': 'floor'}, {'col': 24, 'row': 2, 'style': 'shelf'}, {'col': 2, 'row': 4, 'style': 'cabinet'}, {'col': 33, 'row': 4, 'style': 'desk'}, {'col': 25, 'row': 5, 'style': 'floor'}, {'col': 23, 'row': 6, 'style': 'shelf'}, {'col': 5, 'row': 8, 'style': 'cabinet'}, {'col': 30, 'row': 8, 'style': 'desk'}, {'col': 5, 'row': 10, 'style': 'floor'}, {'col': 36, 'row': 10, 'style': 'shelf'}, {'col': 38, 'row': 11, 'style': 'cabinet'}, {'col': 30, 'row': 12, 'style': 'desk'}, {'col': 26, 'row': 13, 'style': 'floor'}, {'col': 25, 'row': 14, 'style': 'shelf'}, {'col': 21, 'row': 15, 'style': 'cabinet'}, {'col': 19, 'row': 16, 'style': 'desk'}, {'col': 27, 'row': 17, 'style': 'floor'}, {'col': 23, 'row': 18, 'style': 'shelf'}, {'col': 38, 'row': 19, 'style': 'cabinet'}, {'col': 25, 'row': 20, 'style': 'desk'}, {'col': 37, 'row': 21, 'style': 'floor'}, {'col': 31, 'row': 22, 'style': 'shelf'}, {'col': 25, 'row': 23, 'style': 'cabinet'}, {'col': 18, 'row': 24, 'style': 'desk'}];

export const AREAS = [
  { name: 'PUMP CISTERN ALPHA', ward: 'WEST CONDUIT', rect: [2, 3, 9, 7] },
  { name: 'SLUICE CONTROL', ward: 'CENTRAL HUB', rect: [11, 4, 18, 7] },
  { name: 'INFLOW INTERCHANGE', ward: 'CENTRAL HUB', rect: [22, 4, 29, 7] },
  { name: 'EAST SIPHON', ward: 'EAST SECTOR', rect: [31, 3, 38, 7] },
  { name: 'NORTH DRAINAGE CANAL', ward: 'AQUEDUCTS', rect: [2, 2, 38, 2] },
  { name: 'CENTRAL SLUICE HUB', ward: 'CENTRAL HUB', rect: [14, 10, 26, 16] },
  { name: 'WEST CONDUIT MAZE', ward: 'WEST CONDUIT', rect: [2, 10, 11, 16] },
  { name: 'EAST CONDUIT MAZE', ward: 'EAST SECTOR', rect: [29, 10, 38, 16] },
  { name: 'INTERCEPTOR SPILLWAY', ward: 'SOUTH SECTOR', rect: [2, 20, 38, 20] },
  { name: 'SEDIMENT TANK 1', ward: 'SOUTH SECTOR', rect: [3, 21, 11, 25] },
  { name: 'PUMP SUMP 2', ward: 'SOUTH SECTOR', rect: [13, 21, 27, 25] },
  { name: 'DRAINAGE VAULT 3', ward: 'SOUTH SECTOR', rect: [29, 21, 37, 25] },
];

export const THEME = {
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
};

export const ENEMY_SPAWN = {'col': 20, 'row': 13};
