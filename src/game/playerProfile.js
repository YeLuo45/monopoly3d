import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// XP per level - exponential scaling
const XP_PER_LEVEL = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 800,
  6: 1200,
  7: 1700,
  8: 2300,
  9: 3000,
  10: 3800,
  11: 4700,
  12: 5700,
  13: 6800,
  14: 8000,
  15: 9300,
  16: 10700,
  17: 12200,
  18: 13800,
  19: 15500,
  20: 17300,
};

// Titles based on level ranges
const TITLES = {
  1: '新手',
  3: '学徒',
  5: '探索者',
  7: '进阶玩家',
  10: '高手',
  13: '专家',
  15: '大师',
  18: '宗师',
  20: '传奇',
};

// All available categories
const ALL_CATEGORIES = ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'];

// Calculate XP needed for next level
function getXPForLevel(level) {
  return XP_PER_LEVEL[level] || 0;
}

// Get current level from total XP
function calculateLevelFromXP(totalXP) {
  let level = 1;
  for (let l = 1; l <= 20; l++) {
    if (totalXP >= (XP_PER_LEVEL[l] || 0)) {
      level = l;
    }
  }
  return level;
}

// Get title for a level
function getTitleForLevel(level) {
  let title = '新手';
  for (const [minLevel, titleName] of Object.entries(TITLES)) {
    if (level >= parseInt(minLevel)) {
      title = titleName;
    }
  }
  return title;
}

// Get XP progress to next level (0-1)
function getXPProgress(totalXP) {
  const currentLevel = calculateLevelFromXP(totalXP);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1) || currentLevelXP + 1000;
  const xpIntoLevel = totalXP - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;
  return Math.min(1, Math.max(0, xpIntoLevel / xpNeededForNext));
}

// Initial state
const initialState = {
  // Profile identity
  playerId: null,
  displayName: '玩家',
  avatar: 'default',

  // Progression
  level: 1,
  xp: 0,
  title: '新手',

  // Game stats
  gamesPlayed: 0,
  wins: 0,
  winStreak: 0,
  maxWinStreak: 0,

  // Game history (max 20 entries)
  gameHistory: [],

  // AI battle records
  aiBattleRecord: {
    totalBattles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    maxStreak: 0,
  },

  // Category performance
  favoriteCategories: [],
  strongestCategory: null,
  weakestCategory: null,
  wrongAnswers: {}, // category -> array of wrong question info

  // Timestamps
  createdAt: null,
  lastPlayedAt: null,
};

// Create the store
export const usePlayerProfile = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================== PROFILE SETUP ====================

      // Initialize or update profile
      initProfile: (playerId, displayName) => {
        const existing = get();
        const now = Date.now();
        set({
          playerId,
          displayName: displayName || existing.displayName || '玩家',
          createdAt: existing.createdAt || now,
          lastPlayedAt: now,
        });
      },

      // Update display name
      setDisplayName: (name) => set({ displayName: name }),

      // Set avatar
      setAvatar: (avatar) => set({ avatar }),

      // ==================== XP & LEVELING ====================

      // Add XP and handle level-up
      addXP: (amount) => {
        const state = get();
        const newXP = state.xp + amount;
        const newLevel = calculateLevelFromXP(newXP);
        const oldLevel = state.level;
        const leveledUp = newLevel > oldLevel;

        set({
          xp: newXP,
          level: newLevel,
          title: getTitleForLevel(newLevel),
        });

        return {
          leveledUp,
          newLevel,
          oldLevel,
          xpGained: amount,
        };
      },

      // Get XP progress for UI
      getXPProgress: () => {
        return getXPProgress(get().xp);
      },

      // Get current level info
      getLevelInfo: () => {
        const state = get();
        const level = state.level;
        return {
          level,
          title: state.title,
          currentXP: state.xp,
          xpForCurrentLevel: getXPForLevel(level),
          xpForNextLevel: getXPForLevel(level + 1),
          progress: getXPProgress(state.xp),
          isMaxLevel: level >= 20,
        };
      },

      // ==================== GAME RECORDING ====================

      // Record a completed game
      recordGame: (gameResult) => {
        const state = get();
        const now = Date.now();

        // Build game record
        const gameRecord = {
          id: `game_${now}`,
          timestamp: now,
          ageTier: gameResult.ageTier || 'kindergarten',
          rank: gameResult.rank || 1,
          totalPlayers: gameResult.totalPlayers || 1,
          won: gameResult.won || false,
          duration: gameResult.duration || 0,
          correctAnswers: gameResult.correctAnswers || 0,
          totalQuestions: gameResult.totalQuestions || 0,
          accuracy: gameResult.accuracy || 0,
          earnedXP: gameResult.earnedXP || 0,
          categoryStats: gameResult.categoryStats || {},
        };

        // Update game history (keep max 20)
        const newHistory = [gameRecord, ...state.gameHistory].slice(0, 20);

        // Update win/loss stats
        const won = gameResult.won || false;
        const newWinStreak = won ? state.winStreak + 1 : 0;
        const newMaxWinStreak = Math.max(state.maxWinStreak, newWinStreak);

        // Calculate XP earned
        let xpGained = 0;
        if (won) {
          // Base XP for winning
          xpGained += 50;
          // Bonus for rank
          if (gameResult.rank === 1) xpGained += 30;
          if (gameResult.rank === 2) xpGained += 15;
        }
        // XP for questions answered correctly
        xpGained += (gameResult.correctAnswers || 0) * 2;
        // Bonus for accuracy
        if (gameResult.accuracy >= 80) xpGained += 20;
        if (gameResult.accuracy === 100) xpGained += 30;

        // Apply XP and leveling
        const xpResult = get().addXP(xpGained);

        // Update strongest/weakest categories
        const { strongestCategory, weakestCategory } = calculateCategoryPerformance(gameResult.categoryStats, state.wrongAnswers);

        set({
          gamesPlayed: state.gamesPlayed + 1,
          wins: state.wins + (won ? 1 : 0),
          winStreak: newWinStreak,
          maxWinStreak: newMaxWinStreak,
          gameHistory: newHistory,
          strongestCategory,
          weakestCategory,
          lastPlayedAt: now,
        });

        return {
          ...xpResult,
          gameRecord,
          xpGained,
        };
      },

      // Record category performance from a game
      updateCategoryPerformance: (categoryStats) => {
        const state = get();
        const newFavoriteCategories = [...state.favoriteCategories];

        // Update favorite categories based on play frequency
        Object.keys(categoryStats).forEach(cat => {
          if (!newFavoriteCategories.includes(cat)) {
            newFavoriteCategories.push(cat);
          }
        });

        // Sort by total questions (most played first)
        newFavoriteCategories.sort((a, b) => {
          const aTotal = categoryStats[a]?.total || 0;
          const bTotal = categoryStats[b]?.total || 0;
          return bTotal - aTotal;
        });

        set({ favoriteCategories: newFavoriteCategories.slice(0, 5) });
      },

      // Record wrong answers for learning
      recordWrongAnswer: (category, questionInfo) => {
        const state = get();
        const wrongAnswers = { ...state.wrongAnswers };

        if (!wrongAnswers[category]) {
          wrongAnswers[category] = [];
        }

        wrongAnswers[category].push({
          ...questionInfo,
          timestamp: Date.now(),
        });

        // Keep max 20 wrong answers per category
        if (wrongAnswers[category].length > 20) {
          wrongAnswers[category] = wrongAnswers[category].slice(-20);
        }

        set({ wrongAnswers });
      },

      // Clear wrong answers for a category
      clearWrongAnswers: (category) => {
        const state = get();
        if (category) {
          const wrongAnswers = { ...state.wrongAnswers };
          delete wrongAnswers[category];
          set({ wrongAnswers });
        } else {
          set({ wrongAnswers: {} });
        }
      },

      // ==================== AI BATTLE RECORDING ====================

      // Record AI battle result
      recordAIBattle: (result) => {
        const state = get();
        const record = { ...state.aiBattleRecord };
        const now = Date.now();

        record.totalBattles += 1;

        if (result === 'win') {
          record.wins += 1;
          record.currentStreak = Math.abs(record.currentStreak) + 1;
        } else if (result === 'loss') {
          record.losses += 1;
          record.currentStreak = Math.max(-1, record.currentStreak) - 1;
        } else {
          record.draws += 1;
          record.currentStreak = 0;
        }

        record.maxStreak = Math.max(record.maxStreak, Math.abs(record.currentStreak));

        // XP for AI battles
        let xpGained = 0;
        if (result === 'win') {
          xpGained += 30;
          xpGained += Math.min(10, record.currentStreak); // Streak bonus
        } else if (result === 'loss') {
          xpGained += 5; // Participation XP
        } else {
          xpGained += 10;
        }

        const xpResult = get().addXP(xpGained);

        set({
          aiBattleRecord: record,
          lastPlayedAt: now,
        });

        return {
          ...xpResult,
          xpGained,
          battleResult: result,
        };
      },

      // Get AI battle stats
      getAIBattleStats: () => {
        const record = get().aiBattleRecord;
        const total = record.totalBattles;
        return {
          ...record,
          winRate: total > 0 ? Math.round((record.wins / total) * 100) : 0,
          totalBattles: total,
        };
      },

      // ==================== GAME HISTORY ====================

      // Get recent games
      getRecentGames: (count = 5) => {
        return get().gameHistory.slice(0, count);
      },

      // Get games by category
      getGamesByCategory: (category) => {
        return get().gameHistory.filter(g => g.categoryStats?.[category]);
      },

      // Calculate overall accuracy
      getOverallAccuracy: () => {
        const state = get();
        let totalCorrect = 0;
        let totalQuestions = 0;

        state.gameHistory.forEach(game => {
          totalCorrect += game.correctAnswers || 0;
          totalQuestions += game.totalQuestions || 0;
        });

        return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      },

      // ==================== STATS ====================

      // Get full stats
      getStats: () => {
        const state = get();
        return {
          level: state.level,
          title: state.title,
          xp: state.xp,
          xpProgress: getXPProgress(state.xp),
          gamesPlayed: state.gamesPlayed,
          wins: state.wins,
          winRate: state.gamesPlayed > 0 ? Math.round((state.wins / state.gamesPlayed) * 100) : 0,
          winStreak: state.winStreak,
          maxWinStreak: state.maxWinStreak,
          overallAccuracy: get().getOverallAccuracy(),
          aiBattleStats: get().getAIBattleStats(),
          strongestCategory: state.strongestCategory,
          weakestCategory: state.weakestCategory,
          favoriteCategories: state.favoriteCategories,
          gameHistoryCount: state.gameHistory.length,
        };
      },

      // ==================== RESET ====================

      // Reset profile (keeps identity but clears stats)
      resetStats: () => {
        const state = get();
        set({
          level: 1,
          xp: 0,
          title: '新手',
          gamesPlayed: 0,
          wins: 0,
          winStreak: 0,
          maxWinStreak: 0,
          gameHistory: [],
          aiBattleRecord: {
            totalBattles: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            currentStreak: 0,
            maxStreak: 0,
          },
          favoriteCategories: [],
          strongestCategory: null,
          weakestCategory: null,
          wrongAnswers: {},
        });
      },

      // Full reset including identity
      fullReset: () => {
        set({ ...initialState, createdAt: Date.now() });
      },
    }),
    {
      name: 'monopoly3d_player_profile',
      partialize: (state) => ({
        playerId: state.playerId,
        displayName: state.displayName,
        avatar: state.avatar,
        level: state.level,
        xp: state.xp,
        title: state.title,
        gamesPlayed: state.gamesPlayed,
        wins: state.wins,
        winStreak: state.winStreak,
        maxWinStreak: state.maxWinStreak,
        gameHistory: state.gameHistory,
        aiBattleRecord: state.aiBattleRecord,
        favoriteCategories: state.favoriteCategories,
        strongestCategory: state.strongestCategory,
        weakestCategory: state.weakestCategory,
        wrongAnswers: state.wrongAnswers,
        createdAt: state.createdAt,
        lastPlayedAt: state.lastPlayedAt,
      }),
    }
  )
);

// Helper function to calculate category performance
function calculateCategoryPerformance(categoryStats, wrongAnswers) {
  let strongest = null;
  let weakest = null;
  let strongestAcc = 0;
  let weakestAcc = 100;

  Object.entries(categoryStats).forEach(([category, stats]) => {
    if (stats.total >= 3) {
      const accuracy = stats.accuracy || 0;
      if (accuracy >= strongestAcc) {
        strongestAcc = accuracy;
        strongest = category;
      }
      if (accuracy <= weakestAcc) {
        weakestAcc = accuracy;
        weakest = category;
      }
    }
  });

  // Don't mark a category as both strongest and weakest
  if (strongest === weakest && strongest !== null) {
    weakest = null;
  }

  return { strongestCategory: strongest, weakestCategory: weakest };
}

// Selector hooks for common use cases
export const usePlayerLevel = () => usePlayerProfile(s => s.level);
export const usePlayerXP = () => usePlayerProfile(s => s.xp);
export const usePlayerTitle = () => usePlayerProfile(s => s.title);
export const useWinStreak = () => usePlayerProfile(s => s.winStreak);
export const useGamesPlayed = () => usePlayerProfile(s => s.gamesPlayed);
export const useWins = () => usePlayerProfile(s => s.wins);
export const useStrongestCategory = () => usePlayerProfile(s => s.strongestCategory);
export const useWeakestCategory = () => usePlayerProfile(s => s.weakestCategory);
export const useAIBattleStats = () => usePlayerProfile(s => s.aiBattleRecord);