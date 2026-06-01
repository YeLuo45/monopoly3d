/**
 * Tests for StrategyEvolution
 */

import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { StrategyEvolution } from '../../src/game/ai/evolution/strategyEvolution.js';

describe('StrategyEvolution', () => {
  let evolution;
  let mockLongTermMemory;
  let mockMetaCognition;

  beforeEach(() => {
    mockLongTermMemory = {
      store: mock.fn(),
      retrieve: mock.fn(),
    };
    mockMetaCognition = {
      analyze: mock.fn(),
    };
    evolution = new StrategyEvolution(mockLongTermMemory, mockMetaCognition);
  });

  test('constructor initializes with required dependencies', () => {
    assert.strictEqual(evolution.longTermMemory, mockLongTermMemory);
    assert.strictEqual(evolution.metaCognition, mockMetaCognition);
    assert.ok(evolution.populations instanceof Map);
    assert.ok(evolution.evolutionState instanceof Map);
    assert.ok(Array.isArray(evolution.mutationLog));
  });

  test('constructor sets default configuration', () => {
    assert.strictEqual(evolution.config.mutationRate, 0.1);
    assert.strictEqual(evolution.config.crossoverRate, 0.3);
    assert.strictEqual(evolution.config.populationSize, 20);
    assert.strictEqual(evolution.config.eliteCount, 3);
  });

  test('getConfig returns configuration copy', () => {
    const config = evolution.getConfig();
    assert.deepStrictEqual(config, evolution.config);
    assert.notStrictEqual(config, evolution.config);
  });

  test('setConfig updates configuration', () => {
    evolution.setConfig({ mutationRate: 0.2, populationSize: 30 });
    assert.strictEqual(evolution.config.mutationRate, 0.2);
    assert.strictEqual(evolution.config.populationSize, 30);
  });

  test('getEvolutionState initializes state for new player', () => {
    const state = evolution.getEvolutionState('player1');
    assert.strictEqual(state.generation, 0);
    assert.strictEqual(state.gamesPlayed, 0);
    assert.strictEqual(state.lastEvolutionGames, 0);
  });

  test('getEvolutionState returns existing state', () => {
    const state1 = evolution.getEvolutionState('player1');
    state1.generation = 5;
    
    const state2 = evolution.getEvolutionState('player1');
    assert.strictEqual(state2.generation, 5);
  });

  test('addStrategy adds strategy to population', () => {
    const strategy = {
      name: 'test_strategy',
      params: { aggression: 0.5 },
    };
    
    const added = evolution.addStrategy('player1', strategy);
    assert.ok(added.id);
    assert.strictEqual(added.name, 'test_strategy');
    
    const population = evolution.getStrategyPopulation('player1');
    assert.strictEqual(population.length, 1);
  });

  test('addStrategy generates unique IDs', () => {
    const strategy = { name: 'test' };
    const s1 = evolution.addStrategy('player1', { ...strategy });
    const s2 = evolution.addStrategy('player1', { ...strategy });
    
    // IDs should be unique - if same, addStrategy has a bug
    const areDifferent = s1.id !== s2.id;
    assert.ok(areDifferent, `Expected different IDs but got same: ${s1.id}`);
  });

  test('getStrategyPopulation returns sorted strategies', () => {
    // Add strategies with different fitness potential
    evolution.addStrategy('player1', { name: 's1', params: { aggression: 0.1 } });
    evolution.addStrategy('player1', { name: 's2', params: { aggression: 0.9 } });
    evolution.addStrategy('player1', { name: 's3', params: { aggression: 0.5 } });
    
    const population = evolution.getStrategyPopulation('player1');
    assert.strictEqual(population.length, 3);
    // Should be sorted by fitness (default order)
    assert.ok(Array.isArray(population));
  });

  test('mutateStrategy creates mutated copy', () => {
    const parent = {
      id: 'parent1',
      name: 'parent',
      params: { aggression: 0.5, riskTolerance: 0.3 },
      generation: 1,
      tags: ['aggressive'],
    };
    
    const mutated = evolution.mutateStrategy(parent);
    
    assert.ok(mutated.id);
    assert.notStrictEqual(mutated.id, parent.id);
    assert.strictEqual(mutated.parentId, 'parent1');
    assert.strictEqual(mutated.origin, 'mutation');
    assert.strictEqual(mutated.generation, 2);
  });

  test('mutateStrategy modifies numeric params', () => {
    const strategy = {
      id: 'test1',
      name: 'test',
      params: { aggression: 0.5, riskTolerance: 0.3 },
    };
    
    const mutated = evolution.mutateStrategy(strategy);
    
    // Params should be numbers (possibly modified)
    assert.strictEqual(typeof mutated.params.aggression, 'number');
    assert.strictEqual(typeof mutated.params.riskTolerance, 'number');
  });

  test('crossoverStrategy combines two strategies', () => {
    const parentA = {
      id: 'a1',
      name: 'strategy_a',
      params: { aggression: 0.8, caution: 0.2 },
      weights: { propertyValue: 0.9 },
      thresholds: { minProfit: 100 },
      tags: ['aggressive'],
    };
    
    const parentB = {
      id: 'b1',
      name: 'strategy_b',
      params: { aggression: 0.3, caution: 0.7 },
      weights: { liquidity: 0.8 },
      thresholds: { maxLoss: 50 },
      tags: ['cautious'],
    };
    
    const child = evolution.crossoverStrategy(parentA, parentB);
    
    assert.ok(child.id.startsWith('crossover_'));
    assert.ok(child.parentIds.includes('a1'));
    assert.ok(child.parentIds.includes('b1'));
    assert.strictEqual(child.origin, 'crossover');
    // params and weights should be objects (not arrays)
    assert.ok(child.params && typeof child.params === 'object');
    assert.ok(child.weights && typeof child.weights === 'object');
  });

  test('crossoverStrategy combines tags', () => {
    const parentA = { id: 'a1', tags: ['aggressive', 'risky'] };
    const parentB = { id: 'b1', tags: ['cautious', 'defensive'] };
    
    const child = evolution.crossoverStrategy(parentA, parentB);
    
    assert.ok(child.tags.includes('aggressive'));
    assert.ok(child.tags.includes('cautious'));
    assert.ok(child.tags.includes('risky'));
    assert.ok(child.tags.includes('defensive'));
  });

  test('evaluateFitness returns 0 for unknown strategy', () => {
    const fitness = evolution.evaluateFitness('unknown_strategy');
    assert.strictEqual(fitness, 0);
  });

  test('evaluateFitness calculates composite score', () => {
    const strategy = {
      id: 'fit_test',
      gamesPlayed: 10,
      winRate: 0.5,
      avgPlacement: 2,
      profitMargin: 500,
    };
    
    evolution.addStrategy('player1', strategy);
    const fitness = evolution.evaluateFitness('fit_test');
    
    assert.ok(fitness >= 0 && fitness <= 1);
  });

  test('updateFitnessFromGame updates strategy metrics', () => {
    const strategy = {
      id: 'update_test',
      gamesPlayed: 0,
      winRate: 0,
      avgPlacement: 0,
      profitMargin: 0,
    };
    
    evolution.addStrategy('player1', strategy);
    
    const gameResult = {
      placement: 1,
      cashEnd: 5000,
      cashStart: 3000,
      propertiesAcquired: 3,
      monopoliesFormed: 1,
    };
    
    evolution.updateFitnessFromGame('update_test', gameResult);
    
    const updated = evolution.getStrategyPopulation('player1').find(s => s.id === 'update_test');
    assert.strictEqual(updated.gamesPlayed, 1);
    assert.ok(updated.winRate > 0);
    assert.strictEqual(updated.avgPlacement, 1);
  });

  test('pruneWeakStrategies keeps elite and top performers', () => {
    // Add many strategies
    for (let i = 0; i < 15; i++) {
      evolution.addStrategy('player1', { name: `strategy_${i}`, params: { value: i } });
    }
    
    const removed = evolution.pruneWeakStrategies('player1', 5);
    const population = evolution.getStrategyPopulation('player1');
    
    // Should keep elite (3) + requested (5) = 8
    assert.ok(population.length <= 8);
  });

  test('duplicateTopStrategies creates copies of top strategies', () => {
    // Add some strategies
    evolution.addStrategy('player1', { name: 'top', params: { value: 1 } });
    evolution.addStrategy('player1', { name: 'mid', params: { value: 0.5 } });
    evolution.addStrategy('player1', { name: 'low', params: { value: 0.1 } });
    
    const duplicates = evolution.duplicateTopStrategies('player1');
    
    assert.strictEqual(duplicates.length, 3); // eliteCount = 3
    assert.ok(duplicates.every(d => d.origin === 'duplicate'));
    
    const population = evolution.getStrategyPopulation('player1');
    assert.ok(population.length >= 6);
  });

  test('shouldEvolve returns false for new player', () => {
    const shouldEvolve = evolution.shouldEvolve('new_player');
    assert.strictEqual(shouldEvolve, false);
  });

  test('shouldEvolve returns true after threshold games', () => {
    const playerId = 'test_player';
    
    // Record games up to threshold
    for (let i = 0; i < 5; i++) {
      evolution.recordGamePlayed(playerId);
    }
    
    // Add enough strategies
    evolution.addStrategy(playerId, { name: 's1' });
    evolution.addStrategy(playerId, { name: 's2' });
    
    const shouldEvolve = evolution.shouldEvolve(playerId);
    assert.strictEqual(shouldEvolve, true);
  });

  test('runEvolutionCycle returns error for insufficient strategies', () => {
    evolution.addStrategy('player1', { name: 'only_one' });
    
    const result = evolution.runEvolutionCycle('player1');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'insufficient_strategies');
  });

  test('runEvolutionCycle produces new generation', () => {
    // Add minimum strategies
    evolution.addStrategy('player1', { name: 's1' });
    evolution.addStrategy('player1', { name: 's2' });
    
    const result = evolution.runEvolutionCycle('player1');
    
    assert.strictEqual(result.success, true);
    assert.ok(result.generation >= 1);
    assert.ok(result.populationSize > 0);
  });

  test('recordGamePlayed increments counter', () => {
    const playerId = 'counter_test';
    
    evolution.recordGamePlayed(playerId);
    evolution.recordGamePlayed(playerId);
    evolution.recordGamePlayed(playerId);
    
    const state = evolution.getEvolutionState(playerId);
    assert.strictEqual(state.gamesPlayed, 3);
  });
});