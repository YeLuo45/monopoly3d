/**
 * WinningPredictorAI - Predicts game outcomes and winning probability
 * 
 * Analyzes game state to predict winners, calculate win probabilities,
 * and identify key factors that influence winning.
 */

export class WinningPredictorAI {
  /**
   * @param {object} memoryLayer - AIMemoryLayer instance
   * @param {object} opponentModel - OpponentModel instance
   */
  constructor(memoryLayer, opponentModel) {
    this.memory = memoryLayer;
    this.opponentModel = opponentModel;
    
    // Weights for win probability calculation
    this.weights = {
      money: 0.25,
      properties: 0.30,
      monopolies: 0.25,
      position: 0.10,
      momentum: 0.10,
    };
  }

  /**
   * Predict the winner of the current game
   * @param {object} gameState - Current game state
   * @returns {object} {winner, confidence}
   */
  predictWinner(gameState) {
    const players = gameState?.players || [];
    if (players.length === 0) {
      return { winner: null, confidence: 0 };
    }
    
    // Calculate win probabilities for all players
    const winProbs = {};
    let maxProb = 0;
    let winner = null;
    
    for (const player of players) {
      const prob = this.getWinProbability(player.id, gameState);
      winProbs[player.id] = prob;
      if (prob > maxProb) {
        maxProb = prob;
        winner = player.id;
      }
    }
    
    // Confidence based on margin of victory
    const sortedProbs = Object.values(winProbs).sort((a, b) => b - a);
    const margin = sortedProbs[0] - (sortedProbs[1] || 0);
    const confidence = Math.min(0.95, 0.5 + margin);
    
    return { winner, confidence, winProbs };
  }

  /**
   * Predict final standings for all players
   * @param {object} gameState - Current game state
   * @returns {array} Array of {playerId, rank, probability}
   */
  predictFinalStandings(gameState) {
    const players = gameState?.players || [];
    if (players.length === 0) return [];
    
    // Calculate strength scores for each player
    const scores = players.map(player => ({
      playerId: player.id,
      score: this._calculateStrengthScore(player.id, gameState),
      money: player.money || 0,
      properties: this._countProperties(player.id, gameState),
      monopolies: this._countMonopolies(player.id, gameState),
    }));
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    // Assign ranks and calculate final position probabilities
    return scores.map((s, index) => ({
      playerId: s.playerId,
      rank: index + 1,
      probability: this._rankProbability(index + 1, players.length),
      score: s.score,
    }));
  }

  /**
   * Get win probability for a specific player (0-1)
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Win probability between 0 and 1
   */
  getWinProbability(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const players = gameState?.players || [];
    if (players.length <= 1) return 1;
    
    // Get individual factor scores
    const moneyScore = this._evaluateMoney(playerId, gameState);
    const propertyScore = this._evaluateProperties(playerId, gameState);
    const monopolyScore = this._evaluateMonopolies(playerId, gameState);
    const positionScore = this._evaluatePosition(playerId, gameState);
    const momentumScore = this._evaluateMomentum(playerId, gameState);
    
    // Weighted sum
    const rawScore = 
      this.weights.money * moneyScore +
      this.weights.properties * propertyScore +
      this.weights.monopolies * monopolyScore +
      this.weights.position * positionScore +
      this.weights.momentum * momentumScore;
    
    // Normalize to 0-1 range using sigmoid-like function
    const probability = this._normalizeProbability(rawScore, players.length);
    
    return probability;
  }

  /**
   * Get the currently leading player
   * @param {object} gameState - Current game state
   * @returns {object|null} {playerId, score}
   */
  getLeadingPlayer(gameState) {
    const players = gameState?.players || [];
    if (players.length === 0) return null;
    
    let leadingPlayer = null;
    let highestScore = -Infinity;
    
    for (const player of players) {
      const score = this._calculateStrengthScore(player.id, gameState);
      if (score > highestScore) {
        highestScore = score;
        leadingPlayer = { playerId: player.id, score };
      }
    }
    
    return leadingPlayer;
  }

  /**
   * Get key winning factors for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {array} Array of {factor, importance, value}
   */
  getKeyWinningFactors(playerId, gameState) {
    const factors = [];
    const player = this._getPlayer(playerId, gameState);
    if (!player) return factors;
    
    const players = gameState?.players || [];
    
    // Money factor
    const money = player.money || 0;
    const avgMoney = players.reduce((sum, p) => sum + (p.money || 0), 0) / players.length;
    const moneyAdvantage = ((money - avgMoney) / avgMoney) * 100;
    factors.push({
      factor: 'cash_advantage',
      importance: this.weights.money,
      value: Math.round(money),
      advantage: Math.round(moneyAdvantage),
      description: money > avgMoney ? 'Above average cash' : 'Below average cash',
    });
    
    // Property factor
    const propertyCount = this._countProperties(playerId, gameState);
    const avgProperties = this._countTotalProperties(gameState) / players.length;
    factors.push({
      factor: 'property_count',
      importance: this.weights.properties,
      value: propertyCount,
      advantage: Math.round(propertyCount - avgProperties),
      description: `${propertyCount} properties owned`,
    });
    
    // Monopoly factor
    const monopolies = this._countMonopolies(playerId, gameState);
    const monopolyPercentage = players.length > 0 ? 
      (monopolies / Math.max(1, this._countTotalMonopolies(gameState))) * 100 : 0;
    factors.push({
      factor: 'monopoly_control',
      importance: this.weights.monopolies,
      value: monopolies,
      advantage: Math.round(monopolyPercentage),
      description: `${monopolies} monopolies controlled`,
    });
    
    // Position factor
    const positionScore = this._evaluatePosition(playerId, gameState);
    factors.push({
      factor: 'board_position',
      importance: this.weights.position,
      value: Math.round(positionScore * 100),
      advantage: Math.round((positionScore - 0.5) * 100),
      description: 'Position on board',
    });
    
    // Momentum factor
    const momentum = this._evaluateMomentum(playerId, gameState);
    factors.push({
      factor: 'momentum',
      importance: this.weights.momentum,
      value: Math.round(momentum * 100),
      advantage: Math.round((momentum - 0.5) * 100),
      description: momentum > 0.5 ? 'Gaining ground' : 'Losing ground',
    });
    
    // Sort by importance
    factors.sort((a, b) => b.importance - a.importance);
    
    return factors;
  }

  /**
   * Get risk factors threatening a player's winning chances
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {array} Array of {risk, severity, description}
   */
  getRiskFactors(playerId, gameState) {
    const risks = [];
    const player = this._getPlayer(playerId, gameState);
    if (!player) return risks;
    
    const players = gameState?.players || [];
    const opponents = players.filter(p => p.id !== playerId);
    
    // Low cash risk
    const money = player.money || 0;
    if (money < 500) {
      risks.push({
        risk: 'low_cash',
        severity: money < 200 ? 'critical' : 'high',
        description: 'Critical cash shortage - may not survive next rent payment',
      });
    }
    
    // Opponent monopoly threat
    for (const opp of opponents) {
      const oppMonopolies = this._countMonopolies(opp.id, gameState);
      if (oppMonopolies >= 2) {
        risks.push({
          risk: 'opponent_dominance',
          severity: oppMonopolies >= 3 ? 'critical' : 'high',
          description: `Opponent ${opp.id} controls ${oppMonopolies} monopolies`,
        });
      }
    }
    
    // No properties risk
    const propertyCount = this._countProperties(playerId, gameState);
    if (propertyCount === 0) {
      risks.push({
        risk: 'no_properties',
        severity: 'medium',
        description: 'No property ownership - reliant on other income',
      });
    }
    
    // Property clustering risk (all properties in one area)
    const propDistribution = this._getPropertyDistribution(playerId, gameState);
    if (propDistribution.maxConcentration > 0.8) {
      risks.push({
        risk: 'property_clustering',
        severity: 'medium',
        description: 'Properties too clustered - vulnerable to targeted attacks',
      });
    }
    
    // Negative momentum
    const momentum = this._evaluateMomentum(playerId, gameState);
    if (momentum < 0.3) {
      risks.push({
        risk: 'negative_momentum',
        severity: 'medium',
        description: 'Losing ground consistently',
      });
    }
    
    return risks;
  }

  // Private helper methods

  _getPlayer(playerId, gameState) {
    return gameState?.players?.find(p => p.id === playerId);
  }

  _getOpponents(playerId, gameState) {
    return (gameState?.players || []).filter(p => p.id !== playerId);
  }

  _getPlayerProperties(playerId, gameState) {
    const props = [];
    const tiles = gameState?.tiles || gameState?.properties || [];
    for (const tile of tiles) {
      if (tile.owner === playerId) props.push(tile);
    }
    return props;
  }

  _countProperties(playerId, gameState) {
    return this._getPlayerProperties(playerId, gameState).length;
  }

  _countTotalProperties(gameState) {
    const tiles = gameState?.tiles || gameState?.properties || [];
    return tiles.filter(t => t.owner != null).length;
  }

  _countMonopolies(playerId, gameState) {
    const properties = this._getPlayerProperties(playerId, gameState);
    const groups = new Map();
    
    for (const prop of properties) {
      if (prop.colorGroup) {
        if (!groups.has(prop.colorGroup)) groups.set(prop.colorGroup, []);
        groups.get(prop.colorGroup).push(prop);
      }
    }
    
    // A monopoly needs at least 2 properties in a color group
    let monopolyCount = 0;
    for (const [colorGroup, props] of groups) {
      const totalInGroup = this._getTotalInColorGroup(colorGroup, gameState);
      if (props.length >= 2 && props.length === totalInGroup) {
        monopolyCount++;
      }
    }
    
    return monopolyCount;
  }

  _countTotalMonopolies(gameState) {
    const tiles = gameState?.tiles || gameState?.properties || [];
    const colorGroups = new Set();
    for (const tile of tiles) {
      if (tile.colorGroup) colorGroups.add(tile.colorGroup);
    }
    return colorGroups.size;
  }

  _getTotalInColorGroup(colorGroup, gameState) {
    const tiles = gameState?.tiles || gameState?.properties || [];
    return tiles.filter(t => t.colorGroup === colorGroup).length;
  }

  _calculateStrengthScore(playerId, gameState) {
    const money = this._evaluateMoney(playerId, gameState);
    const property = this._evaluateProperties(playerId, gameState);
    const monopoly = this._evaluateMonopolies(playerId, gameState);
    const position = this._evaluatePosition(playerId, gameState);
    const momentum = this._evaluateMomentum(playerId, gameState);
    
    return (
      this.weights.money * money +
      this.weights.properties * property +
      this.weights.monopolies * monopoly +
      this.weights.position * position +
      this.weights.momentum * momentum
    );
  }

  _evaluateMoney(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const players = gameState?.players || [];
    const maxMoney = Math.max(...players.map(p => p.money || 0));
    const minMoney = Math.min(...players.map(p => p.money || 0));
    const range = maxMoney - minMoney || 1;
    const money = player.money || 0;
    
    return (money - minMoney) / range;
  }

  _evaluateProperties(playerId, gameState) {
    const count = this._countProperties(playerId, gameState);
    const players = gameState?.players || [];
    const maxProps = Math.max(...players.map(p => this._countProperties(p.id, gameState)));
    
    return maxProps > 0 ? count / maxProps : 0;
  }

  _evaluateMonopolies(playerId, gameState) {
    const monopolies = this._countMonopolies(playerId, gameState);
    const players = gameState?.players || [];
    const maxMonopolies = Math.max(...players.map(p => this._countMonopolies(p.id, gameState)));
    
    return maxMonopolies > 0 ? monopolies / maxMonopolies : 0;
  }

  _evaluatePosition(playerId, gameState) {
    // Base position evaluation on money + properties value
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0.5;
    
    const properties = this._getPlayerProperties(playerId, gameState);
    const propertyValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalAssets = (player.money || 0) + propertyValue;
    
    const players = gameState?.players || [];
    const maxAssets = Math.max(...players.map(p => {
      const props = this._getPlayerProperties(p.id, gameState);
      const val = props.reduce((s, pr) => s + (pr.price || 0), 0);
      return (p.money || 0) + val;
    }));
    
    return maxAssets > 0 ? totalAssets / maxAssets : 0.5;
  }

  _evaluateMomentum(playerId, gameState) {
    // Simple momentum based on recent activity tracking
    if (!this.memory) return 0.5;
    
    const playerModel = this.memory.getPlayerModel?.(playerId);
    if (!playerModel) return 0.5;
    
    // Use win rate as momentum indicator
    const stats = playerModel.stats || {};
    const gamesPlayed = stats.gamesPlayed || 1;
    const winRate = (stats.gamesWon || 0) / gamesPlayed;
    
    return Math.max(0.1, Math.min(0.9, winRate + 0.3));
  }

  _normalizeProbability(rawScore, playerCount) {
    // Convert raw score to 0-1 probability
    // Higher player count = lower base probability for each
    const baseProbability = 1 / playerCount;
    const normalized = baseProbability + (1 - baseProbability) * rawScore;
    return Math.max(0.05, Math.min(0.95, normalized));
  }

  _rankProbability(rank, totalPlayers) {
    // Assign probabilities based on rank
    // 1st place gets highest probability, last gets lowest
    const weights = [];
    for (let i = 1; i <= totalPlayers; i++) {
      weights.push(1 / i);
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return weights[rank - 1] / totalWeight;
  }

  _getPropertyDistribution(playerId, gameState) {
    const properties = this._getPlayerProperties(playerId, gameState);
    const tiles = gameState?.tiles || gameState?.properties || [];
    const totalTiles = tiles.length || 1;
    
    if (properties.length === 0) {
      return { maxConcentration: 0, distribution: {} };
    }
    
    // Find tile positions
    const positions = properties.map(p => {
      const tile = tiles.find(t => t.id === p.id);
      return tile ? (tile.position || 0) : 0;
    }).sort((a, b) => a - b);
    
    // Calculate max concentration in 25% of board
    let maxConcentration = 0;
    for (let i = 0; i < 4; i++) {
      const start = (i * totalTiles) / 4;
      const end = ((i + 1) * totalTiles) / 4;
      const inSegment = positions.filter(p => p >= start && p < end).length;
      const concentration = inSegment / properties.length;
      maxConcentration = Math.max(maxConcentration, concentration);
    }
    
    return { maxConcentration, distribution: {} };
  }
}