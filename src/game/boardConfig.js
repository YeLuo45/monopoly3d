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

const createProperty = (id, name, price, rent, color, group) => ({
  id, name, type: TILE_TYPES.PROPERTY, price, rent, color, group,
  owner: null, houses: 0, mortgaged: false,
});

const createQuestion = (id, name) => ({
  id, name, type: TILE_TYPES.QUESTION,
});

const createChance = (id, name) => ({
  id, name, type: TILE_TYPES.CHANCE,
});

const createTax = (id, name, amount) => ({
  id, name, type: TILE_TYPES.TAX, amount,
});

const createSpecial = (id, name, subtype) => ({
  id, name, type: TILE_TYPES[subtype] || subtype, subtype,
});

export const BOARD_CONFIG = (() => {
  const custom = loadCustomTiles();
  if (custom) return custom;
  return [
    // Side 1 (top, rightward): 9 tiles
    createSpecial(0, '起点 GO', 'GO'),
    createProperty(1, '红锦大厦', 60, [2, 10, 30, 90, 160, 250], '#DC143C', 'red'),
    createChance(2, '幸运星'),
    createProperty(3, '星光花园', 60, [2, 10, 30, 90, 160, 250], '#DC143C', 'red'),
    createProperty(4, '彩虹小学', 100, [4, 20, 60, 180, 320, 450], '#87CEEB', 'lightBlue'),
    createTax(5, '税务局', 100),
    createProperty(6, '智慧城堡', 100, [4, 20, 60, 180, 320, 450], '#87CEEB', 'lightBlue'),
    createQuestion(7, '知识广场'),
    createProperty(8, '知识宫殿', 120, [6, 30, 90, 270, 400, 550], '#FF69B4', 'pink'),

    // Side 2 (right, downward): 9 tiles
    createProperty(9, '创意工坊', 120, [6, 30, 90, 270, 400, 550], '#FF69B4', 'pink'),
    createSpecial(10, '休息站', 'FREE_PARKING'),
    createProperty(11, '未来之城', 140, [8, 40, 100, 300, 450, 600], '#FF8C00', 'orange'),
    createChance(12, '机会转盘'),
    createProperty(13, '科技乐园', 140, [8, 40, 100, 300, 450, 600], '#FF8C00', 'orange'),
    createProperty(14, '自然博物馆', 180, [12, 60, 140, 400, 550, 700], '#FFD700', 'yellow'),
    createTax(15, '保险费', 150),
    createProperty(16, '艺术中心', 180, [12, 60, 140, 400, 550, 700], '#FFD700', 'yellow'),
    createQuestion(17, '智慧之泉'),

    // Side 3 (bottom, leftward): 9 tiles
    createProperty(18, '体育公园', 200, [14, 70, 160, 420, 580, 720], '#FFD700', 'yellow'),
    createProperty(19, '欢乐小镇', 200, [14, 70, 160, 420, 580, 720], '#228B22', 'green'),
    createSpecial(20, '监狱', 'JAIL'),
    createProperty(21, '魔法森林', 220, [16, 80, 200, 500, 650, 800], '#228B22', 'green'),
    createChance(22, '命运之门'),
    createProperty(23, '奇幻乐园', 220, [16, 80, 200, 500, 650, 800], '#228B22', 'green'),
    createProperty(24, '海滨城市', 240, [18, 90, 220, 560, 700, 850], '#00008B', 'darkBlue'),
    createQuestion(25, '宝藏洞窟'),
    createProperty(26, '星际港', 260, [20, 100, 300, 650, 800, 950], '#00008B', 'darkBlue'),

    // Side 4 (left, upward): 9 tiles
    createSpecial(27, '前往监狱', 'GO_TO_JAIL'),
    createProperty(28, '梦境大厦', 300, [26, 130, 390, 780, 975, 1150], '#9932CC', 'purple'),
    createChance(29, '幸运抽奖'),
    createProperty(30, '太空站', 300, [26, 130, 390, 780, 975, 1150], '#9932CC', 'purple'),
    createTax(31, '学费', 200),
    createProperty(32, '水晶宫', 320, [28, 150, 450, 900, 1100, 1300], '#20B2AA', 'teal'),
    createProperty(33, '龙之谷', 350, [35, 175, 500, 1000, 1200, 1400], '#FF4500', 'orange-red'),
    createQuestion(34, '谜题之塔'),
    createProperty(35, '王者之城', 400, [50, 200, 600, 1100, 1300, 1500], '#FFD700', 'gold'),
  ];
})();

export const BOARD_SIZE = BOARD_CONFIG.length;

// Question tile IDs
export const QUESTION_TILE_IDS = [7, 17, 25, 29, 34];

export const STARTING_MONEY = 1500;
export const PASSING_GO_BONUS = 200;
export const HOUSE_COST = 50;
export const HOTEL_COST = 50;
export const MORTGAGE_RATE = 0.5;
export const MAX_HOUSES = 4;
export const MAX_ROUNDS = 20;
