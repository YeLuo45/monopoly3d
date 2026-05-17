// Map Editor Types and Constants

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

// Visual tile type info for editor palette
export const TILE_TYPE_INFO = {
  [TILE_TYPES.PROPERTY]: { 
    label: '房产', 
    icon: '🏠', 
    color: '#4CAF50',
    description: '可购买、出售、建造房屋的地产格子'
  },
  [TILE_TYPES.CHANCE]: { 
    label: '机会', 
    icon: '🎰', 
    color: '#9C27B0',
    description: '随机事件，可能获得奖励或惩罚'
  },
  [TILE_TYPES.QUESTION]: { 
    label: '问答', 
    icon: '❓', 
    color: '#2196F3',
    description: '知识问答格子，答对获得奖励'
  },
  [TILE_TYPES.TAX]: { 
    label: '税务', 
    icon: '💰', 
    color: '#FF5722',
    description: '需要支付税款的格子'
  },
  [TILE_TYPES.GO]: { 
    label: '起点', 
    icon: '▶', 
    color: '#F44336',
    description: '游戏起点，经过时获得奖励'
  },
  [TILE_TYPES.JAIL]: { 
    label: '监狱', 
    icon: '🏠', 
    color: '#795548',
    description: '参观或坐牢的格子'
  },
  [TILE_TYPES.FREE_PARKING]: { 
    label: '休息站', 
    icon: '☁', 
    color: '#607D8B',
    description: '免费停留的格子'
  },
  [TILE_TYPES.GO_TO_JAIL]: { 
    label: '入狱', 
    icon: '⚠', 
    color: '#E91E63',
    description: '直接前往监狱'
  },
};

// Workshop difficulty levels
export const DIFFICULTY_LEVELS = {
  1: { label: '⭐ 入门', color: '#4CAF50', description: '适合新手，教学导向' },
  2: { label: '⭐⭐ 简单', color: '#8BC34A', description: '轻度挑战，娱乐为主' },
  3: { label: '⭐⭐⭐ 中等', color: '#FFC107', description: '平衡难度，适合大多数玩家' },
  4: { label: '⭐⭐⭐⭐ 困难', color: '#FF9800', description: '高难度，需要策略思维' },
  5: { label: '⭐⭐⭐⭐⭐ 地狱', color: '#F44336', description: '极限挑战，高手专属' },
};

export const BOARD_SIZES = {
  16: { label: '4×4 (16格)', tiles: 16, sides: 4, tilesPerSide: 4 },
  24: { label: '6×4 (24格)', tiles: 24, sides: 4, tilesPerSide: 6 },
  36: { label: '9×4 (36格)', tiles: 36, sides: 4, tilesPerSide: 9 },
  48: { label: '12×4 (48格)', tiles: 48, sides: 4, tilesPerSide: 12 },
  64: { label: '16×4 (64格)', tiles: 64, sides: 4, tilesPerSide: 16 },
};

// Property color groups for visual consistency
export const PROPERTY_COLOR_GROUPS = [
  { id: 'brown', label: '棕色', color: '#8B4513', tileCount: 2 },
  { id: 'lightBlue', label: '浅蓝', color: '#87CEEB', tileCount: 3 },
  { id: 'pink', label: '粉色', color: '#FF69B4', tileCount: 3 },
  { id: 'orange', label: '橙色', color: '#FF8C00', tileCount: 3 },
  { id: 'red', label: '红色', color: '#DC143C', tileCount: 3 },
  { id: 'yellow', label: '黄色', color: '#FFD700', tileCount: 3 },
  { id: 'green', label: '绿色', color: '#228B22', tileCount: 3 },
  { id: 'darkBlue', label: '深蓝', color: '#00008B', tileCount: 2 },
];

// Tile validation rules
export const TILE_VALIDATION_RULES = {
  MIN_TILES: 16,
  MAX_TILES: 64,
  REQUIRED_CORNER_TILES: ['GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL'],
  RECOMMENDED_PROPERTY_COUNT: 8, // At least 8 properties for balanced gameplay
};

/**
 * Validate board configuration
 * @param {Array} tiles - Array of tile objects
 * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateBoardConfig(tiles) {
  const errors = [];
  const warnings = [];

  if (!tiles || !Array.isArray(tiles)) {
    return { valid: false, errors: ['Invalid tiles array'], warnings: [] };
  }

  // Size checks
  if (tiles.length < TILE_VALIDATION_RULES.MIN_TILES) {
    errors.push(`Board must have at least ${TILE_VALIDATION_RULES.MIN_TILES} tiles (current: ${tiles.length})`);
  }
  if (tiles.length > TILE_VALIDATION_RULES.MAX_TILES) {
    errors.push(`Board must have at most ${TILE_VALIDATION_RULES.MAX_TILES} tiles (current: ${tiles.length})`);
  }

  // Required corners
  const corners = tiles.filter(t => t.subtype && ['GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL'].includes(t.subtype));
  const required = ['GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL'];
  for (const corner of required) {
    if (!corners.some(c => c.subtype === corner)) {
      errors.push(`Missing required corner tile: ${corner}`);
    }
  }

  // Property count
  const propertyCount = tiles.filter(t => t.type === TILE_TYPES.PROPERTY).length;
  if (propertyCount < TILE_VALIDATION_RULES.RECOMMENDED_PROPERTY_COUNT) {
    warnings.push(`Recommended at least ${TILE_VALIDATION_RULES.RECOMMENDED_PROPERTY_COUNT} properties (current: ${propertyCount})`);
  }

  // Check for duplicate corner placements
  const cornerPositions = required.map(r => {
    const idx = tiles.findIndex(t => t.subtype === r);
    return { type: r, position: idx };
  });
  const seen = new Set();
  for (const c of cornerPositions) {
    if (c.position === -1) continue;
    if (seen.has(c.position)) {
      errors.push(`Duplicate corner position for ${c.type}`);
    }
    seen.add(c.position);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export const COLOR_GROUPS = {
  brown: '#8B4513',
  lightBlue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  darkBlue: '#00008B',
  purple: '#9932CC',
  teal: '#20B2AA',
  'orange-red': '#FF4500',
  gold: '#FFD700',
};

export const DEFAULT_RULE_CONFIG = {
  startingMoney: 1500,
  passingGoBonus: 200,
  houseCost: 50,
  hotelCost: 50,
  mortgageRate: 0.5,
  maxHouses: 4,
  maxRounds: 20,
  questionTimer: 15,
  questionTileIds: [],
};

export function createDefaultTile(id, type = TILE_TYPES.PROPERTY) {
  switch (type) {
    case TILE_TYPES.PROPERTY:
      return {
        id,
        name: `地块 ${id + 1}`,
        type: TILE_TYPES.PROPERTY,
        price: 100,
        rent: [10, 20, 30, 40, 50],
        color: '#94A3B8',
        group: null,
        owner: null,
        houses: 0,
        mortgaged: false,
      };
    case TILE_TYPES.CHANCE:
      return { id, name: '机会', type: TILE_TYPES.CHANCE };
    case TILE_TYPES.QUESTION:
      return { id, name: '问题', type: TILE_TYPES.QUESTION };
    case TILE_TYPES.TAX:
      return { id, name: '税务', type: TILE_TYPES.TAX, amount: 100 };
    case TILE_TYPES.GO:
      return { id, name: '起点 GO', type: TILE_TYPES.GO, subtype: 'GO' };
    case TILE_TYPES.JAIL:
      return { id, name: '监狱', type: TILE_TYPES.JAIL, subtype: 'JAIL' };
    case TILE_TYPES.FREE_PARKING:
      return { id, name: '休息站', type: TILE_TYPES.FREE_PARKING, subtype: 'FREE_PARKING' };
    case TILE_TYPES.GO_TO_JAIL:
      return { id, name: '前往监狱', type: TILE_TYPES.GO_TO_JAIL, subtype: 'GO_TO_JAIL' };
    default:
      return { id, name: `格子 ${id + 1}`, type };
  }
}

export function generateBoardConfig(size) {
  const config = [];
  const tilesPerSide = size / 4;
  
  for (let i = 0; i < size; i++) {
    // Corner tiles
    if (i === 0) {
      config.push(createDefaultTile(i, TILE_TYPES.GO));
    } else if (i === tilesPerSide) {
      config.push(createDefaultTile(i, TILE_TYPES.JAIL));
    } else if (i === tilesPerSide * 2) {
      config.push(createDefaultTile(i, TILE_TYPES.FREE_PARKING));
    } else if (i === tilesPerSide * 3) {
      config.push(createDefaultTile(i, TILE_TYPES.GO_TO_JAIL));
    } else if (i % 3 === 0) {
      // Every 3rd non-corner is chance
      config.push(createDefaultTile(i, TILE_TYPES.CHANCE));
    } else if (i % 4 === 2) {
      // Some question tiles
      config.push(createDefaultTile(i, TILE_TYPES.QUESTION));
    } else if (i % 5 === 4) {
      // Tax tiles
      config.push(createDefaultTile(i, TILE_TYPES.TAX));
    } else {
      // Default to property
      const groups = Object.keys(COLOR_GROUPS);
      const group = groups[i % groups.length];
      const tile = createDefaultTile(i, TILE_TYPES.PROPERTY);
      tile.name = `房产 ${i + 1}`;
      tile.price = 100 + (i * 10);
      tile.color = COLOR_GROUPS[group];
      tile.group = group;
      tile.rent = [10 + i, 20 + i * 2, 30 + i * 3, 40 + i * 4, 50 + i * 5];
      config.push(tile);
    }
  }
  
  return config;
}
