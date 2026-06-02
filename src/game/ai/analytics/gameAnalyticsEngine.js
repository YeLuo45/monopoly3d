/**
 * Game Analytics Engine
 * 
 * Analyzes game data and provides insights and recommendations.
 * Part of the Real-Time Analytics System (Direction E v3).
 */

import { RealTimeMetricsCollector } from './realTimeMetricsCollector.js';

export class GameAnalyticsEngine {
  /**
   * @param {RealTimeMetricsCollector} metricsCollector - The metrics collector instance
   */
  constructor(metricsCollector = new RealTimeMetricsCollector()) {
    this.metricsCollector = metricsCollector;
    
    // Performance thresholds for alerts
    this.thresholds = {
      money_balance: { low: 500, critical: 100 },
      properties_owned: { low: 2, optimal: 5 },
      net_worth: { declining: -100 }, // per turn decline
      rent_collected: { expected_min: 50 },
      decisions_correct: { accuracy_threshold: 0.6 },
    };
    
    // Trend analysis configuration
    this.trendWindow = 60000; // 1 minute window for trends
    this.historyWindow = 300000; // 5 minutes for historical comparison
  }

  /**
   * Analyze full player performance
   * @param {string} playerId - Player identifier
   * @returns {Object} Complete performance analysis
   */
  analyzePlayerPerformance(playerId) {
    const currentMetrics = this.metricsCollector.getCurrentMetrics(playerId);
    
    if (!currentMetrics || !currentMetrics.metrics || Object.keys(currentMetrics.metrics).length === 0) {
      return {
        playerId,
        analyzedAt: Date.now(),
        performance: null,
        status: 'no_data',
        message: 'No metrics available for analysis',
      };
    }
    
    // Calculate various performance indicators
    const analysis = {
      playerId,
      analyzedAt: Date.now(),
      performance: {
        financial: this._analyzeFinancialHealth(playerId, currentMetrics),
        property: this._analyzePropertyStatus(playerId, currentMetrics),
        decision: this._analyzeDecisionQuality(playerId, currentMetrics),
        activity: this._analyzeActivityLevel(playerId, currentMetrics),
      },
      status: 'analyzed',
      overallScore: 0,
    };
    
    // Calculate overall score (weighted average)
    const weights = { financial: 0.35, property: 0.25, decision: 0.25, activity: 0.15 };
    analysis.overallScore = this._calculateOverallScore(analysis.performance, weights);
    analysis.status = analysis.overallScore >= 0.7 ? 'excellent' : 
                      analysis.overallScore >= 0.5 ? 'good' :
                      analysis.overallScore >= 0.3 ? 'fair' : 'poor';
    
    return analysis;
  }

  /**
   * Analyze game-wide trends
   * @returns {Object} Game trend analysis
   */
  analyzeGameTrends() {
    const now = Date.now();
    const recentWindow = now - this.trendWindow;
    const historicalWindow = now - this.historyWindow;
    
    // Collect all players with metrics
    const allPlayerTrends = [];
    
    // This would need access to all players - using a placeholder approach
    // In real implementation, this would iterate over active game players
    
    return {
      analyzedAt: now,
      timeRange: {
        recent: { start: recentWindow, end: now },
        historical: { start: historicalWindow, end: recentWindow },
      },
      trends: {
        averageWealth: 0,
        totalTransactions: 0,
        activePlayers: 0,
        momentum: 'stable', // rising, falling, stable
      },
      playerTrends: allPlayerTrends,
    };
  }

  /**
   * Get player-specific insights
   * @param {string} playerId - Player identifier
   * @returns {Object} Player insights
   */
  getInsights(playerId) {
    const performance = this.analyzePlayerPerformance(playerId);
    
    if (performance.status === 'no_data' || !performance.performance) {
      return {
        playerId,
        insights: [],
        generatedAt: Date.now(),
      };
    }
    
    const insights = [];
    
    // Financial insights
    if (performance.performance.financial) {
      const fin = performance.performance.financial;
      
      if (fin.balance_trend === 'declining' && fin.decline_rate > 0.2) {
        insights.push({
          type: 'warning',
          category: 'financial',
          title: 'Declining Balance',
          description: `Your balance is decreasing at ${(fin.decline_rate * 100).toFixed(1)}% per turn`,
          priority: 'high',
        });
      }
      
      if (fin.income_ratio < 0.5) {
        insights.push({
          type: 'info',
          category: 'financial',
          title: 'Low Income Ratio',
          description: 'Your income-to-expense ratio is low. Consider more income-generating properties.',
          priority: 'medium',
        });
      }
    }
    
    // Property insights
    if (performance.performance.property) {
      const prop = performance.performance.property;
      
      if (prop.owned_count < 3) {
        insights.push({
          type: 'suggestion',
          category: 'property',
          title: 'Property Gap',
          description: 'Consider acquiring more properties to increase rent income.',
          priority: 'medium',
        });
      }
      
      if (prop.mortgage_ratio > 0.5) {
        insights.push({
          type: 'warning',
          category: 'property',
          title: 'High Mortgage Ratio',
          description: 'Too many properties are mortgaged. Unmortgage them for higher rent.',
          priority: 'high',
        });
      }
    }
    
    // Decision insights
    if (performance.performance.decision) {
      const dec = performance.performance.decision;
      
      if (dec.accuracy < 0.5) {
        insights.push({
          type: 'warning',
          category: 'decision',
          title: 'Decision Accuracy Low',
          description: 'Your decision accuracy is below 50%. Consider consulting the AI advisor.',
          priority: 'high',
        });
      }
    }
    
    // Activity insights
    if (performance.performance.activity) {
      const act = performance.performance.activity;
      
      if (act.turn_frequency < 0.1) {
        insights.push({
          type: 'info',
          category: 'activity',
          title: 'Low Activity',
          description: 'Your activity has been low. Make sure to take your turns promptly.',
          priority: 'low',
        });
      }
    }
    
    return {
      playerId,
      insights,
      generatedAt: Date.now(),
      overallScore: performance.overallScore,
    };
  }

  /**
   * Get actionable recommendations for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Recommendations
   */
  getRecommendations(playerId) {
    const insights = this.getInsights(playerId);
    const recommendations = [];
    
    for (const insight of insights.insights) {
      const rec = this._generateRecommendation(insight);
      if (rec) {
        recommendations.push(rec);
      }
    }
    
    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return {
      playerId,
      recommendations,
      generatedAt: Date.now(),
      count: recommendations.length,
    };
  }

  /**
   * Analyze financial health
   * @private
   */
  _analyzeFinancialHealth(playerId, currentMetrics) {
    const metrics = currentMetrics.metrics;
    
    const balance = metrics.money_balance?.current || 0;
    const income = metrics.money_income?.current || 0;
    const expense = metrics.money_expense?.current || 0;
    
    // Get historical data for trend analysis
    const now = Date.now();
    const recentBalance = this.metricsCollector.aggregateMetrics(
      playerId, 'money_balance', 
      { start: now - 60000, end: now }
    );
    
    const historicalBalance = this.metricsCollector.aggregateMetrics(
      playerId, 'money_balance',
      { start: now - 300000, end: now - 60000 }
    );
    
    let balance_trend = 'stable';
    let decline_rate = 0;
    
    if (historicalBalance.avg && recentBalance.avg) {
      decline_rate = (historicalBalance.avg - recentBalance.avg) / (historicalBalance.avg || 1);
      balance_trend = decline_rate > 0.1 ? 'declining' : decline_rate < -0.1 ? 'growing' : 'stable';
    }
    
    return {
      balance,
      income,
      expense,
      income_ratio: expense > 0 ? income / expense : 1,
      balance_trend,
      decline_rate,
      status: balance < this.thresholds.money_balance.critical ? 'critical' :
              balance < this.thresholds.money_balance.low ? 'low' : 'healthy',
    };
  }

  /**
   * Analyze property status
   * @private
   */
  _analyzePropertyStatus(playerId, currentMetrics) {
    const metrics = currentMetrics.metrics;
    
    const owned = metrics.properties_owned?.current || 0;
    const mortgaged = metrics.properties_mortgaged?.current || 0;
    const rent_collected = metrics.rent_collected?.current || 0;
    const rent_paid = metrics.rent_paid?.current || 0;
    
    return {
      owned_count: owned,
      mortgaged_count: mortgaged,
      mortgage_ratio: owned > 0 ? mortgaged / owned : 0,
      rent_collected,
      rent_paid,
      rent_ratio: rent_paid > 0 ? rent_collected / rent_paid : 1,
      status: owned < this.thresholds.properties_owned.low ? 'underweight' :
              owned >= this.thresholds.properties_owned.optimal ? 'optimal' : 'moderate',
    };
  }

  /**
   * Analyze decision quality
   * @private
   */
  _analyzeDecisionQuality(playerId, currentMetrics) {
    const metrics = currentMetrics.metrics;
    
    const decisions = metrics.decisions_made?.current || 0;
    const correct = metrics.decisions_correct?.current || 0;
    
    const accuracy = decisions > 0 ? correct / decisions : 0;
    
    return {
      total_decisions: decisions,
      correct_decisions: correct,
      accuracy,
      status: accuracy >= this.thresholds.decisions_correct.accuracy_threshold ? 'good' : 'needs_improvement',
    };
  }

  /**
   * Analyze activity level
   * @private
   */
  _analyzeActivityLevel(playerId, currentMetrics) {
    const metrics = currentMetrics.metrics;
    
    const turns = metrics.turn_count?.current || 0;
    const turn_duration = metrics.turn_duration?.current || 0;
    
    return {
      turn_count: turns,
      avg_turn_duration: turn_duration,
      turn_frequency: turns > 0 ? 1 / (turn_duration || 1) : 0,
      status: 'active',
    };
  }

  /**
   * Calculate overall score
   * @private
   */
  _calculateOverallScore(performance, weights) {
    let score = 0;
    let totalWeight = 0;
    
    // Financial score (0-1)
    if (performance.financial) {
      const fin = performance.financial;
      let finScore = 0.5; // base
      if (fin.status === 'healthy') finScore = 1;
      else if (fin.status === 'low') finScore = 0.3;
      else if (fin.status === 'critical') finScore = 0;
      
      if (fin.balance_trend === 'growing') finScore = Math.min(1, finScore + 0.2);
      else if (fin.balance_trend === 'declining') finScore = Math.max(0, finScore - 0.3);
      
      score += finScore * weights.financial;
      totalWeight += weights.financial;
    }
    
    // Property score
    if (performance.property) {
      const prop = performance.property;
      let propScore = 0.5;
      if (prop.status === 'optimal') propScore = 1;
      else if (prop.status === 'moderate') propScore = 0.6;
      else if (prop.status === 'underweight') propScore = 0.3;
      
      score += propScore * weights.property;
      totalWeight += weights.property;
    }
    
    // Decision score
    if (performance.decision) {
      const dec = performance.decision;
      score += dec.accuracy * weights.decision;
      totalWeight += weights.decision;
    }
    
    // Activity score
    if (performance.activity) {
      const act = performance.activity;
      const actScore = act.turn_frequency > 0 ? Math.min(1, act.turn_frequency * 10) : 0.5;
      score += actScore * weights.activity;
      totalWeight += weights.activity;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Generate recommendation from insight
   * @private
   */
  _generateRecommendation(insight) {
    const recMap = {
      'Declining Balance': {
        action: 'Review recent expenses and consider selling properties or making strategic trades to improve cash flow.',
        priority: 'high',
      },
      'Low Income Ratio': {
        action: 'Invest in high-rent properties like Boardwalk, Park Place, or railroad spaces.',
        priority: 'medium',
      },
      'Property Gap': {
        action: 'Prioritize acquiring properties, especially those in color sets you can complete.',
        priority: 'medium',
      },
      'High Mortgage Ratio': {
        action: 'Focus on unmortgaging properties when cash is available to maximize rent collection.',
        priority: 'high',
      },
      'Decision Accuracy Low': {
        action: 'Use the AI Strategy Advisor to get recommendations for key decisions.',
        priority: 'high',
      },
      'Low Activity': {
        action: 'Take your turns promptly to avoid timeout penalties.',
        priority: 'low',
      },
    };
    
    const rec = recMap[insight.title];
    if (!rec) return null;
    
    return {
      ...insight,
      ...rec,
      recommendedAction: rec.action,
    };
  }
}