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

export const BOARD_SIZES = {
  16: { label: '4×4 (16格)', tiles: 16, sides: 4, tilesPerSide: 4 },
  24: { label: '6×4 (24格)', tiles: 24, sides: 4, tilesPerSide: 6 },
  36: { label: '9×4 (36格)', tiles: 36, sides: 4, tilesPerSide: 9 },
  48: { label: '12×4 (48格)', tiles: 48, sides: 4, tilesPerSide: 12 },
};

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
