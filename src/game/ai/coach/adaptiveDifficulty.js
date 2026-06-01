/**
 * AdaptiveDifficulty - Adjusts AI difficulty based on player performance
 * 
 * Tracks player performance and dynamically adjusts AI difficulty to provide
 * an optimal challenge level for engagement and learning.
 */

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
};

// Behavior modifiers for each difficulty level
const DIFFICULTY_MODIFIERS = {
  [DIFFICULTY_LEVELS.EASY]: {
    riskTolerance: 0.3,
    decisionSpeed: 0.5,
    tradeBias: 0.2,
    accuracyBonus: -0.2,
    reactionTime: 2000,
  },
  [DIFFICULTY_LEVELS.MEDIUM]: {
    riskTolerance: 0.5,
    decisionSpeed: 0.7,
    tradeBias: 0.5,
    accuracyBonus: 0,
    reactionTime: 1000,
  },
  [DIFFICULTY_LEVELS.HARD]: {
    riskTolerance: 0.7,
    decisionSpeed: 0.85,
    tradeBias: 0.7,
    accuracyBonus: 0.15,
    reactionTime: 500,
  },
  [DIFFICULTY_LEVELS.EXPERT]: {
    riskTolerance: 0.9,
    decisionSpeed: 1.0,
    tradeBias: 0.9,
    accuracyBonus: 0.3,
    reactionTime: 200,
  },
};

// Thresholds for difficulty adjustment
const ADJUSTMENT_THRESHOLDS = {
  winRateWindow: 5,       // Consider last N games for win rate
  increaseThreshold: 0.7, // Win rate above this -> increase difficulty
  decreaseThreshold: 0.2, // Win rate below this -> decrease difficulty
  scoreGapForIncrease: 20, // Score difference to trigger increase
  scoreGapForDecrease: 15, // Score difference to trigger decrease
};

export class AdaptiveDifficulty {
  /**
   * @param {object} memoryLayer - AI memory layer for tracking performance
   */
  constructor(memoryLayer) {
    this.memoryLayer = memoryLayer;
    
    // Per-player difficulty state
    this.playerDifficulty = {};  // playerId -> { level, history, lastAdjustment }
    this.gameResults = {};       // playerId -> [{ won, score, timestamp }]
  }

  /**
   * Get current difficulty level for a player
   * @param {string} playerId - Player ID
   * @returns {string} Difficulty level
   */
  getDifficultyLevel(playerId) {
    const state = this.playerDifficulty[playerId];
    return state?.level || DIFFICULTY_LEVELS.MEDIUM;
  }

  /**
   * Set difficulty level for a player
   * @param {string} playerId - Player ID
   * @param {string} level - Difficulty level
   */
  setDifficultyLevel(playerId, level) {
    if (!Object.values(DIFFICULTY_LEVELS).includes(level)) {
      throw new Error(`Invalid difficulty level: ${level}`);
    }

    if (!this.playerDifficulty[playerId]) {
      this.playerDifficulty[playerId] = {
        level,
        history: [],
        lastAdjustment: null,
        totalGames: 0,
      };
    } else {
      this.playerDifficulty[playerId].level = level;
    }

    // Record adjustment
    this.playerDifficulty[playerId].lastAdjustment = {
      type: 'manual',
      level,
      timestamp: Date.now(),
    };

    // Record to memory
    this._recordToMemory(playerId, 'difficulty_set', { level });
  }

  /**
   * Track game result for a player
   * @param {string} playerId - Player ID
   * @param {object} result - Game result { won, moneyRank, survivalTurns, score? }
   */
  trackGameResult(playerId, result) {
    const { won, moneyRank = 3, survivalTurns = 20, score } = result;

    // Initialize game results array
    if (!this.gameResults[playerId]) {
      this.gameResults[playerId] = [];
    }

    // Calculate performance score
    const perfScore = this._calculatePerformanceScore(result);

    // Store result
    this.gameResults[playerId].push({
      won,
      moneyRank,
      survivalTurns,
      score: score || perfScore,
      timestamp: Date.now(),
    });

    // Keep only recent results (window + buffer)
    const maxResults = ADJUSTMENT_THRESHOLDS.winRateWindow + 10;
    if (this.gameResults[playerId].length > maxResults) {
      this.gameResults[playerId] = this.gameResults[playerId].slice(-maxResults);
    }

    // Initialize player difficulty state if needed
    if (!this.playerDifficulty[playerId]) {
      this.playerDifficulty[playerId] = {
        level: DIFFICULTY_LEVELS.MEDIUM,
        history: [],
        lastAdjustment: null,
        totalGames: 0,
      };
    }
    this.playerDifficulty[playerId].totalGames++;

    // Record to memory layer
    this._recordToMemory(playerId, 'game_result', {
      won,
      moneyRank,
      survivalTurns,
      performanceScore: perfScore,
    });

    return perfScore;
  }

  /**
   * Get overall performance score for a player (0-100)
   * @param {string} playerId - Player ID
   * @returns {number} Performance score
   */
  getPerformanceScore(playerId) {
    const results = this.gameResults[playerId];
    if (!results || results.length === 0) {
      return 50; // Default neutral score
    }

    // Calculate weighted average favoring recent results
    let totalScore = 0;
    let totalWeight = 0;
    const weights = results.map((_, i) => i + 1); // More recent = higher weight

    results.forEach((result, i) => {
      const weight = weights[i];
      totalScore += (result.score || 50) * weight;
      totalWeight += weight;
    });

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Check if difficulty should be increased
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  shouldIncreaseDifficulty(playerId) {
    const recentResults = this._getRecentResults(playerId);
    if (recentResults.length < 3) {
      return false; // Need minimum games
    }

    const currentLevel = this.getDifficultyLevel(playerId);
    if (currentLevel === DIFFICULTY_LEVELS.EXPERT) {
      return false; // Already at max
    }

    // Check win rate
    const recentWinRate = this._calculateWinRate(recentResults);
    const avgScore = recentResults.reduce((sum, r) => sum + (r.score || 50), 0) / recentResults.length;

    // Increase if winning too often or scoring too high
    const shouldIncrease = 
      recentWinRate >= ADJUSTMENT_THRESHOLDS.increaseThreshold ||
      avgScore >= 70 + ADJUSTMENT_THRESHOLDS.scoreGapForIncrease;

    // Check last adjustment - don't adjust too frequently
    if (shouldIncrease && this._canAdjustDifficulty(playerId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if difficulty should be decreased
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  shouldDecreaseDifficulty(playerId) {
    const recentResults = this._getRecentResults(playerId);
    if (recentResults.length < 3) {
      return false;
    }

    const currentLevel = this.getDifficultyLevel(playerId);
    if (currentLevel === DIFFICULTY_LEVELS.EASY) {
      return false;
    }

    const recentWinRate = this._calculateWinRate(recentResults);
    const avgScore = recentResults.reduce((sum, r) => sum + (r.score || 50), 0) / recentResults.length;

    const shouldDecrease = 
      recentWinRate <= ADJUSTMENT_THRESHOLDS.decreaseThreshold ||
      avgScore <= 40 - ADJUSTMENT_THRESHOLDS.scoreGapForDecrease;

    if (shouldDecrease && this._canAdjustDifficulty(playerId)) {
      return true;
    }

    return false;
  }

  /**
   * Automatically adjust difficulty based on recent performance
   * @param {string} playerId - Player ID
   * @returns {object} Adjustment result
   */
  autoAdjust(playerId) {
    const previousLevel = this.getDifficultyLevel(playerId);
    let newLevel = previousLevel;
    let adjustmentReason = '';

    if (this.shouldIncreaseDifficulty(playerId)) {
      newLevel = this._getNextDifficultyUp(previousLevel);
      adjustmentReason = 'Performance exceeds current difficulty';
    } else if (this.shouldDecreaseDifficulty(playerId)) {
      newLevel = this._getNextDifficultyDown(previousLevel);
      adjustmentReason = 'Struggling at current difficulty';
    }

    if (newLevel !== previousLevel) {
      this.setDifficultyLevel(playerId, newLevel);
      
      const result = {
        previousLevel,
        newLevel,
        reason: adjustmentReason,
        adjusted: true,
      };

      // Record adjustment
      if (this.playerDifficulty[playerId]) {
        this.playerDifficulty[playerId].lastAdjustment = {
          type: 'auto',
          from: previousLevel,
          to: newLevel,
          reason: adjustmentReason,
          timestamp: Date.now(),
        };
        this.playerDifficulty[playerId].history.push({
          from: previousLevel,
          to: newLevel,
          reason: adjustmentReason,
          timestamp: Date.now(),
        });
      }

      return result;
    }

    return {
      previousLevel,
      newLevel: previousLevel,
      reason: 'No adjustment needed',
      adjusted: false,
    };
  }

  /**
   * Get behavior modifiers for the current difficulty level
   * @param {string} playerId - Player ID
   * @returns {object} Behavior modifiers
   */
  getBehaviorModifier(playerId) {
    const level = this.getDifficultyLevel(playerId);
    return { ...DIFFICULTY_MODIFIERS[level] };
  }

  /**
   * Get all difficulty levels with their modifiers
   * @returns {object} All difficulty configurations
   */
  getAllDifficultyConfigs() {
    return { ...DIFFICULTY_MODIFIERS };
  }

  // --- Private helpers ---

  _getRecentResults(playerId) {
    const results = this.gameResults[playerId] || [];
    return results.slice(-ADJUSTMENT_THRESHOLDS.winRateWindow);
  }

  _calculateWinRate(results) {
    if (results.length === 0) return 0.5;
    const wins = results.filter(r => r.won).length;
    return wins / results.length;
  }

  _calculatePerformanceScore(result) {
    let score = 50; // Base score

    // Win bonus
    if (result.won) score += 20;

    // Survival turns bonus (up to 15 extra points)
    score += Math.min(15, (result.survivalTurns || 0) / 2);

    // Money rank bonus (up to 15 extra points)
    // Rank 1 = 15, rank 4 = 0
    const rankBonus = (4 - (result.moneyRank || 3)) * 5;
    score += rankBonus;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  _getNextDifficultyUp(current) {
    const levels = Object.values(DIFFICULTY_LEVELS);
    const idx = levels.indexOf(current);
    return levels[Math.min(idx + 1, levels.length - 1)];
  }

  _getNextDifficultyDown(current) {
    const levels = Object.values(DIFFICULTY_LEVELS);
    const idx = levels.indexOf(current);
    return levels[Math.max(idx - 1, 0)];
  }

  _canAdjustDifficulty(playerId) {
    const state = this.playerDifficulty[playerId];
    if (!state?.lastAdjustment) return true;

    const timeSinceAdjustment = Date.now() - state.lastAdjustment.timestamp;
    const minInterval = 3 * 60 * 1000; // 3 minutes minimum between adjustments

    return timeSinceAdjustment >= minInterval;
  }

  _recordToMemory(playerId, eventType, data) {
    if (this.memoryLayer) {
      this.memoryLayer.ingest(eventType, {
        playerId,
        ...data,
        timestamp: Date.now(),
      });
    }
  }
}

export default AdaptiveDifficulty;