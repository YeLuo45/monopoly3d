// Achievement Types and Categories
export const ACHIEVEMENT_CATEGORIES = {
  GAMEPLAY: 'gameplay',      // Gameplay achievements
  LEARNING: 'learning',       // Learning/education achievements
  SOCIAL: 'social',           // Social/multiplayer achievements
  SPECIAL: 'special',        // Special/rare achievements
  SEASONAL: 'seasonal',       // Time-limited achievements
};

// Achievement difficulty levels
export const ACHIEVEMENT_DIFFICULTY = {
  EASY: 'easy',       // 10-30 points
  MEDIUM: 'medium',   // 40-60 points
  HARD: 'hard',       // 70-100 points
  LEGENDARY: 'legendary', // 150+ points
};

// Achievement rarity (drop rate / exclusivity)
export const ACHIEVEMENT_RARITY = {
  COMMON: 'common',       // 50% - easy to get
  UNCOMMON: 'uncommon',   // 30% - moderate
  RARE: 'rare',           // 15% - challenging
  EPIC: 'epic',           // 4% - very challenging
  LEGENDARY: 'legendary', // 1% - extremely rare
};

export const RARITY_LABELS = {
  [ACHIEVEMENT_RARITY.COMMON]: '普通',
  [ACHIEVEMENT_RARITY.UNCOMMON]: '稀有',
  [ACHIEVEMENT_RARITY.RARE]: '罕见',
  [ACHIEVEMENT_RARITY.EPIC]: '史诗',
  [ACHIEVEMENT_RARITY.LEGENDARY]: '传说',
};

export const RARITY_COLORS = {
  [ACHIEVEMENT_RARITY.COMMON]: 'text-gray-400 border-gray-500',
  [ACHIEVEMENT_RARITY.UNCOMMON]: 'text-green-400 border-green-500',
  [ACHIEVEMENT_RARITY.RARE]: 'text-blue-400 border-blue-500',
  [ACHIEVEMENT_RARITY.EPIC]: 'text-purple-400 border-purple-500',
  [ACHIEVEMENT_RARITY.LEGENDARY]: 'text-yellow-400 border-yellow-500',
};

export const RARITY_BG_COLORS = {
  [ACHIEVEMENT_RARITY.COMMON]: 'from-gray-500/20 to-gray-600/20',
  [ACHIEVEMENT_RARITY.UNCOMMON]: 'from-green-500/20 to-green-600/20',
  [ACHIEVEMENT_RARITY.RARE]: 'from-blue-500/20 to-blue-600/20',
  [ACHIEVEMENT_RARITY.EPIC]: 'from-purple-500/20 to-purple-600/20',
  [ACHIEVEMENT_RARITY.LEGENDARY]: 'from-yellow-500/20 to-orange-600/20',
};

// Achievement status
export const ACHIEVEMENT_STATUS = {
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  IN_PROGRESS: 'in_progress',
  EXPIRED: 'expired', // For limited-time achievements
};

// Task chapter structure
export const TASK_CHAPTERS = {
  TUTORIAL: {
    id: 'tutorial',
    name: '新手教程',
    description: '完成基础游戏教程',
    order: 1,
    tasks: ['first_game', 'first_win', 'first_property'],
  },
  EXPLORER: {
    id: 'explorer',
    name: '探索者',
    description: '探索游戏的各种功能',
    order: 2,
    tasks: ['visit_all_tiles', 'use_editor', 'play_multiplayer'],
  },
  SCHOLAR: {
    id: 'scholar',
    name: '学习达人',
    description: '展示你的学习能力',
    order: 3,
    tasks: ['answer_100_questions', 'perfect_round', 'category_master'],
  },
  tycoon: {
    id: 'tycoon',
    name: '小富翁',
    description: '积累财富成为大富翁',
    order: 4,
    tasks: ['earn_1000', 'own_5_properties', 'richest_player'],
  },
  CHAMPION: {
    id: 'champion',
    name: '游戏冠军',
    description: '成为游戏的高手',
    order: 5,
    tasks: ['win_10_games', 'defeat_ai', 'top_3_streak'],
  },
};

// Weather types for the game world
export const WEATHER_TYPES = {
  SUNNY: 'sunny',
  CLOUDY: 'cloudy',
  RAINY: 'rainy',
  STORMY: 'stormy',
  SNOWY: 'snowy',
  SPECIAL: 'special', // Rainbow, shooting stars, etc.
};

// Points multiplier based on weather
export const WEATHER_MULTIPLIERS = {
  [WEATHER_TYPES.SUNNY]: 1.0,
  [WEATHER_TYPES.CLOUDY]: 1.0,
  [WEATHER_TYPES.RAINY]: 1.5,   // Bonus points for learning
  [WEATHER_TYPES.STORMY]: 2.0,   // Double points during storms
  [WEATHER_TYPES.SNOWY]: 1.5,
  [WEATHER_TYPES.SPECIAL]: 3.0,  // Special weather = triple points!
};

// Achievement definition template
export const createAchievement = ({
  id,
  name,
  description,
  icon,
  category,
  difficulty,
  points,
  condition,
  secret = false,
  tier = 'kindergarten',
  rarity = ACHIEVEMENT_RARITY.COMMON,
  limitedTime = false,
  expiresAt = null,
}) => ({
  id,
  name,
  description,
  icon,
  category,
  difficulty,
  points,
  condition,
  secret,
  tier,
  rarity,
  limitedTime,
  expiresAt,
  unlockedAt: null,
  progress: 0,
  target: 1,
});

// Check if a limited-time achievement has expired
export const isAchievementExpired = (achievement) => {
  if (!achievement.limitedTime || !achievement.expiresAt) return false;
  return Date.now() > achievement.expiresAt;
};
