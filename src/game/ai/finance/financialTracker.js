/**
 * FinancialTracker - Track Financial History and Projections
 * 
 * Records all money movements, calculates net worth, analyzes cash flow,
 * and predicts future financial positions.
 */

export class FinancialTracker {
  constructor() {
    // Transaction history per player
    this.transactions = new Map();
    
    // Net worth history per player
    this.netWorthHistory = new Map();
    
    // Default tracking config
    this.config = {
      maxHistorySize: 100,
      historyRetentionTurns: 50,
    };
  }

  /**
   * Record a money transaction
   * @param {string} playerId - Player ID
   * @param {object} transaction - Transaction details {amount, type, reason, timestamp}
   */
  recordTransaction(playerId, transaction) {
    if (!this.transactions.has(playerId)) {
      this.transactions.set(playerId, []);
    }
    
    const playerTransactions = this.transactions.get(playerId);
    
    // Create transaction record
    const record = {
      id: this._generateId(),
      timestamp: transaction.timestamp || Date.now(),
      turn: transaction.turn || 0,
      amount: transaction.amount,
      type: transaction.type, // 'income', 'expense', 'transfer', 'purchase', 'sale'
      reason: transaction.reason || 'unknown',
      fromPlayer: transaction.fromPlayer || null,
      toPlayer: transaction.toPlayer || null,
      propertyId: transaction.propertyId || null,
      balance: transaction.balance || 0, // Balance after transaction
    };
    
    playerTransactions.push(record);
    
    // Trim history if needed
    if (playerTransactions.length > this.config.maxHistorySize) {
      playerTransactions.shift();
    }
  }

  /**
   * Get transaction history for a player
   * @param {string} playerId - Player ID
   * @param {number} count - Number of recent transactions to retrieve
   * @returns {array} Array of transaction records
   */
  getTransactionHistory(playerId, count = 10) {
    const playerTransactions = this.transactions.get(playerId) || [];
    const start = Math.max(0, playerTransactions.length - count);
    return playerTransactions.slice(start);
  }

  /**
   * Calculate net worth for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Net worth (total assets - debts)
   */
  getNetWorth(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;
    
    let netWorth = player.money || 0;
    
    // Add property values
    const properties = player.properties || [];
    for (const prop of properties) {
      const property = this._getProperty(prop.id, gameState);
      if (property) {
        if (prop.mortgaged) {
          // Mortgaged properties: only house value (mortgage already deducted)
          netWorth += (property.houseCost || 0) * (property.houses || 0);
        } else {
          // Free properties: full value
          netWorth += property.price || 0;
          // Add house/hotel value
          netWorth += (property.houseCost || 0) * (property.houses || 0);
          if (property.hotel) {
            netWorth += property.houseCost || 0;
          }
        }
      }
    }
    
    // Subtract mortgages owed
    for (const prop of properties) {
      if (prop.mortgaged) {
        const property = this._getProperty(prop.id, gameState);
        if (property) {
          netWorth -= property.price * 0.5; // Debt from mortgage
        }
      }
    }
    
    // Add other assets ( railroads, utilities )
    // ... ( could be extended )
    
    return Math.round(netWorth);
  }

  /**
   * Calculate cash flow (income vs expenses)
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Cash flow analysis {inflow, outflow, net, perTurn}
   */
  getCashFlow(playerId, gameState) {
    const history = this.getTransactionHistory(playerId, 20);
    
    let inflow = 0;
    let outflow = 0;
    
    for (const tx of history) {
      if (tx.type === 'income' || tx.type === 'sale') {
        inflow += tx.amount;
      } else if (tx.type === 'expense' || tx.type === 'purchase') {
        outflow += Math.abs(tx.amount);
      }
    }
    
    // Calculate per-turn average
    const turns = this._getTurnSpan(history);
    const perTurn = turns > 0 ? (inflow - outflow) / turns : 0;
    
    return {
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      net: Math.round(inflow - outflow),
      perTurn: Math.round(perTurn * 100) / 100,
    };
  }

  /**
   * Predict when player might become insolvent
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Prediction {turnsToInsolvency, risk, severity}
   */
  predictInsolvency(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) {
      return { turnsToInsolvency: Infinity, risk: 'unknown', severity: 0 };
    }
    
    const currentCash = player.money || 0;
    const cashFlow = this.getCashFlow(playerId, gameState);
    
    // Determine risk level
    if (currentCash <= 0) {
      return { 
        turnsToInsolvency: 0, 
        risk: 'critical', 
        severity: 1.0 
      };
    }
    
    if (cashFlow.perTurn >= 0) {
      // Positive or neutral cash flow - low risk
      return { 
        turnsToInsolvency: Infinity, 
        risk: 'low', 
        severity: 0 
      };
    }
    
    // Calculate turns until insolvency
    const avgLossPerTurn = Math.abs(cashFlow.perTurn);
    const safeReserve = 200; // Keep minimum for emergencies
    const availableCash = currentCash - safeReserve;
    
    const turnsToInsolvency = Math.floor(availableCash / avgLossPerTurn);
    
    // Calculate severity
    let severity = 1 - (availableCash / 1000);
    severity = Math.max(0, Math.min(1, severity));
    
    // Determine risk level
    let risk = 'low';
    if (turnsToInsolvency <= 2) {
      risk = 'critical';
    } else if (turnsToInsolvency <= 5) {
      risk = 'high';
    } else if (turnsToInsolvency <= 10) {
      risk = 'medium';
    }
    
    return {
      turnsToInsolvency: Math.max(0, turnsToInsolvency),
      risk,
      severity: Math.round(severity * 100) / 100,
    };
  }

  /**
   * Get financial summary for a player
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {object} Complete financial summary
   */
  getFinancialSummary(playerId, gameState) {
    const netWorth = this.getNetWorth(playerId, gameState);
    const cashFlow = this.getCashFlow(playerId, gameState);
    const insolvencyPrediction = this.predictInsolvency(playerId, gameState);
    const recentTransactions = this.getTransactionHistory(playerId, 10);
    
    const player = this._getPlayer(playerId, gameState);
    const cash = player?.money || 0;
    
    return {
      netWorth,
      cash,
      cashFlow,
      insolvencyPrediction,
      recentTransactions,
      propertyCount: (player?.properties || []).length,
      mortgagedCount: (player?.properties || []).filter(p => p.mortgaged).length,
    };
  }

  /**
   * Check if player can afford an amount
   * @param {string} playerId - Player ID
   * @param {number} amount - Amount to check
   * @param {object} gameState - Current game state
   * @returns {boolean} True if player can afford
   */
  canAfford(playerId, amount, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return false;
    return player.money >= amount;
  }

  /**
   * Get wealth rank compared to other players
   * @param {string} playerId - Player ID
   * @param {object} gameState - Current game state
   * @returns {number} Rank (1 = richest)
   */
  getWealthRank(playerId, gameState) {
    const players = gameState.players || [];
    
    const wealth = players.map(p => ({
      id: p.id,
      netWorth: this.getNetWorth(p.id, gameState),
    }));
    
    wealth.sort((a, b) => b.netWorth - a.netWorth);
    
    const rank = wealth.findIndex(w => w.id === playerId) + 1;
    return rank || wealth.length;
  }

  /**
   * Generate unique ID for transactions
   * @private
   */
  _generateId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get turn span from transaction history
   * @private
   */
  _getTurnSpan(history) {
    if (history.length < 2) return 1;
    
    const firstTurn = history[0].turn || 0;
    const lastTurn = history[history.length - 1].turn || 0;
    
    return Math.max(1, lastTurn - firstTurn);
  }

  /**
   * Get player by ID
   * @private
   */
  _getPlayer(playerId, gameState) {
    const players = gameState.players || [];
    return players.find(p => p.id === playerId) || null;
  }

  /**
   * Get property by ID
   * @private
   */
  _getProperty(propertyId, gameState) {
    const tiles = gameState.tiles || [];
    return tiles.find(t => t.id === propertyId) || null;
  }
}