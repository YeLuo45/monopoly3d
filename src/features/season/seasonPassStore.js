/**
 * Season Pass Store - Season pass and battle pass management
 * 
 * Features:
 * - Season progression with tier-based rewards
 * - Free tier and premium tier rewards
 * - Daily/weekly seasonal challenges
 * - XP multiplier for premium subscribers
 * - Season reset and history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SEASON_DURATION_DAYS = 28; // 4 weeks

const SEASON_TIERS = [
  { tier: 1, level: 1, xpRequired: 0, freeRewards: ['avatar:star'], premiumRewards: ['avatar:galaxy', 'emote:clap'] },
  { tier: 2, level: 2, xpRequired: 100, freeRewards: ['theme:nebula'], premiumRewards: ['theme:nebula_plus'] },
  { tier: 3, level: 3, xpRequired: 250, freeRewards: ['piece:panda'], premiumRewards: ['piece:panda_glow'] },
  { tier: 4, level: 4, xpRequired: 500, freeRewards: ['emote:fire'], premiumRewards: ['emote:fire_gold'] },
  { tier: 5, level: 5, xpRequired: 800, freeRewards: ['avatar:knight'], premiumRewards: ['avatar:knight_gold'] },
  { tier: 6, level: 6, xpRequired: 1200, freeRewards: ['theme:forest'], premiumRewards: ['theme:forest_plus'] },
  { tier: 7, level: 7, xpRequired: 1700, freeRewards: ['piece:dragon'], premiumRewards: ['piece:dragon_glow'] },
  { tier: 8, level: 8, xpRequired: 2300, freeRewards: ['emote:meteor'], premiumRewards: ['emote:meteor_gold'] },
  { tier: 9, level: 9, xpRequired: 3000, freeRewards: ['avatar:phoenix'], premiumRewards: ['avatar:phoenix_glow'] },
  { tier: 10, level: 10, xpRequired: 3800, freeRewards: ['theme:aurora'], premiumRewards: ['theme:aurora_plus', 'emote:legendary'] },
];

// Generate unique ID
const genId = () => `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create default season state
const createDefaultSeason = (overrides = {}) => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 7)); // Random start in past week
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + SEASON_DURATION_DAYS);

  return {
    id: genId(),
    name: '第1赛季',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    xp: 0,
    tier: 1,
    isPremium: false,
    claimedRewards: [], // Array of claimed reward IDs
    dailyChallenges: [],
    weeklyChallenges: [],
    lastDailyReset: null,
    lastWeeklyReset: null,
    ...overrides,
  };
};

// Daily challenge templates
const DAILY_CHALLENGE_TEMPLATES = [
  { id: 'daily_wins', name: '胜利之路', description: '赢得1局游戏', type: 'win', target: 1, xpReward: 50 },
  { id: 'daily_games', name: '游戏达人', description: '完成3局游戏', type: 'games_played', target: 3, xpReward: 30 },
  { id: 'daily_questions', name: '答题高手', description: '回答20道题目', type: 'questions_answered', target: 20, xpReward: 40 },
  { id: 'daily_correct', name: '正确率', description: '答对15道题', type: 'correct_answers', target: 15, xpReward: 50 },
  { id: 'daily_properties', name: '房产大亨', description: '购买3处房产', type: 'properties_bought', target: 3, xpReward: 60 },
  { id: 'daily_emotes', name: '表情达人', description: '发送5次表情', type: 'emotes_sent', target: 5, xpReward: 20 },
  { id: 'daily_streak', name: '连胜挑战', description: '取得2连胜', type: 'win_streak', target: 2, xpReward: 80 },
];

// Weekly challenge templates
const WEEKLY_CHALLENGE_TEMPLATES = [
  { id: 'weekly_wins', name: '本周胜利', description: '本周赢得5局', type: 'win', target: 5, xpReward: 200 },
  { id: 'weekly_games', name: '游戏时间', description: '本周完成20局', type: 'games_played', target: 20, xpReward: 150 },
  { id: 'weekly_accuracy', name: '准确率挑战', description: '总体正确率超过70%', type: 'accuracy', target: 70, xpReward: 250 },
  { id: 'weekly_questions', name: '知识积累', description: '本周答对100道题', type: 'correct_answers', target: 100, xpReward: 180 },
  { id: 'weekly_streak', name: '连胜王者', description: '取得5连胜', type: 'win_streak', target: 5, xpReward: 300 },
];

export const useSeasonPassStore = create(
  persist(
    (set, get) => ({
      // Current season
      currentSeason: null,

      // Season history
      seasonHistory: [],

      // Premium status
      isPremium: false,

      // ============ Season Management ============

      /**
       * Initialize or resume current season
       */
      initSeason: () => {
        const { currentSeason, seasonHistory } = get();
        
        // Check if current season exists and is valid
        if (currentSeason) {
          const now = new Date();
          const endDate = new Date(currentSeason.endDate);
          if (now < endDate) {
            // Season is still active
            get().checkDailyReset();
            get().checkWeeklyReset();
            return;
          }
        }

        // Start new season
        get().startNewSeason();
      },

      /**
       * Start a new season
       */
      startNewSeason: () => {
        const { seasonHistory } = get();
        
        // Archive current season if exists
        if (get().currentSeason) {
          seasonHistory.push({
            ...get().currentSeason,
            archivedAt: new Date().toISOString(),
          });
        }

        // Cap history at 6 seasons
        const trimmedHistory = seasonHistory.slice(-5);

        // Create new season
        const newSeason = createDefaultSeason();

        set({
          currentSeason: newSeason,
          seasonHistory: trimmedHistory,
        });
      },

      /**
       * Add XP to current season
       * @param {number} amount - XP amount
       * @param {boolean} isBonus - Apply premium bonus (2x for premium)
       */
      addXP: (amount, isBonus = false) => {
        const state = get();
        if (!state.currentSeason) return;

        let xpToAdd = amount;
        if (state.isPremium) {
          xpToAdd = amount * 2; // Premium gets 2x XP
        }

        const newXP = state.currentSeason.xp + xpToAdd;
        
        // Check for tier upgrades
        let newTier = state.currentSeason.tier;
        for (const t of SEASON_TIERS) {
          if (newXP >= t.xpRequired) {
            newTier = t.tier;
          }
        }

        set(state => ({
          currentSeason: {
            ...state.currentSeason,
            xp: newXP,
            tier: newTier,
          },
        }));
      },

      /**
       * Upgrade season pass (premium)
       */
      upgradeToPremium: () => {
        set({ isPremium: true });
        if (get().currentSeason) {
          set(state => ({
            currentSeason: { ...state.currentSeason, isPremium: true },
          }));
        }
      },

      // ============ Reward Claims ============

      /**
       * Claim a reward for a tier
       * @param {number} tier
       * @param {string} rewardType - 'free' or 'premium'
       */
      claimReward: (tier, rewardType = 'free') => {
        const state = get();
        if (!state.currentSeason) return false;

        const tierData = SEASON_TIERS.find(t => t.tier === tier);
        if (!tierData) return false;

        // Check if already claimed
        const rewardId = `tier_${tier}_${rewardType}`;
        if (state.currentSeason.claimedRewards.includes(rewardId)) {
          return false; // Already claimed
        }

        // Check if tier is unlocked
        if (tier > state.currentSeason.tier) {
          return false; // Tier not unlocked
        }

        // Check if premium reward requires premium
        if (rewardType === 'premium' && !state.isPremium) {
          return false; // Need premium
        }

        set(state => ({
          currentSeason: {
            ...state.currentSeason,
            claimedRewards: [...state.currentSeason.claimedRewards, rewardId],
          },
        }));

        return true;
      },

      /**
       * Check if a reward is claimed
       */
      isRewardClaimed: (tier, rewardType = 'free') => {
        const state = get();
        if (!state.currentSeason) return false;
        const rewardId = `tier_${tier}_${rewardType}`;
        return state.currentSeason.claimedRewards.includes(rewardId);
      },

      /**
       * Get all unclaimed rewards for current tier and below
       */
      getUnclaimedRewards: () => {
        const state = get();
        if (!state.currentSeason) return [];

        const unclaimed = [];
        for (let t = 1; t <= state.currentSeason.tier; t++) {
          const tierData = SEASON_TIERS.find(tier => tier.tier === t);
          if (!tierData) continue;

          if (!state.currentSeason.claimedRewards.includes(`tier_${t}_free`)) {
            unclaimed.push({ tier: t, type: 'free', reward: tierData.freeRewards });
          }
          if (state.isPremium && !state.currentSeason.claimedRewards.includes(`tier_${t}_premium`)) {
            unclaimed.push({ tier: t, type: 'premium', reward: tierData.premiumRewards });
          }
        }
        return unclaimed;
      },

      // ============ Challenge Management ============

      /**
       * Check and reset daily challenges if needed
       */
      checkDailyReset: () => {
        const state = get();
        if (!state.currentSeason) return;

        const now = new Date();
        const lastReset = state.currentSeason.lastDailyReset 
          ? new Date(state.currentSeason.lastDailyReset)
          : null;

        // Check if we need to reset (new day)
        if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
          const newChallenges = DAILY_CHALLENGE_TEMPLATES.map(template => ({
            ...template,
            progress: 0,
            completed: false,
            claimed: false,
            id: `daily_${template.id}_${Date.now()}`,
          }));

          set(state => ({
            currentSeason: {
              ...state.currentSeason,
              dailyChallenges: newChallenges,
              lastDailyReset: now.toISOString(),
            },
          }));
        }
      },

      /**
       * Check and reset weekly challenges if needed
       */
      checkWeeklyReset: () => {
        const state = get();
        if (!state.currentSeason) return;

        const now = new Date();
        const lastReset = state.currentSeason.lastWeeklyReset 
          ? new Date(state.currentSeason.lastWeeklyReset)
          : null;

        // Check if we need to reset (new week - Monday)
        const dayOfWeek = now.getDay();
        const mondayOfThisWeek = new Date(now);
        mondayOfThisWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        if (!lastReset) {
          const newChallenges = WEEKLY_CHALLENGE_TEMPLATES.map(template => ({
            ...template,
            progress: 0,
            completed: false,
            claimed: false,
            id: `weekly_${template.id}_${Date.now()}`,
          }));

          set(state => ({
            currentSeason: {
              ...state.currentSeason,
              weeklyChallenges: newChallenges,
              lastWeeklyReset: now.toISOString(),
            },
          }));
        } else {
          const lastResetDate = new Date(lastReset);
          if (now >= mondayOfThisWeek && lastResetDate < mondayOfThisWeek) {
            const newChallenges = WEEKLY_CHALLENGE_TEMPLATES.map(template => ({
              ...template,
              progress: 0,
              completed: false,
              claimed: false,
              id: `weekly_${template.id}_${Date.now()}`,
            }));

            set(state => ({
              currentSeason: {
                ...state.currentSeason,
                weeklyChallenges: newChallenges,
                lastWeeklyReset: now.toISOString(),
              },
            }));
          }
        }
      },

      /**
       * Update challenge progress
       * @param {string} challengeType - e.g., 'win', 'games_played'
       * @param {number} amount - Progress to add
       */
      updateChallengeProgress: (challengeType, amount) => {
        const state = get();
        if (!state.currentSeason) return;

        const updateChallenges = (challenges) =>
          challenges.map(c => {
            if (c.completed) return c;
            const newProgress = c.type === challengeType ? c.progress + amount : c.progress;
            const completed = newProgress >= c.target;
            return { ...c, progress: newProgress, completed };
          });

        set(state => ({
          currentSeason: {
            ...state.currentSeason,
            dailyChallenges: updateChallenges(state.currentSeason.dailyChallenges || []),
            weeklyChallenges: updateChallenges(state.currentSeason.weeklyChallenges || []),
          },
        }));
      },

      /**
       * Claim challenge reward
       * @param {string} challengeId
       * @returns {boolean} - Success
       */
      claimChallengeReward: (challengeId) => {
        const state = get();
        if (!state.currentSeason) return false;

        const claimInList = (challenges) =>
          challenges.map(c => {
            if (c.id !== challengeId || c.claimed || !c.completed) return c;
            
            // Award XP
            get().addXP(c.xpReward, true);
            return { ...c, claimed: true };
          });

        set(state => ({
          currentSeason: {
            ...state.currentSeason,
            dailyChallenges: claimInList(state.currentSeason.dailyChallenges || []),
            weeklyChallenges: claimInList(state.currentSeason.weeklyChallenges || []),
          },
        }));

        return true;
      },

      // ============ Stats & Info ============

      /**
       * Get current season progress info
       */
      getSeasonProgress: () => {
        const state = get();
        if (!state.currentSeason) return null;

        const currentTierData = SEASON_TIERS.find(t => t.tier === state.currentSeason.tier) || SEASON_TIERS[0];
        const nextTierData = SEASON_TIERS.find(t => t.tier === state.currentSeason.tier + 1);

        const xpIntoTier = state.currentSeason.xp - currentTierData.xpRequired;
        const xpForNextTier = nextTierData ? nextTierData.xpRequired - currentTierData.xpRequired : 0;
        const progressPercent = nextTierData 
          ? Math.min(1, xpIntoTier / xpForNextTier) 
          : 1;

        // Calculate days remaining
        const now = new Date();
        const endDate = new Date(state.currentSeason.endDate);
        const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

        return {
          name: state.currentSeason.name,
          xp: state.currentSeason.xp,
          tier: state.currentSeason.tier,
          maxTier: SEASON_TIERS.length,
          progressPercent,
          xpIntoTier,
          xpForNextTier,
          daysRemaining,
          isPremium: state.isPremium,
          claimedRewardsCount: state.currentSeason.claimedRewards?.length || 0,
          totalRewardsCount: SEASON_TIERS.length * 2, // free + premium per tier
        };
      },

      /**
       * Get active challenges (not completed or claimed)
       */
      getActiveChallenges: () => {
        const state = get();
        if (!state.currentSeason) return { daily: [], weekly: [] };

        const activeDaily = (state.currentSeason.dailyChallenges || [])
          .filter(c => !c.claimed)
          .map(c => ({ ...c, timeLeft: '今日' }));

        const activeWeekly = (state.currentSeason.weeklyChallenges || [])
          .filter(c => !c.claimed)
          .map(c => ({ ...c, timeLeft: '本周' }));

        return { daily: activeDaily, weekly: activeWeekly };
      },

      /**
       * Get premium upgrade info
       */
      getPremiumInfo: () => {
        const state = get();
        return {
          isPremium: state.isPremium,
          benefits: [
            '2倍经验值获取',
            '专属高级奖励',
            '独占外观道具',
            '赛季加成标识',
          ],
        };
      },
    }),
    {
      name: 'monopoly3d-season-pass',
    }
  )
);

// Export constants
export { SEASON_TIERS, SEASON_DURATION_DAYS };