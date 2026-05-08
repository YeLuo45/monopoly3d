// AI Brain - Strategic decision making for AI opponents
// Provides scoring functions for property purchase and house building decisions
// Self-evolution learning system with adaptive difficulty

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BOARD_CONFIG, BOARD_SIZE } from './boardConfig';

// AI Difficulty levels
export const AI_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
  ADAPTIVE: 'adaptive',  // Self-evolving AI based on player performance
};

const DIFFICULTY_LABELS = {
  [AI_DIFFICULTY.EASY]: '简单',
  [AI_DIFFICULTY.NORMAL]: '普通',
  [AI_DIFFICULTY.HARD]: '困难',
  [AI_DIFFICULTY.ADAPTIVE]: '自适应',
};

export const DIFFICULTY_NOISE = {
  [AI_DIFFICULTY.EASY]: 0.5,    // 50% random noise
  [AI_DIFFICULTY.NORMAL]: 0.2,   // 20% random noise
  [AI_DIFFICULTY.HARD]: 0.0,    // No noise
};

// Self-Evolution Configuration
const LEARNING_CONFIG = {
  STREAK_THRESHOLD: 3,           // Win/Loss streak before adjustment
  DIFFICULTY_STEP: 0.1,          // How much to adjust per streak
  MIN_DIFFICULTY: 0.0,           // Hardest (noise = 0)
  MAX_DIFFICULTY: 1.0,           // Easiest (noise = 0.5)
  DECAY_RATE: 0.95,              // Older decisions count less
  DECISION_MEMORY_SIZE: 100,     // Max decisions to remember per AI
  ADAPTATION_WEIGHT: 0.3,        // How much to weigh recent vs older performance
};

// Cash reserve thresholds
const SAFETY_FUND = 300;
const HOUSE_COST = 50;

// ==================== AI BRAIN STORE ====================

/**
 * Create AI Brain Store with self-evolution learning
 * Manages adaptive difficulty, decision recording, and behavior profiling
 */
const createAIBrainStore = () => {
  return create(
    persist(
      (set, get) => ({
        // AI Profiles: tracks behavior and performance per AI type
        aiProfiles: {
          [AI_DIFFICULTY.EASY]: {
            difficulty: AI_DIFFICULTY.EASY,
            noiseLevel: 0.5,
            winStreak: 0,
            lossStreak: 0,
            totalGames: 0,
            totalWins: 0,
            adaptiveNoise: 0.5,
            lastAdjusted: null,
          },
          [AI_DIFFICULTY.NORMAL]: {
            difficulty: AI_DIFFICULTY.NORMAL,
            noiseLevel: 0.2,
            winStreak: 0,
            lossStreak: 0,
            totalGames: 0,
            totalWins: 0,
            adaptiveNoise: 0.2,
            lastAdjusted: null,
          },
          [AI_DIFFICULTY.HARD]: {
            difficulty: AI_DIFFICULTY.HARD,
            noiseLevel: 0.0,
            winStreak: 0,
            lossStreak: 0,
            totalGames: 0,
            totalWins: 0,
            adaptiveNoise: 0.0,
            lastAdjusted: null,
          },
        },

        // Decision history for each AI profile
        decisionHistory: {
          [AI_DIFFICULTY.EASY]: [],
          [AI_DIFFICULTY.NORMAL]: [],
          [AI_DIFFICULTY.HARD]: [],
        },

        // Behavior patterns observed from human players
        behaviorPatterns: {
          aggressiveBuying: 0,      // How often human buys expensive properties
          cautiousPlaying: 0,       // How often human saves money
          strategicBuilding: 0,     // How often human builds on monopolies
          riskTaking: 0,            // How often human takes risky decisions
          questionAccuracy: 0.5,    // Human's overall question accuracy
          categoryStrengths: {},     // Accuracy by category
        },

        // Game history for learning
        gameHistory: [],

        // Current session decisions (for real-time adaptation)
        sessionDecisions: [],

        // ==================== CORE FUNCTIONS ====================

        /**
         * Get adaptive noise level for an AI difficulty
         */
        getAdaptiveNoise: (difficulty) => {
          const profile = get().aiProfiles[difficulty];
          return profile ? profile.adaptiveNoise : DIFFICULTY_NOISE[difficulty];
        },

        /**
         * Record a game result for learning
         */
        recordGameResult: (difficulty, won, playerPerformance) => {
          set((state) => {
            const profile = { ...state.aiProfiles[difficulty] };
            const now = Date.now();

            // Update streaks
            if (won) {
              profile.winStreak = profile.winStreak + 1;
              profile.lossStreak = 0;
            } else {
              profile.lossStreak = profile.lossStreak + 1;
              profile.winStreak = 0;
            }

            // Check for adaptive difficulty adjustment
            const streak = won ? profile.winStreak : profile.lossStreak;
            if (streak >= LEARNING_CONFIG.STREAK_THRESHOLD) {
              const adjustment = LEARNING_CONFIG.DIFFICULTY_STEP * streak;
              if (won && profile.adaptiveNoise < LEARNING_CONFIG.MAX_DIFFICULTY) {
                // AI winning too much - make it harder (less noise = smarter)
                profile.adaptiveNoise = Math.min(
                  LEARNING_CONFIG.MAX_DIFFICULTY,
                  profile.adaptiveNoise + adjustment
                );
              } else if (!won && profile.adaptiveNoise > LEARNING_CONFIG.MIN_DIFFICULTY) {
                // AI losing too much - make it easier (more noise = dumber)
                profile.adaptiveNoise = Math.max(
                  LEARNING_CONFIG.MIN_DIFFICULTY,
                  profile.adaptiveNoise - adjustment
                );
              }
              profile.lastAdjusted = now;
            }

            // Update stats
            profile.totalGames += 1;
            if (won) profile.totalWins += 1;

            return {
              aiProfiles: {
                ...state.aiProfiles,
                [difficulty]: profile,
              },
              gameHistory: [
                ...state.gameHistory.slice(-99), // Keep last 100 games
                {
                  difficulty,
                  won,
                  timestamp: now,
                  playerPerformance,
                },
              ],
            };
          });
        },

        /**
         * Record an AI decision for learning
         */
        recordDecision: (difficulty, decision, context, score) => {
          set((state) => {
            const history = state.decisionHistory[difficulty] || [];
            const newDecision = {
              ...decision,
              context,
              score,
              timestamp: Date.now(),
              success: null, // Will be updated later
            };

            // Decay old decisions
            const now = Date.now();
            const decayingHistory = history
              .map((d) => ({
                ...d,
                weight: d.weight
                  ? d.weight * LEARNING_CONFIG.DECAY_RATE
                  : LEARNING_CONFIG.DECAY_RATE,
              }))
              .filter((d) => d.weight > 0.1);

            return {
              decisionHistory: {
                ...state.decisionHistory,
                [difficulty]: [...decayingHistory, newDecision].slice(
                  -LEARNING_CONFIG.DECISION_MEMORY_SIZE
                ),
              },
              sessionDecisions: [...state.sessionDecisions, newDecision].slice(-20),
            };
          });
        },

        /**
         * Update decision success after outcome is known
         */
        updateDecisionOutcome: (difficulty, timestamp, success) => {
          set((state) => {
            const history = state.decisionHistory[difficulty];
            if (!history) return state;

            const updatedHistory = history.map((d) =>
              d.timestamp === timestamp ? { ...d, success } : d
            );

            return {
              decisionHistory: {
                ...state.decisionHistory,
                [difficulty]: updatedHistory,
              },
            };
          });
        },

        /**
         * Analyze human player behavior for AI adaptation
         */
        analyzeHumanBehavior: (gameActions) => {
          set((state) => {
            const patterns = { ...state.behaviorPatterns };

            // Analyze buying patterns
            const buyingDecisions = gameActions.filter((a) => a.type === 'buy_property');
            if (buyingDecisions.length > 0) {
              const expensiveBuys = buyingDecisions.filter(
                (a) => a.price > 150
              ).length;
              patterns.aggressiveBuying =
                (patterns.aggressiveBuying * 0.7) +
                (expensiveBuys / buyingDecisions.length) * 0.3;
            }

            // Analyze money management
            const moneyDecisions = gameActions.filter((a) => a.type === 'money_management');
            if (moneyDecisions.length > 0) {
              const cautious = moneyDecisions.filter(
                (a) => a.savedMoney > a.spentMoney
              ).length;
              patterns.cautiousPlaying =
                (patterns.cautiousPlaying * 0.7) +
                (cautious / moneyDecisions.length) * 0.3;
            }

            // Analyze building patterns
            const buildingDecisions = gameActions.filter(
              (a) => a.type === 'build_house'
            );
            if (buildingDecisions.length > 0) {
              const strategicBuilds = buildingDecisions.filter(
                (a) => a.isMonopoly
              ).length;
              patterns.strategicBuilding =
                (patterns.strategicBuilding * 0.7) +
                (strategicBuilds / buildingDecisions.length) * 0.3;
            }

            // Update question accuracy
            const questions = gameActions.filter((a) => a.type === 'answer_question');
            if (questions.length > 0) {
              const correct = questions.filter((a) => a.correct).length;
              patterns.questionAccuracy =
                (patterns.questionAccuracy * 0.7) +
                (correct / questions.length) * 0.3;
            }

            return {
              behaviorPatterns: patterns,
            };
          });
        },

        /**
         * Get recommended difficulty based on human player performance
         */
        getRecommendedDifficulty: (currentDifficulty) => {
          const profile = get().aiProfiles[currentDifficulty];
          if (!profile || profile.totalGames < 3) {
            return currentDifficulty; // Not enough data
          }

          const winRate = profile.totalWins / profile.totalGames;
          const recentGames = get().gameHistory.slice(-5);
          const recentWinRate =
            recentGames.length > 0
              ? recentGames.filter((g) => g.won).length / recentGames.length
              : winRate;

          // If human is winning too much (>70%), increase AI difficulty
          if (recentWinRate > 0.7 && currentDifficulty !== AI_DIFFICULTY.HARD) {
            if (currentDifficulty === AI_DIFFICULTY.EASY) {
              return AI_DIFFICULTY.NORMAL;
            }
            return AI_DIFFICULTY.HARD;
          }

          // If human is losing too much (<30%), decrease AI difficulty
          if (recentWinRate < 0.3 && currentDifficulty !== AI_DIFFICULTY.EASY) {
            if (currentDifficulty === AI_DIFFICULTY.HARD) {
              return AI_DIFFICULTY.NORMAL;
            }
            return AI_DIFFICULTY.EASY;
          }

          return currentDifficulty;
        },

        /**
         * Get behavior-adjusted decision modifier
         */
        getBehaviorModifier: (decisionType) => {
          const patterns = get().behaviorPatterns;
          switch (decisionType) {
            case 'buy_expensive':
              return patterns.aggressiveBuying > 0.5 ? 1.2 : 0.8;
            case 'save_money':
              return patterns.cautiousPlaying > 0.5 ? 1.1 : 0.9;
            case 'build_monopoly':
              return patterns.strategicBuilding > 0.5 ? 1.15 : 0.85;
            default:
              return 1.0;
          }
        },

        /**
         * Get AI performance statistics
         */
        getAIStats: (difficulty) => {
          const profile = get().aiProfiles[difficulty];
          if (!profile) return null;

          const recentGames = get().gameHistory.slice(-10);
          const recentWins = recentGames.filter((g) => g.difficulty === difficulty && g.won).length;

          return {
            totalGames: profile.totalGames,
            totalWins: profile.totalWins,
            winRate: profile.totalGames > 0 ? profile.totalWins / profile.totalGames : 0,
            winStreak: profile.winStreak,
            lossStreak: profile.lossStreak,
            adaptiveNoise: profile.adaptiveNoise,
            recentWinRate: recentGames.length > 0 ? recentWins / recentGames.length : 0,
            lastAdjusted: profile.lastAdjusted,
          };
        },

        /**
         * Get learning insights from decision history
         */
        getLearningInsights: (difficulty) => {
          const history = get().decisionHistory[difficulty] || [];
          const successfulDecisions = history.filter((d) => d.success === true);
          const failedDecisions = history.filter((d) => d.success === false);

          // Find common patterns in successful vs failed decisions
          const avgScoreSuccess = successfulDecisions.length > 0
            ? successfulDecisions.reduce((sum, d) => sum + d.score, 0) / successfulDecisions.length
            : 0;
          const avgScoreFailure = failedDecisions.length > 0
            ? failedDecisions.reduce((sum, d) => sum + d.score, 0) / failedDecisions.length
            : 0;

          return {
            totalDecisions: history.length,
            successfulDecisions: successfulDecisions.length,
            failedDecisions: failedDecisions.length,
            avgScoreSuccess,
            avgScoreFailure,
            decisionTypes: {
              buy: history.filter((d) => d.action === 'buy').length,
              build: history.filter((d) => d.action === 'build').length,
              pass: history.filter((d) => d.action === 'pass').length,
            },
          };
        },

        /**
         * Reset AI learning data (for new game session)
         */
        resetSession: () => {
          set({ sessionDecisions: [] });
        },

        /**
         * Clear all learning data
         */
        clearAllLearning: () => {
          set({
            aiProfiles: {
              [AI_DIFFICULTY.EASY]: {
                difficulty: AI_DIFFICULTY.EASY,
                noiseLevel: 0.5,
                winStreak: 0,
                lossStreak: 0,
                totalGames: 0,
                totalWins: 0,
                adaptiveNoise: 0.5,
                lastAdjusted: null,
              },
              [AI_DIFFICULTY.NORMAL]: {
                difficulty: AI_DIFFICULTY.NORMAL,
                noiseLevel: 0.2,
                winStreak: 0,
                lossStreak: 0,
                totalGames: 0,
                totalWins: 0,
                adaptiveNoise: 0.2,
                lastAdjusted: null,
              },
              [AI_DIFFICULTY.HARD]: {
                difficulty: AI_DIFFICULTY.HARD,
                noiseLevel: 0.0,
                winStreak: 0,
                lossStreak: 0,
                totalGames: 0,
                totalWins: 0,
                adaptiveNoise: 0.0,
                lastAdjusted: null,
              },
            },
            decisionHistory: {
              [AI_DIFFICULTY.EASY]: [],
              [AI_DIFFICULTY.NORMAL]: [],
              [AI_DIFFICULTY.HARD]: [],
            },
            gameHistory: [],
            sessionDecisions: [],
          });
        },

        /**
         * Export learning data for analysis
         */
        exportLearningData: () => {
          const state = get();
          return {
            aiProfiles: state.aiProfiles,
            decisionHistory: state.decisionHistory,
            gameHistory: state.gameHistory,
            behaviorPatterns: state.behaviorPatterns,
            exportedAt: Date.now(),
          };
        },
      }),
      {
        name: 'monopoly3d-ai-brain',
        version: 1,
      }
    )
  );
};

// Create singleton store instance
export const useAIBrainStore = createAIBrainStore();

// ==================== EXISTING SCORING FUNCTIONS ====================

/**
 * Get all tiles in the same color group as the given tile
 */
function getColorGroupTiles(tile) {
  if (!tile || !tile.group) return [];
  return BOARD_CONFIG.filter(t => t.type === 'property' && t.group === tile.group && t.id !== tile.id);
}

/**
 * Count how many tiles in a color group are owned by a player
 */
function countOwnedInGroup(playerId, groupTiles) {
  return groupTiles.filter(t => t.owner === playerId).length;
}

/**
 * Check if a color group is complete (player owns all tiles)
 */
function isColorGroupComplete(playerId, groupTiles) {
  return groupTiles.every(t => t.owner === playerId);
}

/**
 * Calculate traffic score for a tile (how often opponents pass through)
 * Corners and high-rent tiles have higher traffic
 */
function calculateTrafficScore(tile) {
  let traffic = 0;
  
  // Corners have highest traffic (GO, Jail, Free Parking, Go To Jail)
  if ([0, 10, 20, 27].includes(tile.id)) {
    traffic += 15;
  }
  
  // High-rent properties tend to be in high-traffic areas
  if (tile.type === 'property') {
    traffic += Math.min(10, tile.price / 50);
  }
  
  // Tax tiles and question tiles see regular traffic
  if (tile.type === 'tax') {
    traffic += 5;
  }
  
  return traffic;
}

/**
 * Score a property purchase decision
 * Higher score = more desirable to purchase
 * 
 * @param {Object} tile - The property tile to score
 * @param {Object} player - The AI player
 * @param {Object} state - Full game state
 * @param {string} difficulty - AI difficulty level
 * @returns {number} Score for purchasing this property
 */
export function scorePropertyPurchase(tile, player, state, difficulty = AI_DIFFICULTY.NORMAL) {
  if (!tile || tile.type !== 'property' || tile.owner !== null) {
    return -Infinity;
  }
  
  let score = 0;
  const groupTiles = getColorGroupTiles(tile);
  
  // 1. FUND SAFETY: Penalty if purchase leaves insufficient funds
  const remainingCash = player.money - tile.price;
  if (remainingCash < 0) {
    return -Infinity; // Can't afford
  }
  if (remainingCash < SAFETY_FUND) {
    score -= (SAFETY_FUND - remainingCash) * 0.5; // Risk penalty
  }
  
  // 2. COLOR GROUP COMPLETION BONUS
  const ownedInGroup = countOwnedInGroup(player.id, groupTiles);
  const totalInGroup = groupTiles.length + 1; // +1 for the tile being purchased
  
  // Only 1 tile away from complete group = huge bonus
  if (ownedInGroup === totalInGroup - 1) {
    score += 50;
  } else if (ownedInGroup > 0) {
    score += 20 * ownedInGroup;
  }
  
  // 3. ROI CALCULATION: Estimate payback turns
  if (tile.type === 'property' && tile.rent && tile.rent.length > 0) {
    const baseRent = tile.rent[0];
    const avgRent = baseRent * 0.3; // Assume 30% chance someone lands
    
    if (avgRent > 0) {
      const paybackTurns = tile.price / avgRent;
      // Faster payback = better investment
      score += Math.max(0, 25 - paybackTurns);
    }
  }
  
  // 4. TRAFFIC VALUE: Properties in high-traffic areas
  score += calculateTrafficScore(tile) * 2;
  
  // 5. ALREADY COMPLETE GROUP: If player owns full group, monopoly is very valuable
  if (isColorGroupComplete(player.id, groupTiles)) {
    score += 30;
  }
  
  // Apply difficulty-based noise (using adaptive noise from store)
  const noise = useAIBrainStore.getState().getAdaptiveNoise(difficulty);
  if (noise > 0) {
    const noiseFactor = 1 + (Math.random() - 0.5) * noise * 2;
    score *= noiseFactor;
  }
  
  return score;
}

/**
 * Score a house building decision on a specific property
 * 
 * @param {Object} tile - The property tile to build on
 * @param {Object} player - The AI player
 * @param {Object} state - Full game state
 * @param {string} difficulty - AI difficulty level
 * @returns {number} Score for building a house on this property
 */
export function scoreBuildHouse(tile, player, state, difficulty = AI_DIFFICULTY.NORMAL) {
  if (!tile || tile.type !== 'property') {
    return -Infinity;
  }
  
  // Can only build on properties player owns
  if (tile.owner !== player.id) {
    return -Infinity;
  }
  
  // Can't build if already at max houses
  if (tile.houses >= 4) {
    return -Infinity;
  }
  
  // Can't afford to build
  if (player.money < HOUSE_COST) {
    return -Infinity;
  }
  
  // Safety fund check
  if (player.money - HOUSE_COST < SAFETY_FUND) {
    return -Infinity;
  }
  
  let score = 0;
  const groupTiles = getColorGroupTiles(tile);
  
  // 1. FULL COLOR GROUP PRIORITY: Buildings on complete groups are much more valuable
  if (isColorGroupComplete(player.id, groupTiles)) {
    score += 40;
  } else {
    // Only build if at least 2 of the group are owned
    const ownedInGroup = countOwnedInGroup(player.id, groupTiles);
    if (ownedInGroup < 2) {
      return -Infinity; // Not worth building without monopoly potential
    }
    score += 15 * ownedInGroup;
  }
  
  // 2. HIGH-TRAFFIC TILES: Buildings on high-traffic areas pay off faster
  score += calculateTrafficScore(tile) * 3;
  
  // 3. ROI CALCULATION: Buildings on expensive properties have better ROI
  if (tile.rent && tile.rent.length > 0) {
    const currentRent = tile.rent[Math.min(tile.houses, 4)];
    const nextRent = tile.rent[Math.min(tile.houses + 1, 4)];
    const rentIncrease = nextRent - currentRent;
    
    if (rentIncrease > 0) {
      const paybackTurns = HOUSE_COST / (rentIncrease * 0.3);
      score += Math.max(0, 30 - paybackTurns);
    }
  }
  
  // Apply difficulty-based noise (using adaptive noise from store)
  const noise = useAIBrainStore.getState().getAdaptiveNoise(difficulty);
  if (noise > 0) {
    const noiseFactor = 1 + (Math.random() - 0.5) * noise * 2;
    score *= noiseFactor;
  }
  
  return score;
}

/**
 * Choose the best action for AI using scoring system
 * 
 * @param {Object} state - Full game state
 * @param {number} playerIndex - Index of the AI player in state.players
 * @param {string} difficulty - AI difficulty level
 * @returns {Object} Action to take: { action: 'buy'|'build'|'pass', tileId?: number }
 */
export function chooseAIAction(state, playerIndex, difficulty = AI_DIFFICULTY.NORMAL) {
  const player = state.players[playerIndex];
  if (!player || !player.isAI) {
    return { action: 'pass' };
  }
  
  const pos = player.position;
  const currentTile = BOARD_CONFIG[pos];
  
  // 1. EVALUATE PROPERTY PURCHASE
  if (currentTile && currentTile.type === 'property' && currentTile.owner === null) {
    const buyScore = scorePropertyPurchase(currentTile, player, state, difficulty);
    
    // Determine if AI should buy based on difficulty
    const buyThreshold = difficulty === AI_DIFFICULTY.EASY ? -20 :
                         difficulty === AI_DIFFICULTY.NORMAL ? 0 :
                         10;
    
    const adaptiveNoise = useAIBrainStore.getState().getAdaptiveNoise(difficulty);
    const easyRandomFactor = adaptiveNoise > 0.3 ? 0.3 : 0;
    
    if (buyScore > buyThreshold || Math.random() < easyRandomFactor) {
      // Record the decision for learning
      useAIBrainStore.getState().recordDecision(difficulty, {
        action: 'buy',
        tileId: currentTile.id,
        position: pos,
      }, {
        playerMoney: player.money,
        tilePrice: currentTile.price,
        groupOwned: countOwnedInGroup(player.id, getColorGroupTiles(currentTile)),
      }, buyScore);
      
      return { action: 'buy' };
    }
  }
  
  // 2. EVALUATE HOUSE BUILDING
  const buildableProperties = player.properties
    .map(propId => BOARD_CONFIG[propId])
    .filter(tile => tile && tile.type === 'property' && tile.owner === player.id && tile.houses < 4);
  
  if (buildableProperties.length > 0 && player.money >= HOUSE_COST + SAFETY_FUND) {
    let bestBuildScore = -Infinity;
    let bestTileId = null;
    
    for (const tile of buildableProperties) {
      const buildScore = scoreBuildHouse(tile, player, state, difficulty);
      if (buildScore > bestBuildScore) {
        bestBuildScore = buildScore;
        bestTileId = tile.id;
      }
    }
    
    const buildThreshold = difficulty === AI_DIFFICULTY.EASY ? -10 :
                           difficulty === AI_DIFFICULTY.NORMAL ? 5 :
                           15;
    
    if (bestBuildScore > buildThreshold) {
      // Record the decision for learning
      useAIBrainStore.getState().recordDecision(difficulty, {
        action: 'build',
        tileId: bestTileId,
      }, {
        playerMoney: player.money,
        houseCost: HOUSE_COST,
      }, bestBuildScore);
      
      return { action: 'build', tileId: bestTileId };
    }
  }
  
  // 3. DEFAULT: PASS
  useAIBrainStore.getState().recordDecision(difficulty, {
    action: 'pass',
    position: pos,
  }, {
    playerMoney: player.money,
  }, 0);
  
  return { action: 'pass' };
}

/**
 * Get difficulty label in Chinese
 */
export function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS[AI_DIFFICULTY.NORMAL];
}

// ==================== ADAPTIVE AI FUNCTIONS ====================

/**
 * Get the effective difficulty for an AI player
 * For ADAPTIVE AI, this calculates difficulty based on player performance
 * using the AI Brain Store's data
 */
export function getAdaptiveDifficulty() {
  const store = useAIBrainStore.getState();
  const profiles = store.aiProfiles;
  
  // Find the base difficulty with best win rate for player
  const winRates = [
    { difficulty: AI_DIFFICULTY.EASY, rate: profiles[AI_DIFFICULTY.EASY].totalGames > 0 
      ? profiles[AI_DIFFICULTY.EASY].totalWins / profiles[AI_DIFFICULTY.EASY].totalGames : 0.5 },
    { difficulty: AI_DIFFICULTY.NORMAL, rate: profiles[AI_DIFFICULTY.NORMAL].totalGames > 0 
      ? profiles[AI_DIFFICULTY.NORMAL].totalWins / profiles[AI_DIFFICULTY.NORMAL].totalGames : 0.5 },
    { difficulty: AI_DIFFICULTY.HARD, rate: profiles[AI_DIFFICULTY.HARD].totalGames > 0 
      ? profiles[AI_DIFFICULTY.HARD].totalWins / profiles[AI_DIFFICULTY.HARD].totalGames : 0.5 },
  ];
  
  // Sort by win rate descending
  winRates.sort((a, b) => b.rate - a.rate);
  
  // If player winning too much (>60%), increase AI difficulty
  // If player losing too much (<40%), decrease AI difficulty
  const recentWinRate = winRates[0].rate;
  const recentDifficulty = winRates[0].difficulty;
  
  if (recentWinRate > 0.6 && recentDifficulty !== AI_DIFFICULTY.HARD) {
    return AI_DIFFICULTY.HARD;
  } else if (recentWinRate < 0.4 && recentDifficulty !== AI_DIFFICULTY.EASY) {
    return AI_DIFFICULTY.EASY;
  }
  return AI_DIFFICULTY.NORMAL;
}

/**
 * Get adaptive AI status info for display
 */
export function getAdaptiveAIStatus() {
  const store = useAIBrainStore.getState();
  const profiles = store.aiProfiles;
  const gameHistory = store.gameHistory;
  
  const totalGames = gameHistory.length;
  const humanWins = gameHistory.filter(g => g.won).length;
  const playerWinRate = totalGames > 0 ? humanWins / totalGames : 0.5;
  
  // Calculate player accuracy from behavior patterns
  const questionAccuracy = store.behaviorPatterns.questionAccuracy;
  
  // Get suggested difficulty based on recent performance
  let suggestedDifficulty = getAdaptiveDifficulty();
  
  let statusMessage = '';
  if (totalGames < 3) {
    statusMessage = `需要至少3局游戏来适应 (当前: ${totalGames}/3)`;
  } else if (suggestedDifficulty === AI_DIFFICULTY.HARD) {
    statusMessage = '检测到玩家技术提升 → AI将提高难度';
  } else if (suggestedDifficulty === AI_DIFFICULTY.EASY) {
    statusMessage = '检测到玩家遇到困难 → AI将降低难度';
  } else {
    statusMessage = 'AI难度适应良好';
  }
  
  // Get per-difficulty stats
  const easyStats = store.getAIStats(AI_DIFFICULTY.EASY);
  const normalStats = store.getAIStats(AI_DIFFICULTY.NORMAL);
  const hardStats = store.getAIStats(AI_DIFFICULTY.HARD);
  
  return {
    gamesPlayed: totalGames,
    playerWinRate: Math.round(playerWinRate * 100),
    playerAccuracy: Math.round(questionAccuracy * 100),
    suggestedDifficulty,
    statusMessage,
    easyStats: easyStats ? { games: easyStats.totalGames, wins: easyStats.totalWins, winRate: Math.round(easyStats.winRate * 100) } : null,
    normalStats: normalStats ? { games: normalStats.totalGames, wins: normalStats.totalWins, winRate: Math.round(normalStats.winRate * 100) } : null,
    hardStats: hardStats ? { games: hardStats.totalGames, wins: hardStats.totalWins, winRate: Math.round(hardStats.winRate * 100) } : null,
  };
}

/**
 * Learn from game results and update adaptive AI state
 * Called at game end to improve AI's understanding of player skill
 * 
 * @param {Object} gameResult - { winner: Object, players: Array, questionsAnswered: Array }
 */
export function learn(gameResult) {
  const { winner, players, questionsAnswered } = gameResult;
  
  // Find human player(s)
  const humanPlayers = players.filter(p => !p.isAI);
  const aiPlayers = players.filter(p => p.isAI);
  
  if (humanPlayers.length === 0 || aiPlayers.length === 0) {
    console.log('Adaptive AI: No humans or AIs in game, skipping learn');
    return;
  }
  
  // Determine if any human won
  const humanWon = winner && !winner.isAI;
  
  // Calculate player's answer accuracy
  const totalQuestions = questionsAnswered.length;
  const correctAnswers = questionsAnswered.filter(q => q.correct).length;
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0.5;
  
  const store = useAIBrainStore.getState();
  
  // Record game result for each AI difficulty (simulate learning across all)
  // This allows the AI to adapt which difficulty to use next time
  [AI_DIFFICULTY.EASY, AI_DIFFICULTY.NORMAL, AI_DIFFICULTY.HARD].forEach(diff => {
    // Get actual player performance for this difficulty
    const profile = store.aiProfiles[diff];
    
    // For recordGameResult: won = human won, playerPerformance = accuracy
    store.recordGameResult(diff, humanWon, accuracy);
  });
  
  // Analyze human behavior from question answers
  const gameActions = questionsAnswered.map(q => ({
    type: 'answer_question',
    correct: q.correct,
    category: q.category,
  }));
  
  store.analyzeHumanBehavior(gameActions);
  
  console.log('Adaptive AI learned:', {
    humanWon,
    accuracy: Math.round(accuracy * 100),
    totalGames: store.gameHistory.length,
    behaviorPatterns: store.behaviorPatterns,
  });
}
