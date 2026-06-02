/**
 * ContingencyPlanner - Plan for worst-case scenarios
 */
export class ContingencyPlanner {
  constructor() {}

  createContingencyPlan(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { valid: false };

    const cash = player.money || 0;
    const properties = this._getPlayerProperties(playerId, gameState);
    const totalValue = properties.reduce((sum, p) => sum + (p.price || 100), 0);
    const monthlyIncome = this._estimateMonthlyIncome(playerId, gameState);

    return {
      valid: true,
      phase: this._determinePhase(cash, totalValue, monthlyIncome),
      emergencyFundTarget: this._calculateEmergencyFund(gameState),
      actions: this._generateActions(playerId, gameState),
      priority: cash < 500 ? 'critical' : cash < 1000 ? 'high' : 'normal',
    };
  }

  getEmergencyFundTarget(playerId, gameState) {
    return this._calculateEmergencyFund(gameState);
  }

  getRecoveryPlan(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { valid: false };

    const cash = player.money || 0;
    const properties = this._getPlayerProperties(playerId, gameState);

    if (properties.length === 0) {
      return { valid: true, strategy: 'sell_all', cash, recoveryTime: 'impossible' };
    }

    const sellableProps = properties.filter(p => !p.mortgaged);
    const potentialCash = cash + sellableProps.reduce((s, p) => s + (p.price || 100), 0);
    const targetCash = this._calculateEmergencyFund(gameState);
    const sellValue = potentialCash - targetCash;

    return {
      valid: true,
      strategy: 'gradual_sell',
      currentCash: cash,
      sellValue,
      targetCash,
      propertiesToSell: sellableProps.slice(0, Math.ceil(sellValue / 150)),
      recoveryTime: sellValue > 0 ? '3-5 turns' : 'impossible',
    };
  }

getTurnaroundStrategy(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return { valid: false };

    const cash = player.money || 0;
    const monthlyExpenses = this._estimateMonthlyExpenses(playerId, gameState);

    if (cash < monthlyExpenses * 1.5) {
      return { valid: true, strategy: 'survival_mode', focus: 'liquidate_assets' };
    } else if (cash < monthlyExpenses * 3) {
      return { valid: true, strategy: 'defensive_build', focus: 'complete_existing_monopolies' };
    } else {
      return { valid: true, strategy: 'aggressive_expansion', focus: 'acquire_monopolies' };
    }
  }
  }

  worstCaseAnalysis(playerId, gameState) {
    const opponents = this._getOpponents(playerId, gameState);
    const player = this._getPlayer(playerId, gameState);
    const cash = player?.money || 0;

    // Worst case: all opponents land on your properties at once
    const properties = this._getPlayerProperties(playerId, gameState);
    let maxRentLoss = 0;
    for (const prop of properties) {
      const rent = prop.rent?.[prop.houses || 0] || 50;
      maxRentLoss += rent * opponents.length;
    }

    return {
      scenario: 'all_opponents_visit',
      probability: 0.05,
      maxRentLoss,
      currentCash,
      cashAfterLoss: Math.max(0, cash - maxRentLoss),
      survivalChance: cash > maxRentLoss ? 'likely' : cash > maxRentLoss / 2 ? 'uncertain' : 'unlikely',
    };
  }

  getSurvivalProbability(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    if (!player) return 0;

    const cash = player.money || 0;
    const worst = this.worstCaseAnalysis(playerId, gameState);
    const monthlyIncome = this._estimateMonthlyIncome(playerId, gameState);
    const monthlyExpenses = this._estimateMonthlyExpenses(playerId, gameState);

    if (monthlyExpenses <= 0 && worst.maxRentLoss === 0) return 1;
    if (cash >= worst.maxRentLoss + monthlyExpenses * 3) return 0.9;
    if (cash >= worst.maxRentLoss / 2) return 0.7;
    if (cash >= monthlyExpenses * 2) return 0.5;
    return 0.2;
  }

  // Helpers
  _getPlayer(playerId, gameState) {
    return gameState?.players?.find(p => p.id === playerId);
  }

  _getOpponents(playerId, gameState) {
    return (gameState?.players || []).filter(p => p.id !== playerId);
  }

  _getPlayerProperties(playerId, gameState) {
    const tiles = gameState?.tiles || gameState?.properties || [];
    return tiles.filter(t => t.owner === playerId);
  }

  _estimateMonthlyIncome(playerId, gameState) {
    const props = this._getPlayerProperties(playerId, gameState);
    return props.reduce((sum, p) => sum + (p.rent?.[p.houses || 0] || 0) * 0.3, 0);
  }

  _estimateMonthlyExpenses(playerId, gameState) {
    const props = this._getPlayerProperties(playerId, gameState);
    return props.reduce((sum, p) => sum + (p.mortgagePayment || 0), 0) + 100;
  }

  _calculateEmergencyFund(gameState) {
    return 500 + (gameState?.players?.length || 4) * 100;
  }

  _determinePhase(cash, totalValue, monthlyIncome) {
    if (cash < 500 || totalValue < 1000) return 'critical';
    if (cash < 1500 || totalValue < 3000) return 'recovery';
    if (cash > 5000 && totalValue > 10000) return 'expansion';
    return 'stable';
  }

  _generateActions(playerId, gameState) {
    const player = this._getPlayer(playerId, gameState);
    const actions = [];
    if (player && player.money < 1000) {
      actions.push({ action: 'sell_assets', reason: 'Build emergency fund' });
    }
    return actions;
  }
}
