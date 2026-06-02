/**
 * RiskAnalyzer - Comprehensive risk analysis
 */
export class RiskAnalyzer {
  constructor(memoryLayer, opponentModel) {
    this.memory = memoryLayer;
    this.opponentModel = opponentModel;
  }

  identifyRisks(playerId, gameState) {
    const risks = [];
    const myProperties = this._getPlayerProperties(playerId, gameState);
    const myMonopolies = this._getMonopolies(myProperties);
    const opponents = this._getOpponents(playerId, gameState);

    // Risk: opponent landing on your properties
    for (const prop of myProperties) {
      const landingProb = this.getLandingProbability(prop.id, gameState);
      const rent = this._estimateRent(prop, gameState);
      const expectedLoss = landingProb * rent * opponents.length;
      if (expectedLoss > 50) {
        risks.push({
          type: 'rent_exposure',
          propertyId: prop.id,
          probability: landingProb,
          expectedLoss,
          severity: expectedLoss > 200 ? 'high' : 'medium',
        });
      }
    }

    // Risk: opponents completing monopolies you need
    for (const mono of myMonopolies) {
      const missing = mono.properties.filter(p => !p.owned);
      if (missing.length === 1) {
        risks.push({
          type: 'monopoly_race',
          colorGroup: mono.colorGroup,
          missingProperty: missing[0].id,
          severity: 'high',
        });
      }
    }

    // Risk: low cash buffer
    const player = this._getPlayer(playerId, gameState);
    const monthlyExpenses = this._estimateMonthlyExpenses(playerId, gameState);
    if (player && player.money < monthlyExpenses * 2) {
      risks.push({
        type: 'cash_shortage',
        currentCash: player.money,
        monthlyExpenses,
        severity: 'high',
      });
    }

    return risks;
  }

  getMostDangerousOpponents(playerId, gameState) {
    const opponents = this._getOpponents(playerId, gameState);
    const dangers = opponents.map(opp => {
      const oppProps = this._getPlayerProperties(opp.id, gameState);
      const monopolies = this._getMonopolies(oppProps).length;
      const cash = opp.money || 0;
      const score = monopolies * 3 + (cash / 500);
      return { opponentId: opp.id, score, monopolies, cash };
    });
    dangers.sort((a, b) => b.score - a.score);
    return dangers;
  }

  getRiskMitigationPlan(playerId, gameState) {
    const risks = this.identifyRisks(playerId, gameState);
    const plan = { actions: [], priority: 'medium' };

    for (const risk of risks) {
      switch (risk.type) {
        case 'rent_exposure':
          plan.actions.push({
            action: 'build_houses',
            propertyId: risk.propertyId,
            reason: 'Reduce rent exposure',
          });
          break;
        case 'monopoly_race':
          plan.actions.push({
            action: 'acquire_property',
            propertyId: risk.missingProperty,
            reason: 'Beat opponent to monopoly',
          });
          break;
        case 'cash_shortage':
          plan.actions.push({
            action: 'sell_properties',
            reason: 'Increase cash reserves',
          });
          break;
      }
    }

    const highSeverity = risks.filter(r => r.severity === 'high');
    if (highSeverity.length > 0) plan.priority = 'high';
    return plan;
  }

  shouldTradeForRiskReduction(propertyId, gameState) {
    const prop = this._findProperty(propertyId, gameState);
    if (!prop) return { should: false, reason: 'Property not found' };

    const opponents = this._getOpponents(prop.owner, gameState);
    const landingProb = this.getLandingProbability(propertyId, gameState);
    const expectedLoss = landingProb * 50 * opponents.length;

    if (expectedLoss > 200) {
      return { should: true, reason: 'High expected loss - trade recommended', expectedLoss };
    }
    return { should: false, reason: 'Risk is acceptable' };
  }

  getLandingProbability(tileId, gameState) {
    // Simplified: average landing probability per turn
    const boardSize = gameState?.tiles?.length || 40;
    return 2 / boardSize; // 2 landings per turn average
  }

  getExpectedLoss(playerId, tileId, gameState) {
    const prop = this._findProperty(tileId, gameState);
    if (!prop || !prop.owner || prop.owner === playerId) return 0;

    const landingProb = this.getLandingProbability(tileId, gameState);
    const rent = this._estimateRent(prop, gameState);
    const opponentCount = this._getOpponents(playerId, gameState).length;
    return landingProb * rent * opponentCount;
  }

  // Helpers
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

  _findProperty(propertyId, gameState) {
    const tiles = gameState?.tiles || gameState?.properties || [];
    return tiles.find(t => t.id === propertyId);
  }

  _estimateRent(prop, gameState) {
    return prop.baseRent || prop.rent?.[0] || 25;
  }

  _estimateMonthlyExpenses(playerId, gameState) {
    const props = this._getPlayerProperties(playerId, gameState);
    return props.reduce((sum, p) => sum + (p.mortgagePayment || 0), 0) + 100;
  }

  _getMonopolies(properties) {
    const groups = new Map();
    for (const prop of properties) {
      if (prop.colorGroup) {
        if (!groups.has(prop.colorGroup)) groups.set(prop.colorGroup, []);
        groups.get(prop.colorGroup).push(prop);
      }
    }
    return Array.from(groups.values()).filter(g => g.length >= 3);
  }
}
