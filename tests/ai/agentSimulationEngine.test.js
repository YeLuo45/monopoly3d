/**
 * Tests for AgentSimulationEngine
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AgentSimulationEngine } from '../../src/game/ai/agentSimulationEngine.js';
import { MultiAgentSystemFacade } from '../../src/game/ai/multiAgentSystemFacade.js';

describe('AgentSimulationEngine', () => {
  let facade;
  let engine;
  
  beforeEach(() => {
    facade = new MultiAgentSystemFacade();
    engine = new AgentSimulationEngine(facade);
  });
  
  afterEach(() => {
    engine.stop();
    facade.clear();
  });
  
  test('should create instance with facade reference', () => {
    assert.ok(engine.multiAgentSystem === facade);
    assert.strictEqual(engine.isRunning, false);
    assert.strictEqual(engine.currentTurn, 0);
  });
  
  test('should simulate single turn', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const agents = ['strategic-1', 'tactical-1'];
    const result = await engine.simulateTurn({ turn: 1 }, agents);
    
    assert.strictEqual(result.turn, 0);
    assert.ok(result.decisions.length === 2);
    assert.ok('duration' in result);
  });
  
  test('should simulate multiple turns', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const agents = ['strategic-1'];
    
    await engine.simulateTurn({ turn: 1 }, agents);
    await engine.simulateTurn({ turn: 2 }, agents);
    
    assert.strictEqual(engine.currentTurn, 2);
    assert.ok(engine.decisionLog.length === 2);
  });
  
  test('should update agent behavior profiles', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const agents = ['strategic-1', 'reactive-1'];
    await engine.simulateTurn({}, agents);
    
    const profile = engine.getAgentBehaviorProfile('strategic-1');
    assert.ok(profile);
    assert.strictEqual(profile.agentId, 'strategic-1');
    assert.ok(profile.totalDecisions >= 1);
  });
  
  test('should return null for non-existent agent profile', () => {
    const profile = engine.getAgentBehaviorProfile('non-existent');
    assert.strictEqual(profile, null);
  });
  
  test('should get simulation metrics', async () => {
    await facade.initialize({ phase: 'playing' });
    await engine.simulateTurn({}, ['strategic-1']);
    
    const metrics = engine.getMetrics();
    assert.ok('totalDecisions' in metrics);
    assert.ok('successfulDecisions' in metrics);
    assert.ok('averageDecisionTime' in metrics);
  });
  
  test('should simulate full game', async () => {
    await facade.initialize({ phase: 'playing', players: ['p1', 'p2'] });
    
    const result = await engine.simulateGame(
      { phase: 'playing' },
      ['strategic-1', 'analytical-1'],
      5
    );
    
    assert.ok(result.turns);
    assert.ok(result.finalTurn > 0);
    assert.ok('duration' in result);
  });
  
  test('should stop simulation', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const result = await engine.simulateGame(
      { phase: 'playing' },
      ['strategic-1'],
      100
    );
    
    assert.strictEqual(engine.isRunning, false);
  });
});