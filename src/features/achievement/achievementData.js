import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DIFFICULTY, ACHIEVEMENT_RARITY, WEATHER_TYPES } from './achievementTypes';
import { createAchievement } from './achievementTypes';

// All achievements in the game
export const ACHIEVEMENTS = [
  // ==================== GAMEPLAY ACHIEVEMENTS ====================
  createAchievement({
    id: 'first_game',
    name: '初次游戏',
    description: '完成你的第一局游戏',
    icon: '🎮',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 10,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    condition: (state) => (state.profile?.gamesPlayed || 0) >= 1,
  }),
  createAchievement({
    id: 'first_win',
    name: '首战告捷',
    description: '赢得第一局游戏的胜利',
    icon: '🏆',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 30,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    condition: (state) => (state.profile?.wins || 0) >= 1,
  }),
  createAchievement({
    id: 'first_property',
    name: '置办家业',
    description: '购买你的第一块地产',
    icon: '🏠',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 10,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    condition: (state) => (state.profile?.propertiesBought || 0) >= 1,
  }),
  createAchievement({
    id: 'own_5_properties',
    name: '地产大亨',
    description: '同时拥有5块地产',
    icon: '🏘️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 40,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    condition: (state) => (state.profile?.maxProperties || 0) >= 5,
  }),
  createAchievement({
    id: 'earn_1000',
    name: '千金散尽还复来',
    description: '单局游戏累计获得1000金币',
    icon: '💰',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 50,
    condition: (state) => (state.profile?.maxMoneyEarned || 0) >= 1000,
  }),
  createAchievement({
    id: 'richest_player',
    name: '富甲一方',
    description: '在游戏结束时成为金钱最多的玩家',
    icon: '👑',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 80,
    condition: (state) => state.justWonAsRicher,
  }),
  createAchievement({
    id: 'build_house',
    name: '添砖加瓦',
    description: '在你的地产上建造第一所房子',
    icon: '🏗️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 15,
    condition: (state) => (state.profile?.housesBuilt || 0) >= 1,
  }),
  createAchievement({
    id: 'collect_rent',
    name: '坐收渔利',
    description: '从其他玩家那里收取租金',
    icon: '💵',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 10,
    condition: (state) => (state.profile?.rentCollected || 0) >= 1,
  }),
  createAchievement({
    id: 'rent_master',
    name: '租金之王',
    description: '单局游戏累计收取500租金',
    icon: '🤑',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 45,
    condition: (state) => (state.profile?.maxRentCollected || 0) >= 500,
  }),
  createAchievement({
    id: 'visit_all_tiles',
    name: '环游世界',
    description: '访问棋盘上的所有格子',
    icon: '🌍',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 70,
    condition: (state) => (state.profile?.uniqueTilesVisited || 0) >= 20,
  }),
  createAchievement({
    id: 'lucky_dice',
    name: '幸运骰子',
    description: '连续3次掷出相同点数',
    icon: '🎲',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 35,
    condition: (state) => state.achievementProgress?.luckyDiceStreak >= 3,
  }),
  createAchievement({
    id: 'escape_jail',
    name: '逃出生天',
    description: '从监狱成功逃脱',
    icon: '🚔',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 30,
    condition: (state) => state.achievementProgress?.escapedJail,
  }),
  createAchievement({
    id: 'pass_go',
    name: '路过起点',
    description: '经过起点格获得200金币',
    icon: '⭕',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 10,
    condition: (state) => state.achievementProgress?.passedGo,
  }),

  // ==================== LEARNING ACHIEVEMENTS ====================
  createAchievement({
    id: 'answer_100_questions',
    name: '百问百答',
    description: '累计回答100道题目',
    icon: '📚',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 80,
    condition: (state) => (state.profile?.totalQuestionsAnswered || 0) >= 100,
  }),
  createAchievement({
    id: 'perfect_round',
    name: '完美答题',
    description: '一轮游戏所有题目都答对',
    icon: '⭐',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 60,
    condition: (state) => state.achievementProgress?.perfectRound,
  }),
  createAchievement({
    id: 'category_master',
    name: '学科大师',
    description: '在某个学科类别达到90%正确率',
    icon: '🎓',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 50,
    condition: (state) => {
      const categoryStats = state.profile?.categoryStats || {};
      return Object.values(categoryStats).some(s => s.total >= 10 && s.accuracy >= 90);
    },
  }),
  createAchievement({
    id: 'math_whiz',
    name: '数学小天才',
    description: '数学类别连续答对10题',
    icon: '🔢',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 45,
    condition: (state) => (state.achievementProgress?.mathStreak || 0) >= 10,
  }),
  createAchievement({
    id: 'speed_demon',
    name: '速度之星',
    description: '在10秒内正确回答问题',
    icon: '⚡',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 40,
    condition: (state) => state.achievementProgress?.fastAnswer,
  }),
  createAchievement({
    id: 'first_wrong',
    name: '失败是成功之母',
    description: '答错第一道题',
    icon: '📝',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 10,
    condition: (state) => (state.profile?.totalQuestionsAnswered || 0) >= 1,
    secret: true,
  }),
  createAchievement({
    id: 'comeback_kid',
    name: '逆袭小子',
    description: '答错后连续答对5题',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 65,
    condition: (state) => (state.achievementProgress?.comebackStreak || 0) >= 5,
  }),
  createAchievement({
    id: 'all_categories',
    name: '全能选手',
    description: '在所有学科类别都回答过问题',
    icon: '🏅',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 50,
    condition: (state) => {
      const categories = state.profile?.categoriesPlayed || [];
      return ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'].every(c => categories.includes(c));
    },
  }),
  createAchievement({
    id: 'streak_10',
    name: '连胜10题',
    description: '连续答对10道题',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 70,
    condition: (state) => (state.achievementProgress?.correctStreak || 0) >= 10,
  }),
  createAchievement({
    id: 'streak_20',
    name: '连胜20题',
    description: '连续答对20道题',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.LEARNING,
    difficulty: ACHIEVEMENT_DIFFICULTY.LEGENDARY,
    points: 150,
    condition: (state) => (state.achievementProgress?.correctStreak || 0) >= 20,
  }),

  // ==================== SOCIAL/MULTIPLAYER ACHIEVEMENTS ====================
  createAchievement({
    id: 'play_multiplayer',
    name: '初次联机',
    description: '完成一局多人游戏',
    icon: '🌐',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 15,
    condition: (state) => (state.profile?.multiplayerGames || 0) >= 1,
  }),
  createAchievement({
    id: 'host_room',
    name: '房主诞生',
    description: '创建并开始一局多人游戏',
    icon: '🏠',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 20,
    condition: (state) => (state.profile?.roomsHosted || 0) >= 1,
  }),
  createAchievement({
    id: 'defeat_friend',
    name: '技高一筹',
    description: '在多人游戏中击败其他玩家',
    icon: '⚔️',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 35,
    condition: (state) => state.achievementProgress?.defeatedAnotherPlayer,
  }),
  createAchievement({
    id: 'friendly_match',
    name: '友谊第一',
    description: '完成一局多人游戏（不计较输赢）',
    icon: '🤝',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 15,
    condition: (state) => (state.profile?.friendlyMatches || 0) >= 1,
    secret: true,
  }),

  // ==================== SPECIAL/RARE ACHIEVEMENTS ====================
  createAchievement({
    id: 'win_10_games',
    name: '常胜将军',
    description: '累计赢得10局游戏',
    icon: '🏆',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.LEGENDARY,
    points: 200,
    condition: (state) => (state.profile?.wins || 0) >= 10,
  }),
  createAchievement({
    id: 'play_50_games',
    name: '游戏达人',
    description: '累计完成50局游戏',
    icon: '🎖️',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.LEGENDARY,
    points: 180,
    condition: (state) => (state.profile?.gamesPlayed || 0) >= 50,
  }),
  createAchievement({
    id: 'top_3_streak',
    name: '三连前三',
    description: '连续3局游戏获得前三名',
    icon: '🥉',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 100,
    condition: (state) => (state.achievementProgress?.topThreeStreak || 0) >= 3,
  }),
  createAchievement({
    id: 'perfectionist',
    name: '完美主义者',
    description: '以最高分完成一局游戏',
    icon: '💎',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.LEGENDARY,
    points: 150,
    condition: (state) => state.achievementProgress?.achievedPerfection,
  }),
  createAchievement({
    id: 'early_bird',
    name: '早起鸟儿',
    description: '在早晨6点-8点之间完成一局游戏',
    icon: '🌅',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 30,
    condition: (state) => state.achievementProgress?.playedEarlyBird,
    secret: true,
  }),
  createAchievement({
    id: 'night_owl',
    name: '夜猫子',
    description: '在午夜12点后完成一局游戏',
    icon: '🦉',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 30,
    condition: (state) => state.achievementProgress?.playedNightOwl,
    secret: true,
  }),
  createAchievement({
    id: 'first_century',
    name: '百分成就',
    description: '单局游戏获得100分',
    icon: '💯',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 80,
    condition: (state) => (state.profile?.maxScore || 0) >= 100,
  }),
  createAchievement({
    id: 'collector',
    name: '收藏家',
    description: '解锁50%的成就',
    icon: '📦',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    points: 100,
    condition: (state) => {
      const total = Object.keys(ACHIEVEMENTS).length;
      const unlocked = state.achievementProgress?.unlockedCount || 0;
      return unlocked >= total * 0.5;
    },
  }),
  createAchievement({
    id: 'master_collector',
    name: '收藏大师',
    description: '解锁80%的成就',
    icon: '🏺',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.LEGENDARY,
    points: 200,
    condition: (state) => {
      const total = Object.keys(ACHIEVEMENTS).length;
      const unlocked = state.achievementProgress?.unlockedCount || 0;
      return unlocked >= total * 0.8;
    },
  }),

  // ==================== SEASONAL/TIME-LIMITED ====================
  createAchievement({
    id: 'spring_festival',
    name: '新春快乐',
    description: '春节期间登录游戏',
    icon: '🧧',
    category: ACHIEVEMENT_CATEGORIES.SEASONAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 20,
    condition: (state) => state.achievementProgress?.playedDuringSpringFestival,
    secret: true,
  }),
  createAchievement({
    id: 'lucky_new_year',
    name: '幸运新年',
    description: '新年月期间完成游戏',
    icon: '🎊',
    category: ACHIEVEMENT_CATEGORIES.SEASONAL,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 40,
    condition: (state) => state.achievementProgress?.playedDuringNewYear,
  }),

  // ==================== EDITOR ACHIEVEMENTS ====================
  createAchievement({
    id: 'use_editor',
    name: '地图设计师',
    description: '第一次使用地图编辑器',
    icon: '🗺️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    points: 15,
    condition: (state) => (state.profile?.editorUses || 0) >= 1,
  }),
  createAchievement({
    id: 'custom_map_master',
    name: '自定义地图大师',
    description: '使用自定义地图完成游戏',
    icon: '🗺️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    points: 50,
    condition: (state) => state.achievementProgress?.playedCustomMap,
  }),
];

// Get achievement by ID
export const getAchievementById = (id) => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

// Get achievements by category
export const getAchievementsByCategory = (category) => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

// Get achievements by difficulty
export const getAchievementsByDifficulty = (difficulty) => {
  return ACHIEVEMENTS.filter(a => a.difficulty === difficulty);
};

// Calculate total possible points
export const getTotalPossiblePoints = () => {
  return ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);
};

// Weather-based achievements
export const WEATHER_ACHIEVEMENTS = {
  [WEATHER_TYPES.RAINY]: {
    id: 'rainy_day_hero',
    name: '雨中英雄',
    description: '在雨天完成游戏',
    icon: '🌧️',
    points: 25,
  },
  [WEATHER_TYPES.STORMY]: {
    id: 'storm_chaser',
    name: '追风者',
    description: '在暴风雨天完成游戏',
    icon: '⛈️',
    points: 50,
  },
  [WEATHER_TYPES.SNOWY]: {
    id: 'winter_warrior',
    name: '冬日战士',
    description: '在下雪天完成游戏',
    icon: '❄️',
    points: 25,
  },
  [WEATHER_TYPES.SPECIAL]: {
    id: 'rainbow_seeker',
    name: '彩虹追寻者',
    description: '在特殊天气完成游戏',
    icon: '🌈',
    points: 75,
  },
};
