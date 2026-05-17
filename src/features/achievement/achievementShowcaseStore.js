/**
 * Achievement Showcase Store - 3D showcase and display state management
 * 
 * Features:
 * - Featured achievements for showcase (rotating carousel)
 * - Achievement collection organization
 * - Rare achievement display
 * - Showcase history and animations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACHIEVEMENTS } from './achievementData';
import { ACHIEVEMENT_RARITY } from './achievementTypes';

const MAX_FEATURED = 6; // Number of achievements in showcase
const MAX_RECENT = 10; // Recent unlocks to remember

// Rarity order for sorting
const RARITY_ORDER = {
  [ACHIEVEMENT_RARITY.LEGENDARY]: 0,
  [ACHIEVEMENT_RARITY.EPIC]: 1,
  [ACHIEVEMENT_RARITY.RARE]: 2,
  [ACHIEVEMENT_RARITY.UNCOMMON]: 3,
  [ACHIEVEMENT_RARITY.COMMON]: 4,
};

export const useAchievementShowcaseStore = create(
  persist(
    (set, get) => ({
      // Currently displayed achievements in showcase
      featuredAchievements: [],

      // Recent unlocks (for notifications/animation triggers)
      recentUnlocks: [],

      // Showcase state
      showcaseIndex: 0, // Current rotation index
      isAutoRotating: true,
      rotationInterval: 5000, // 5 seconds

      // Achievement collection stats
      collectionStats: {
        total: ACHIEVEMENTS.length,
        unlocked: 0,
        byRarity: {
          common: { total: 0, unlocked: 0 },
          uncommon: { total: 0, unlocked: 0 },
          rare: { total: 0, unlocked: 0 },
          epic: { total: 0, unlocked: 0 },
          legendary: { total: 0, unlocked: 0 },
        },
        byCategory: {
          gameplay: { total: 0, unlocked: 0 },
          learning: { total: 0, unlocked: 0 },
          social: { total: 0, unlocked: 0 },
          special: { total: 0, unlocked: 0 },
          seasonal: { total: 0, unlocked: 0 },
        },
      },

      // ============ Featured Achievement Management ============

      /**
       * Update featured achievements based on unlocked achievements
       * @param {object} unlockedAchievements - map of achievement ID -> unlock data
       */
      updateFeaturedAchievements: (unlockedAchievements) => {
        const unlocked = Object.keys(unlockedAchievements);
        const locked = ACHIEVEMENTS.filter(a => !unlocked.includes(a.id));

        // Get recent unlocks
        const recent = unlocked
          .map(id => unlockedAchievements[id])
          .filter(Boolean)
          .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
          .slice(0, MAX_RECENT);

        // Featured: top unlocked by rarity + some locked to aim for
        const featured = [];

        // Add unlocked achievements sorted by rarity
        const unlockedSorted = [...ACHIEVEMENTS]
          .filter(a => unlocked.includes(a.id))
          .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

        // Add top unlocked to featured
        featured.push(...unlockedSorted.slice(0, 3));

        // Add locked legendary/epic as motivation
        const lockedMotivational = [...ACHIEVEMENTS]
          .filter(a => !unlocked.includes(a.id))
          .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

        featured.push(...lockedMotivational.slice(0, MAX_FEATURED - featured.length));

        // If not enough, fill with locked common
        if (featured.length < MAX_FEATURED) {
          const commonLocked = [...ACHIEVEMENTS]
            .filter(a => !unlocked.includes(a.id) && a.rarity === ACHIEVEMENT_RARITY.COMMON);
          featured.push(...commonLocked.slice(0, MAX_FEATURED - featured.length));
        }

        set({
          featuredAchievements: featured.slice(0, MAX_FEATURED),
          recentUnlocks: recent,
          collectionStats: get().calculateCollectionStats(unlockedAchievements),
        });
      },

      /**
       * Calculate collection statistics
       */
      calculateCollectionStats: (unlockedAchievements) => {
        const unlocked = Object.keys(unlockedAchievements);
        const stats = {
          total: ACHIEVEMENTS.length,
          unlocked: unlocked.length,
          byRarity: {},
          byCategory: {},
        };

        // Rarity counts
        Object.values(ACHIEVEMENT_RARITY).forEach(rarity => {
          const total = ACHIEVEMENTS.filter(a => a.rarity === rarity).length;
          const unlockedCount = unlocked.filter(id => {
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            return ach && ach.rarity === rarity;
          }).length;
          stats.byRarity[rarity] = { total, unlocked: unlockedCount };
        });

        // Category counts
        const categories = ['gameplay', 'learning', 'social', 'special', 'seasonal'];
        categories.forEach(cat => {
          const total = ACHIEVEMENTS.filter(a => a.category === cat).length;
          const unlockedCount = unlocked.filter(id => {
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            return ach && ach.category === cat;
          }).length;
          stats.byCategory[cat] = { total, unlocked: unlockedCount };
        });

        return stats;
      },

      /**
       * Get achievement by ID
       */
      getAchievementById: (id) => {
        return ACHIEVEMENTS.find(a => a.id === id);
      },

      /**
       * Get achievements by rarity
       */
      getAchievementsByRarity: (rarity) => {
        return ACHIEVEMENTS.filter(a => a.rarity === rarity);
      },

      /**
       * Get collection progress by rarity
       */
      getRarityProgress: () => {
        const stats = get().collectionStats;
        return Object.entries(stats.byRarity).map(([rarity, data]) => ({
          rarity,
          ...data,
          progress: data.total > 0 ? data.unlocked / data.total : 0,
        }));
      },

      /**
       * Get collection progress by category
       */
      getCategoryProgress: () => {
        const stats = get().collectionStats;
        return Object.entries(stats.byCategory).map(([category, data]) => ({
          category,
          ...data,
          progress: data.total > 0 ? data.unlocked / data.total : 0,
        }));
      },

      // ============ Rotation Control ============

      /**
       * Start auto-rotation
       */
      startRotation: () => {
        set({ isAutoRotating: true });
      },

      /**
       * Stop auto-rotation
       */
      stopRotation: () => {
        set({ isAutoRotating: false });
      },

      /**
       * Set rotation interval
       */
      setRotationInterval: (interval) => {
        set({ rotationInterval: interval });
      },

      /**
       * Go to next showcase item
       */
      nextShowcase: () => {
        const { featuredAchievements, showcaseIndex } = get();
        if (featuredAchievements.length === 0) return;
        set({ showcaseIndex: (showcaseIndex + 1) % featuredAchievements.length });
      },

      /**
       * Go to previous showcase item
       */
      prevShowcase: () => {
        const { featuredAchievements, showcaseIndex } = get();
        if (featuredAchievements.length === 0) return;
        set({
          showcaseIndex: showcaseIndex === 0 
            ? featuredAchievements.length - 1 
            : showcaseIndex - 1
        });
      },

      /**
       * Go to specific showcase index
       */
      goToShowcaseIndex: (index) => {
        const { featuredAchievements } = get();
        if (index >= 0 && index < featuredAchievements.length) {
          set({ showcaseIndex: index });
        }
      },

      /**
       * Get current showcase achievement
       */
      getCurrentShowcase: () => {
        const { featuredAchievements, showcaseIndex } = get();
        return featuredAchievements[showcaseIndex] || null;
      },

      /**
       * Add a new unlock to recent list
       */
      addRecentUnlock: (achievementId, unlockedAt) => {
        const { recentUnlocks } = get();
        const newUnlock = { id: achievementId, unlockedAt };
        const updated = [newUnlock, ...recentUnlocks].slice(0, MAX_RECENT);
        set({ recentUnlocks: updated });
      },

      /**
       * Get rare achievements (epic + legendary)
       */
      getRareAchievements: () => {
        return ACHIEVEMENTS.filter(a => 
          a.rarity === ACHIEVEMENT_RARITY.EPIC || 
          a.rarity === ACHIEVEMENT_RARITY.LEGENDARY
        );
      },

      /**
       * Get completion percentage
       */
      getCompletionPercentage: () => {
        const { collectionStats } = get();
        return collectionStats.total > 0 
          ? (collectionStats.unlocked / collectionStats.total) * 100 
          : 0;
      },
    }),
    {
      name: 'monopoly3d-achievement-showcase',
      partialize: (state) => ({
        // Only persist these fields
        recentUnlocks: state.recentUnlocks,
        collectionStats: state.collectionStats,
        rotationInterval: state.rotationInterval,
      }),
    }
  )
);