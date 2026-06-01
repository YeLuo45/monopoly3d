/**
 * StrategyEvolution - Cross-session Strategy Evolution System
 * 
 * Evolves AI strategies across game sessions using genetic algorithms.
 * Uses observed game outcomes to evaluate and improve strategy fitness.
 */

export class StrategyEvolution {
  /**
   * @param {object} longTermMemory - L3 LongTermMemory instance
   * @param {object} metaCognition - L4 MetaCognition instance
   */
  constructor(longTermMemory, metaCognition) {
    this.longTermMemory = longTermMemory;
    this.metaCognition = metaCognition;
    
    // Strategy populations per player
    this.populations = new Map();
    
    // Evolution state tracking
    this.evolutionState = new Map();
    
    // Mutation log for debugging/visualization
    this.mutationLog = [];
    
    // Configuration (can be overridden)
    this.config = {
      mutationRate: 0.1,
      crossoverRate: 0.3,
      populationSize: 20,
      eliteCount: 3,
      generations: 10,
      evolveThreshold: 5, // games before evolution
    };
  }

  // ============ Evolution Cycles ============

  /**
   * Run one evolution cycle for a player
   * @param {string} playerId - Player ID
   * @returns {object} Evolution results
   */
  runEvolutionCycle(playerId) {
    const population = this.getStrategyPopulation(playerId);
    
    if (population.length < 2) {
      return { success: false, reason: 'insufficient_strategies' };
    }

    const state = this.getEvolutionState(playerId);
    state.generation++;
    
    // Evaluate fitness for all strategies
    const fitnessScores = population.map(s => ({
      id: s.id,
      fitness: this.evaluateFitness(s.id),
    }));

    // Sort by fitness
    fitnessScores.sort((a, b) => b.fitness - a.fitness);

    // Create next generation
    const nextGeneration = [];
    
    // Keep elite strategies (top performers never mutate)
    const elite = fitnessScores.slice(0, this.config.eliteCount);
    elite.forEach(e => {
      const strat = population.find(s => s.id === e.id);
      if (strat) nextGeneration.push({ ...strat });
    });

    // Generate new strategies through crossover and mutation
    while (nextGeneration.length < this.config.populationSize) {
      const roll = Math.random();
      
      if (roll < this.config.crossoverRate && nextGeneration.length < this.config.populationSize - 1) {
        // Crossover
        const parentA = this._selectParent(fitnessScores);
        const parentB = this._selectParent(fitnessScores);
        if (parentA && parentB) {
          const child = this.crossoverStrategy(parentA, parentB);
          nextGeneration.push(child);
        }
      } else {
        // Mutation
        const parent = this._selectParent(fitnessScores);
        if (parent) {
          const mutated = this.mutateStrategy(parent);
          nextGeneration.push(mutated);
        }
      }
    }

    // Update population
    this.populations.set(playerId, nextGeneration);
    
    // Log mutation
    this.mutationLog.push({
      playerId,
      generation: state.generation,
      timestamp: Date.now(),
      topFitness: fitnessScores[0]?.fitness || 0,
    });

    return {
      success: true,
      generation: state.generation,
      topFitness: fitnessScores[0]?.fitness || 0,
      populationSize: nextGeneration.length,
    };
  }

  /**
   * Check if evolution should run for a player
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  shouldEvolve(playerId) {
    const state = this.getEvolutionState(playerId);
    
    // Check if we've played enough games since last evolution
    const gamesSinceEvolution = state.gamesPlayed - state.lastEvolutionGames;
    
    if (gamesSinceEvolution >= this.config.evolveThreshold) {
      const population = this.getStrategyPopulation(playerId);
      // Only evolve if we have enough strategies
      return population.length >= 2;
    }
    
    return false;
  }

  /**
   * Record that a game was played (increments counter)
   * @param {string} playerId - Player ID
   */
  recordGamePlayed(playerId) {
    const state = this.getEvolutionState(playerId);
    state.gamesPlayed++;
  }

  // ============ Mutation Strategies ============

  /**
   * Mutate a strategy template
   * @param {object} strategyTemplate - Strategy to mutate
   * @returns {object} Mutated strategy
   */
  mutateStrategy(strategyTemplate) {
    const mutated = JSON.parse(JSON.stringify(strategyTemplate));
    
    // Mark as mutant
    mutated.id = `mutant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    mutated.parentId = strategyTemplate.id;
    mutated.generation = (strategyTemplate.generation || 0) + 1;
    mutated.origin = 'mutation';
    
    // Mutate numeric parameters
    if (mutated.params) {
      for (const key of Object.keys(mutated.params)) {
        if (typeof mutated.params[key] === 'number') {
          // Gaussian mutation
          const gaussian = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
          mutated.params[key] += gaussian * this.config.mutationRate * mutated.params[key];
        }
      }
    }
    
    // Mutate weights if present
    if (mutated.weights) {
      for (const key of Object.keys(mutated.weights)) {
        if (typeof mutated.weights[key] === 'number') {
          const gaussian = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
          mutated.weights[key] += gaussian * this.config.mutationRate * 0.5;
        }
      }
    }
    
    // Mutate decision thresholds
    if (mutated.thresholds) {
      for (const key of Object.keys(mutated.thresholds)) {
        if (typeof mutated.thresholds[key] === 'number') {
          mutated.thresholds[key] += (Math.random() - 0.5) * this.config.mutationRate;
        }
      }
    }
    
    // Mutate tags (add/remove behavioral tags)
    if (mutated.tags && Math.random() < this.config.mutationRate) {
      const addTag = Math.random() > 0.5;
      if (addTag) {
        const possibleTags = ['aggressive', 'defensive', 'opportunistic', 'patient', 'risky', 'cautious'];
        const currentTags = mutated.tags;
        const newTag = possibleTags[Math.floor(Math.random() * possibleTags.length)];
        if (!currentTags.includes(newTag)) {
          currentTags.push(newTag);
        }
      } else if (mutated.tags.length > 0) {
        mutated.tags.pop();
      }
    }
    
    return mutated;
  }

  /**
   * Crossover two strategies
   * @param {object} strategyA - First strategy
   * @param {object} strategyB - Second strategy
   * @returns {object} Combined strategy
   */
  crossoverStrategy(strategyA, strategyB) {
    const child = {
      id: `crossover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `hybrid_${strategyA.name || 'A'}_${strategyB.name || 'B'}`,
      generation: Math.max(strategyA.generation || 0, strategyB.generation || 0) + 1,
      origin: 'crossover',
      parentIds: [strategyA.id, strategyB.id],
      params: {},
      weights: {},
      thresholds: {},
      tags: [],
    };
    
    // Combine params (randomly pick from each parent)
    const allParams = new Set([
      ...Object.keys(strategyA.params || {}),
      ...Object.keys(strategyB.params || {}),
    ]);
    
    for (const key of allParams) {
      const valA = strategyA.params?.[key];
      const valB = strategyB.params?.[key];
      child.params[key] = Math.random() < 0.5 
        ? (valA !== undefined ? valA : valB) 
        : (valB !== undefined ? valB : valA);
    }
    
    // Combine weights
    const allWeights = new Set([
      ...Object.keys(strategyA.weights || {}),
      ...Object.keys(strategyB.weights || {}),
    ]);
    
    for (const key of allWeights) {
      const valA = strategyA.weights?.[key];
      const valB = strategyB.weights?.[key];
      if (valA !== undefined && valB !== undefined) {
        // Blend weights
        child.weights[key] = (valA + valB) / 2;
      } else {
        child.weights[key] = valA !== undefined ? valA : valB;
      }
    }
    
    // Combine thresholds
    const allThresholds = new Set([
      ...Object.keys(strategyA.thresholds || {}),
      ...Object.keys(strategyB.thresholds || {}),
    ]);
    
    for (const key of allThresholds) {
      const valA = strategyA.thresholds?.[key];
      const valB = strategyB.thresholds?.[key];
      child.thresholds[key] = Math.random() < 0.5 
        ? (valA !== undefined ? valA : valB) 
        : (valB !== undefined ? valB : valA);
    }
    
    // Combine tags (union)
    child.tags = [...new Set([
      ...(strategyA.tags || []),
      ...(strategyB.tags || []),
    ])];
    
    return child;
  }

  // ============ Fitness Evaluation ============

  /**
   * Evaluate fitness of a strategy (0-1 scale)
   * @param {string} strategyId - Strategy ID
   * @returns {number} Fitness score
   */
  evaluateFitness(strategyId) {
    // Get strategy data from long term memory
    const strategy = this._findStrategy(strategyId);
    
    if (!strategy) return 0;
    
    // Fitness based on multiple factors
    const gamesPlayed = strategy.gamesPlayed || 0;
    const winRate = strategy.winRate || 0;
    const avgPlacement = strategy.avgPlacement || 4;
    const profitMargin = strategy.profitMargin || 0;
    
    // Calculate composite fitness
    // Win rate is most important (40%)
    // Profit margin (30%)
    // Games played shows reliability (20%)
    // Average placement (10%)
    
    const fitness = (
      winRate * 0.4 +
      Math.max(0, Math.min(profitMargin / 1000, 1)) * 0.3 +
      Math.min(gamesPlayed / 20, 1) * 0.2 +
      Math.max(0, (4 - avgPlacement) / 4) * 0.1
    );
    
    return Math.max(0, Math.min(1, fitness));
  }

  /**
   * Update strategy fitness from game result
   * @param {string} strategyId - Strategy ID
   * @param {object} gameResult - Game result {
   *   playerId, placement, cashEnd, cashStart, propertiesAcquired, 
   *   monopoliesFormed, rentPaid, rentReceived, tradesAccepted
   * }
   */
  updateFitnessFromGame(strategyId, gameResult) {
    const strategy = this._findStrategy(strategyId);
    
    if (!strategy) return;
    
    const { placement, cashEnd, cashStart, propertiesAcquired, monopoliesFormed } = gameResult;
    
    // Update games played
    strategy.gamesPlayed = (strategy.gamesPlayed || 0) + 1;
    
    // Update win rate (exponential moving average)
    const isWin = placement === 1;
    const alpha = 0.3;
    strategy.winRate = strategy.winRate 
      ? strategy.winRate * (1 - alpha) + (isWin ? alpha : 0)
      : (isWin ? alpha : 0);
    
    // Update average placement
    const prevGames = strategy.gamesPlayed - 1;
    const prevAvg = strategy.avgPlacement || placement;
    strategy.avgPlacement = (prevAvg * prevGames + placement) / strategy.gamesPlayed;
    
    // Update profit margin
    const profit = cashEnd - cashStart;
    const prevProfit = strategy.profitMargin || profit;
    strategy.profitMargin = prevProfit * 0.7 + profit * 0.3;
    
    // Update additional metrics
    strategy.propertiesAcquired = (strategy.propertiesAcquired || 0) + (propertiesAcquired || 0);
    strategy.monopoliesFormed = (strategy.monopoliesFormed || 0) + (monopoliesFormed || 0);
    
    // Store in long term memory
    this._saveStrategy(strategy);
  }

  // ============ Strategy Population ============

  /**
   * Get all strategies for a player sorted by fitness
   * @param {string} playerId - Player ID
   * @returns {Array} Strategies sorted by fitness
   */
  getStrategyPopulation(playerId) {
    const population = this.populations.get(playerId) || [];
    
    // Sort by fitness
    return population.sort((a, b) => {
      const fitnessA = this.evaluateFitness(a.id);
      const fitnessB = this.evaluateFitness(b.id);
      return fitnessB - fitnessA;
    });
  }

  /**
   * Add a new strategy to population
   * @param {string} playerId - Player ID
   * @param {object} strategy - Strategy to add
   */
  addStrategy(playerId, strategy) {
    const population = this.populations.get(playerId) || [];
    
    // Ensure unique ID
    strategy.id = strategy.id || `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    strategy.createdAt = Date.now();
    strategy.gamesPlayed = strategy.gamesPlayed || 0;
    strategy.winRate = strategy.winRate || 0;
    strategy.avgPlacement = strategy.avgPlacement || 0;
    strategy.profitMargin = strategy.profitMargin || 0;
    
    population.push(strategy);
    
    // Maintain population size
    if (population.length > this.config.populationSize * 2) {
      this.pruneWeakStrategies(playerId, this.config.populationSize);
    }
    
    this.populations.set(playerId, population);
    this._saveStrategy(strategy);
    
    return strategy;
  }

  /**
   * Prune weak strategies, keeping top performers
   * @param {string} playerId - Player ID
   * @param {number} keepCount - Number of strategies to keep
   */
  pruneWeakStrategies(playerId, keepCount = 10) {
    const population = this.populations.get(playerId) || [];
    
    // Sort by fitness
    const sorted = population.sort((a, b) => {
      const fitnessA = this.evaluateFitness(a.id);
      const fitnessB = this.evaluateFitness(b.id);
      return fitnessB - fitnessA;
    });
    
    // Keep top performers + elite
    const eliteCount = this.config.eliteCount;
    const toKeep = Math.min(keepCount + eliteCount, sorted.length);
    
    // First, identify elite strategies
    const eliteStrategies = sorted.slice(0, eliteCount);
    const eliteIds = new Set(eliteStrategies.map(s => s.id));
    
    // Then select additional top strategies (excluding elite)
    const additionalNeeded = keepCount - eliteCount;
    const additionalStrategies = sorted
      .filter(s => !eliteIds.has(s.id))
      .slice(0, Math.max(0, additionalNeeded));
    
    const pruned = [...eliteStrategies, ...additionalStrategies];
    
    this.populations.set(playerId, pruned);
    
    return pruned.length;
  }

  /**
   * Duplicate top strategies for variation
   * @param {string} playerId - Player ID
   * @returns {Array} New strategy copies
   */
  duplicateTopStrategies(playerId) {
    const population = this.getStrategyPopulation(playerId);
    const topStrategies = population.slice(0, this.config.eliteCount);
    
    const duplicates = [];
    
    for (const strategy of topStrategies) {
      const duplicate = this.mutateStrategy(strategy);
      duplicate.origin = 'duplicate';
      duplicate.name = `${strategy.name || 'strategy'}_copy`;
      duplicates.push(duplicate);
      this.addStrategy(playerId, duplicate);
    }
    
    return duplicates;
  }

  // ============ Helper Methods ============

  /**
   * Get evolution state for player
   * @param {string} playerId - Player ID
   * @returns {object} Evolution state
   */
  getEvolutionState(playerId) {
    if (!this.evolutionState.has(playerId)) {
      this.evolutionState.set(playerId, {
        generation: 0,
        gamesPlayed: 0,
        lastEvolutionGames: 0,
        lastEvolutionTime: 0,
      });
    }
    return this.evolutionState.get(playerId);
  }

  /**
   * Select parent for reproduction based on fitness
   * @param {Array} fitnessScores - Array of {id, fitness}
   * @returns {object|null} Selected strategy
   */
  _selectParent(fitnessScores) {
    if (fitnessScores.length === 0) return null;
    
    // Roulette wheel selection
    const totalFitness = fitnessScores.reduce((sum, f) => sum + f.fitness, 0);
    if (totalFitness === 0) {
      // Random selection if all fitness is 0
      return fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
    }
    
    let roll = Math.random() * totalFitness;
    for (const entry of fitnessScores) {
      roll -= entry.fitness;
      if (roll <= 0) {
        return this._findStrategy(entry.id);
      }
    }
    
    return fitnessScores[fitnessScores.length - 1];
  }

  /**
   * Find strategy by ID in population or memory
   * @param {string} strategyId - Strategy ID
   * @returns {object|null}
   */
  _findStrategy(strategyId) {
    // Search in all populations
    for (const population of this.populations.values()) {
      const found = population.find(s => s.id === strategyId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Save strategy to long term memory
   * @param {object} strategy - Strategy to save
   */
  _saveStrategy(strategy) {
    if (this.longTermMemory && typeof this.longTermMemory.store === 'function') {
      this.longTermMemory.store('strategy', strategy.id, strategy);
    }
  }

  /**
   * Get strategy from long term memory
   * @param {string} strategyId - Strategy ID
   * @returns {object|null}
   */
  _loadStrategy(strategyId) {
    if (this.longTermMemory && typeof this.longTermMemory.retrieve === 'function') {
      return this.longTermMemory.retrieve('strategy', strategyId);
    }
    return null;
  }

  /**
   * Set evolution configuration
   * @param {object} config - Configuration overrides
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns {object}
   */
  getConfig() {
    return { ...this.config };
  }
}