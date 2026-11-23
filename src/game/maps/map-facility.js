/* ==========================================================================
   THE LAST EXIT — Map 1: SUBLEVEL 4 (Medical Facility)
   The original facility map: 41x27 grid with ring corridor, laboratory,
   theatre, generator room, east wing ward, and south utility corridors.
   ========================================================================== */

export const ID = 'facility';
export const NAME = 'SUBLEVEL 4';
export const SUBTITLE = 'MEDICAL FACILITY';
export const MONSTER_ID = 'warden';
export const MONSTER_NAME = 'THE WARDEN';
export const TAGLINE = 'You woke up strapped to a gurney seven storeys underground.';

export const MAP_ROWS = [
  '#'.repeat(41),
  '#'.repeat(41),
  '##' + '.'.repeat(35) + '####',
  '##..#############..##' + '#######D############',
  '##..##EE#########..##' + '#' + '.'.repeat(13) + '######',
  '##..#.....##.L..#..##' + '#.K..K...K..K.######',
  '##..D.L.........D..##' + '#...L.T...L...######',
  '##..#...........#..##' + '#' + '.'.repeat(13) + '######',
  '##.L#.....##....#L.##' + '#......L......######',
  '##..###..########..##' + '#.K..K...K..K.######',
  '##..###..########..##' + '#.......T.....######',
  '##..#.....##....#..##' + '#######D############',
  '##..#B..X.##.S..#..##' + '#######.############',
  '##..D...X.##..L.D..##' + '#######.############',
  '##..#.X...##X...#....' + '.'.repeat(17) + '###',
  '##..#.....##....#..##' + '##D###D####D####D###',
  '##..##D######D###..##' + '#...#...#.....#...##',
  '##..##.######.###..##' + '#.K.#...#.T...#...##',
  '##.................##' + '#...#...#.....#...##',
  '####.' + '#'.repeat(11) + '.####' + '#'.repeat(20),
  '##' + '.'.repeat(19) + '.'.repeat(12) + '#'.repeat(8),
  '####D#########D###########D##############',
  '##.B.X.#####.X..B#######B..X.############',
  '##.....#####..X..#######.....############',
  '##.....#####.....#######..B..############',
  '#'.repeat(41),
  '#'.repeat(41),
];

export const MAINTENANCE_SPOTS = [
  { col: 2, row: 2, style: 'floor' },
  { col: 10, row: 2, style: 'shelf' },
  { col: 18, row: 2, style: 'floor' },
  { col: 2, row: 8, style: 'cabinet' },
  { col: 18, row: 11, style: 'cabinet' },
  { col: 17, row: 15, style: 'desk' },
  { col: 14, row: 5, style: 'shelf' },
  { col: 12, row: 7, style: 'desk' },
  { col: 15, row: 8, style: 'cabinet' },
  { col: 6, row: 11, style: 'cabinet' },
  { col: 9, row: 14, style: 'floor' },
  { col: 7, row: 15, style: 'shelf' },
  { col: 13, row: 17, style: 'floor' },
  { col: 2, row: 18, style: 'floor' },
  { col: 18, row: 18, style: 'desk' },
  { col: 24, row: 7, style: 'floor' },
  { col: 33, row: 16, style: 'shelf' },
  { col: 38, row: 17, style: 'cabinet' },
  { col: 22, row: 16, style: 'floor' },
  { col: 3, row: 23, style: 'floor' },
  { col: 25, row: 24, style: 'shelf' },
];

export const AREAS = [
  { name: 'GENERATOR ROOM', ward: 'WEST BLOCK', rect: [5, 5, 9, 8] },
  { name: 'LABORATORY', ward: 'WEST BLOCK', rect: [12, 5, 15, 8] },
  { name: 'THEATRE', ward: 'WEST BLOCK', rect: [5, 11, 9, 15] },
  { name: 'WARD 9', ward: 'WEST BLOCK', rect: [12, 11, 15, 15] },
  { name: 'WEST CORRIDOR', ward: 'WEST BLOCK', rect: [2, 3, 18, 19] },
  { name: 'EAST CORRIDOR', ward: 'WEST BLOCK', rect: [17, 3, 18, 18] },
  { name: 'NORTH CORRIDOR', ward: 'WEST BLOCK', rect: [2, 2, 20, 2] },
  { name: 'NORTH CORRIDOR', ward: 'EAST WING', rect: [21, 2, 36, 2] },
  { name: 'MULTI-BED WARD', ward: 'EAST WING', rect: [22, 4, 34, 6] },
  { name: 'HALL', ward: 'EAST WING', rect: [22, 7, 34, 8] },
  { name: 'PATIENT ROOMS', ward: 'EAST WING', rect: [22, 9, 34, 10] },
  { name: 'PATIENT ROOMS', ward: 'EAST WING', rect: [22, 16, 28, 18] },
  { name: "NURSES' STATION", ward: 'EAST WING', rect: [30, 16, 34, 18] },
  { name: 'MEDICAL STORAGE', ward: 'EAST WING', rect: [36, 16, 38, 18] },
  { name: 'SERVICE CORRIDOR', ward: 'SOUTH SECTION', rect: [2, 20, 32, 20] },
  { name: 'UTILITY ROOM', ward: 'SOUTH SECTION', rect: [2, 22, 6, 24] },
  { name: 'UTILITY ROOM', ward: 'SOUTH SECTION', rect: [12, 22, 16, 24] },
  { name: 'UTILITY ROOM', ward: 'SOUTH SECTION', rect: [24, 22, 28, 24] },
];

export const THEME = {
  background: 0x06090e,
  fogColor: 0x091018,
  ambientColor: 0x384a5c,
  ambientIntensity: 0.75,
  hemiSky: 0x283848,
  hemiGround: 0x10161e,
  hemiIntensity: 0.65,
  wallHeight: 3.2,
  torchColor: 0xffffff,
};

export const ENEMY_SPAWN = { col: 7, row: 7 };
