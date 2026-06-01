/**
 * Tests for EvolutionConfig
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { EvolutionConfig } from '../../src/game/ai/evolution/evolutionConfig.js';

describe('EvolutionConfig', () => {
  test('constructor initializes with defaults', () => {
    const config = new EvolutionConfig();
    
    assert.strictEqual(config.getMutationRate(), 0.1);
    assert.strictEqual(config.getCrossoverRate(), 0.3);
    assert.strictEqual(config.getPopulationSize(), 20);
    assert.strictEqual(config.getEliteCount(), 3);
    assert.strictEqual(config.getGenerations(), 10);
  });

  test('setMutationRate updates value within bounds', () => {
    const config = new EvolutionConfig();
    
    config.setMutationRate(0.2);
    assert.strictEqual(config.getMutationRate(), 0.2);
    
    config.setMutationRate(0.5);
    assert.strictEqual(config.getMutationRate(), 0.5);
  });

  test('setMutationRate throws for out-of-bounds values', () => {
    const config = new EvolutionConfig();
    
    assert.throws(() => config.setMutationRate(-0.1), /between 0 and 1/);
    assert.throws(() => config.setMutationRate(1.5), /between 0 and 1/);
  });

  test('setCrossoverRate updates value within bounds', () => {
    const config = new EvolutionConfig();
    
    config.setCrossoverRate(0.4);
    assert.strictEqual(config.getCrossoverRate(), 0.4);
  });

  test('setPopulationSize updates value within bounds', () => {
    const config = new EvolutionConfig();
    
    config.setPopulationSize(30);
    assert.strictEqual(config.getPopulationSize(), 30);
  });

  test('setPopulationSize throws for out-of-bounds values', () => {
    const config = new EvolutionConfig();
    
    assert.throws(() => config.setPopulationSize(1), /between 2 and 100/);
    assert.throws(() => config.setPopulationSize(101), /between 2 and 100/);
  });

  test('setEliteCount updates value within bounds', () => {
    const config = new EvolutionConfig();
    
    config.setEliteCount(5);
    assert.strictEqual(config.getEliteCount(), 5);
  });

  test('setGenerations updates value within bounds', () => {
    const config = new EvolutionConfig();
    
    config.setGenerations(20);
    assert.strictEqual(config.getGenerations(), 20);
  });

  test('setAll updates multiple values', () => {
    const config = new EvolutionConfig();
    
    config.setAll({
      mutationRate: 0.15,
      crossoverRate: 0.4,
      populationSize: 25,
    });
    
    assert.strictEqual(config.getMutationRate(), 0.15);
    assert.strictEqual(config.getCrossoverRate(), 0.4);
    assert.strictEqual(config.getPopulationSize(), 25);
    // Unchanged values should remain
    assert.strictEqual(config.getEliteCount(), 3);
  });

  test('reset restores default values', () => {
    const config = new EvolutionConfig();
    
    config.setMutationRate(0.5);
    config.setPopulationSize(50);
    config.reset();
    
    assert.strictEqual(config.getMutationRate(), 0.1);
    assert.strictEqual(config.getPopulationSize(), 20);
  });

  test('validate returns valid for correct config', () => {
    const config = new EvolutionConfig();
    const result = config.validate();
    
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('validate detects eliteCount exceeding half of populationSize', () => {
    const config = new EvolutionConfig();
    
    config.setPopulationSize(6);
    config.setEliteCount(5);
    
    const result = config.validate();
    
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('eliteCount')));
  });

  test('isValid returns correct boolean', () => {
    const config = new EvolutionConfig();
    
    assert.strictEqual(config.isValid(), true);
    
    config.setPopulationSize(6);
    config.setEliteCount(5);
    
    assert.strictEqual(config.isValid(), false);
  });

  test('toJSON and fromJSON roundtrip', () => {
    const config = new EvolutionConfig();
    config.setMutationRate(0.25);
    config.setCrossoverRate(0.45);
    
    const json = config.toJSON();
    const restored = EvolutionConfig.fromJSON(json);
    
    assert.strictEqual(restored.getMutationRate(), 0.25);
    assert.strictEqual(restored.getCrossoverRate(), 0.45);
    assert.strictEqual(restored.getPopulationSize(), 20);
  });

  test('getAll returns all config values', () => {
    const config = new EvolutionConfig();
    
    const all = config.getAll();
    
    assert.strictEqual(all.mutationRate, 0.1);
    assert.strictEqual(all.crossoverRate, 0.3);
    assert.strictEqual(all.populationSize, 20);
    assert.strictEqual(all.eliteCount, 3);
    assert.strictEqual(all.generations, 10);
  });

  test('throws error for unknown parameter', () => {
    const config = new EvolutionConfig();
    
    assert.throws(() => {
      config._validateAndSet('unknownParam', 0.5);
    }, /Unknown configuration parameter/);
  });

  test('throws error for non-number values', () => {
    const config = new EvolutionConfig();
    
    assert.throws(() => {
      config.setMutationRate('not a number');
    }, /must be a number/);
  });
});