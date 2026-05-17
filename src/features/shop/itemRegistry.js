/**
 * ItemRegistry - Provider-based system for skins, props, and cosmetics
 * 
 * Inspired by nanobot's ToolRegistry pattern:
 * - Discoverable: All items registered in central registry
 * - Composable: Items can have dependencies and categories
 * - Extensible: New item types pluggable without modifying core
 * 
 * Item types:
 * - token_skin: Changes player token appearance
 * - board_theme: Changes game board visual theme
 * - property_style: Changes property card visual style
 * - particle_effect: Adds particle effects to actions
 * - profile_frame: Decorates player name in HUD
 */

import { createContext, useContext } from 'react';

// ==================== ITEM DEFINITIONS ====================

export const ITEM_TYPES = {
  TOKEN_SKIN: 'token_skin',
  BOARD_THEME: 'board_theme',
  PROPERTY_STYLE: 'property_style',
  PARTICLE_EFFECT: 'particle_effect',
  PROFILE_FRAME: 'profile_frame',
  EMOTE: 'emote',
};

export const ITEM_RARITIES = {
  COMMON: { id: 'common', label: '普通', color: '#9CA3AF', dropRate: 0.6 },
  UNCOMMON: { id: 'uncommon', label: '稀有', color: '#22C55E', dropRate: 0.25 },
  RARE: { id: 'rare', label: '罕见', color: '#3B82F6', dropRate: 0.10 },
  EPIC: { id: 'epic', label: '史诗', color: '#A855F7', dropRate: 0.04 },
  LEGENDARY: { id: 'legendary', label: '传说', color: '#F59E0B', dropRate: 0.01 },
};

export const TOKEN_SKINS = {
  // Default tokens
  default_car: {
    id: 'default_car',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '赛车',
    description: '经典红色赛车皮肤',
    rarity: ITEM_RARITIES.COMMON,
    price: 0, // Free default
    preview: '🚗',
    shape: 'car',
  },
  default_dog: {
    id: 'default_dog',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '小狗',
    description: '可爱的小狗皮肤',
    rarity: ITEM_RARITIES.COMMON,
    price: 0,
    preview: '🐕',
    shape: 'dog',
  },
  default_cat: {
    id: 'default_cat',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '小猫',
    description: '可爱的小猫皮肤',
    rarity: ITEM_RARITIES.COMMON,
    price: 0,
    preview: '🐱',
    shape: 'cat',
  },
  // Premium tokens
  golden_car: {
    id: 'golden_car',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '黄金赛车',
    description: '金光闪闪的豪华赛车',
    rarity: ITEM_RARITIES.RARE,
    price: 500,
    preview: '🏎️',
    shape: 'car',
    color: '#FFD700',
    material: 'metallic',
  },
  rainbow_unicorn: {
    id: 'rainbow_unicorn',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '彩虹独角兽',
    description: '梦幻彩虹独角兽',
    rarity: ITEM_RARITIES.EPIC,
    price: 1000,
    preview: '🦄',
    shape: 'unicorn',
    color: '#FF69B4',
    material: 'iridescent',
  },
  robot_t1000: {
    id: 'robot_t1000',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: 'T1000机器人',
    description: '液态金属机器人',
    rarity: ITEM_RARITIES.LEGENDARY,
    price: 2000,
    preview: '🤖',
    shape: 'robot',
    color: '#C0C0C0',
    material: 'chrome',
    specialEffect: 'liquid_metal',
  },
  ninja_cat: {
    id: 'ninja_cat',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '忍者猫',
    description: '隐藏在阴影中的忍者猫',
    rarity: ITEM_RARITIES.UNCOMMON,
    price: 300,
    preview: '🐱‍👤',
    shape: 'cat',
    color: '#1F2937',
    material: 'matte',
  },
  wizard_owl: {
    id: 'wizard_owl',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '巫师猫头鹰',
    description: '睿智的巫师猫头鹰',
    rarity: ITEM_RARITIES.RARE,
    price: 600,
    preview: '🦉',
    shape: 'owl',
    color: '#6366F1',
    material: 'magical',
  },
  dragon_rider: {
    id: 'dragon_rider',
    type: ITEM_TYPES.TOKEN_SKIN,
    name: '驯龙师',
    description: '骑着巨龙的勇士',
    rarity: ITEM_RARITIES.LEGENDARY,
    price: 2500,
    preview: '🐉',
    shape: 'dragon',
    color: '#DC2626',
    material: 'fiery',
    specialEffect: 'flame_trail',
  },
};

export const BOARD_THEMES = {
  classic_green: {
    id: 'classic_green',
    type: ITEM_TYPES.BOARD_THEME,
    name: '经典绿',
    description: '经典大富翁绿色主题',
    rarity: ITEM_RARITIES.COMMON,
    price: 0,
    preview: '🟢',
    colors: {
      primary: '#228B22',
      secondary: '#90EE90',
      accent: '#006400',
      background: '#F0FFF0',
    },
  },
  sunset_orange: {
    id: 'sunset_orange',
    type: ITEM_TYPES.BOARD_THEME,
    name: '日落橙',
    description: '温暖的日落色调',
    rarity: ITEM_RARITIES.UNCOMMON,
    price: 200,
    preview: '🧡',
    colors: {
      primary: '#FF6B35',
      secondary: '#FFB347',
      accent: '#FF4500',
      background: '#FFF5E6',
    },
  },
  ocean_blue: {
    id: 'ocean_blue',
    type: ITEM_TYPES.BOARD_THEME,
    name: '海洋蓝',
    description: '清新海洋主题',
    rarity: ITEM_RARITIES.RARE,
    price: 400,
    preview: '💙',
    colors: {
      primary: '#0077B6',
      secondary: '#00B4D8',
      accent: '#023E8A',
      background: '#E0F7FA',
    },
  },
  royal_purple: {
    id: 'royal_purple',
    type: ITEM_TYPES.BOARD_THEME,
    name: '皇家紫',
    description: '奢华皇家紫主题',
    rarity: ITEM_RARITIES.EPIC,
    price: 800,
    preview: '💜',
    colors: {
      primary: '#7C3AED',
      secondary: '#A78BFA',
      accent: '#5B21B6',
      background: '#F5F3FF',
    },
  },
  midnight_black: {
    id: 'midnight_black',
    type: ITEM_TYPES.BOARD_THEME,
    name: '午夜黑',
    description: '炫酷午夜黑色主题',
    rarity: ITEM_RARITIES.LEGENDARY,
    price: 1500,
    preview: '🌑',
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#000000',
      background: '#111827',
    },
    isDark: true,
  },
};

export const PARTICLE_EFFECTS = {
  sparkle: {
    id: 'sparkle',
    type: ITEM_TYPES.PARTICLE_EFFECT,
    name: '闪光粒子',
    description: '购买/建造时产生闪光效果',
    rarity: ITEM_RARITIES.COMMON,
    price: 0,
    preview: '✨',
  },
  confetti: {
    id: 'confetti',
    type: ITEM_TYPES.PARTICLE_EFFECT,
    name: '彩色纸屑',
    description: '游戏事件时飘落彩色纸屑',
    rarity: ITEM_RARITIES.UNCOMMON,
    price: 150,
    preview: '🎊',
  },
  firework: {
    id: 'firework',
    type: ITEM_TYPES.PARTICLE_EFFECT,
    name: '烟花',
    description: '成就解锁时绽放烟花',
    rarity: ITEM_RARITIES.RARE,
    price: 400,
    preview: '🎆',
  },
  magical_sparkle: {
    id: 'magical_sparkle',
    type: ITEM_TYPES.PARTICLE_EFFECT,
    name: '魔法闪光',
    description: '神秘魔法粒子环绕',
    rarity: ITEM_RARITIES.EPIC,
    price: 700,
    preview: '🌟',
  },
  legendary_aura: {
    id: 'legendary_aura',
    type: ITEM_TYPES.PARTICLE_EFFECT,
    name: '传说光环',
    description: '传说级玩家专属光环',
    rarity: ITEM_RARITIES.LEGENDARY,
    price: 1200,
    preview: '👑',
  },
};

export const PROFILE_FRAMES = {
  none: {
    id: 'none',
    type: ITEM_TYPES.PROFILE_FRAME,
    name: '无',
    description: '默认无边框',
    rarity: ITEM_RARITIES.COMMON,
    price: 0,
    preview: '⬜',
  },
  bronze: {
    id: 'bronze',
    type: ITEM_TYPES.PROFILE_FRAME,
    name: '铜牌框',
    description: '铜色玩家边框',
    rarity: ITEM_RARITIES.COMMON,
    price: 50,
    preview: '🥉',
    borderColor: '#CD7F32',
  },
  silver: {
    id: 'silver',
    type: ITEM_TYPES.PROFILE_FRAME,
    name: '银牌框',
    description: '银色玩家边框',
    rarity: ITEM_RARITIES.UNCOMMON,
    price: 150,
    preview: '🥈',
    borderColor: '#C0C0C0',
  },
  gold: {
    id: 'gold',
    type: ITEM_TYPES.PROFILE_FRAME,
    name: '金牌框',
    description: '金色玩家边框',
    rarity: ITEM_RARITIES.RARE,
    price: 500,
    preview: '🥇',
    borderColor: '#FFD700',
  },
  diamond: {
    id: 'diamond',
    type: ITEM_TYPES.PROFILE_FRAME,
    name: '钻石框',
    description: '璀璨钻石边框',
    rarity: ITEM_RARITIES.EPIC,
    price: 1000,
    preview: '💎',
    borderColor: '#B9F2FF',
  },
  rainbow: {
    id: 'rainbow',
    type: ITEM_TYPES.PROFILE_FRAME,
    name: '彩虹框',
    description: '流动彩虹边框',
    rarity: ITEM_RARITIES.LEGENDARY,
    price: 2000,
    preview: '🏆',
    borderColor: 'linear-gradient(90deg, red, orange, yellow, green, blue, purple)',
  },
};

// ==================== ITEM REGISTRY ====================

/**
 * Central registry combining all item categories
 */
export const ITEM_REGISTRY = {
  [ITEM_TYPES.TOKEN_SKIN]: TOKEN_SKINS,
  [ITEM_TYPES.BOARD_THEME]: BOARD_THEMES,
  [ITEM_TYPES.PARTICLE_EFFECT]: PARTICLE_EFFECTS,
  [ITEM_TYPES.PROFILE_FRAME]: PROFILE_FRAMES,
};

/**
 * Get all items as flat array
 */
export function getAllItems() {
  return Object.values(ITEM_REGISTRY).flatMap(cat => Object.values(cat));
}

/**
 * Get item by ID
 */
export function getItemById(itemId) {
  for (const category of Object.values(ITEM_REGISTRY)) {
    if (category[itemId]) return category[itemId];
  }
  return null;
}

/**
 * Get items by type
 */
export function getItemsByType(type) {
  return ITEM_REGISTRY[type] ? Object.values(ITEM_REGISTRY[type]) : [];
}

/**
 * Get items by rarity
 */
export function getItemsByRarity(rarityId) {
  return getAllItems().filter(item => item.rarity.id === rarityId);
}

/**
 * Get shop items (excludes free default items)
 */
export function getShopItems() {
  return getAllItems().filter(item => item.price > 0);
}

/**
 * Get items on sale (simulated rotating inventory)
 */
export function getItemsOnSale() {
  const now = Date.now();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const allShopItems = getShopItems();
  
  // Rotate sale items based on day
  const startIdx = dayOfYear % allShopItems.length;
  return [
    allShopItems[startIdx],
    allShopItems[(startIdx + 1) % allShopItems.length],
    allShopItems[(startIdx + 2) % allShopItems.length],
  ].filter(Boolean);
}

// ==================== INVENTORY STORE ====================

const INVENTORY_KEY = 'monopoly3d_inventory';

/**
 * Load inventory from localStorage
 */
export function loadInventory() {
  try {
    const data = localStorage.getItem(INVENTORY_KEY);
    return data ? JSON.parse(data) : {
      ownedItems: ['default_car', 'default_dog', 'default_cat', 'classic_green', 'sparkle', 'none'],
      equippedItems: {
        [ITEM_TYPES.TOKEN_SKIN]: 'default_car',
        [ITEM_TYPES.BOARD_THEME]: 'classic_green',
        [ITEM_TYPES.PARTICLE_EFFECT]: 'sparkle',
        [ITEM_TYPES.PROFILE_FRAME]: 'none',
      },
      coins: 1000, // Starting coins for testing
    };
  } catch {
    return null;
  }
}

/**
 * Save inventory to localStorage
 */
export function saveInventory(inventory) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    return true;
  } catch {
    return false;
  }
}

/**
 * Purchase an item
 */
export function purchaseItem(itemId, inventory) {
  const item = getItemById(itemId);
  if (!item) return { success: false, error: '物品不存在' };
  
  if (inventory.ownedItems.includes(itemId)) {
    return { success: false, error: '已拥有该物品' };
  }
  
  if (inventory.coins < item.price) {
    return { success: false, error: `金币不足 (需要 ${item.price} 金币)` };
  }
  
  const newInventory = {
    ...inventory,
    ownedItems: [...inventory.ownedItems, itemId],
    coins: inventory.coins - item.price,
  };
  
  if (saveInventory(newInventory)) {
    return { success: true, inventory: newInventory };
  }
  return { success: false, error: '保存失败' };
}

/**
 * Equip an item
 */
export function equipItem(itemId, inventory) {
  const item = getItemById(itemId);
  if (!item) return { success: false, error: '物品不存在' };
  
  if (!inventory.ownedItems.includes(itemId)) {
    return { success: false, error: '请先购买该物品' };
  }
  
  const newInventory = {
    ...inventory,
    equippedItems: {
      ...inventory.equippedItems,
      [item.type]: itemId,
    },
  };
  
  if (saveInventory(newInventory)) {
    return { success: true, inventory: newInventory };
  }
  return { success: false, error: '保存失败' };
}

/**
 * Add coins (from achievements, daily bonus, etc.)
 */
export function addCoins(amount, inventory) {
  const newInventory = {
    ...inventory,
    coins: inventory.coins + amount,
  };
  
  if (saveInventory(newInventory)) {
    return { success: true, inventory: newInventory };
  }
  return { success: false, error: '保存失败' };
}

// ==================== SKIN PROVIDER CONTEXT ====================

export const SkinContext = createContext(null);

export function useSkinContext() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error('useSkinContext must be used within SkinProvider');
  return ctx;
}