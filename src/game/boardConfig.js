// Board tile configuration
// 36 tiles in a loop: alternating property, chance, question, tax, special

export const TILE_TYPES = {
  PROPERTY: 'property',
  CHANCE: 'chance',
  QUESTION: 'question',
  TAX: 'tax',
  GO: 'go',
  JAIL: 'jail',
  FREE_PARKING: 'free_parking',
  GO_TO_JAIL: 'go_to_jail',
};

// Load custom tiles from editor if available
function loadCustomTiles() {
  try {
    const saved = localStorage.getItem('monopoly3d_editor_tiles');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Color groups for properties
export const COLOR_GROUPS = {
  brown: '#8B4513',
  lightBlue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  darkBlue: '#00008B',
};

const createProperty = (id, nameKey, price, rent, color, group) => ({
  id, nameKey, type: TILE_TYPES.PROPERTY, price, rent, color, group,
  owner: null, houses: 0, mortgaged: false,
});

const createQuestion = (id, nameKey) => ({
  id, nameKey, type: TILE_TYPES.QUESTION,
});

const createChance = (id, nameKey) => ({
  id, nameKey, type: TILE_TYPES.CHANCE,
});

const createTax = (id, nameKey, amount) => ({
  id, nameKey, type: TILE_TYPES.TAX, amount,
});

const createSpecial = (id, nameKey, subtype) => ({
  id, nameKey, type: TILE_TYPES[subtype] || subtype, subtype,
});

export const BOARD_CONFIG = (() => {
  const custom = loadCustomTiles();
  if (custom) return custom;
  return [
    // Side 1 (top, rightward): 9 tiles
    createSpecial(0, 'tile_0_name', 'GO'),
    createProperty(1, 'tile_1_name', 60, [2, 10, 30, 90, 160, 250], '#DC143C', 'red'),
    createChance(2, 'tile_2_name'),
    createProperty(3, 'tile_3_name', 60, [2, 10, 30, 90, 160, 250], '#DC143C', 'red'),
    createProperty(4, 'tile_4_name', 100, [4, 20, 60, 180, 320, 450], '#87CEEB', 'lightBlue'),
    createTax(5, 'tile_5_name', 100),
    createProperty(6, 'tile_6_name', 100, [4, 20, 60, 180, 320, 450], '#87CEEB', 'lightBlue'),
    createQuestion(7, 'tile_7_name'),
    createProperty(8, 'tile_8_name', 120, [6, 30, 90, 270, 400, 550], '#FF69B4', 'pink'),

    // Side 2 (right, downward): 9 tiles
    createProperty(9, 'tile_9_name', 120, [6, 30, 90, 270, 400, 550], '#FF69B4', 'pink'),
    createSpecial(10, 'tile_10_name', 'FREE_PARKING'),
    createProperty(11, 'tile_11_name', 140, [8, 40, 100, 300, 450, 600], '#FF8C00', 'orange'),
    createChance(12, 'tile_12_name'),
    createProperty(13, 'tile_13_name', 140, [8, 40, 100, 300, 450, 600], '#FF8C00', 'orange'),
    createProperty(14, 'tile_14_name', 180, [12, 60, 140, 400, 550, 700], '#FFD700', 'yellow'),
    createTax(15, 'tile_15_name', 150),
    createProperty(16, 'tile_16_name', 180, [12, 60, 140, 400, 550, 700], '#FFD700', 'yellow'),
    createQuestion(17, 'tile_17_name'),

    // Side 3 (bottom, leftward): 9 tiles
    createProperty(18, 'tile_18_name', 200, [14, 70, 160, 420, 580, 720], '#FFD700', 'yellow'),
    createProperty(19, 'tile_19_name', 200, [14, 70, 160, 420, 580, 720], '#228B22', 'green'),
    createSpecial(20, 'tile_20_name', 'JAIL'),
    createProperty(21, 'tile_21_name', 220, [16, 80, 200, 500, 650, 800], '#228B22', 'green'),
    createChance(22, 'tile_22_name'),
    createProperty(23, 'tile_23_name', 220, [16, 80, 200, 500, 650, 800], '#228B22', 'green'),
    createProperty(24, 'tile_24_name', 240, [18, 90, 220, 560, 700, 850], '#00008B', 'darkBlue'),
    createQuestion(25, 'tile_25_name'),
    createProperty(26, 'tile_26_name', 260, [20, 100, 300, 650, 800, 950], '#00008B', 'darkBlue'),

    // Side 4 (left, upward): 9 tiles
    createSpecial(27, 'tile_27_name', 'GO_TO_JAIL'),
    createProperty(28, 'tile_28_name', 300, [26, 130, 390, 780, 975, 1150], '#9932CC', 'purple'),
    createChance(29, 'tile_29_name'),
    createProperty(30, 'tile_30_name', 300, [26, 130, 390, 780, 975, 1150], '#9932CC', 'purple'),
    createTax(31, 'tile_31_name', 200),
    createProperty(32, 'tile_32_name', 320, [28, 150, 450, 900, 1100, 1300], '#20B2AA', 'teal'),
    createProperty(33, 'tile_33_name', 350, [35, 175, 500, 1000, 1200, 1400], '#FF4500', 'orange-red'),
    createQuestion(34, 'tile_34_name'),
    createProperty(35, 'tile_35_name', 400, [50, 200, 600, 1100, 1300, 1500], '#FFD700', 'gold'),
  ];
})();

export const BOARD_SIZE = BOARD_CONFIG.length;

// Question tile IDs
// Question tile IDs - corrected: tile 29 is CHANCE, not QUESTION
export const QUESTION_TILE_IDS = [7, 17, 25, 34];

export const STARTING_MONEY = 1500;
export const PASSING_GO_BONUS = 200;
export const HOUSE_COST = 50;
export const HOTEL_COST = 50;
export const MORTGAGE_RATE = 0.5;
export const MAX_HOUSES = 4;
export const MAX_ROUNDS = 20;
