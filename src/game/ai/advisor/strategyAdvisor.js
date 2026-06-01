/**
 * StrategyAdvisor - AI-powered strategy recommendations
 * Uses memory layer + embedding index + decision analyzer
 */
export class StrategyAdvisor {
  constructor(memoryLayer, embeddingIndex, decisionAnalyzer) {
    this.memoryLayer = memoryLayer;
    this.embeddingIndex = embeddingIndex;
    this.decisionAnalyzer = decisionAnalyzer;
  }

  /**
   * Get game phase based on turn count and board state
   */
  getGamePhase(gameState) {
    const turn = gameState?.turn || 1;
    if (turn <= 5) return 'early';
    if (turn <= 15) return 'mid';
    return 'late';
  }

  /**
   * Get recommended strategy for current phase
   */
  getRecommendedStrategy(phase, playerPosition = 1) {
    const strategies = {
      early: { name: 'aggressive_early', desc: 'Buy aggressively, focus on color groups' },
      mid: { name: 'defensive_mid', desc: 'Build properties, avoid risky trades' },
      late: { name: 'final_push', desc: 'Maximize rent, complete monopolies' },
    };
    const base = strategies[phase] || strategies.mid;
    if (playerPosition === 1) {
      return { ...base, name: 'monopoly_hunt', desc: 'Hunt monopolies as first player' };
    }
    return base;
  }

  /**
   * Suggest next move for a player
   */
  suggestNextMove(playerId, gameState) {
    const phase = this.getGamePhase(gameState);
    const strategy = this.getRecommendedStrategy(phase);

    // Find similar past situations
    const similar = this._findSimilarSituations(gameState);
    const pastDecisions = this._getPastDecisions(playerId, similar);

    // Determine best action
    const actions = this._getAvailableActions(gameState, playerId);
    const scored = actions.map(a => ({
      action: a,
      confidence: this._scoreAction(a, pastDecisions, gameState),
      reasoning: this._generateReasoning(a, pastDecisions, phase),
    }));
    scored.sort((a, b) => b.confidence - a.confidence);

    return {
      primary: scored[0] || null,
      alternatives: scored.slice(1, 4),
      strategy,
      phase,
    };
  }

  /**
   * Property purchase recommendation
   */
  suggestPropertyPurchase(tileId, playerId, gameState) {
    const tile = this._getTile(tileId, gameState);
    const money = this._getPlayerMoney(playerId, gameState);
    const propertyCount = this._getPropertyCount(playerId, gameState);
    const price = tile?.price || 0;

    if (!tile || !tile.price) {
      return { shouldBuy: false, reasoning: 'Invalid tile', confidence: 0 };
    }

    // Can afford check
    if (price > money * 0.4) {
      return { shouldBuy: false, reasoning: `Price ${price} exceeds 40% of money ${money}`, confidence: 0.9 };
    }

    // Color group completeness
    const groupComplete = this._getColorGroupCompletion(tileId, playerId, gameState);
    const monopolyBonus = groupComplete >= 2 ? 0.3 : 0;
    const rentPotential = this._calculateRentPotential(tileId);
    const affordability = price <= money * 0.3 ? 0.2 : 0;
    const confidence = Math.min(0.95, 0.4 + rentPotential + monopolyBonus + affordability);

    const shouldBuy = confidence > 0.6;
    const reasoning = shouldBuy
      ? `High potential tile (rent score ${rentPotential.toFixed(2)})${monopolyBonus > 0 ? ', could complete monopoly' : ''}`
      : `Low confidence (${confidence.toFixed(2)}), not a strong buy`;

    return { shouldBuy, reasoning, confidence };
  }

  /**
   * Rent strategy suggestion
   */
  suggestRentStrategy(tileId, gameState) {
    const tile = this._getTile(tileId, gameState);
    if (!tile) return { optimalRent: 0, reasoning: 'Invalid tile' };

    const baseRent = tile.rent?.[0] || 10;
    const upgradeLevel = tile.houses || 0;
    const rentMultiplier = 1 + upgradeLevel * 0.5;
    const optimalRent = Math.floor(baseRent * rentMultiplier);

    return {
      optimalRent,
      reasoning: `Base rent ${baseRent} × ${rentMultiplier.toFixed(1)} (${upgradeLevel} houses) = ${optimalRent}`,
    };
  }

  /**
   * Trade offer suggestion
   */
  suggestTradeOffer(playerId, targetId, gameState) {
    const playerMoney = this._getPlayerMoney(playerId, gameState);
    const targetMoney = this._getPlayerMoney(targetId, gameState);

    const offer = Math.floor((targetMoney - playerMoney) * 0.1);
    return {
      offer: Math.max(0, offer),
      reasoning: `Suggested trade: ${Math.max(0, offer)} based on wealth gap`,
    };
  }

  /**
   * Explain a decision
   */
  explainDecision(decisionId) {
    const memory = this.memoryLayer;
    if (!memory) return { explanation: 'No memory available', score: 0 };

    const l2 = memory.l2;
    if (!l2) return { explanation: 'No working memory', score: 0 };

    const decisions = l2.getDecisions ? l2.getDecisions() : [];
    const decision = decisions.find(d => d.id === decisionId);
    if (!decision) return { explanation: 'Decision not found', score: 0 };

    const score = this.decisionAnalyzer?.scoreDecision?.(decision) || 0.5;
    return {
      explanation: decision.reasoning || 'No reasoning recorded',
      score,
      situation: decision.situation || 'Unknown',
    };
  }

  // --- Private helpers ---

  _findSimilarSituations(gameState) {
    if (!this.embeddingIndex) return [];
    try {
      return this.embeddingIndex.search([], 5);
    } catch {
      return [];
    }
  }

  _getPastDecisions(playerId, similarSituations) {
    const memory = this.memoryLayer;
    if (!memory) return [];
    const l1 = memory.l1;
    if (!l1 || !l1.getRecent) return [];
    try {
      return l1.getRecent(20).filter(e => e.playerId === playerId);
    } catch {
      return [];
    }
  }

  _getAvailableActions(gameState, playerId) {
    return [
      { type: 'buy_property', label: 'Buy property' },
      { type: 'roll_dice', label: 'Roll dice' },
      { type: 'trade', label: 'Propose trade' },
      { type: 'build_house', label: 'Build house' },
    ];
  }

  _scoreAction(action, pastDecisions, gameState) {
    const baseScore = 0.5;
    if (!pastDecisions || pastDecisions.length === 0) return baseScore;

    const relevant = pastDecisions.filter(d => d.action?.type === action.type);
    if (relevant.length === 0) return baseScore;

    const avgOutcome = relevant.reduce((sum, d) => sum + (d.outcome || 0.5), 0) / relevant.length;
    return Math.min(0.95, avgOutcome);
  }

  _generateReasoning(action, pastDecisions, phase) {
    const phaseStrategy = {
      early: 'Focus on acquiring properties and color groups',
      mid: 'Build strategically and manage cash flow',
      late: 'Maximize rent income and complete monopolies',
    };
    return `[${phase}] ${phaseStrategy[phase] || 'Neutral strategy'}: ${action.label}`;
  }

  _getTile(tileId, gameState) {
    return gameState?.tiles?.find(t => t.id === tileId) || null;
  }

  _getPlayerMoney(playerId, gameState) {
    return gameState?.players?.find(p => p.id === playerId)?.money || 0;
  }

  _getPropertyCount(playerId, gameState) {
    return gameState?.players?.find(p => p.id === playerId)?.properties?.length || 0;
  }

  _getColorGroupCompletion(tileId, playerId, gameState) {
    const tile = this._getTile(tileId, gameState);
    if (!tile?.colorGroup) return 0;
    const owned = gameState?.players?.find(p => p.id === playerId)?.properties || [];
    return owned.filter(p => p.colorGroup === tile.colorGroup).length;
  }

  _calculateRentPotential(tileId) {
    // Simple heuristic based on tile ID
    const baseRentScores = [0, 0.1, 0.15, 0.15, 0.2, 0.2, 0.25, 0.25, 0.3, 0.3];
    const idx = (tileId || 0) % 10;
    return baseRentScores[idx];
  }
}