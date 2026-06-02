/**
 * GameStateEvaluator - Evaluates current game state for players
 * 
 * Provides comprehensive evaluation of player positions, progress tracking,
 * and scenario simulation using Monte Carlo methods.
 */

export class GameStateEvaluator {
  constructor() {
    // Evaluation constants
    this.PROPERTY_WEIGHT = 30;
    this.MONEY_WEIGHT = 25;
    this.MONOPOLY_WEIGHT = 25;
    this.POSITION_WEIGHT = 10;
    this.MOMENTUM_WEIGHT = 10;
    
    // Simulation settings
    this.DEFAULT_SIMULATIONS = 1000;
    this.MAX_SIMULATION_TURNS = 50;
  }

  /**
   * Evaluate a player's overall position strength
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} {score, breakdown, grade}
   */
  evaluatePosition(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { score: 0, breakdown: {}, grade: 'F' };
    }
    
    const breakdown = this._calculateBreakdown(playerId, gameState);
    const score = this._computeWeightedScore(breakdown);
    const grade = this._scoreToGrade(score);
    
    return { score, breakdown, grade };
  }

  /**
   * Compare two players head-to-head
   * @param {string} playerA - First player ID
   * @param {string} playerB - Second player ID
   * @param {object} gameState - Current game state
   * @returns {object} {winner, advantages, comparison}
   */
  comparePlayers(playerA, playerB, gameState) {
    const evalA = this.evaluatePosition(playerA, gameState);
    const evalB = this.evaluatePosition(playerB, gameState);
    
    const advantages = [];
    const categories = ['money', 'properties', 'monopolies', 'position', 'momentum'];
    
    for (const cat of categories) {
      const valA = evalA.breakdown[cat]?.value || 0;
      const valB = evalB.breakdown[cat]?.value || 0;
      const diff = valA - valB;
      
      if (Math.abs(diff) > 0.05) {
        advantages.push({
          category: cat,
          leader: diff > 0 ? playerA : playerB,
          difference: Math.abs(Math.round(diff * 100)),
          percentage: Math.abs(Math.round(diff * 100)),
        });
      }
    }
    
    return {
      winner: evalA.score > evalB.score ? playerA : playerB,
      scoreA: evalA.score,
      scoreB: evalB.score,
      advantages,
      comparison: {
        money: { a: evalA.breakdown.money?.value || 0, b: evalB.breakdown.money?.value || 0 },
        properties: { a: evalA.breakdown.properties?.value || 0, b: evalB.breakdown.properties?.value || 0 },
        monopolies: { a: evalA.breakdown.monopolies?.value || 0, b: evalB.breakdown.monopolies?.value || 0 },
      },
    };
  }

  /**
   * Calculate player's progress toward winning (0-100)
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Progress score 0-100
   */
  getProgressScore(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const players = gameState?.players || [];
    const totalPlayers = players.length;
    if (totalPlayers <= 1) return 100;
    
    // Calculate individual metrics
    const propertyProgress = this._calculatePropertyProgress(playerId, gameState);
    const assetProgress = this._calculateAssetProgress(playerId, gameState);
    const standingProgress = this._calculateStandingProgress(playerId, gameState);
    
    // Weighted combination
    const progress = (
      propertyProgress * 0.35 +
      assetProgress * 0.35 +
      standingProgress * 0.30
    );
    
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  /**
   * Get player's momentum - gaining or losing ground
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} {direction, rate, prediction}
   */
  getMomentum(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { direction: 'neutral', rate: 0, prediction: 'stable' };
    }
    
    // Calculate current position vs average
    const evalResult = this.evaluatePosition(playerId, gameState);
    const currentScore = evalResult.score;
    
    // Simulate a few turns ahead to predict momentum
    const simulatedScores = this._simulateMomentumTurns(playerId, gameState, 3);
    
    // Calculate trend
    const scoreDiff = simulatedScores[simulatedScores.length - 1] - simulatedScores[0];
    const avgChange = scoreDiff / Math.max(1, simulatedScores.length - 1);
    
    let direction = 'neutral';
    let prediction = 'stable';
    
    if (avgChange > 0.05) {
      direction = 'positive';
      prediction = 'gaining';
    } else if (avgChange < -0.05) {
      direction = 'negative';
      prediction = 'losing';
    }
    
    const rate = Math.abs(Math.round(avgChange * 100));
    
    return {
      direction,
      rate,
      prediction,
      currentScore: Math.round(currentScore * 100),
      projectedScore: Math.round(simulatedScores[simulatedScores.length - 1] * 100),
      trend: simulatedScores,
    };
  }

  /**
   * Monte Carlo simulation of remaining game
   * @param {object} gameState - Current game state
   * @param {number} numSimulations - Number of simulations to run
   * @returns {object} Simulation results with win probabilities
   */
  simulateRemainingGame(gameState, numSimulations = null) {
    const simCount = numSimulations || this.DEFAULT_SIMULATIONS;
    const players = gameState?.players || [];
    
    if (players.length === 0) {
      return { standings: [], winProbabilities: {} };
    }
    
    // Track wins per player
    const winCounts = {};
    const finalStandings = {};
    
    for (const player of players) {
      winCounts[player.id] = 0;
      finalStandings[player.id] = [];
    }
    
    // Run simulations
    for (let i = 0; i < simCount; i++) {
      const result = this._runSingleSimulation(gameState);
      
      // Record winner
      if (result.winner) {
        winCounts[result.winner]++;
      }
      
      // Record standings
      for (const player of players) {
        finalStandings[player.id].push(result.standings[player.id] || 0);
      }
    }
    
    // Calculate final probabilities
    const winProbabilities = {};
    const avgStandings = {};
    
    for (const player of players) {
      winProbabilities[player.id] = winCounts[player.id] / simCount;
      const standings = finalStandings[player.id];
      avgStandings[player.id] = standings.reduce((a, b) => a + b, 0) / standings.length;
    }
    
    // Sort for final ranking
    const ranking = players
      .map(p => ({
        playerId: p.id,
        winProbability: winProbabilities[p.id],
        avgStanding: avgStandings[p.id],
      }))
      .sort((a, b) => b.winProbability - a.winProbability);
    
    return {
      standings: ranking,
      winProbabilities,
      avgStandings,
      simulationsRun: simCount,
    };
  }

  /**
   * Get best and worst case scenarios for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} {bestCase, worstCase, expected}
   */
  getBestCaseWorstCase(playerId, gameState) {
    const simResult = this.simulateRemainingGame(gameState, 500);
    const playerResults = simResult.standings.find(s => s.playerId === playerId);
    
    if (!playerResults) {
      return {
        bestCase: { rank: 1, probability: 0 },
        worstCase: { rank: 1, probability: 0 },
        expected: { rank: 1 },
      };
    }
    
    // Get distribution of final positions
    const standings = simResult.standings;
    const playerStandings = standings.filter(s => s.playerId === playerId);
    
    // Best case: highest win prob
    const bestCase = {
      rank: 1,
      winProbability: playerResults.winProbability,
      scenario: 'dominate',
    };
    
    // Worst case: lowest among plausible outcomes
    const worstCase = {
      rank: standings.length,
      probability: 1 - playerResults.winProbability,
      scenario: 'collapse',
    };
    
    // Expected: average standing
    const expected = {
      rank: Math.round(playerResults.avgStanding),
      winRate: Math.round(playerResults.winProbability * 100),
    };
    
    return { bestCase, worstCase, expected };
  }

  // Private helper methods

  _getPlayer(playerId, gameState) {
    return gameState?.players?.find(p => p.id === playerId);
  }

  _getPlayerProperties(playerId, gameState) {
    const props = [];
    const tiles = gameState?.tiles || gameState?.properties || [];
    for (const tile of tiles) {
      if (tile.owner === playerId) props.push(tile);
    }
    return props;
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
    
    let monopolyCount = 0;
    for (const [colorGroup, props] of groups) {
      const totalInGroup = this._getTotalInColorGroup(colorGroup, gameState);
      if (props.length >= 2 && props.length === totalInGroup) {
        monopolyCount++;
      }
    }
    
    return monopolyCount;
  }

  _getTotalInColorGroup(colorGroup, gameState) {
    const tiles = gameState?.tiles || gameState?.properties || [];
    return tiles.filter(t => t.colorGroup === colorGroup).length;
  }

  _calculateBreakdown(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    const players = gameState?.players || [];
    
    // Calculate money score
    const money = player?.money || 0;
    const maxMoney = Math.max(...players.map(p => p.money || 0), 1);
    const minMoney = Math.min(...players.map(p => p.money || 0), 0);
    const moneyRange = maxMoney - minMoney || 1;
    const moneyScore = (money - minMoney) / moneyRange;
    
    // Calculate property score
    const properties = this._getPlayerProperties(playerId, gameState);
    const propertyCount = properties.length;
    const maxProperties = Math.max(1, ...players.map(p => this._getPlayerProperties(p.id, gameState).length));
    const propertyScore = propertyCount / maxProperties;
    
    // Calculate monopoly score
    const monopolies = this._countMonopolies(playerId, gameState);
    const maxMonopolies = Math.max(1, ...players.map(p => this._countMonopolies(p.id, gameState)));
    const monopolyScore = monopolies / maxMonopolies;
    
    // Calculate position score
    const propertyValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalAssets = money + propertyValue;
    const maxAssets = Math.max(1, ...players.map(p => {
      const props = this._getPlayerProperties(p.id, gameState);
      return (p.money || 0) + props.reduce((s, pr) => s + (pr.price || 0), 0);
    }));
    const positionScore = totalAssets / maxAssets;
    
    // Calculate momentum (simplified)
    const momentumScore = 0.5; // Would integrate with memory layer for actual momentum
    
    return {
      money: { value: moneyScore, raw: money },
      properties: { value: propertyScore, raw: propertyCount },
      monopolies: { value: monopolyScore, raw: monopolies },
      position: { value: positionScore, raw: totalAssets },
      momentum: { value: momentumScore },
    };
  }

  _computeWeightedScore(breakdown) {
    return (
      breakdown.money.value * (this.MONEY_WEIGHT / 100) +
      breakdown.properties.value * (this.PROPERTY_WEIGHT / 100) +
      breakdown.monopolies.value * (this.MONOPOLY_WEIGHT / 100) +
      breakdown.position.value * (this.POSITION_WEIGHT / 100) +
      breakdown.momentum.value * (this.MOMENTUM_WEIGHT / 100)
    );
  }

  _scoreToGrade(score) {
    if (score >= 0.9) return 'A+';
    if (score >= 0.85) return 'A';
    if (score >= 0.8) return 'A-';
    if (score >= 0.75) return 'B+';
    if (score >= 0.7) return 'B';
    if (score >= 0.65) return 'B-';
    if (score >= 0.6) return 'C+';
    if (score >= 0.55) return 'C';
    if (score >= 0.5) return 'C-';
    if (score >= 0.4) return 'D';
    return 'F';
  }

  _calculatePropertyProgress(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const tiles = gameState?.tiles || gameState?.properties || [];
    const totalProperties = tiles.filter(t => t.type === 'property').length;
    const owned = this._getPlayerProperties(playerId, gameState).length;
    
    return totalProperties > 0 ? owned / totalProperties : 0;
  }

  _calculateAssetProgress(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    const properties = this._getPlayerProperties(playerId, gameState);
    const propertyValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalAssets = (player.money || 0) + propertyValue;
    
    // Assume target of $5000 is a winning position
    const targetAssets = 5000;
    return Math.min(1, totalAssets / targetAssets);
  }

  _calculateStandingProgress(playerId, gameState) {
    const evalResult = this.evaluatePosition(playerId, gameState);
    const players = gameState?.players || [];
    
    // If leading, high progress; if behind, lower progress
    const rank = this._getPlayerRank(playerId, gameState);
    const totalPlayers = players.length || 1;
    
    return (totalPlayers - rank + 1) / totalPlayers;
  }

  _getPlayerRank(playerId, gameState) {
    const players = gameState?.players || [];
    const scores = players.map(p => ({
      id: p.id,
      score: this.evaluatePosition(p.id, gameState).score,
    }));
    scores.sort((a, b) => b.score - a.score);
    
    return scores.findIndex(p => p.id === playerId) + 1;
  }

  _simulateMomentumTurns(playerId, gameState, numTurns) {
    const scores = [];
    let currentEval = this.evaluatePosition(playerId, gameState);
    scores.push(currentEval.score);
    
    for (let i = 0; i < numTurns; i++) {
      // Simulate small random changes
      const delta = (Math.random() - 0.5) * 0.1;
      currentEval = Math.max(0, Math.min(1, currentEval + delta));
      scores.push(currentEval);
    }
    
    return scores;
  }

  _runSingleSimulation(gameState) {
    const players = gameState?.players || [];
    if (players.length === 0) {
      return { winner: null, standings: {} };
    }
    
    // Simulate remaining game turns
    const numTurns = this.MAX_SIMULATION_TURNS;
    const playerScores = {};
    
    // Initialize scores based on current state
    for (const player of players) {
      const evalResult = this.evaluatePosition(player.id, gameState);
      playerScores[player.id] = evalResult.score * 100;
    }
    
    // Simulate turns with random walks
    for (let turn = 0; turn < numTurns; turn++) {
      for (const player of players) {
        // Random change simulating game events
        const change = (Math.random() - 0.5) * 20;
        playerScores[player.id] = Math.max(0, Math.min(100, playerScores[player.id] + change));
      }
    }
    
    // Determine winner (highest score)
    let winner = null;
    let maxScore = -Infinity;
    const standings = {};
    
    for (const player of players) {
      if (playerScores[player.id] > maxScore) {
        maxScore = playerScores[player.id];
        winner = player.id;
      }
      standings[player.id] = playerScores[player.id];
    }
    
    // Sort standings
    const sortedStandings = Object.entries(standings)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [playerId, score], index) => {
        acc[playerId] = index + 1;
        return acc;
      }, {});
    
    return { winner, standings: sortedStandings };
  }
}