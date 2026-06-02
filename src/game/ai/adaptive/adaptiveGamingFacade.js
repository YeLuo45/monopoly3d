/**
 * AdaptiveGamingFacade - Unified Adaptive Gaming System
 * 
 * Provides a unified facade integrating all adaptive systems:
 * - AdaptiveLearningEngine for personalized learning
 * - PlayerSegmentor for player segmentation
 * - DynamicDifficultyEngine for difficulty adjustment
 * - AchievementManager for achievements
 * - CloudSaveManager for cloud persistence
 * 
 * This is the main entry point for the adaptive gaming system (Direction E v9).
 */

import { AdaptiveLearningEngine } from '../tutor/adaptiveLearningEngine.js';
import { PlayerSegmentor } from '../segment/playerSegmentor.js';
import { DynamicDifficultyEngine } from '../difficulty/dynamicDifficultyEngine.js';
import { AchievementManager } from '../progression/achievementManager.js';
import { CloudSaveManager } from '../cloud/cloudSaveManager.js';

export class AdaptiveGamingFacade {
  /**
   * Create a new AdaptiveGamingFacade
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Core adaptive systems
    this.learningEngine = new AdaptiveLearningEngine();
    this.segmentor = new PlayerSegmentor();
    this.difficultyEngine = new DynamicDifficultyEngine();
    this.achievementManager = new AchievementManager();
    this.cloudSaveManager = new CloudSaveManager(config.cloudEndpoint);
    
    // Player state management
    this.playerStates = new Map(); // playerId -> state
    this.initializedPlayers = new Set();
    
    // System status
    this.systemStatus = {
      initialized: false,
      lastUpdate: null,
      activePlayers: 0,
      totalRecommendations: 0
    };
    
    // Recommendation cache
    this.recommendationCache = new Map(); // playerId -> recommendation[]
  }

  /**
   * Initialize all adaptive systems for a player
   * @param {string} playerId - Player ID to initialize
   * @returns {Object} Initialization result with status
   */
  initialize(playerId) {
    if (!playerId) {
      throw new Error('playerId is required');
    }
    
    if (this.initializedPlayers.has(playerId)) {
      return {
        success: true,
        message: `Player ${playerId} already initialized`,
        playerId,
        alreadyInitialized: true
      };
    }
    
    // Initialize player state
    const playerState = {
      playerId,
      initializedAt: Date.now(),
      lastActivity: Date.now(),
      sessionCount: 1,
      totalPlayTime: 0,
      currentSessionStart: Date.now(),
      preferences: {
        learningStyle: 'visual',
        difficulty: 'normal',
        notifications: true
      },
      metrics: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        avgPlacement: 0,
        propertiesOwned: 0,
        tradesCompleted: 0,
        moneyEarned: 0,
        moneyLost: 0
      },
      adaptationState: {
        currentDifficulty: 'normal',
        learningProgress: 0,
        segment: 'casual',
        confidence: 0.5
      }
    };
    
    this.playerStates.set(playerId, playerState);
    this.initializedPlayers.add(playerId);
    this.systemStatus.activePlayers++;
    this.systemStatus.initialized = true;
    this.systemStatus.lastUpdate = Date.now();
    
    return {
      success: true,
      message: `Player ${playerId} initialized successfully`,
      playerId,
      systems: {
        learningEngine: true,
        segmentor: true,
        difficultyEngine: true,
        achievementManager: true,
        cloudSaveManager: true
      }
    };
  }

  /**
   * Get adaptive recommendation for a player
   * @param {string} playerId - Player ID
   * @param {Object} context - Context for recommendation (gameState, phase, etc.)
   * @returns {Object} Recommendation result
   */
  getRecommendation(playerId, context = {}) {
    // Ensure player is initialized
    if (!this.initializedPlayers.has(playerId)) {
      this.initialize(playerId);
    }
    
    const playerState = this.playerStates.get(playerId);
    if (!playerState) {
      throw new Error(`Player ${playerId} not found`);
    }
    
    // Get player segment
    const segmentResult = this.segmentor.segmentPlayer({
      playerId,
      metrics: playerState.metrics,
      preferences: playerState.preferences
    });
    
    // Get difficulty level
    const difficulty = this.difficultyEngine.getDifficulty(playerId) || 'normal';
    
    // Get learning recommendation
    const learningRec = this.learningEngine.getRecommendation
      ? this.learningEngine.getRecommendation(playerId)
      : this._getDefaultLearningRec(playerId);
    
    // Build composite recommendation
    const recommendation = {
      playerId,
      segment: segmentResult.segment || 'casual',
      difficulty,
      timestamp: Date.now(),
      context,
      suggestions: {
        learning: learningRec,
        strategic: this._getStrategicSuggestion(playerId, context, segmentResult),
        difficulty: difficulty,
        achievement: this._getNextAchievement(playerId)
      },
      confidence: segmentResult.confidence || 0.5,
      adaptation: {
        learningProgress: playerState.adaptationState.learningProgress,
        difficultyAdjustments: playerState.adaptationState.currentDifficulty
      }
    };
    
    // Cache recommendation
    if (!this.recommendationCache.has(playerId)) {
      this.recommendationCache.set(playerId, []);
    }
    this.recommendationCache.get(playerId).push(recommendation);
    this.systemStatus.totalRecommendations++;
    
    // Update player last activity
    playerState.lastActivity = Date.now();
    
    return recommendation;
  }

  /**
   * Get the AdaptiveLearningEngine instance
   * @returns {AdaptiveLearningEngine}
   */
  getLearningEngine() {
    return this.learningEngine;
  }

  /**
   * Get the PlayerSegmentor instance
   * @returns {PlayerSegmentor}
   */
  getSegmentor() {
    return this.segmentor;
  }

  /**
   * Get the DynamicDifficultyEngine instance
   * @returns {DynamicDifficultyEngine}
   */
  getDifficultyEngine() {
    return this.difficultyEngine;
  }

  /**
   * Get the AchievementManager instance
   * @returns {AchievementManager}
   */
  getAchievementManager() {
    return this.achievementManager;
  }

  /**
   * Get the CloudSaveManager instance
   * @returns {CloudSaveManager}
   */
  getCloudSaveManager() {
    return this.cloudSaveManager;
  }

  /**
   * Update player metrics
   * @param {string} playerId - Player ID
   * @param {Object} metrics - Metrics to update
   * @returns {Object} Updated metrics
   */
  updatePlayerMetrics(playerId, metrics) {
    if (!this.initializedPlayers.has(playerId)) {
      this.initialize(playerId);
    }
    
    const playerState = this.playerStates.get(playerId);
    if (!playerState) {
      throw new Error(`Player ${playerId} not found`);
    }
    
    // Merge new metrics
    Object.keys(metrics).forEach(key => {
      if (key in playerState.metrics) {
        if (typeof metrics[key] === 'number') {
          playerState.metrics[key] += metrics[key];
        } else {
          playerState.metrics[key] = metrics[key];
        }
      }
    });
    
    // Update adaptation state based on new metrics
    this._updateAdaptationState(playerId);
    
    return playerState.metrics;
  }

  /**
   * Get player state
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player state
   */
  getPlayerState(playerId) {
    return this.playerStates.get(playerId) || null;
  }

  /**
   * Get system status
   * @returns {Object} System status
   */
  getSystemStatus() {
    return {
      ...this.systemStatus,
      memoryUsage: {
        playerStates: this.playerStates.size,
        recommendationCache: this.recommendationCache.size
      }
    };
  }

  /**
   * Reset player state
   * @param {string} playerId - Player ID
   * @returns {boolean} Success
   */
  resetPlayer(playerId) {
    if (this.playerStates.has(playerId)) {
      this.playerStates.delete(playerId);
      this.initializedPlayers.delete(playerId);
      this.recommendationCache.delete(playerId);
      this.systemStatus.activePlayers--;
      return true;
    }
    return false;
  }

  // Private helper methods

  /**
   * Get default learning recommendation
   * @private
   */
  _getDefaultLearningRec(playerId) {
    const playerState = this.playerStates.get(playerId);
    return {
      type: 'learning',
      content: 'Welcome to Monopoly3D! Learn the basics to get started.',
      priority: 'high',
      completed: false
    };
  }

  /**
   * Get strategic suggestion based on segment and context
   * @private
   */
  _getStrategicSuggestion(playerId, context, segmentResult) {
    const segment = segmentResult.segment || 'casual';
    const phase = context.phase || 'early';
    
    const suggestions = {
      casual: {
        early: 'Focus on acquiring properties in desirable locations.',
        mid: 'Build houses on your properties to increase rent.',
        late: 'Trade strategically to complete your property sets.'
      },
      strategic: {
        early: 'Analyze the board and plan your property acquisition strategy.',
        mid: 'Optimize your property portfolio for maximum returns.',
        late: 'Use your position to negotiate favorable trades.'
      },
      competitive: {
        early: 'Target high-value properties and block opponents.',
        mid: 'Apply pressure on opponents with strategic purchases.',
        late: 'Finish strong by maximizing your winning position.'
      },
      social: {
        early: 'Build relationships with other players through trades.',
        mid: 'Focus on mutually beneficial exchanges.',
        late: 'Maintain friendly relations while securing your position.'
      }
    };
    
    return {
      type: 'strategic',
      content: suggestions[segment]?.[phase] || suggestions.casual[phase],
      segment,
      priority: 'medium'
    };
  }

  /**
   * Get next achievement suggestion
   * @private
   */
  _getNextAchievement(playerId) {
    const achievements = this.achievementManager.getAchievements
      ? this.achievementManager.getAchievements(playerId)
      : [];
    
    const nextAchievement = this.achievementManager.getNextAchievement
      ? this.achievementManager.getNextAchievement(playerId)
      : null;
    
    return {
      type: 'achievement',
      current: achievements.length,
      next: nextAchievement,
      priority: 'low'
    };
  }

  /**
   * Update adaptation state based on metrics
   * @private
   */
  _updateAdaptationState(playerId) {
    const playerState = this.playerStates.get(playerId);
    const { metrics } = playerState;
    
    // Calculate win rate
    if (metrics.totalGames > 0) {
      const winRate = metrics.wins / metrics.totalGames;
      playerState.adaptationState.learningProgress = Math.min(1, winRate + 0.1);
    }
    
    // Update segment based on behavior
    const segmentResult = this.segmentor.segmentPlayer({
      playerId,
      metrics,
      preferences: playerState.preferences
    });
    playerState.adaptationState.segment = segmentResult.segment || 'casual';
    playerState.adaptationState.confidence = segmentResult.confidence || 0.5;
    
    // Update difficulty based on performance
    if (metrics.avgPlacement > 0) {
      const difficultyMap = { 1: 'easy', 2: 'normal', 3: 'hard', 4: 'very_hard' };
      playerState.adaptationState.currentDifficulty = difficultyMap[metrics.avgPlacement] || 'normal';
    }
  }
}