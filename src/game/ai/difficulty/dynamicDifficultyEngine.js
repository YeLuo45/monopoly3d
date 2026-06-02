/**
 * Dynamic Difficulty Engine
 * 
 * Dynamically adjusts game difficulty based on player performance
 * to maintain optimal challenge level. Part of the Dynamic Difficulty
 * Adjustment System (Direction E v6).
 */

import { PlayerPerformanceTracker } from './playerPerformanceTracker.js';

export class DynamicDifficultyEngine {
  /**
   * @param {Object} analyticsEngine - Analytics engine for performance data
   */
  constructor(analyticsEngine = null) {
    this.analyticsEngine = analyticsEngine;
    
    // Initialize player performance tracker
    this.performanceTracker = new PlayerPerformanceTracker();
    
    // Player difficulty levels
    // Structure: { playerId: { difficulty, lastAdjustment, adjustmentHistory } }
    this.playerDifficulties = new Map();
    
    // Difficulty levels in order from easiest to hardest
    this.difficultyLevels = ['very_easy', 'easy', 'normal', 'hard', 'very_hard'];
    
    // Difficulty adjustment thresholds
    this.adjustmentConfig = {
      // Performance delta thresholds for adjustment
      improveThreshold: 0.15,      // 15% improvement triggers increase
      declineThreshold: -0.15,     // 15% decline triggers decrease
      
      // Minimum performance delta needed to trigger adjustment
      minDeltaMagnitude: 0.1,
      
      // Cooldown period between adjustments (ms)
      adjustmentCooldown: 60000,   // 1 minute
      
      // Maximum adjustments per game session
      maxAdjustmentsPerSession: 5,
      
      // Performance window for analysis
      performanceWindow: 10,       // Last 10 entries
      
      // Score thresholds for difficulty mapping
      scoreThresholds: {
        excellent: 0.85,  // Very hard
        good: 0.65,       // Hard
        average: 0.45,    // Normal
        belowAverage: 0.25, // Easy
        poor: 0,           // Very easy
      },
    };
    
    // Current session adjustment counts
    this.sessionAdjustmentCounts = new Map();
  }

  /**
   * Get current difficulty level for a player
   * @param {string} playerId - Player identifier
   * @returns {string} Current difficulty level
   */
  getDifficulty(playerId) {
    if (!this.playerDifficulties.has(playerId)) {
      // Default to 'normal' for new players
      this._initializePlayer(playerId, 'normal');
    }
    
    return this.playerDifficulties.get(playerId).difficulty;
  }

  /**
   * Adjust difficulty based on performance delta
   * @param {string} playerId - Player identifier
   * @param {number} performanceDelta - Performance change (-1 to 1)
   * @returns {Object} Adjustment result { previousDifficulty, newDifficulty, reason }
   */
  adjustDifficulty(playerId, performanceDelta) {
    const playerData = this._getOrCreatePlayer(playerId);
    const currentDifficulty = playerData.difficulty;
    
    // Check cooldown
    const timeSinceLastAdjustment = Date.now() - playerData.lastAdjustment;
    if (timeSinceLastAdjustment < this.adjustmentConfig.adjustmentCooldown) {
      return {
        previousDifficulty: currentDifficulty,
        newDifficulty: currentDifficulty,
        reason: 'cooldown_active',
        nextAdjustmentIn: this.adjustmentConfig.adjustmentCooldown - timeSinceLastAdjustment,
      };
    }
    
    // Check max adjustments
    const sessionCount = this.sessionAdjustmentCounts.get(playerId) || 0;
    if (sessionCount >= this.adjustmentConfig.maxAdjustmentsPerSession) {
      return {
        previousDifficulty: currentDifficulty,
        newDifficulty: currentDifficulty,
        reason: 'max_adjustments_reached',
      };
    }
    
    // Check if delta magnitude is sufficient
    if (Math.abs(performanceDelta) < this.adjustmentConfig.minDeltaMagnitude) {
      return {
        previousDifficulty: currentDifficulty,
        newDifficulty: currentDifficulty,
        reason: 'delta_too_small',
        magnitude: performanceDelta,
      };
    }
    
    // Calculate new difficulty
    let newDifficulty = currentDifficulty;
    const currentIndex = this.difficultyLevels.indexOf(currentDifficulty);
    
    if (performanceDelta > this.adjustmentConfig.improveThreshold) {
      // Player improving - increase difficulty
      newDifficulty = this._increaseDifficulty(currentIndex);
    } else if (performanceDelta < this.adjustmentConfig.declineThreshold) {
      // Player struggling - decrease difficulty
      newDifficulty = this._decreaseDifficulty(currentIndex);
    }
    
    // Apply change if different
    if (newDifficulty !== currentDifficulty) {
      playerData.difficulty = newDifficulty;
      playerData.lastAdjustment = Date.now();
      
      // Record adjustment history
      playerData.adjustmentHistory.push({
        timestamp: Date.now(),
        previous: currentDifficulty,
        new: newDifficulty,
        delta: performanceDelta,
      });
      
      // Update session count
      this.sessionAdjustmentCounts.set(playerId, sessionCount + 1);
      
      return {
        previousDifficulty: currentDifficulty,
        newDifficulty: newDifficulty,
        reason: performanceDelta > 0 ? 'performance_improved' : 'performance_declined',
        delta: performanceDelta,
      };
    }
    
    return {
      previousDifficulty: currentDifficulty,
      newDifficulty: currentDifficulty,
      reason: 'no_change_needed',
      delta: performanceDelta,
    };
  }

  /**
   * Analyze performance trend for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Performance trend analysis
   */
  analyzePerformanceTrend(playerId) {
    // Get trend from performance tracker
    const trend = this.performanceTracker.getPerformanceTrend(playerId);
    
    // Also get recent performance delta
    const history = this.performanceTracker.getPerformanceHistory(playerId, {
      count: this.adjustmentConfig.performanceWindow,
    });
    
    let recentDelta = 0;
    if (history.length >= 2) {
      const oldest = history[0].overallScore;
      const newest = history[history.length - 1].overallScore;
      recentDelta = (newest - oldest) / (oldest || 1);
    }
    
    return {
      playerId,
      trend: trend.direction,
      magnitude: trend.magnitude,
      confidence: trend.confidence,
      sampleSize: trend.sampleSize,
      recentDelta,
      recommendation: this._getTrendRecommendation(trend, recentDelta),
    };
  }

  /**
   * Get recommended difficulty for a player based on performance
   * @param {string} playerId - Player identifier
   * @returns {Object} Recommendation { recommendedDifficulty, confidence, reasoning }
   */
  getRecommendedDifficulty(playerId) {
    // Get average performance over recent window
    const avgPerformance = this.performanceTracker.getAveragePerformance(
      playerId,
      this.adjustmentConfig.performanceWindow
    );
    
    // Get current difficulty
    const currentDifficulty = this.getDifficulty(playerId);
    const currentIndex = this.difficultyLevels.indexOf(currentDifficulty);
    
    // Map performance score to difficulty
    const thresholds = this.adjustmentConfig.scoreThresholds;
    let recommendedIndex = currentIndex;
    
    if (avgPerformance >= thresholds.excellent) {
      recommendedIndex = 4; // very_hard
    } else if (avgPerformance >= thresholds.good) {
      recommendedIndex = Math.max(2, currentIndex); // at least hard
    } else if (avgPerformance >= thresholds.average) {
      recommendedIndex = 2; // normal
    } else if (avgPerformance >= thresholds.belowAverage) {
      recommendedIndex = Math.min(1, currentIndex); // at most easy
    } else {
      recommendedIndex = 0; // very_easy
    }
    
    // Only recommend change if significantly different
    const indexDifference = Math.abs(recommendedIndex - currentIndex);
    
    let reasoning;
    if (indexDifference === 0) {
      reasoning = 'Current difficulty is appropriate for performance level';
    } else if (recommendedIndex > currentIndex) {
      reasoning = 'Strong performance suggests player is ready for more challenge';
    } else {
      reasoning = 'Performance struggling at current difficulty - reducing challenge';
    }
    
    return {
      playerId,
      currentDifficulty,
      recommendedDifficulty: this.difficultyLevels[recommendedIndex],
      avgPerformance,
      confidence: this.performanceTracker.getPerformanceTrend(playerId).confidence,
      reasoning,
      indexDifference,
    };
  }

  /**
   * Record a performance event for a player
   * @param {string} playerId - Player identifier
   * @param {Object} metrics - Performance metrics
   */
  recordPerformance(playerId, metrics) {
    this.performanceTracker.recordPerformance(playerId, metrics);
  }

  /**
   * Auto-adjust difficulty based on recent performance
   * @param {string} playerId - Player identifier
   * @returns {Object} Adjustment result
   */
  autoAdjust(playerId) {
    // First analyze trend
    const trend = this.analyzePerformanceTrend(playerId);
    
    // Calculate adjustment based on recent delta
    const adjustment = this.adjustDifficulty(playerId, trend.recentDelta);
    
    return {
      ...adjustment,
      trendAnalysis: trend,
    };
  }

  /**
   * Reset player difficulty to default
   * @param {string} playerId - Player identifier
   */
  resetPlayerDifficulty(playerId) {
    if (this.playerDifficulties.has(playerId)) {
      this.playerDifficulties.get(playerId).difficulty = 'normal';
      this.playerDifficulties.get(playerId).lastAdjustment = 0;
      this.playerDifficulties.get(playerId).adjustmentHistory = [];
    }
    this.sessionAdjustmentCounts.delete(playerId);
  }

  /**
   * Reset all player difficulties
   */
  resetAll() {
    for (const playerId of this.playerDifficulties.keys()) {
      this.resetPlayerDifficulty(playerId);
    }
    this.sessionAdjustmentCounts.clear();
  }

  /**
   * Get adjustment history for a player
   * @param {string} playerId - Player identifier
   * @param {number} limit - Maximum entries to return
   * @returns {Array} Adjustment history
   */
  getAdjustmentHistory(playerId, limit = 10) {
    const playerData = this.playerDifficulties.get(playerId);
    if (!playerData) return [];
    
    const history = playerData.adjustmentHistory;
    return limit > 0 ? history.slice(-limit) : history;
  }

  // ==================== Private Methods ====================

  /**
   * Initialize a new player with default difficulty
   * @private
   */
  _initializePlayer(playerId, difficulty = 'normal') {
    this.playerDifficulties.set(playerId, {
      difficulty,
      lastAdjustment: 0,
      adjustmentHistory: [],
    });
  }

  /**
   * Get or create player data
   * @private
   */
  _getOrCreatePlayer(playerId) {
    if (!this.playerDifficulties.has(playerId)) {
      this._initializePlayer(playerId);
    }
    return this.playerDifficulties.get(playerId);
  }

  /**
   * Increase difficulty (move up in levels)
   * @private
   */
  _increaseDifficulty(currentIndex) {
    // Move up but cap at very_hard (index 4)
    return this.difficultyLevels[Math.min(currentIndex + 1, 4)];
  }

  /**
   * Decrease difficulty (move down in levels)
   * @private
   */
  _decreaseDifficulty(currentIndex) {
    // Move down but cap at very_easy (index 0)
    return this.difficultyLevels[Math.max(currentIndex - 1, 0)];
  }

  /**
   * Get recommendation based on trend analysis
   * @private
   */
  _getTrendRecommendation(trend, recentDelta) {
    if (trend.direction === 'improving' && trend.confidence > 0.7) {
      return 'increase_difficulty';
    } else if (trend.direction === 'declining' && trend.confidence > 0.7) {
      return 'decrease_difficulty';
    } else if (Math.abs(recentDelta) > 0.2) {
      // Significant recent change
      return recentDelta > 0 ? 'monitor_increase' : 'monitor_decrease';
    }
    return 'maintain';
  }
}