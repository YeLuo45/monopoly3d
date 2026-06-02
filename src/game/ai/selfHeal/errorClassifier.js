/**
 * ErrorClassifier - Classify and categorize agent errors
 */
export class ErrorClassifier {
  constructor() {
    this.errorPatterns = this._initPatterns();
    this.classificationRules = this._initRules();
  }

  _initPatterns() {
    return {
      timeout: /timeout|timed out|took too long/i,
      memory: /memory|heap|out of memory|OOM/i,
      network: /network|connection|ECONNREFUSED|ETIMEDOUT/i,
      logic: /undefined|null.*cannot|cannot read/i,
      resource: /resource limit|cpu|rate limit/i,
    };
  }

  _initRules() {
    return {
      timeout: { severity: 'medium', recoverable: true, strategy: 'retry' },
      memory: { severity: 'high', recoverable: false, strategy: 'restart' },
      network: { severity: 'low', recoverable: true, strategy: 'retry' },
      logic: { severity: 'medium', recoverable: false, strategy: 'reset_state' },
      resource: { severity: 'high', recoverable: false, strategy: 'reduce_load' },
    };
  }

  classify(error) {
    const errorStr = typeof error === 'string' ? error : error.message || JSON.stringify(error);

    for (const [type, pattern] of Object.entries(this.errorPatterns)) {
      if (pattern.test(errorStr)) {
        return {
          type,
          severity: this.classificationRules[type].severity,
          recoverable: this.classificationRules[type].recoverable,
          strategy: this.classificationRules[type].strategy,
        };
      }
    }
    return { type: 'unknown', severity: 'low', recoverable: true, strategy: 'retry' };
  }

  isRecoverable(error) {
    return this.classify(error).recoverable;
  }

  getRecommendedStrategy(error) {
    return this.classify(error).strategy;
  }
}