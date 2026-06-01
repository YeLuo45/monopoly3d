/**
 * EvolutionConfig - Configuration for Strategy Evolution
 * 
 * Manages evolution parameters with validation and defaults.
 */

export class EvolutionConfig {
  constructor() {
    // Default configuration values
    this._config = {
      mutationRate: 0.1,
      crossoverRate: 0.3,
      populationSize: 20,
      eliteCount: 3,
      generations: 10,
    };
    
    // Validation constraints
    this._constraints = {
      mutationRate: { min: 0, max: 1 },
      crossoverRate: { min: 0, max: 1 },
      populationSize: { min: 2, max: 100 },
      eliteCount: { min: 0, max: 10 },
      generations: { min: 1, max: 100 },
    };
    
    // Default configuration snapshot
    this._defaults = { ...this._config };
  }

  // ============ Getters ============

  /**
   * Get mutation rate
   * @returns {number} Mutation rate (0-1)
   */
  getMutationRate() {
    return this._config.mutationRate;
  }

  /**
   * Get crossover rate
   * @returns {number} Crossover rate (0-1)
   */
  getCrossoverRate() {
    return this._config.crossoverRate;
  }

  /**
   * Get population size
   * @returns {number} Population size
   */
  getPopulationSize() {
    return this._config.populationSize;
  }

  /**
   * Get elite count
   * @returns {number} Elite count
   */
  getEliteCount() {
    return this._config.eliteCount;
  }

  /**
   * Get generations
   * @returns {number} Number of generations
   */
  getGenerations() {
    return this._config.generations;
  }

  /**
   * Get all configuration as object
   * @returns {object} Full configuration
   */
  getAll() {
    return { ...this._config };
  }

  // ============ Setters ============

  /**
   * Set mutation rate
   * @param {number} rate - Mutation rate (0-1)
   */
  setMutationRate(rate) {
    this._validateAndSet('mutationRate', rate);
  }

  /**
   * Set crossover rate
   * @param {number} rate - Crossover rate (0-1)
   */
  setCrossoverRate(rate) {
    this._validateAndSet('crossoverRate', rate);
  }

  /**
   * Set population size
   * @param {number} size - Population size
   */
  setPopulationSize(size) {
    this._validateAndSet('populationSize', size);
  }

  /**
   * Set elite count
   * @param {number} count - Elite count
   */
  setEliteCount(count) {
    this._validateAndSet('eliteCount', count);
  }

  /**
   * Set generations
   * @param {number} generations - Number of generations
   */
  setGenerations(generations) {
    this._validateAndSet('generations', generations);
  }

  /**
   * Set multiple configuration values
   * @param {object} config - Configuration object
   */
  setAll(config) {
    if (config.mutationRate !== undefined) this.setMutationRate(config.mutationRate);
    if (config.crossoverRate !== undefined) this.setCrossoverRate(config.crossoverRate);
    if (config.populationSize !== undefined) this.setPopulationSize(config.populationSize);
    if (config.eliteCount !== undefined) this.setEliteCount(config.eliteCount);
    if (config.generations !== undefined) this.setGenerations(config.generations);
  }

  /**
   * Reset to defaults
   */
  reset() {
    this._config = { ...this._defaults };
  }

  // ============ Validation ============

  /**
   * Validate and set a parameter
   * @param {string} key - Parameter key
   * @param {*} value - Value to set
   */
  _validateAndSet(key, value) {
    const constraints = this._constraints[key];
    
    if (!constraints) {
      throw new Error(`Unknown configuration parameter: ${key}`);
    }
    
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      throw new Error(`${key} must be a number`);
    }
    
    if (numValue < constraints.min || numValue > constraints.max) {
      throw new Error(`${key} must be between ${constraints.min} and ${constraints.max}`);
    }
    
    this._config[key] = numValue;
  }

  /**
   * Validate all parameters
   * @returns {object} Validation result { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];
    
    for (const key of Object.keys(this._constraints)) {
      const value = this._config[key];
      const constraints = this._constraints[key];
      
      if (value < constraints.min || value > constraints.max) {
        errors.push(`${key} out of range: ${value} (valid: ${constraints.min}-${constraints.max})`);
      }
    }
    
    // Elite count should not exceed half of population size
    if (this._config.eliteCount > this._config.populationSize / 2) {
      errors.push(`eliteCount (${this._config.eliteCount}) should not exceed half of populationSize (${this._config.populationSize})`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if configuration is valid
   * @returns {boolean}
   */
  isValid() {
    return this.validate().valid;
  }

  // ============ Serialization ============

  /**
   * Serialize to JSON
   * @returns {object}
   */
  toJSON() {
    return {
      config: { ...this._config },
      constraints: { ...this._constraints },
      defaults: { ...this._defaults },
    };
  }

  /**
   * Create from JSON
   * @param {object} json - JSON representation
   * @returns {EvolutionConfig}
   */
  static fromJSON(json) {
    const instance = new EvolutionConfig();
    if (json.config) {
      instance.setAll(json.config);
    }
    return instance;
  }
}