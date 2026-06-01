/**
 * PerformanceDashboard - AI Performance Metrics Dashboard
 * 
 * Aggregates and displays AI performance metrics, trends, and milestones.
 * Part of Direction B: AI Performance Dashboard (v8).
 */

import { MetricsAggregator } from './metricsAggregator.js';

export class PerformanceDashboard {
  /**
   * @param {object} memoryLayer - Memory layer (L0-L4)
   * @param {object} metaCognition - MetaCognition instance (L4)
   */
  constructor(memoryLayer, metaCognition) {
    this.memoryLayer = memoryLayer;
    this.metaCognition = metaCognition;
    this.aggregator = new MetricsAggregator(memoryLayer);
    
    // Milestone definitions
    this.milestones = {
      first_win: {
        id: 'first_win',
        name: 'First Victory',
        description: 'Win your first game',
        condition: (stats) => stats.wins >= 1,
        icon: '🏆',
      },
      win_5_games: {
        id: 'win_5_games',
        name: 'Rising Star',
        description: 'Win 5 games',
        condition: (stats) => stats.wins >= 5,
        icon: '⭐',
      },
      win_rate_50: {
        id: 'win_rate_50',
        name: 'Halfway There',
        description: 'Achieve 50% win rate',
        condition: (stats) => stats.winRate >= 0.5,
        icon: '📊',
      },
      win_rate_75: {
        id: 'win_rate_75',
        name: 'Dominant',
        description: 'Achieve 75% win rate',
        condition: (stats) => stats.winRate >= 0.75,
        icon: '👑',
      },
      top_3_strategies: {
        id: 'top_3_strategies',
        name: 'Strategic Mind',
        description: 'Develop 3 winning strategies',
        condition: (stats) => stats.strategies >= 3,
        icon: '🧠',
      },
      consistent_player: {
        id: 'consistent_player',
        name: 'Consistent Performer',
        description: 'Play 20 games',
        condition: (stats) => stats.games >= 20,
        icon: '🎯',
      },
      profitable: {
        id: 'profitable',
        name: 'Wealth Builder',
        description: 'Average profit above 1000 per game',
        condition: (stats) => stats.avgProfit >= 1000,
        icon: '💰',
      },
      accurate_decisions: {
        id: 'accurate_decisions',
        name: 'Sharp Mind',
        description: 'Achieve 80% decision accuracy',
        condition: (stats) => stats.decisionAccuracy >= 0.8,
        icon: '🎯',
      },
    };
  }

  /**
   * Get win rate over recent N games
   * @param {string} playerId - Player ID
   * @param {number} games - Number of games to analyze
   * @returns {number} Win rate (0-1)
   */
  getWinRate(playerId, games = 20) {
    return this.aggregator.getRawMetric(playerId, 'win_rate', games);
  }

  /**
   * Get average placement (1-4) over recent N games
   * @param {string} playerId - Player ID
   * @param {number} games - Number of games to analyze
   * @returns {number} Average placement (1 = best)
   */
  getAveragePlacement(playerId, games = 20) {
    return this.aggregator.getRawMetric(playerId, 'avg_placement', games);
  }

  /**
   * Get average profit per game
   * @param {string} playerId - Player ID
   * @param {number} games - Number of games to analyze
   * @returns {number} Average money gained per game
   */
  getProfitPerGame(playerId, games = 20) {
    return this.aggregator.getRawMetric(playerId, 'money_final', games);
  }

  /**
   * Get AI self-assessment accuracy
   * @param {string} playerId - Player ID
   * @returns {number} Decision accuracy (0-1)
   */
  getDecisionAccuracy(playerId) {
    return this.aggregator.getRawMetric(playerId, 'self_assessment_accuracy');
  }

  /**
   * Get trend direction for a metric
   * @param {string} playerId - Player ID
   * @param {string} metric - Metric name
   * @param {number} games - Number of games to analyze
   * @returns {object} {direction, delta} where direction is 'improving'|'stable'|'declining'
   */
  getTrend(playerId, metric, games = 10) {
    if (games < 2) {
      return { direction: 'stable', delta: 0 };
    }

    // Get recent half vs older half
    const halfGames = Math.floor(games / 2);
    const olderValue = this.aggregator.getRawMetric(playerId, metric, games);
    
    // Simulate getting older half by using different window
    // In a real implementation, we'd store historical values
    // For now, we estimate based on performance trend
    const recentTrend = this.metaCognition?.getPerformanceTrend(playerId, games);
    
    if (!recentTrend || recentTrend.length < 2) {
      return { direction: 'stable', delta: 0 };
    }

    const firstHalf = recentTrend.slice(0, halfGames);
    const secondHalf = recentTrend.slice(halfGames);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const delta = secondAvg - firstAvg;
    
    let direction = 'stable';
    if (delta > 0.1) {
      direction = 'improving';
    } else if (delta < -0.1) {
      direction = 'declining';
    }

    return { direction, delta };
  }

  /**
   * Get full dashboard data for a player
   * @param {string} playerId - Player ID
   * @returns {object} Full dashboard state
   */
  getDashboardData(playerId) {
    const games = 20;
    
    // Core metrics
    const winRate = this.getWinRate(playerId, games);
    const avgPlacement = this.getAveragePlacement(playerId, games);
    const profitPerGame = this.getProfitPerGame(playerId, games);
    const decisionAccuracy = this.getDecisionAccuracy(playerId);
    
    // Trends
    const trends = {
      winRate: this.getTrend(playerId, 'win_rate', 10),
      avgPlacement: this.getTrend(playerId, 'avg_placement', 10),
      profit: this.getTrend(playerId, 'money_final', 10),
      decisionAccuracy: this.getTrend(playerId, 'self_assessment_accuracy', 10),
    };
    
    // Stats for milestones
    const stats = this._getPlayerStats(playerId);
    
    // Milestones
    const milestones = this.getMilestones(playerId);
    const nextMilestone = this.getNextMilestone(playerId);
    
    return {
      playerId,
      winRate,
      avgPlacement,
      profitPerGame,
      decisionAccuracy,
      trends,
      milestones,
      nextMilestone,
      stats,
    };
  }

  /**
   * Get unlocked milestones for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Unlocked milestones
   */
  getMilestones(playerId) {
    const stats = this._getPlayerStats(playerId);
    const unlocked = [];
    
    for (const milestone of Object.values(this.milestones)) {
      if (milestone.condition(stats)) {
        unlocked.push({
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          icon: milestone.icon,
        });
      }
    }
    
    return unlocked;
  }

  /**
   * Get next milestone to achieve
   * @param {string} playerId - Player ID
   * @returns {object|null} Next milestone or null
   */
  getNextMilestone(playerId) {
    const stats = this._getPlayerStats(playerId);
    const unlockedIds = this.getMilestones(playerId).map(m => m.id);
    
    for (const milestone of Object.values(this.milestones)) {
      if (!unlockedIds.includes(milestone.id)) {
        return {
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          icon: milestone.icon,
          progress: this._calculateProgress(milestone, stats),
        };
      }
    }
    
    return null;
  }

  /**
   * Calculate progress toward a milestone
   * @private
   */
  _calculateProgress(milestone, stats) {
    switch (milestone.id) {
      case 'first_win':
        return Math.min(stats.wins / 1, 1);
      case 'win_5_games':
        return Math.min(stats.wins / 5, 1);
      case 'win_rate_50':
        return Math.min(stats.winRate / 0.5, 1);
      case 'win_rate_75':
        return Math.min(stats.winRate / 0.75, 1);
      case 'top_3_strategies':
        return Math.min(stats.strategies / 3, 1);
      case 'consistent_player':
        return Math.min(stats.games / 20, 1);
      case 'profitable':
        return Math.min(stats.avgProfit / 1000, 1);
      case 'accurate_decisions':
        return Math.min(stats.decisionAccuracy / 0.8, 1);
      default:
        return 0;
    }
  }

  /**
   * Get player statistics
   * @private
   */
  _getPlayerStats(playerId) {
    const games = 20;
    
    // Get data from metaCognition if available
    let wins = 0;
    let totalGames = 0;
    
    if (this.metaCognition?.performanceLog) {
      const log = this.metaCognition.performanceLog.get(playerId);
      if (log) {
        const recent = log.slice(-games);
        wins = recent.filter(e => e.won).length;
        totalGames = recent.length;
      }
    }
    
    // Get strategy count from L3
    let strategyCount = 0;
    if (this.memoryLayer?.l3 || this.memoryLayer) {
      const l3 = this.memoryLayer.l3 || this.memoryLayer;
      if (l3.strategies) {
        strategyCount = Array.from(l3.strategies.values())
          .filter(s => s.playerId === playerId).length;
      }
    }
    
    const winRate = totalGames > 0 ? wins / totalGames : 0;
    const avgProfit = this.getProfitPerGame(playerId, games);
    const decisionAccuracy = this.getDecisionAccuracy(playerId);
    
    return {
      wins,
      games: totalGames,
      winRate,
      strategies: strategyCount,
      avgProfit,
      decisionAccuracy,
    };
  }
}