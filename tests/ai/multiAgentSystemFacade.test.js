/**
 * Tests for MultiAgentSystemFacade
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { MultiAgentSystemFacade, AgentType } from '../../src/game/ai/multiAgentSystemFacade.js';

describe('MultiAgentSystemFacade', () => {
  let facade;
  
  beforeEach(() => {
    facade = new MultiAgentSystemFacade();
  });
  
  afterEach(() => {
    facade.clear();
  });
  
  test('should create instance with all subsystems', () => {
    assert.ok(facade.coordinator);
    assert.ok(facade.messageBus);
    assert.ok(facade.blackboard);
    assert.ok(facade.orchestrationEngine);
  });
  
  test('should initialize with game state', async () => {
    const gameState = { phase: 'playing', players: ['player1', 'player2'] };
    await facade.initialize(gameState);
    
    assert.strictEqual(facade.isInitialized, true);
    assert.ok(facade.initializedAt);
    assert.deepStrictEqual(facade.gameState, gameState);
  });
  
  test('should not reinitialize if already initialized', async () => {
    const gameState1 = { phase: 'setup' };
    const gameState2 = { phase: 'playing' };
    
    await facade.initialize(gameState1);
    await facade.initialize(gameState2);
    
    assert.strictEqual(facade.gameState, gameState1);
  });
  
  test('should register default agents on initialization', async () => {
    await facade.initialize({});
    
    const agents = facade.coordinator.getAllAgents();
    assert.ok(agents.length >= 4);
  });
  
  test('should make coordinated decisions', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const result = await facade.makeDecision('strategic-1', { turn: 1 }, {});
    
    assert.strictEqual(result.agentId, 'strategic-1');
    assert.ok('duration' in result);
  });
  
  test('should return error for non-existent agent', async () => {
    await facade.initialize({});
    
    const result = await facade.makeDecision('non-existent', {}, {});
    
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('not found'));
  });
  
  test('should return all system references', () => {
    assert.ok(facade.getCoordinator() === facade.coordinator);
    assert.ok(facade.getMessageBus() === facade.messageBus);
    assert.ok(facade.getBlackboard() === facade.blackboard);
    assert.ok(facade.getOrchestrationEngine() === facade.orchestrationEngine);
  });
  
  test('should provide system status', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const status = facade.getSystemStatus();
    
    assert.strictEqual(status.initialized, true);
    assert.ok(status.uptime >= 0);
    assert.ok('coordinator' in status);
    assert.ok('messageBus' in status);
    assert.ok('blackboard' in status);
    assert.ok('orchestration' in status);
  });
  
  test('should run diagnostics', async () => {
    await facade.initialize({});
    
    const diagnostics = facade.diagnose();
    
    assert.ok(diagnostics.timestamp);
    assert.ok(diagnostics.duration >= 0);
    assert.ok('components' in diagnostics);
    assert.ok('overallHealth' in diagnostics);
    assert.ok('issues' in diagnostics);
    assert.ok('recommendations' in diagnostics);
  });
  
  test('should clear all system state', async () => {
    await facade.initialize({ phase: 'playing' });
    await facade.makeDecision('strategic-1', {}, {});
    
    facade.clear();
    
    assert.strictEqual(facade.isInitialized, false);
    assert.strictEqual(facade.initializedAt, null);
    assert.strictEqual(facade.gameState, null);
  });
  
  test('should update blackboard on game state change', async () => {
    await facade.initialize({ phase: 'setup' });
    
    await facade.makeDecision('strategic-1', {}, { phase: 'playing', players: ['p1'] });
    
    const phase = facade.blackboard.read('game:phase');
    assert.strictEqual(phase, 'playing');
  });
});