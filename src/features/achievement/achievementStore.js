import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACHIEVEMENTS, getTotalPossiblePoints, WEATHER_ACHIEVEMENTS } from './achievementData';
import { WEATHER_TYPES, WEATHER_MULTIPLIERS, ACHIEVEMENT_STATUS } from './achievementTypes';

// Initial state
const initialAchievementState = {
  // Unlocked achievements map: { achievementId: { unlockedAt, progress } }
  unlockedAchievements: {},

  // Current achievement progress during gameplay
  currentProgress: {
    correctStreak: 0,
    mathStreak: 0,
    comebackStreak: 0,
    luckyDiceStreak: 0,
    passedGo: false,
    escapedJail: false,
    fastAnswer: false,
    perfectRound: false,
    defeatedAnotherPlayer: false,
    topThreeStreak: 0,
    achievedPerfection: false,
    playedEarlyBird: false,
    playedNightOwl: false,
    playedDuringSpringFestival: false,
    playedDuringNewYear: false,
    playedCustomMap: false,
  },

  // One-time triggers (reset each game)
  oneTimeTriggers: {
    escapedJail: false,
    passedGo: false,
    fastAnswer: false,
    perfectRound: false,
    defeatedAnotherPlayer: false,
    achievedPerfection: false,
    playedEarlyBird: false,
    playedNightOwl: false,
    playedDuringSpringFestival: false,
    playedDuringNewYear: false,
    playedCustomMap: false,
  },

  // Weather system state
  currentWeather: WEATHER_TYPES.SUNNY,
  weatherChangedAt: Date.now(),
  weatherDuration: 30 * 60 * 1000, // 30 minutes

  // Leaderboard data
  leaderboard: [], // Array of { studentId, name, score, gamesPlayed, wins, lastUpdated }

  // Achievement popup queue
  pendingPopups: [], // Queue of achievement to show

  // Profile stats (synced with game store profile)
  profileStats: {
    gamesPlayed: 0,
    wins: 0,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    propertiesBought: 0,
    maxProperties: 0,
    maxMoneyEarned: 0,
    maxRentCollected: 0,
    rentCollected: 0,
    housesBuilt: 0,
    multiplayerGames: 0,
    roomsHosted: 0,
    friendlyMatches: 0,
    editorUses: 0,
    maxScore: 0,
    uniqueTilesVisited: new Set(),
    categoriesPlayed: new Set(),
    categoryStats: {},
  },
};

export const useAchievementStore = create(
  persist(
    (set, get) => ({
      ...initialAchievementState,

      // ==================== WEATHER SYSTEM ====================

      // Set current weather
      setWeather: (weather) => {
        set({
          currentWeather: weather,
          weatherChangedAt: Date.now(),
        });
      },

      // Get weather multiplier for points
      getWeatherMultiplier: () => {
        return WEATHER_MULTIPLIERS[get().currentWeather] || 1.0;
      },

      // Change weather randomly
      randomizeWeather: () => {
        const weatherTypes = Object.values(WEATHER_TYPES);
        const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        get().setWeather(randomWeather);
      },

      // Check if weather should change (based on duration)
      shouldChangeWeather: () => {
        const { weatherChangedAt, weatherDuration } = get();
        return Date.now() - weatherChangedAt > weatherDuration;
      },

      // Update weather based on time
      updateWeather: () => {
        if (get().shouldChangeWeather()) {
          get().randomizeWeather();
        }
      },

      // ==================== ACHIEVEMENT UNLOCKING ====================

      // Unlock an achievement
      unlockAchievement: (achievementId) => {
        const state = get();
        if (state.unlockedAchievements[achievementId]) return; // Already unlocked

        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (!achievement) return;

        const unlockedAt = Date.now();
        const weatherMultiplier = state.getWeatherMultiplier();
        const finalPoints = Math.floor(achievement.points * weatherMultiplier);

        set(s => ({
          unlockedAchievements: {
            ...s.unlockedAchievements,
            [achievementId]: {
              unlockedAt,
              pointsEarned: finalPoints,
              weatherAtUnlock: s.currentWeather,
            },
          },
          pendingPopups: [
            ...s.pendingPopups,
            {
              ...achievement,
              pointsEarned: finalPoints,
              unlockedAt,
            },
          ],
        }));

        return finalPoints;
      },

      // Check and unlock achievements based on current state
      checkAchievements: (gameState) => {
        const state = get();
        const achievements = state.evaluateAchievements(gameState);
        achievements.forEach(aId => {
          state.unlockAchievement(aId);
        });
      },

      // Evaluate which achievements should be unlocked
      evaluateAchievements: (gameState) => {
        const state = get();
        const unlocked = new Set(Object.keys(state.unlockedAchievements));
        const toUnlock = [];

        ACHIEVEMENTS.forEach(achievement => {
          if (unlocked.has(achievement.id)) return;
          try {
            if (achievement.condition(gameState)) {
              toUnlock.push(achievement.id);
            }
          } catch (e) {
            console.warn(`Error checking achievement ${achievement.id}:`, e);
          }
        });

        return toUnlock;
      },

      // ==================== PROGRESS TRACKING ====================

      // Update current game progress
      updateProgress: (progressUpdate) => {
        set(s => ({
          currentProgress: {
            ...s.currentProgress,
            ...progressUpdate,
          },
        }));
      },

      // Record a correct answer
      recordCorrectAnswer: (category) => {
        set(s => {
          const newStreak = s.currentProgress.correctStreak + 1;
          const newMathStreak = category === 'math' ? s.currentProgress.mathStreak + 1 : s.currentProgress.mathStreak;

          // Check for comeback
          const comebackStreak = s.currentProgress.comebackStreak + 1;

          return {
            currentProgress: {
              ...s.currentProgress,
              correctStreak: newStreak,
              mathStreak: newMathStreak,
              comebackStreak,
            },
            oneTimeTriggers: {
              ...s.oneTimeTriggers,
              fastAnswer: s.currentProgress.fastAnswer,
            },
          };
        });
      },

      // Record a wrong answer
      recordWrongAnswer: () => {
        set(s => ({
          currentProgress: {
            ...s.currentProgress,
            correctStreak: 0,
            mathStreak: 0,
            comebackStreak: 0,
          },
        }));
      },

      // Reset progress for new game
      resetGameProgress: () => {
        set({
          currentProgress: { ...initialAchievementState.currentProgress },
          oneTimeTriggers: { ...initialAchievementState.oneTimeTriggers },
        });
      },

      // Trigger one-time event
      triggerEvent: (eventName) => {
        if (initialAchievementState.oneTimeTriggers.hasOwnProperty(eventName)) {
          set(s => ({
            oneTimeTriggers: {
              ...s.oneTimeTriggers,
              [eventName]: true,
            },
            currentProgress: {
              ...s.currentProgress,
              [eventName]: true,
            },
          }));
        }
      },

      // ==================== PROFILE STATS ====================

      // Update profile stats from game store
      syncProfileStats: (profileData) => {
        set(s => ({
          profileStats: {
            ...s.profileStats,
            ...profileData,
          },
        }));
      },

      // Increment specific stat
      incrementStat: (statName, amount = 1) => {
        set(s => ({
          profileStats: {
            ...s.profileStats,
            [statName]: (s.profileStats[statName] || 0) + amount,
          },
        }));
      },

      // Update category stats
      updateCategoryStats: (category, correct) => {
        set(s => {
          const categoryStats = { ...s.profileStats.categoryStats };
          if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, correct: 0 };
          }
          categoryStats[category] = {
            total: categoryStats[category].total + 1,
            correct: categoryStats[category].correct + (correct ? 1 : 0),
            accuracy: Math.round(
              ((categoryStats[category].correct + (correct ? 1 : 0)) /
                (categoryStats[category].total + 1)) * 100
            ),
          };

          const categoriesPlayed = new Set(s.profileStats.categoriesPlayed);
          categoriesPlayed.add(category);

          return {
            profileStats: {
              ...s.profileStats,
              categoryStats,
              categoriesPlayed,
            },
          };
        });
      },

      // ==================== POPUP MANAGEMENT ====================

      // Get next popup
      getNextPopup: () => {
        const { pendingPopups } = get();
        return pendingPopups.length > 0 ? pendingPopups[0] : null;
      },

      // Remove shown popup
      dismissPopup: () => {
        set(s => ({
          pendingPopups: s.pendingPopups.slice(1),
        }));
      },

      // ==================== LEADERBOARD ====================

      // Update leaderboard entry
      updateLeaderboard: (entry) => {
        set(s => {
          const leaderboard = [...s.leaderboard];
          const existingIndex = leaderboard.findIndex(e => e.studentId === entry.studentId);

          if (existingIndex >= 0) {
            leaderboard[existingIndex] = {
              ...leaderboard[existingIndex],
              ...entry,
              lastUpdated: Date.now(),
            };
          } else {
            leaderboard.push({
              ...entry,
              lastUpdated: Date.now(),
            });
          }

          // Sort by score descending
          leaderboard.sort((a, b) => b.score - a.score);

          // Keep only top 100
          return { leaderboard: leaderboard.slice(0, 100) };
        });
      },

      // Get player rank
      getPlayerRank: (studentId) => {
        const { leaderboard } = get();
        const index = leaderboard.findIndex(e => e.studentId === studentId);
        return index >= 0 ? index + 1 : null;
      },

      // ==================== POINTS & SCORING ====================

      // Calculate total earned points
      getTotalEarnedPoints: () => {
        const { unlockedAchievements } = get();
        return Object.values(unlockedAchievements).reduce(
          (sum, data) => sum + (data.pointsEarned || 0),
          0
        );
      },

      // Get achievement percentage
      getCompletionPercentage: () => {
        const { unlockedAchievements } = get();
        return Math.round((Object.keys(unlockedAchievements).length / ACHIEVEMENTS.length) * 100);
      },

      // ==================== STATE EXPORT ====================

      // Export achievement state for game store
      exportState: () => {
        const state = get();
        return {
          profile: {
            ...state.profileStats,
            achievementsUnlocked: Object.keys(state.unlockedAchievements).length,
            totalPoints: state.getTotalEarnedPoints(),
            completionPercentage: state.getCompletionPercentage(),
          },
          achievementProgress: {
            ...state.currentProgress,
            ...state.oneTimeTriggers,
            unlockedCount: Object.keys(state.unlockedAchievements).length,
          },
          justWonAsRicher: state.currentProgress.achievedPerfection,
        };
      },

      // Get all unlocked achievements
      getUnlockedAchievements: () => {
        const { unlockedAchievements } = get();
        return ACHIEVEMENTS.filter(a => unlockedAchievements[a.id])
          .map(a => ({
            ...a,
            ...unlockedAchievements[a.id],
          }));
      },

      // Get achievements by status
      getAchievementsByStatus: (status) => {
        const { unlockedAchievements, currentProgress } = get();

        return ACHIEVEMENTS.map(a => {
          if (unlockedAchievements[a.id]) {
            return { ...a, status: ACHIEVEMENT_STATUS.UNLOCKED, ...unlockedAchievements[a.id] };
          }

          // Check if in progress
          if (a.trait && currentProgress[a.trait] > 0) {
            return { ...a, status: ACHIEVEMENT_STATUS.IN_PROGRESS, progress: currentProgress[a.trait] };
          }

          return { ...a, status: ACHIEVEMENT_STATUS.LOCKED };
        });
      },

      // Reset all achievements (for testing)
      resetAchievements: () => {
        set({
          unlockedAchievements: {},
          currentProgress: { ...initialAchievementState.currentProgress },
          oneTimeTriggers: { ...initialAchievementState.oneTimeTriggers },
          pendingPopups: [],
        });
      },
    }),
    {
      name: 'monopoly3d_achievements',
      partialize: (state) => ({
        unlockedAchievements: state.unlockedAchievements,
        profileStats: {
          ...state.profileStats,
          // Convert Sets to Arrays for persistence
          uniqueTilesVisited: Array.from(state.profileStats.uniqueTilesVisited || []),
          categoriesPlayed: Array.from(state.profileStats.categoriesPlayed || []),
        },
        leaderboard: state.leaderboard,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.profileStats) {
          // Convert Arrays back to Sets
          if (Array.isArray(state.profileStats.uniqueTilesVisited)) {
            state.profileStats.uniqueTilesVisited = new Set(state.profileStats.uniqueTilesVisited);
          }
          if (Array.isArray(state.profileStats.categoriesPlayed)) {
            state.profileStats.categoriesPlayed = new Set(state.profileStats.categoriesPlayed);
          }
        }
      },
    }
  )
);

// Selector hooks for performance
export const useWeather = () => useAchievementStore(s => s.currentWeather);
export const useWeatherMultiplier = () => useAchievementStore(s => s.getWeatherMultiplier());
export const useUnlockedCount = () => useAchievementStore(s => Object.keys(s.unlockedAchievements).length);
export const useTotalPoints = () => useAchievementStore(s => s.getTotalEarnedPoints());
export const useCompletionPercentage = () => useAchievementStore(s => s.getCompletionPercentage());
export const useNextPopup = () => useAchievementStore(s => s.pendingPopups[0]);
