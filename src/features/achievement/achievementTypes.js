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

// Achievement status
export const ACHIEVEMENT_STATUS = {
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  IN_PROGRESS: 'in_progress',
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
  unlockedAt: null,
  progress: 0,
  target: 1,
});
