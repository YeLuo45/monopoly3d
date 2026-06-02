/**
 * Interest Calculator
 * 
 * Calculates interest scenarios for loan analysis.
 */

class InterestCalculator {
  constructor() {
    this.defaultCompoundsPerYear = 12; // Monthly compounding
  }

  /**
   * Calculate simple interest
   * Formula: I = P * r * t
   * @param {number} principal - Initial principal amount
   * @param {number} rate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
   * @param {number} time - Time period in years
   * @returns {number} Simple interest amount
   */
  calculateSimpleInterest(principal, rate, time) {
    if (principal < 0 || rate < 0 || time < 0) {
      throw new Error('All parameters must be non-negative');
    }
    return principal * rate * time;
  }

  /**
   * Calculate compound interest
   * Formula: A = P(1 + r/n)^(nt)
   * @param {number} principal - Initial principal amount
   * @param {number} rate - Annual interest rate (as decimal)
   * @param {number} time - Time period in years
   * @param {number} compoundsPerYear - Number of times interest is compounded per year
   * @returns {number} Total amount after compound interest
   */
  calculateCompoundInterest(principal, rate, time, compoundsPerYear = this.defaultCompoundsPerYear) {
    if (principal < 0 || rate < 0 || time < 0 || compoundsPerYear <= 0) {
      throw new Error('Invalid parameter values');
    }
    const amount = principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * time);
    return amount;
  }

  /**
   * Calculate effective annual rate from nominal rate
   * Formula: EAR = (1 + r/n)^n - 1
   * @param {number} nominalRate - Nominal annual interest rate (as decimal)
   * @param {number} compoundsPerYear - Number of compounding periods per year
   * @returns {number} Effective annual rate (as decimal)
   */
  calculateEffectiveRate(nominalRate, compoundsPerYear = this.defaultCompoundsPerYear) {
    if (nominalRate < 0 || compoundsPerYear <= 0) {
      throw new Error('Invalid parameter values');
    }
    if (nominalRate === 0) return 0;
    const effectiveRate = Math.pow(1 + nominalRate / compoundsPerYear, compoundsPerYear) - 1;
    return effectiveRate;
  }

  /**
   * Compare two loan offers and determine which is better
   * @param {Object} loanA - First loan {principal, rate, term} (term in months)
   * @param {Object} loanB - Second loan {principal, rate, term} (term in months)
   * @returns {Object} {better: 'A'|'B'|'equal', savingsA: number, savingsB: number}
   */
  compareLoanOffers(loanA, loanB) {
    const totalA = this.calculateTotalLoanCost(loanA.principal, loanA.rate, loanA.term);
    const totalB = this.calculateTotalLoanCost(loanB.principal, loanB.rate, loanB.term);

    const diff = totalA - totalB;
    const result = {
      better: 'equal',
      savingsA: 0,
      savingsB: 0
    };

    if (Math.abs(diff) < 0.01) {
      return result;
    }

    if (diff > 0) {
      result.better = 'B';
      result.savingsB = diff;
      result.savingsA = 0;
    } else {
      result.better = 'A';
      result.savingsA = Math.abs(diff);
      result.savingsB = 0;
    }

    return result;
  }

  /**
   * Calculate total cost of a loan (principal + total interest)
   * @param {number} principal - Loan principal
   * @param {number} annualRate - Annual interest rate (as decimal)
   * @param {number} termMonths - Loan term in months
   * @returns {number} Total amount to be paid
   */
  calculateTotalLoanCost(principal, annualRate, termMonths) {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
      return principal;
    }
    // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    return monthlyPayment * termMonths;
  }

  /**
   * Calculate true cost of a loan including all interest paid
   * @param {Object} loan - Loan object {principal, rate, term, paymentsMade}
   * @returns {Object} {totalPaid, totalInterest, remainingInterest}
   */
  calculateTrueCost(loan) {
    const { principal, rate, term, paymentsMade = 0 } = loan;
    const monthlyRate = rate / 12;
    const totalTerm = term;

    const totalPaid = this.calculateTotalLoanCost(principal, rate, totalTerm);
    const totalInterest = totalPaid - principal;
    const remainingInterest = totalInterest * ((totalTerm - paymentsMade) / totalTerm);

    return {
      totalPaid,
      totalInterest,
      remainingInterest,
      principalPaid: principal
    };
  }

  /**
   * Calculate monthly payment using standard amortization formula
   * @param {number} principal - Loan principal
   * @param {number} annualRate - Annual interest rate (as decimal)
   * @param {number} termMonths - Loan term in months
   * @returns {number} Monthly payment amount
   */
  calculateMonthlyPayment(principal, annualRate, termMonths) {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
      return principal / termMonths;
    }
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                   (Math.pow(1 + monthlyRate, termMonths) - 1);
    return payment;
  }

  /**
   * Calculate APR from simple add-on interest rate
   * @param {number} addOnRate - Add-on interest rate (as decimal)
   * @param {number} termMonths - Loan term in months
   * @returns {number} APR as decimal
   */
  aprFromAddOn(addOnRate, termMonths) {
    // Approximate APR for add-on interest loans
    // APR ≈ 2 * n * I / P where n = term, I = interest, P = principal
    const n = termMonths;
    const apr = 2 * n * addOnRate / (n + 1);
    return apr;
  }
}

export { InterestCalculator };