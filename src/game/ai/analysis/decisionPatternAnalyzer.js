/**
 * DecisionPatternAnalyzer - Analyze AI decision patterns and identify improvement opportunities
 * 
 * Analyzes AI decision data to detect recurring patterns, identify biases,
 * find inconsistencies, and generate actionable feedback.
 */

export class DecisionPatternAnalyzer {
  /**
   * Create a decision pattern analyzer
   * @param {object} memoryLayer - Memory layer instance
   * @param {object} embeddingIndex - Embedding index for similarity search
   */
  constructor(memoryLayer, embeddingIndex) {
    this.memoryLayer = memoryLayer;
    this.embeddingIndex = embeddingIndex;
    this.baselineDecisions = this._initializeBaseline();
  }

  /**
   * Initialize baseline human decisions for comparison
   * @returns {Array} Baseline decision templates
   */
  _initializeBaseline() {
    return [
      { type: 'property_buy', action: 'buy', weight: 0.7 },
      { type: 'property_buy', action: 'skip', weight: 0.3 },
      { type: 'rent_pay', action: 'pay', weight: 0.85 },
      { type: 'rent_pay', action: 'negotiate', weight: 0.15 },
      { type: 'question_answer', action: 'respond', weight: 0.9 },
      { type: 'question_answer', action: 'pass', weight: 0.1 },
    ];
  }

  /**
   * Detect recurring decision patterns for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Detected patterns with {pattern, count, strength}
   */
  detectDecisionPatterns(playerId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) || 
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];
    
    if (decisions.length < 2) return [];

    const patterns = [];
    const actionGroups = new Map();

    // Group by action type
    for (const decision of decisions) {
      const key = decision.action || decision.type || 'unknown';
      if (!actionGroups.has(key)) {
        actionGroups.set(key, []);
      }
      actionGroups.get(key).push(decision);
    }

    // Analyze each group for patterns
    for (const [action, group] of actionGroups) {
      if (group.length >= 2) {
        const pattern = {
          type: action,
          count: group.length,
          strength: Math.min(group.length / 10, 1.0), // Cap at 1.0
          decisions: group.slice(0, 5), // Sample
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Identify systematic biases in player decisions
   * @param {string} playerId - Player ID
   * @returns {Array} Detected biases with {bias, severity, evidence}
   */
  identifyBiases(playerId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) ||
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];
    
    const biases = [];
    const actionCounts = new Map();
    let totalDecisions = 0;

    // Count action frequencies
    for (const decision of decisions) {
      const action = decision.action || 'unknown';
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      totalDecisions++;
    }

    if (totalDecisions === 0) return biases;

    // Detect "always avoid rent" bias
    const rentDecisions = decisions.filter(d => 
      d.situation?.toLowerCase().includes('rent') || 
      d.action?.toLowerCase().includes('rent')
    );
    const rentSkips = rentDecisions.filter(d => d.action?.toLowerCase().includes('skip') || d.action?.toLowerCase().includes('avoid'));
    if (rentDecisions.length >= 3 && rentSkips.length / rentDecisions.length > 0.5) {
      biases.push({
        bias: 'rent_avoidance',
        severity: 0.7,
        evidence: `Skipped rent in ${rentSkips.length}/${rentDecisions.length} cases`,
      });
    }

    // Detect "always buy property" bias
    const buyDecisions = decisions.filter(d => d.action?.toLowerCase().includes('buy'));
    if (buyDecisions.length / totalDecisions > 0.8 && totalDecisions >= 5) {
      biases.push({
        bias: 'compulsive_buying',
        severity: 0.5,
        evidence: `Bought property in ${buyDecisions.length}/${totalDecisions} decisions`,
      });
    }

    // Detect "never take risks" bias
    const riskyActions = ['upgrade', 'trade', 'bid', 'mortgage'];
    const riskyDecisions = decisions.filter(d => 
      riskyActions.some(a => d.action?.toLowerCase().includes(a))
    );
    if (riskyDecisions.length / totalDecisions < 0.1 && totalDecisions >= 10) {
      biases.push({
        bias: 'risk_averseness',
        severity: 0.6,
        evidence: `Only took risky actions in ${riskyDecisions.length}/${totalDecisions} decisions`,
      });
    }

    return biases;
  }

  /**
   * Find cases where AI makes different decisions in similar situations
   * @param {string} playerId - Player ID
   * @returns {Array} Inconsistencies with {situation1, decision1, situation2, decision2, similarity}
   */
  findInconsistencies(playerId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) ||
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];
    
    const inconsistencies = [];

    // Need at least 2 decisions to compare
    if (decisions.length < 2) return inconsistencies;

    // Compare each pair of decisions
    for (let i = 0; i < decisions.length; i++) {
      for (let j = i + 1; j < decisions.length; j++) {
        const d1 = decisions[i];
        const d2 = decisions[j];

        // Check if situations are similar
        const similarity = this._calculateSituationSimilarity(d1, d2);
        
        if (similarity > 0.7 && d1.action !== d2.action) {
          inconsistencies.push({
            situation1: d1.situation,
            decision1: d1.action,
            situation2: d2.situation,
            decision2: d2.action,
            similarity: Math.round(similarity * 100) / 100,
          });
        }
      }
    }

    return inconsistencies;
  }

  /**
   * Calculate similarity between two situations
   * @param {object} d1 - First decision
   * @param {object} d2 - Second decision
   * @returns {number} Similarity score (0-1)
   */
  _calculateSituationSimilarity(d1, d2) {
    if (!d1.situation || !d2.situation) return 0;

    const s1 = d1.situation.toLowerCase();
    const s2 = d2.situation.toLowerCase();

    // Simple word overlap similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Score a decision from 0-1
   * @param {object} decision - Decision object
   * @returns {number} Quality score (0-1)
   */
  scoreDecision(decision) {
    let score = 0.5; // Base score

    // Boost for having reasoning
    if (decision.reasoning && decision.reasoning.length > 20) {
      score += 0.1;
    }

    // Boost for having full reasoning chain
    if (decision.chain && decision.chain.length > 1) {
      score += 0.1;
    }

    // Boost for reasonable action selection
    const reasonableActions = ['buy', 'pay', 'trade', 'upgrade', 'respond'];
    if (decision.action && reasonableActions.includes(decision.action.toLowerCase())) {
      score += 0.15;
    }

    // Check against baseline
    const baseline = this.baselineDecisions.find(b => 
      b.type === decision.type && b.action === decision.action
    );
    if (baseline) {
      score = score * 0.7 + baseline.weight * 0.3;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Score a pattern's strength from 0-1
   * @param {object} pattern - Pattern object
   * @returns {number} Pattern strength (0-1)
   */
  scorePattern(pattern) {
    if (!pattern || typeof pattern.count !== 'number') return 0;

    // Strength grows with count but plateaus
    const baseStrength = Math.min(pattern.count / 5, 1.0);
    const frequencyBonus = pattern.count > 3 ? 0.2 : 0;

    return Math.min(baseStrength + frequencyBonus, 1.0);
  }

  /**
   * Compare player decisions to baseline human decisions
   * @param {string} playerId - Player ID
   * @returns {object} Comparison results
   */
  compareToBaseline(playerId) {
    const patterns = this.detectDecisionPatterns(playerId);
    const biases = this.identifyBiases(playerId);

    let totalDeviation = 0;
    let comparisonCount = 0;

    for (const pattern of patterns) {
      const baseline = this.baselineDecisions.find(b => b.type === pattern.type);
      if (baseline) {
        totalDeviation += Math.abs(pattern.strength - baseline.weight);
        comparisonCount++;
      }
    }

    return {
      averageDeviation: comparisonCount > 0 ? totalDeviation / comparisonCount : 0,
      biasCount: biases.length,
      patternCount: patterns.length,
      overallScore: 1 - (comparisonCount > 0 ? totalDeviation / comparisonCount : 0),
    };
  }

  /**
   * Generate feedback for a specific decision
   * @param {string} decisionId - Decision ID
   * @returns {object} Feedback with {score, explanation, suggestion}
   */
  generateDecisionFeedback(decisionId) {
    const decision = this.memoryLayer.getDecision?.(decisionId) ||
                     this.memoryLayer.l2?.getDecision?.(decisionId) ||
                     this._findDecisionById(decisionId);

    if (!decision) {
      return { score: 0, explanation: 'Decision not found', suggestion: '' };
    }

    const score = this.scoreDecision(decision);
    
    let explanation = '';
    let suggestion = '';

    if (score >= 0.8) {
      explanation = 'Excellent decision with clear reasoning';
      suggestion = 'Continue this approach';
    } else if (score >= 0.6) {
      explanation = 'Good decision but could be improved';
      suggestion = 'Consider adding more detailed reasoning';
    } else if (score >= 0.4) {
      explanation = 'Average decision with room for improvement';
      suggestion = 'Review the situation and consider alternative actions';
    } else {
      explanation = 'Poor decision that needs review';
      suggestion = 'Analyze similar past decisions to improve';
    }

    // Check for specific issues
    if (decision.reasoning && decision.reasoning.length < 20) {
      suggestion = 'Add more detailed reasoning to support this decision';
    }

    return { score: Math.round(score * 100) / 100, explanation, suggestion };
  }

  /**
   * Find decision by ID
   * @param {string} decisionId - Decision ID
   * @returns {object|null} Decision or null
   */
  _findDecisionById(decisionId) {
    const allDecisions = this.memoryLayer.getAllDecisions?.() ||
                         this.memoryLayer.l2?.getAllDecisions?.() || [];
    return allDecisions.find(d => d.id === decisionId) || null;
  }

  /**
   * Get pattern frequency map
   * @param {string} playerId - Player ID
   * @returns {object} Map of pattern -> count
   */
  getPatternFrequency(playerId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) ||
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];
    
    const frequency = {};

    // Count all actions directly
    for (const decision of decisions) {
      const action = decision.action || 'unknown';
      frequency[action] = (frequency[action] || 0) + 1;
    }

    return frequency;
  }

  /**
   * Get decision time statistics
   * @param {string} playerId - Player ID
   * @returns {object} Stats with {avg, min, max} in milliseconds
   */
  getDecisionTimeStats(playerId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) ||
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];

    if (decisions.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }

    let sum = 0;
    let min = Infinity;
    let max = 0;

    for (const decision of decisions) {
      // Use timestamp difference or default to random time
      const time = decision.duration || 
                   (decision.timestamp && decision.endTimestamp 
                    ? decision.endTimestamp - decision.timestamp 
                    : Math.random() * 5000 + 500);
      
      sum += time;
      min = Math.min(min, time);
      max = Math.max(max, time);
    }

    return {
      avg: Math.round(sum / decisions.length),
      min: min === Infinity ? 0 : Math.round(min),
      max: Math.round(max),
    };
  }
}