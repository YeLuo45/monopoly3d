/**
 * PlayerModel - Individual player behavior profile
 * Tracks player actions and builds a behavioral profile
 */
export class PlayerModel {
  constructor(playerId) {
    this.playerId = playerId;
    this.tilesVisited = new Set();
    this.tilesVisitedCount = {}; // tileId -> count
    this.propertiesBought = [];
    this.rentPaid = 0;
    this.rentReceived = 0;
    this.diceRolls = [];
    this.questionResponses = []; // { category, correct, timeTaken }
    this.propertyBuyDecisions = []; // { tileId, bought, decisionTime }
    this.riskIncidents = []; // high rent pays, risky decisions
    
    // Computed profile (lazy)
    this._profile = null;
    this._lastUpdate = null;
  }

  /**
   * Record a player action
   * @param {string} event - Event type (property_purchase, rent_paid, dice_roll, etc.)
   * @param {object} data - Event data
   */
  recordAction(event, data) {
    this._profile = null; // invalidate cache
    
    switch (event) {
      case 'tile_visit':
        this._recordTileVisit(data.tileId);
        break;
      case 'property_purchase':
        this._recordPropertyPurchase(data);
        break;
      case 'rent_paid':
        this._recordRentPaid(data.amount);
        break;
      case 'rent_received':
        this._recordRentReceived(data.amount);
        break;
      case 'dice_roll':
        this._recordDiceRoll(data.values);
        break;
      case 'question_answered':
        this._recordQuestionResponse(data);
        break;
      case 'property_buy_decision':
        this._recordPropertyDecision(data);
        break;
      case 'risk_incident':
        this._recordRiskIncident(data);
        break;
    }
    
    this._lastUpdate = Date.now();
  }

  _recordTileVisit(tileId) {
    this.tilesVisited.add(tileId);
    this.tilesVisitedCount[tileId] = (this.tilesVisitedCount[tileId] || 0) + 1;
  }

  _recordPropertyPurchase(data) {
    this.propertiesBought.push({
      tileId: data.tileId,
      price: data.price,
      timestamp: data.timestamp || Date.now(),
    });
  }

  _recordRentPaid(amount) {
    this.rentPaid += amount;
  }

  _recordRentReceived(amount) {
    this.rentReceived += amount;
  }

  _recordDiceRoll(values) {
    if (Array.isArray(values)) {
      this.diceRolls.push(...values);
    } else {
      this.diceRolls.push(values);
    }
  }

  _recordQuestionResponse(data) {
    this.questionResponses.push({
      category: data.category,
      correct: data.correct,
      timeTaken: data.timeTaken || 0,
      timestamp: Date.now(),
    });
  }

  _recordPropertyDecision(data) {
    this.propertyBuyDecisions.push({
      tileId: data.tileId,
      bought: data.bought,
      decisionTime: data.decisionTime || 0,
      timestamp: Date.now(),
    });
  }

  _recordRiskIncident(data) {
    this.riskIncidents.push({
      type: data.type,
      severity: data.severity,
      context: data.context,
      timestamp: Date.now(),
    });
  }

  /**
   * Get comprehensive player profile
   * @returns {object} Profile object
   */
  getProfile() {
    if (this._profile) return this._profile;

    const totalDiceRolls = this.diceRolls.length;
    const avgDice = totalDiceRolls > 0
      ? this.diceRolls.reduce((a, b) => a + b, 0) / totalDiceRolls
      : 3.5;

    const totalQuestions = this.questionResponses.length;
    const correctQuestions = this.questionResponses.filter(q => q.correct).length;
    const accuracy = totalQuestions > 0 ? (correctQuestions / totalQuestions) * 100 : 0;

    // Calculate category accuracies
    const categoryAccuracy = {};
    const categories = [...new Set(this.questionResponses.map(q => q.category))];
    categories.forEach(cat => {
      const catResponses = this.questionResponses.filter(q => q.category === cat);
      const catCorrect = catResponses.filter(q => q.correct).length;
      categoryAccuracy[cat] = catResponses.length > 0
        ? (catCorrect / catResponses.length) * 100
        : 0;
    });

    // Common tiles (top 5)
    const tileCounts = Object.entries(this.tilesVisitedCount)
      .sort((a, b) => b[1] - a[1]);
    const commonTiles = tileCounts.slice(0, 5).map(([tileId, count]) => ({
      tileId: parseInt(tileId),
      count,
    }));

    // Property buying rate
    const buyDecisions = this.propertyBuyDecisions.length;
    const buys = this.propertyBuyDecisions.filter(d => d.bought).length;
    const buyRate = buyDecisions > 0 ? (buys / buyDecisions) * 100 : 0;

    // Average decision time for property purchases
    const avgDecisionTime = this.propertyBuyDecisions.length > 0
      ? this.propertyBuyDecisions.reduce((sum, d) => sum + d.decisionTime, 0) / this.propertyBuyDecisions.length
      : 0;

    this._profile = {
      playerId: this.playerId,
      playStyle: this._determinePlayStyle(buyRate, accuracy),
      riskTaker: this.getRiskProfile(),
      avgDice,
      avgMoney: this.rentReceived - this.rentPaid,
      commonTiles,
      strength: this._determineStrength(categoryAccuracy),
      propertiesOwned: this.propertiesBought.length,
      totalRentPaid: this.rentPaid,
      totalRentReceived: this.rentReceived,
      accuracy,
      categoryAccuracy,
      buyRate,
      avgDecisionTime,
      lastUpdate: this._lastUpdate,
    };

    return this._profile;
  }

  _determinePlayStyle(buyRate, accuracy) {
    if (buyRate > 70 && accuracy > 70) return 'aggressive';
    if (buyRate < 30 && accuracy > 70) return 'conservative';
    return 'balanced';
  }

  _determineStrength(categoryAccuracy) {
    const entries = Object.entries(categoryAccuracy);
    if (entries.length === 0) return 'general';
    
    const strongest = entries.reduce((max, [cat, acc]) => 
      acc > max.accuracy ? { category: cat, accuracy: acc } : max,
      { category: 'none', accuracy: 0 }
    );
    
    return strongest.category || 'general';
  }

  /**
   * Get risk profile
   * @returns {string} 'conservative'|'balanced'|'aggressive'
   */
  getRiskProfile() {
    const riskScore = this._calculateRiskScore();
    
    if (riskScore < 0.3) return 'conservative';
    if (riskScore > 0.7) return 'aggressive';
    return 'balanced';
  }

  _calculateRiskScore() {
    let score = 0;
    let factors = 0;

    // Factor 1: Rent paid vs received (high ratio = risky)
    if (this.rentReceived > 0) {
      const ratio = this.rentPaid / this.rentReceived;
      score += Math.min(ratio, 2) / 2;
      factors++;
    }

    // Factor 2: Property decisions
    if (this.propertyBuyDecisions.length > 0) {
      const riskyDecisions = this.propertyBuyDecisions.filter(d => d.bought).length;
      score += riskyDecisions / this.propertyBuyDecisions.length;
      factors++;
    }

    // Factor 3: Risk incidents
    if (this.riskIncidents.length > 0) {
      const severity = this.riskIncidents.reduce((sum, i) => sum + (i.severity || 0), 0);
      score += Math.min(severity / this.riskIncidents.length, 1);
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Serialize to JSON
   * @returns {object} JSON representation
   */
  toJSON() {
    return {
      playerId: this.playerId,
      tilesVisited: Array.from(this.tilesVisited),
      tilesVisitedCount: this.tilesVisitedCount,
      propertiesBought: this.propertiesBought,
      rentPaid: this.rentPaid,
      rentReceived: this.rentReceived,
      diceRolls: this.diceRolls,
      questionResponses: this.questionResponses,
      propertyBuyDecisions: this.propertyBuyDecisions,
      riskIncidents: this.riskIncidents,
      _lastUpdate: this._lastUpdate,
    };
  }

  /**
   * Deserialize from JSON
   * @param {object} json - JSON object
   * @returns {PlayerModel} New instance
   */
  static fromJSON(json) {
    const model = new PlayerModel(json.playerId);
    model.tilesVisited = new Set(json.tilesVisited || []);
    model.tilesVisitedCount = json.tilesVisitedCount || {};
    model.propertiesBought = json.propertiesBought || [];
    model.rentPaid = json.rentPaid || 0;
    model.rentReceived = json.rentReceived || 0;
    model.diceRolls = json.diceRolls || [];
    model.questionResponses = json.questionResponses || [];
    model.propertyBuyDecisions = json.propertyBuyDecisions || [];
    model.riskIncidents = json.riskIncidents || [];
    model._lastUpdate = json._lastUpdate || null;
    return model;
  }
}