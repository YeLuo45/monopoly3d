/**
 * Tests for EvolutionUI
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  createEvolutionData,
  createStrategyComparisonData,
  createFitnessChartData,
  createMutationTimelineData,
  formatStrategy,
  getEvolutionSummary,
} from '../../src/game/ai/evolution/evolutionUI.js';

describe('EvolutionUI', () => {
  test('createEvolutionData returns structure with required fields', () => {
    const mockEvolution = {
      getStrategyPopulation: () => [],
      getEvolutionState: () => ({ generation: 0, gamesPlayed: 0, lastEvolutionTime: 0 }),
      getConfig: () => ({ mutationRate: 0.1, crossoverRate: 0.3, populationSize: 20, eliteCount: 3 }),
      shouldEvolve: () => false,
      mutationLog: [],
      evaluateFitness: () => 0,
    };
    
    const data = createEvolutionData(mockEvolution, 'player1');
    
    assert.ok(typeof data.currentGeneration === 'number');
    assert.ok(Array.isArray(data.topStrategies));
    assert.ok(Array.isArray(data.fitnessHistory));
    assert.ok(Array.isArray(data.mutationLog));
    assert.ok(data.config);
    assert.ok(data.evolutionState);
  });

  test('createEvolutionData returns empty arrays for new player', () => {
    const mockEvolution = {
      getStrategyPopulation: () => [],
      getEvolutionState: () => ({ generation: 0, gamesPlayed: 0 }),
      getConfig: () => ({ mutationRate: 0.1, crossoverRate: 0.3, populationSize: 20, eliteCount: 3 }),
      shouldEvolve: () => false,
      mutationLog: [],
    };
    
    const data = createEvolutionData(mockEvolution, 'new_player');
    
    assert.strictEqual(data.currentGeneration, 0);
    assert.strictEqual(data.topStrategies.length, 0);
    assert.strictEqual(data.populationSize, 0);
  });

  test('createEvolutionData includes top strategies with fitness', () => {
    const mockEvolution = {
      getStrategyPopulation: () => [
        { id: 's1', name: 'Strategy 1', fitness: 0.8, gamesPlayed: 5, winRate: 0.4, avgPlacement: 2.5, tags: ['aggressive'] },
        { id: 's2', name: 'Strategy 2', fitness: 0.6, gamesPlayed: 3, winRate: 0.3, avgPlacement: 3, tags: [] },
      ],
      getEvolutionState: () => ({ generation: 2, gamesPlayed: 10 }),
      getConfig: () => ({ mutationRate: 0.1, crossoverRate: 0.3, populationSize: 20, eliteCount: 3 }),
      shouldEvolve: () => false,
      mutationLog: [
        { playerId: 'player1', generation: 1, topFitness: 0.7, timestamp: Date.now() },
        { playerId: 'player1', generation: 2, topFitness: 0.8, timestamp: Date.now() },
      ],
      evaluateFitness: (id) => id === 's1' ? 0.8 : 0.6,
    };
    
    const data = createEvolutionData(mockEvolution, 'player1');
    
    assert.strictEqual(data.topStrategies.length, 2);
    assert.strictEqual(data.topStrategies[0].rank, 1);
    assert.strictEqual(data.topStrategies[0].id, 's1');
    assert.strictEqual(data.topStrategies[0].fitness, 0.8);
  });

  test('createStrategyComparisonData handles empty input', () => {
    const data = createStrategyComparisonData([]);
    
    assert.strictEqual(data.strategies.length, 0);
    assert.ok(data.metrics);
  });

  test('createStrategyComparisonData formats strategies correctly', () => {
    const strategies = [
      { id: 's1', name: 'Test Strategy', fitness: 0.75, winRate: 0.5, avgPlacement: 2, gamesPlayed: 10 },
    ];
    
    const data = createStrategyComparisonData(strategies);
    
    assert.strictEqual(data.strategies.length, 1);
    assert.strictEqual(data.strategies[0].rank, 1);
    assert.strictEqual(data.strategies[0].id, 's1');
    assert.ok(Array.isArray(data.metrics));
    assert.ok(data.ranges);
  });

  test('createFitnessChartData handles empty history', () => {
    const data = createFitnessChartData([]);
    
    assert.ok(Array.isArray(data.labels));
    assert.ok(Array.isArray(data.datasets));
    assert.strictEqual(data.labels.length, 0);
  });

  test('createFitnessChartData creates valid chart structure', () => {
    const history = [
      { generation: 1, fitness: 0.5 },
      { generation: 2, fitness: 0.6 },
      { generation: 3, fitness: 0.7 },
    ];
    
    const data = createFitnessChartData(history);
    
    assert.strictEqual(data.labels.length, 3);
    assert.strictEqual(data.labels[0], 'Gen 1');
    assert.strictEqual(data.datasets[0].data.length, 3);
  });

  test('createMutationTimelineData handles empty log', () => {
    const data = createMutationTimelineData([]);
    
    assert.strictEqual(data.events.length, 0);
    assert.strictEqual(data.totalMutations, 0);
  });

  test('createMutationTimelineData creates timeline events', () => {
    const log = [
      { generation: 1, topFitness: 0.5, timestamp: 1000 },
      { generation: 2, topFitness: 0.6, timestamp: 2000 },
    ];
    
    const data = createMutationTimelineData(log);
    
    assert.strictEqual(data.events.length, 2);
    assert.strictEqual(data.totalMutations, 2);
    assert.strictEqual(data.events[0].generation, 1);
  });

  test('formatStrategy returns formatted object', () => {
    const strategy = {
      id: 'test_id',
      name: 'Test',
      fitness: 0.75,
      winRate: 0.5,
      avgPlacement: 2.5,
      gamesPlayed: 10,
      tags: ['aggressive'],
      origin: 'mutation',
      generation: 3,
    };
    
    const formatted = formatStrategy(strategy);
    
    assert.strictEqual(formatted.id, 'test_id');
    assert.strictEqual(formatted.name, 'Test');
    assert.strictEqual(formatted.fitness, '75.0%');
    assert.strictEqual(formatted.winRate, '50.0%');
    assert.strictEqual(formatted.avgPlacement, '2.5');
  });

  test('formatStrategy handles missing fields', () => {
    const strategy = {
      id: 'minimal',
    };
    
    const formatted = formatStrategy(strategy);
    
    assert.strictEqual(formatted.id, 'minimal');
    assert.strictEqual(formatted.name, 'Unnamed Strategy');
    assert.strictEqual(formatted.fitness, 'N/A');
  });

  test('getEvolutionSummary returns zeros for empty population', () => {
    const mockEvolution = {
      getStrategyPopulation: () => [],
      getEvolutionState: () => ({ generation: 0, gamesPlayed: 0 }),
    };
    
    const summary = getEvolutionSummary(mockEvolution, 'player1');
    
    assert.strictEqual(summary.totalStrategies, 0);
    assert.strictEqual(summary.averageFitness, 0);
    assert.strictEqual(summary.bestFitness, 0);
  });

  test('getEvolutionSummary calculates correct metrics', () => {
    const mockEvolution = {
      getStrategyPopulation: () => [
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
      ],
      getEvolutionState: () => ({ generation: 5, gamesPlayed: 20 }),
      evaluateFitness: (id) => id === 's1' ? 0.9 : id === 's2' ? 0.7 : 0.5,
    };
    
    const summary = getEvolutionSummary(mockEvolution, 'player1');
    
    assert.strictEqual(summary.totalStrategies, 3);
    assert.strictEqual(summary.currentGeneration, 5);
    assert.strictEqual(summary.gamesPlayed, 20);
    assert.strictEqual(summary.bestFitness, 0.9);
    assert.ok(summary.averageFitness > 0);
  });
});