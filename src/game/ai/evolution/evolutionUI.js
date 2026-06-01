/**
 * EvolutionUI - Plain Data Factory for Evolution Visualization
 * 
 * Creates data structures for UI rendering without any rendering logic.
 */

/**
 * Create evolution visualization data
 * @param {object} evolution - StrategyEvolution instance
 * @param {string} playerId - Player ID
 * @returns {object} Evolution data for UI
 */
export function createEvolutionData(evolution, playerId) {
  const population = evolution.getStrategyPopulation(playerId);
  const state = evolution.getEvolutionState(playerId);
  const config = evolution.getConfig();
  
  // Calculate current generation
  const currentGeneration = state?.generation || 0;
  
  // Get top strategies with fitness scores
  const topStrategies = population.slice(0, 5).map((strategy, index) => ({
    rank: index + 1,
    id: strategy.id,
    name: strategy.name || `Strategy ${index + 1}`,
    fitness: evolution.evaluateFitness(strategy.id),
    gamesPlayed: strategy.gamesPlayed || 0,
    winRate: strategy.winRate || 0,
    avgPlacement: strategy.avgPlacement || 0,
    tags: strategy.tags || [],
    origin: strategy.origin || 'unknown',
  }));
  
  // Build fitness history from mutation log
  const fitnessHistory = (evolution.mutationLog || [])
    .filter(log => log.playerId === playerId)
    .slice(-20) // last 20 entries
    .map(log => ({
      generation: log.generation,
      fitness: log.topFitness,
      timestamp: log.timestamp,
    }));
  
  // Add current fitness to history if we have strategies
  if (topStrategies.length > 0 && fitnessHistory.length === 0) {
    fitnessHistory.push({
      generation: 0,
      fitness: topStrategies[0].fitness,
      timestamp: Date.now(),
    });
  }
  
  // Get mutation log entries for this player
  const mutationLog = (evolution.mutationLog || [])
    .filter(log => log.playerId === playerId)
    .slice(-10) // last 10 mutations
    .map(log => ({
      generation: log.generation,
      topFitness: log.topFitness,
      timestamp: log.timestamp,
    }));
  
  return {
    currentGeneration,
    topStrategies,
    fitnessHistory,
    mutationLog,
    populationSize: population.length,
    config: {
      mutationRate: config.mutationRate,
      crossoverRate: config.crossoverRate,
      populationSize: config.populationSize,
      eliteCount: config.eliteCount,
    },
    evolutionState: {
      gamesPlayed: state?.gamesPlayed || 0,
      shouldEvolve: evolution.shouldEvolve(playerId),
      lastEvolutionTime: state?.lastEvolutionTime || 0,
    },
  };
}

/**
 * Create strategy comparison data
 * @param {Array} strategies - Array of strategy objects
 * @returns {object} Comparison data
 */
export function createStrategyComparisonData(strategies) {
  if (!strategies || strategies.length === 0) {
    return { strategies: [], metrics: {} };
  }
  
  const metrics = ['fitness', 'winRate', 'avgPlacement', 'gamesPlayed'];
  
  return {
    strategies: strategies.map((s, index) => ({
      rank: index + 1,
      id: s.id,
      name: s.name || `Strategy ${index + 1}`,
      fitness: s.fitness || 0,
      winRate: s.winRate || 0,
      avgPlacement: s.avgPlacement || 0,
      gamesPlayed: s.gamesPlayed || 0,
      tags: s.tags || [],
    })),
    metrics,
    ranges: {
      fitness: { min: 0, max: 1 },
      winRate: { min: 0, max: 1 },
      avgPlacement: { min: 1, max: 4 },
      gamesPlayed: { min: 0, max: Math.max(...strategies.map(s => s.gamesPlayed || 0)) },
    },
  };
}

/**
 * Create fitness chart data
 * @param {Array} fitnessHistory - Array of fitness history entries
 * @returns {object} Chart data
 */
export function createFitnessChartData(fitnessHistory) {
  if (!fitnessHistory || fitnessHistory.length === 0) {
    return {
      labels: [],
      datasets: [{
        label: 'Fitness',
        data: [],
      }],
    };
  }
  
  return {
    labels: fitnessHistory.map(h => `Gen ${h.generation}`),
    datasets: [{
      label: 'Top Fitness',
      data: fitnessHistory.map(h => h.fitness),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
    }],
  };
}

/**
 * Create mutation event data for timeline
 * @param {Array} mutationLog - Array of mutation events
 * @returns {object} Timeline data
 */
export function createMutationTimelineData(mutationLog) {
  if (!mutationLog || mutationLog.length === 0) {
    return { events: [], totalMutations: 0 };
  }
  
  return {
    events: mutationLog.map(event => ({
      generation: event.generation,
      fitness: event.topFitness,
      timestamp: event.timestamp,
      type: event.type || 'evolution',
    })),
    totalMutations: mutationLog.length,
  };
}

/**
 * Format strategy for display
 * @param {object} strategy - Strategy object
 * @returns {object} Formatted strategy
 */
export function formatStrategy(strategy) {
  return {
    id: strategy.id || 'unknown',
    name: strategy.name || 'Unnamed Strategy',
    fitness: strategy.fitness !== undefined ? `${(strategy.fitness * 100).toFixed(1)}%` : 'N/A',
    winRate: strategy.winRate !== undefined ? `${(strategy.winRate * 100).toFixed(1)}%` : 'N/A',
    avgPlacement: strategy.avgPlacement ? strategy.avgPlacement.toFixed(1) : 'N/A',
    gamesPlayed: strategy.gamesPlayed || 0,
    tags: strategy.tags || [],
    origin: strategy.origin || 'unknown',
    generation: strategy.generation || 0,
  };
}

/**
 * Get evolution summary
 * @param {object} evolution - StrategyEvolution instance
 * @param {string} playerId - Player ID
 * @returns {object} Summary data
 */
export function getEvolutionSummary(evolution, playerId) {
  const population = evolution.getStrategyPopulation(playerId);
  const state = evolution.getEvolutionState(playerId);
  
  if (population.length === 0) {
    return {
      totalStrategies: 0,
      averageFitness: 0,
      bestFitness: 0,
      currentGeneration: 0,
      gamesPlayed: 0,
    };
  }
  
  const fitnessScores = population.map(s => evolution.evaluateFitness(s.id));
  const averageFitness = fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length;
  const bestFitness = Math.max(...fitnessScores);
  
  return {
    totalStrategies: population.length,
    averageFitness,
    bestFitness,
    currentGeneration: state?.generation || 0,
    gamesPlayed: state?.gamesPlayed || 0,
  };
}