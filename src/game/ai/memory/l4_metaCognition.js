/**
 * L4_MetaCognition - Self-reflection and improvement
 * 
 * Inspired by generic-agent self-improvement loop. Assesses decision
 * quality, identifies weaknesses, and tracks performance trends.
 */

export class L4_MetaCognition {
  /**
   * @param {L3_LongTermMemory} longTermMemory - Reference to L3
   * @param {L2_WorkingMemory} workingMemory - Reference to L2
   */
  constructor(longTermMemory, workingMemory) {
    this.longTermMemory = longTermMemory;
    this.workingMemory = workingMemory;
    this.performanceLog = new Map(); // playerId -> performance history
    this.selfConfidence = new Map(); // playerId -> confidence score
  }

  /**
   * Assess the quality of a decision (0-1 scale)
   * @param {string} decisionId - Decision ID
   * @returns {number} Quality score
   */
  assessDecisionQuality(decisionId) {
    const decision = this.workingMemory.getDecisions('__current__')
      .find(d => d.id === decisionId);
    
    if (!decision) {
      // Try to find in all decisions if playerId unknown
      const allDecisions = this.workingMemory.getAllDecisions();
      const found = allDecisions.find(d => d.id === decisionId);
      if (!found) return 0;
    }
    
    // Simple quality assessment based on reasoning chain length
    const chainLength = decision ? decision.chain.length : 1;
    
    // More reasoning steps = higher quality (capped at 0.8)
    const reasoningScore = Math.min(chainLength * 0.2, 0.8);
    
    // Check if reasoning contains strategic keywords
    const hasStrategicThinking = decision && (
      decision.reasoning.includes('because') ||
      decision.reasoning.includes('since') ||
      decision.reasoning.includes('therefore') ||
      decision.reasoning.includes('risk')
    );
    
    const strategicBonus = hasStrategicThinking ? 0.2 : 0;
    
    return Math.min(reasoningScore + strategicBonus, 1);
  }

  /**
   * Get overall confidence in AI's self-assessment
   * @param {string} playerId - Player ID
   * @returns {number} Confidence score 0-1
   */
  getSelfConfidence(playerId) {
    const confidence = this.selfConfidence.get(playerId);
    if (confidence !== undefined) return confidence;
    
    // Calculate based on decision history
    const decisions = this.workingMemory.getDecisions(playerId);
    if (decisions.length === 0) return 0.5; // Default
    
    // Higher confidence with more decisions
    const baseConfidence = Math.min(decisions.length / 20, 0.9);
    
    // Adjust based on performance trend
    const trend = this.getPerformanceTrend(playerId, 5);
    let trendBonus = 0;
    if (trend.length >= 2) {
      const recentAvg = trend.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, trend.length);
      trendBonus = (recentAvg - 0.5) * 0.2;
    }
    
    const finalConfidence = Math.max(0.1, Math.min(0.95, baseConfidence + trendBonus));
    this.selfConfidence.set(playerId, finalConfidence);
    
    return finalConfidence;
  }

  /**
   * Identify patterns where AI underperforms
   * @param {string} playerId - Player ID
   * @returns {Array} Weak patterns
   */
  identifyWeakPatterns(playerId) {
    const weakPatterns = [];
    const topStrategies = this.longTermMemory.getTopStrategies(playerId, 10);
    
    // Find strategies with low win rates
    for (const strategy of topStrategies) {
      if (strategy.winRate < 0.3 && strategy.totalGames >= 3) {
        weakPatterns.push({
          patternId: strategy.id,
          situation: strategy.situation,
          strategy: strategy.strategy,
          winRate: strategy.winRate,
          totalGames: strategy.totalGames,
          issue: 'Low win rate',
        });
      }
    }
    
    // Find patterns in reasoning that correlate with losses
    const decisions = this.workingMemory.getDecisions(playerId);
    const shortReasoning = decisions.filter(d => d.chain.length <= 1);
    if (shortReasoning.length > decisions.length * 0.5) {
      weakPatterns.push({
        patternId: 'short_reasoning',
        issue: 'Many decisions lack detailed reasoning',
        frequency: shortReasoning.length,
      });
    }
    
    return weakPatterns;
  }

  /**
   * Generate improvement suggestion for a weak pattern
   * @param {string} weakPatternId - Weak pattern ID
   * @returns {string} Improvement suggestion
   */
  suggestImprovement(weakPatternId) {
    if (weakPatternId === 'short_reasoning') {
      return 'Consider adding more detailed reasoning to decisions, ' +
        'including risk assessment and expected outcomes.';
    }
    
    const strategy = this.longTermMemory.strategies.get(weakPatternId);
    if (!strategy) return 'No specific suggestion available.';
    
    if (strategy.winRate < 0.3) {
      return `Strategy "${strategy.strategy}" shows low win rate. ` +
        `Consider alternative approaches or waiting for better opportunities.`;
    }
    
    if (strategy.totalGames < 3) {
      return `Strategy "${strategy.strategy}" needs more data. ` +
        `Continue using it to gather more performance data.`;
    }
    
    return 'Review the strategy and consider adjusting based on recent performance.';
  }

  /**
   * Track performance after game
   * @param {string} playerId - Player ID
   * @param {object} gameOutcome - Game outcome {won, score, rank}
   */
  trackPerformance(playerId, gameOutcome) {
    if (!this.performanceLog.has(playerId)) {
      this.performanceLog.set(playerId, []);
    }
    
    const log = this.performanceLog.get(playerId);
    log.push({
      ...gameOutcome,
      timestamp: Date.now(),
    });
    
    // Keep only last 50 games
    if (log.length > 50) {
      this.performanceLog.set(playerId, log.slice(-50));
    }
    
    // Update self-confidence
    this.getSelfConfidence(playerId);
  }

  /**
   * Get recent performance trend
   * @param {string} playerId - Player ID
   * @param {number} games - Number of games to analyze
   * @returns {Array} Performance values (1 = win, 0 = loss)
   */
  getPerformanceTrend(playerId, games = 10) {
    const log = this.performanceLog.get(playerId);
    if (!log || log.length === 0) return [];
    
    const recent = log.slice(-games);
    return recent.map(entry => entry.won ? 1 : 0);
  }

  /**
   * Get detailed performance stats
   * @param {string} playerId - Player ID
   * @param {number} games - Number of games to analyze
   * @returns {object} Detailed stats
   */
  getDetailedStats(playerId, games = 10) {
    const log = this.performanceLog.get(playerId);
    if (!log || log.length === 0) {
      return { games: 0, wins: 0, winRate: 0, avgScore: 0 };
    }
    
    const recent = log.slice(-games);
    const wins = recent.filter(e => e.won).length;
    
    return {
      games: recent.length,
      wins,
      winRate: wins / recent.length,
      avgScore: recent.reduce((a, e) => a + (e.score || 0), 0) / recent.length,
    };
  }
}