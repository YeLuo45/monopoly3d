/**
 * Loan Manager
 * 
 * Manages player loans including tracking, amortization, and refinancing decisions.
 */

import { InterestCalculator } from './interestCalculator.js';

class LoanManager {
  constructor() {
    this.loans = new Map(); // playerId -> Array of loan objects
    this.loanIdCounter = 0;
    this.calculator = new InterestCalculator();
  }

  /**
   * Generate a unique loan ID
   * @returns {string} Unique loan identifier
   */
  generateLoanId() {
    return `loan_${Date.now()}_${++this.loanIdCounter}`;
  }

  /**
   * Track a new loan for a player
   * @param {string} playerId - Player identifier
   * @param {Object} loan - Loan details {principal, rate, term, startDate}
   * @returns {Object} Created loan object with id
   */
  trackLoan(playerId, loan) {
    if (!this.loans.has(playerId)) {
      this.loans.set(playerId, []);
    }

    const loanRecord = {
      id: this.generateLoanId(),
      playerId,
      principal: loan.principal,
      originalPrincipal: loan.principal,
      rate: loan.rate, // Annual interest rate as decimal
      term: loan.term, // Term in months
      startDate: loan.startDate || Date.now(),
      paymentsMade: 0,
      monthlyPayment: this.calculator.calculateMonthlyPayment(loan.principal, loan.rate, loan.term),
      status: 'active', // active, paid_off, defaulted
      remainingBalance: loan.principal
    };

    this.loans.get(playerId).push(loanRecord);
    return loanRecord;
  }

  /**
   * Get all active loans for a player
   * @param {string} playerId - Player identifier
   * @returns {Array} Array of active loan objects
   */
  getActiveLoans(playerId) {
    const playerLoans = this.loans.get(playerId) || [];
    return playerLoans.filter(loan => loan.status === 'active');
  }

  /**
   * Get all loans (including paid off) for a player
   * @param {string} playerId - Player identifier
   * @returns {Array} Array of all loan objects
   */
  getAllLoans(playerId) {
    return this.loans.get(playerId) || [];
  }

  /**
   * Get total debt for a player
   * @param {string} playerId - Player identifier
   * @returns {number} Total remaining debt
   */
  getTotalDebt(playerId) {
    const activeLoans = this.getActiveLoans(playerId);
    return activeLoans.reduce((total, loan) => total + loan.remainingBalance, 0);
  }

  /**
   * Get loan by ID
   * @param {string} loanId - Loan identifier
   * @returns {Object|null} Loan object or null if not found
   */
  getLoanById(loanId) {
    for (const loans of this.loans.values()) {
      const loan = loans.find(l => l.id === loanId);
      if (loan) return loan;
    }
    return null;
  }

  /**
   * Calculate monthly payment using standard amortization formula
   * @param {number} principal - Loan principal
   * @param {number} rate - Annual interest rate (as decimal)
   * @param {number} term - Loan term in months
   * @returns {number} Monthly payment amount
   */
  calculatePayment(principal, rate, term) {
    return this.calculator.calculateMonthlyPayment(principal, rate, term);
  }

  /**
   * Generate full amortization schedule for a loan
   * @param {string} loanId - Loan identifier
   * @returns {Array} Array of payment schedule objects
   */
  generateAmortizationSchedule(loanId) {
    const loan = this.getLoanById(loanId);
    if (!loan) {
      throw new Error(`Loan ${loanId} not found`);
    }

    const schedule = [];
    let balance = loan.principal;
    const monthlyRate = loan.rate / 12;
    let paymentNumber = 0;

    while (balance > 0.01 && paymentNumber < loan.term * 2) {
      paymentNumber++;
      const interestPayment = balance * monthlyRate;
      let principalPayment = loan.monthlyPayment - interestPayment;

      // Handle final payment
      if (principalPayment > balance) {
        principalPayment = balance;
      }

      balance -= principalPayment;
      if (balance < 0) balance = 0;

      schedule.push({
        paymentNumber,
        payment: loan.monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: balance
      });
    }

    return schedule;
  }

  /**
   * Record a payment for a loan
   * @param {string} loanId - Loan identifier
   * @param {number} amount - Payment amount
   * @returns {Object} Updated loan state
   */
  recordPayment(loanId, amount) {
    const loan = this.getLoanById(loanId);
    if (!loan) {
      throw new Error(`Loan ${loanId} not found`);
    }

    loan.paymentsMade++;
    const monthlyRate = loan.rate / 12;
    const interestPortion = loan.remainingBalance * monthlyRate;
    const principalPortion = Math.min(amount - interestPortion, loan.remainingBalance);

    loan.remainingBalance -= principalPortion;

    if (loan.remainingBalance <= 0.01) {
      loan.remainingBalance = 0;
      loan.status = 'paid_off';
    }

    return {
      loanId,
      paymentNumber: loan.paymentsMade,
      interestPaid: interestPortion,
      principalPaid: principalPortion,
      remainingBalance: loan.remainingBalance,
      status: loan.status
    };
  }

  /**
   * Determine if a loan should be refinanced
   * @param {string} loanId - Loan identifier
   * @param {number} newRate - New interest rate (as decimal)
   * @param {Object} gameState - Current game state
   * @returns {Object} {shouldRefinance, reason, savings}
   */
  shouldRefinance(loanId, newRate, gameState) {
    const loan = this.getLoanById(loanId);
    if (!loan) {
      return { shouldRefinance: false, reason: 'Loan not found', savings: 0 };
    }

    if (loan.status !== 'active') {
      return { shouldRefinance: false, reason: 'Loan is not active', savings: 0 };
    }

    const currentRemaining = loan.remainingBalance;
    const remainingTerm = loan.term - loan.paymentsMade;

    if (remainingTerm <= 0) {
      return { shouldRefinance: false, reason: 'Loan is nearly paid off', savings: 0 };
    }

    const currentCost = this.calculator.calculateTotalLoanCost(currentRemaining, loan.rate, remainingTerm);
    const newCost = this.calculator.calculateTotalLoanCost(currentRemaining, newRate, remainingTerm);

    const savings = currentCost - newCost;
    const rateImprovement = loan.rate - newRate;

    // Refinancing makes sense if rate drops significantly and sufficient savings
    const minSavingsThreshold = currentRemaining * 0.02; // At least 2% of remaining balance
    const minRateImprovement = 0.005; // At least 0.5% rate drop

    if (savings > minSavingsThreshold && rateImprovement > minRateImprovement) {
      return {
        shouldRefinance: true,
        reason: `Rate drop from ${(loan.rate * 100).toFixed(2)}% to ${(newRate * 100).toFixed(2)}%`,
        savings: savings,
        newMonthlyPayment: this.calculator.calculateMonthlyPayment(currentRemaining, newRate, remainingTerm)
      };
    }

    return {
      shouldRefinance: false,
      reason: savings > 0
        ? `Savings of $${savings.toFixed(2)} don't justify refinancing costs`
        : 'New rate is not favorable',
      savings: Math.max(0, savings)
    };
  }

  /**
   * Get debt summary for a player
   * @param {string} playerId - Player identifier
   * @returns {Object} Debt summary
   */
  getDebtSummary(playerId) {
    const activeLoans = this.getActiveLoans(playerId);
    const allLoans = this.getAllLoans(playerId);

    const totalDebt = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
    const totalOriginal = activeLoans.reduce((sum, l) => sum + l.principal, 0);
    const totalMonthlyPayments = activeLoans.reduce((sum, l) => sum + l.monthlyPayment, 0);

    return {
      playerId,
      activeLoanCount: activeLoans.length,
      totalLoans: allLoans.length,
      totalDebt,
      totalOriginalPrincipal: totalOriginal,
      totalMonthlyPayments,
      loans: activeLoans
    };
  }

  /**
   * Clear all loans for a player (e.g., when game resets)
   * @param {string} playerId - Player identifier
   */
  clearPlayerLoans(playerId) {
    this.loans.delete(playerId);
  }

  /**
   * Clear all loans (full reset)
   */
  clearAll() {
    this.loans.clear();
    this.loanIdCounter = 0;
  }
}

export { LoanManager };