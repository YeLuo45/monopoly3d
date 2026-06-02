/**
 * Tax Compliance
 * 
 * Ensures tax compliance in the monopoly game, checking for violations,
 * generating tax reports, and providing deadline reminders.
 */

class TaxCompliance {
  constructor() {
    // Compliance thresholds
    this.auditThreshold = 0.20; // 20% variance triggers audit risk
    this.lateFilingPenaltyRate = 0.05; // 5% penalty for late filing
    this.underreportingPenalty = 0.25; // 25% penalty for underreporting
    
    // Reporting periods (in game turns)
    this.quarterlyReportingPeriod = 10;
    this.annualReportingPeriod = 40;
    
    // Record keeping requirements
    this.recordRetentionPeriod = 30; // turns
  }

  /**
   * Check if a player is compliant with tax requirements
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Compliance status {isCompliant, issues, lastAudit}
   */
  isCompliant(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const issues = [];
    const player = this.findPlayer(playerId, gameState);
    
    if (!player) {
      return {
        isCompliant: false,
        issues: [`Player not found: ${playerId}`],
        lastAudit: null
      };
    }
    
    // Check if tax returns have been filed
    if (!player.taxFiled && player.taxFiled !== undefined) {
      issues.push('Tax return not filed for current period');
    }
    
    // Check for underreported income
    const reportedIncome = player.reportedIncome || 0;
    const actualIncome = player.actualIncome || this.calculateActualIncome(player);
    const variance = Math.abs(reportedIncome - actualIncome) / (actualIncome || 1);
    
    if (variance > this.auditThreshold) {
      issues.push(`Income underreporting detected: ${(variance * 100).toFixed(1)}% variance`);
    }
    
    // Check for unpaid taxes
    if (player.unpaidTaxes && player.unpaidTaxes > 0) {
      const turnsOverdue = gameState.turn - (player.lastTaxPaymentTurn || 0);
      if (turnsOverdue > 3) {
        issues.push(`Unpaid taxes overdue: $${player.unpaidTaxes}`);
      }
    }
    
    // Check for incomplete records
    if (player.missingRecords && player.missingRecords.length > 0) {
      issues.push(`Missing documentation: ${player.missingRecords.join(', ')}`);
    }
    
    return {
      isCompliant: issues.length === 0,
      issues,
      lastAudit: player.lastAudit || null
    };
  }

  /**
   * Get violation risks for a player
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Risk assessment {risks, riskLevel, recommendations}
   */
  getViolationRisks(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const risks = [];
    const player = this.findPlayer(playerId, gameState);
    
    if (!player) {
      return {
        risks: ['Player not found'],
        riskLevel: 'UNKNOWN',
        recommendations: []
      };
    }
    
    // High value transactions without reporting
    if (player.highValueTransactions) {
      for (const tx of player.highValueTransactions) {
        if (!tx.reported) {
          risks.push({
            type: 'UNREPORTED_TRANSACTION',
            severity: 'HIGH',
            amount: tx.amount,
            description: `Large transaction of $${tx.amount} not reported`
          });
        }
      }
    }
    
    // Property transfers without documentation
    if (player.propertyTransfers) {
      const undocumented = player.propertyTransfers.filter(t => !t.documented);
      if (undocumented.length > 0) {
        risks.push({
          type: 'UNDOCUMENTED_TRANSFER',
          severity: 'MEDIUM',
          count: undocumented.length,
          description: `${undocumented.length} property transfers lack documentation`
        });
      }
    }
    
    // Frequent cash transactions (auditing risk)
    if (player.cashTransactions && player.cashTransactions.length > 10) {
      risks.push({
        type: 'CASH_INTENSIVE',
        severity: 'MEDIUM',
        count: player.cashTransactions.length,
        description: 'High volume of cash transactions may trigger audit'
      });
    }
    
    // Previous audit history
    if (player.auditHistory) {
      const recentAudits = player.auditHistory.filter(a => 
        gameState.turn - a.turn < 20
      );
      if (recentAudits.length > 0) {
        risks.push({
          type: 'RECENT_AUDIT',
          severity: 'LOW',
          count: recentAudits.length,
          description: 'Recent audit history increases future audit probability'
        });
      }
    }
    
    // Calculate overall risk level
    let riskLevel = 'LOW';
    if (risks.some(r => r.severity === 'HIGH')) {
      riskLevel = 'HIGH';
    } else if (risks.some(r => r.severity === 'MEDIUM')) {
      riskLevel = 'MEDIUM';
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(risks);
    
    return { risks, riskLevel, recommendations };
  }

  /**
   * Generate a tax report for a player
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Current game state
   * @returns {Object} Tax report {income, deductions, taxDue, paid, outstanding}
   */
  generateTaxReport(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('Player ID and game state are required');
    }
    
    const player = this.findPlayer(playerId, gameState);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    
    // Calculate income sources
    const income = this.calculateIncome(player, gameState);
    
    // Calculate deductions
    const deductions = this.calculateDeductions(player, gameState);
    
    // Calculate taxable income
    const taxableIncome = Math.max(0, income.total - deductions.total);
    
    // Calculate tax based on brackets
    const taxDue = this.calculateTax(taxableIncome);
    
    // Track payments
    const paid = player.taxPaid || 0;
    
    // Outstanding balance
    const outstanding = Math.max(0, taxDue - paid);
    
    return {
      period: player.taxPeriod || 'ANNUAL',
      turn: gameState.turn,
      income: {
        total: income.total,
        sources: income.sources
      },
      deductions: {
        total: deductions.total,
        items: deductions.items
      },
      taxableIncome,
      taxDue,
      taxPaid: paid,
      outstanding,
      status: outstanding > 0 ? 'UNPAID' : 'PAID'
    };
  }

  /**
   * Get upcoming tax deadline reminders
   * @param {Object} gameState - Current game state
   * @returns {Array} Deadline reminders
   */
  getDeadlineReminders(gameState) {
    if (!gameState) {
      throw new Error('Game state is required');
    }
    
    const reminders = [];
    const currentTurn = gameState.turn || 1;
    
    // Quarterly tax deadlines
    const quartersUntilNext = this.quarterlyReportingPeriod - (currentTurn % this.quarterlyReportingPeriod);
    reminders.push({
      type: 'QUARTERLY_TAX',
      dueIn: quartersUntilNext === this.quarterlyReportingPeriod ? 0 : quartersUntilNext,
      description: 'Quarterly estimated tax payment due',
      urgency: quartersUntilNext <= 2 ? 'HIGH' : 'NORMAL'
    });
    
    // Annual tax deadline
    const turnsUntilAnnual = this.annualReportingPeriod - (currentTurn % this.annualReportingPeriod);
    reminders.push({
      type: 'ANNUAL_TAX',
      dueIn: turnsUntilAnnual === this.annualReportingPeriod ? 0 : turnsUntilAnnual,
      description: 'Annual tax return and final payment due',
      urgency: turnsUntilAnnual <= 5 ? 'HIGH' : 'NORMAL'
    });
    
    // Property tax deadlines (if applicable)
    if (gameState.propertyTaxDueDates) {
      for (const [propertyId, dueTurn] of Object.entries(gameState.propertyTaxDueDates)) {
        const turnsUntilDue = dueTurn - currentTurn;
        if (turnsUntilDue > 0 && turnsUntilDue <= 5) {
          reminders.push({
            type: 'PROPERTY_TAX',
            dueIn: turnsUntilDue,
            propertyId,
            description: `Property tax for ${propertyId} due soon`,
            urgency: turnsUntilDue <= 2 ? 'HIGH' : 'NORMAL'
          });
        }
      }
    }
    
    return reminders;
  }

  /**
   * Calculate actual income from all sources
   * @param {Object} player - Player object
   * @returns {number} Total actual income
   */
  calculateActualIncome(player) {
    let total = 0;
    
    if (player.rentCollected) total += player.rentCollected;
    if (player.propertiesSoldValue) total += player.propertiesSoldValue;
    if (player.dividends) total += player.dividends;
    if (player.interestIncome) total += player.interestIncome;
    if (player.baseIncome) total += player.baseIncome;
    if (player.otherIncome) total += player.otherIncome;
    
    return total;
  }

  /**
   * Calculate player income with breakdown
   * @param {Object} player - Player object
   * @param {Object} gameState - Game state
   * @returns {Object} Income breakdown
   */
  calculateIncome(player, gameState) {
    const sources = {};
    
    sources.rent = player.rentCollected || 0;
    sources.propertySales = player.propertiesSoldValue || 0;
    sources.dividends = player.dividends || 0;
    sources.interest = player.interestIncome || 0;
    sources.other = player.baseIncome || 0;
    
    const total = Object.values(sources).reduce((sum, val) => sum + val, 0);
    
    return { total, sources };
  }

  /**
   * Calculate player deductions
   * @param {Object} player - Player object
   * @param {Object} gameState - Game state
   * @returns {Object} Deductions breakdown
   */
  calculateDeductions(player, gameState) {
    const items = [];
    
    // Standard deduction
    const standardDeduction = 2000;
    items.push({ type: 'STANDARD', amount: standardDeduction });
    
    // Property tax deductions
    if (player.propertyTaxPaid) {
      items.push({ type: 'PROPERTY_TAX', amount: player.propertyTaxPaid });
    }
    
    // Charitable contributions
    if (player.charitableContributions) {
      items.push({ type: 'CHARITABLE', amount: player.charitableContributions });
    }
    
    // Business expenses
    if (player.businessExpenses) {
      items.push({ type: 'BUSINESS', amount: player.businessExpenses });
    }
    
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    
    return { total, items };
  }

  /**
   * Calculate tax based on progressive brackets
   * @param {number} taxableIncome - Taxable income amount
   * @returns {number} Total tax
   */
  calculateTax(taxableIncome) {
    const brackets = [
      { min: 0, max: 5000, rate: 0.10 },
      { min: 5000, max: 20000, rate: 0.15 },
      { min: 20000, max: 50000, rate: 0.20 },
      { min: 50000, max: 100000, rate: 0.25 },
      { min: 100000, max: Infinity, rate: 0.30 }
    ];
    
    let tax = 0;
    let remainingIncome = taxableIncome;
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const bracketSize = bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min;
      const taxableInBracket = Math.min(remainingIncome, bracketSize);
      
      tax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
    }
    
    return tax;
  }

  /**
   * Generate recommendations based on risks
   * @param {Array} risks - List of identified risks
   * @returns {Array} Recommendations
   */
  generateRecommendations(risks) {
    const recommendations = [];
    
    for (const risk of risks) {
      if (risk.type === 'UNREPORTED_TRANSACTION') {
        recommendations.push({
          priority: 'HIGH',
          action: 'Report the transaction immediately',
          details: `File amended report for $${risk.amount}`
        });
      }
      
      if (risk.type === 'UNDOCUMENTED_TRANSFER') {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Document property transfers',
          details: 'Gather and organize transfer documentation'
        });
      }
      
      if (risk.type === 'CASH_INTENSIVE') {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Reduce cash transactions',
          details: 'Use documented payment methods where possible'
        });
      }
      
      if (risk.type === 'RECENT_AUDIT') {
        recommendations.push({
          priority: 'LOW',
          action: 'Maintain detailed records',
          details: 'Keep thorough records to demonstrate compliance'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Find a player by ID in game state
   * @param {string} playerId - Player identifier
   * @param {Object} gameState - Game state
   * @returns {Object|null} Player object
   */
  findPlayer(playerId, gameState) {
    if (gameState.players) {
      return gameState.players.find(p => p.id === playerId) || null;
    }
    return gameState[playerId] || null;
  }
}

export { TaxCompliance };