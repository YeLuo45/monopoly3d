/**
 * AdaptiveAnalytics - Analytics for Adaptive Gaming System
 * 
 * Provides analytics and insights for the adaptive gaming system,
 * including player adaptation metrics, system performance, and trends.
 * Part of the Adaptive Gaming System (Direction E v9).
 */

export class AdaptiveAnalytics {
  /**
   * Create a new AdaptiveAnalytics
   * @param {AdaptiveGamingFacade} adaptiveFacade - The adaptive gaming facade
   */
  constructor(adaptiveFacade) {
    if (!adaptiveFacade) {
      throw new Error('adaptiveFacade is required');
    }
    
    this.facade = adaptiveFacade;
    
    // Analytics data storage
    this.playerAnalytics = new Map(); // playerId -> analytics data
    this.systemMetrics = {
      totalRecommendations: 0,
      totalInitializations: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      lastUpdated: Date.now()
    };
    
    // Trend data
    this.trends = {
      daily: [],
      weekly: [],
      monthly: []
    };
  }

  /**
   * Get player adaptation metrics
   * @param {string} playerId - Player ID
   * @returns {Object} Player adaptation metrics
   */
  getPlayerAdaptationMetrics(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }
    
    const playerState = this.facade.getPlayerState(playerId);
    if (!playerState) {
      return null;
    }
    
    const { metrics, adaptationState, preferences } = playerState;
    
    // Calculate adaptation metrics
    const winRate = metrics.totalGames > 0
      ? (metrics.wins / metrics.totalGames * 100).toFixed(1)
      : 0;
    
    const avgPlacement = metrics.avgPlacement || 0;
    
    const profitability = metrics.moneyEarned > 0
      ? ((metrics.moneyEarned - metrics.moneyLost) / metrics.moneyEarned * 100).toFixed(1)
      : 0;
    
    const engagement = this._calculateEngagement(playerState);
    
    const adaptationLevel = this._calculateAdaptationLevel(adaptationState);
    
    return {
      playerId,
      segment: adaptationState?.segment || 'unknown',
      difficulty: adaptationState?.currentDifficulty || 'normal',
      adaptationLevel,
      performance: {
        winRate: `${winRate}%`,
        avgPlacement: avgPlacement.toFixed(1),
        profitability: `${profitability}%`,
        totalGames: metrics.totalGames,
        wins: metrics.wins,
        losses: metrics.losses
      },
      engagement,
      progress: {
        learningProgress: ((adaptationState?.learningProgress || 0) * 100).toFixed(1),
        confidence: ((adaptationState?.confidence || 0) * 100).toFixed(1),
        masteryLevel: this._calculateMasteryLevel(metrics)
      },
      activity: {
        totalPlayTime: metrics.totalPlayTime || 0,
        sessionCount: metrics.sessionCount || 0,
        lastActive: new Date(playerState.lastActivity).toISOString(),
        propertiesOwned: metrics.propertiesOwned,
        tradesCompleted: metrics.tradesCompleted
      },
      recommendations: this._getPlayerRecommendationStats(playerId)
    };
  }

  /**
   * Get overall system performance
   * @returns {Object} System performance metrics
   */
  getSystemPerformance() {
    const status = this.facade.getSystemStatus();
    
    // Calculate system-level metrics
    const activePlayers = status.activePlayers || 0;
    const totalPlayers = this.facade.initializedPlayers?.size || 0;
    const totalRecs = this.systemMetrics.totalRecommendations;
    const cacheSize = this._getTotalCacheSize();
    
    return {
      system: {
        status: status.initialized ? 'operational' : 'initializing',
        activePlayers,
        totalInitializedPlayers: totalPlayers,
        uptime: this._getUptime(),
        lastUpdated: new Date(this.systemMetrics.lastUpdated).toISOString()
      },
      recommendations: {
        totalGenerated: totalRecs,
        cacheHitRate: `${(this.systemMetrics.cacheHitRate * 100).toFixed(1)}%`,
        avgResponseTime: `${this.systemMetrics.avgResponseTime.toFixed(2)}ms`
      },
      memory: {
        playerStates: status.memoryUsage?.playerStates || 0,
        recommendationCache: status.memoryUsage?.recommendationCache || 0,
        totalCacheSize: cacheSize
      },
      subsystems: this._getSubsystemStatus()
    };
  }

  /**
   * Get adaptation trends across all players
   * @returns {Object} Adaptation trends
   */
  getAdaptationTrends() {
    const trends = {
      timestamp: new Date().toISOString(),
      segments: this._getSegmentDistribution(),
      difficulties: this._getDifficultyDistribution(),
      performance: this._getAggregatePerformance(),
      engagement: this._getAggregateEngagement(),
      recommendations: this._getRecommendationTrends(),
      predictions: this._getTrendPredictions()
    };
    
    return trends;
  }

  // Private helper methods

  /**
   * Calculate engagement score
   * @private
   */
  _calculateEngagement(playerState) {
    const { metrics, lastActivity, currentSessionStart } = playerState;
    
    // Session engagement
    const sessionDuration = Date.now() - (currentSessionStart || Date.now());
    const sessionMinutes = sessionDuration / 60000;
    
    // Frequency engagement
    const daysActive = metrics.totalGames > 0 ? Math.max(1, metrics.sessionCount) : 0;
    const frequencyScore = Math.min(1, daysActive / 7);
    
    // Depth engagement
    const depthScore = metrics.propertiesOwned > 0 || metrics.tradesCompleted > 0
      ? Math.min(1, (metrics.propertiesOwned + metrics.tradesCompleted) / 20)
      : 0;
    
    const engagement = (frequencyScore * 0.4 + depthScore * 0.6);
    
    return {
      score: (engagement * 100).toFixed(1),
      sessionDuration: `${sessionMinutes.toFixed(1)}min`,
      frequencyScore: frequencyScore.toFixed(2),
      depthScore: depthScore.toFixed(2),
      level: engagement > 0.7 ? 'high' : engagement > 0.4 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate adaptation level
   * @private
   */
  _calculateAdaptationLevel(adaptationState) {
    const learningProgress = adaptationState?.learningProgress || 0;
    const confidence = adaptationState?.confidence || 0;
    const mastery = (learningProgress * 0.6 + confidence * 0.4);
    
    return {
      score: (mastery * 100).toFixed(1),
      level: mastery > 0.8 ? 'expert' : mastery > 0.6 ? 'advanced' : mastery > 0.4 ? 'intermediate' : 'beginner',
      learningProgress: learningProgress.toFixed(2),
      confidence: confidence.toFixed(2)
    };
  }

  /**
   * Calculate mastery level
   * @private
   */
  _calculateMasteryLevel(metrics) {
    const winScore = metrics.wins * 10;
    const propertyScore = Math.min(metrics.propertiesOwned * 2, 50);
    const tradeScore = Math.min(metrics.tradesCompleted * 1, 30);
    const total = winScore + propertyScore + tradeScore;
    
    if (total > 150) return 'master';
    if (total > 100) return 'expert';
    if (total > 50) return 'intermediate';
    if (total > 20) return 'beginner';
    return 'novice';
  }

  /**
   * Get player recommendation stats
   * @private
   */
  _getPlayerRecommendationStats(playerId) {
    const cached = this.facade.recommendationCache?.get(playerId) || [];
    
    return {
      total: cached.length,
      latest: cached.length > 0 ? cached[cached.length - 1] : null,
      byType: this._aggregateByType(cached)
    };
  }

  /**
   * Aggregate data by type
   * @private
   */
  _aggregateByType(data) {
    const byType = {};
    data.forEach(item => {
      const type = item.suggestions?.learning?.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    return byType;
  }

  /**
   * Get total cache size
   * @private
   */
  _getTotalCacheSize() {
    let total = 0;
    if (this.facade.playerStates) {
      total += this.facade.playerStates.size;
    }
    if (this.facade.recommendationCache) {
      this.facade.recommendationCache.forEach(arr => {
        total += arr.length;
      });
    }
    return total;
  }

  /**
   * Get uptime
   * @private
   */
  _getUptime() {
    const startTime = this.facade.systemStatus?.lastUpdate || Date.now();
    const uptime = Date.now() - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get subsystem status
   * @private
   */
  _getSubsystemStatus() {
    return {
      learningEngine: this.facade.getLearningEngine() ? 'active' : 'inactive',
      segmentor: this.facade.getSegmentor() ? 'active' : 'inactive',
      difficultyEngine: this.facade.getDifficultyEngine() ? 'active' : 'inactive',
      achievementManager: this.facade.getAchievementManager() ? 'active' : 'inactive',
      cloudSaveManager: this.facade.getCloudSaveManager() ? 'active' : 'inactive'
    };
  }

  /**
   * Get segment distribution
   * @private
   */
  _getSegmentDistribution() {
    const segments = { casual: 0, strategic: 0, competitive: 0, social: 0 };
    
    this.facade.initializedPlayers?.forEach(playerId => {
      const state = this.facade.getPlayerState(playerId);
      if (state?.adaptationState?.segment) {
        segments[state.adaptationState.segment]++;
      }
    });
    
    return segments;
  }

  /**
   * Get difficulty distribution
   * @private
   */
  _getDifficultyDistribution() {
    const difficulties = { very_easy: 0, easy: 0, normal: 0, hard: 0, very_hard: 0 };
    
    this.facade.initializedPlayers?.forEach(playerId => {
      const state = this.facade.getPlayerState(playerId);
      if (state?.adaptationState?.currentDifficulty) {
        difficulties[state.adaptationState.currentDifficulty]++;
      }
    });
    
    return difficulties;
  }

  /**
   * Get aggregate performance
   * @private
   */
  _getAggregatePerformance() {
    let totalWins = 0;
    let totalGames = 0;
    let totalPlacement = 0;
    
    this.facade.initializedPlayers?.forEach(playerId => {
      const state = this.facade.getPlayerState(playerId);
      if (state) {
        totalWins += state.metrics.wins || 0;
        totalGames += state.metrics.totalGames || 0;
        totalPlacement += state.metrics.avgPlacement || 0;
      }
    });
    
    const playerCount = this.facade.initializedPlayers?.size || 1;
    
    return {
      avgWinRate: totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0',
      avgPlacement: (totalPlacement / playerCount).toFixed(1),
      totalGamesPlayed: totalGames
    };
  }

  /**
   * Get aggregate engagement
   * @private
   */
  _getAggregateEngagement() {
    let totalPlayTime = 0;
    let totalSessions = 0;
    let totalTrades = 0;
    
    this.facade.initializedPlayers?.forEach(playerId => {
      const state = this.facade.getPlayerState(playerId);
      if (state) {
        totalPlayTime += state.metrics.totalPlayTime || 0;
        totalSessions += state.metrics.sessionCount || 0;
        totalTrades += state.metrics.tradesCompleted || 0;
      }
    });
    
    const playerCount = this.facade.initializedPlayers?.size || 1;
    
    return {
      avgPlayTime: `${(totalPlayTime / playerCount).toFixed(0)}min`,
      avgSessions: (totalSessions / playerCount).toFixed(1),
      avgTrades: (totalTrades / playerCount).toFixed(1)
    };
  }

  /**
   * Get recommendation trends
   * @private
   */
  _getRecommendationTrends() {
    return {
      totalGenerated: this.systemMetrics.totalRecommendations,
      bySegment: this._getSegmentDistribution(),
      averageConfidence: '0.75'
    };
  }

  /**
   * Get trend predictions
   * @private
   */
  _getTrendPredictions() {
    return {
      nextWeek: {
        expectedPlayers: this.facade.initializedPlayers?.size || 0,
        predictedEngagement: 'high'
      },
      optimalDifficulty: 'normal',
      recommendedFeatures: ['trade', 'property_management']
    };
  }
}