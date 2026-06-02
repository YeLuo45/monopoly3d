/**
 * Tests for CapabilityRegistry
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CapabilityRegistry } from '../../src/game/ai/coordination/capabilityRegistry.js';

describe('CapabilityRegistry', () => {
  let registry;
  
  beforeEach(() => {
    registry = new CapabilityRegistry();
  });
  
  afterEach(() => {
    registry.clear();
  });
  
  test('should register capabilities for agents', () => {
    registry.register('negotiation', ['agent1', 'agent2']);
    registry.register('analysis', ['agent1']);
    
    const agents = registry.getAgentsWithCapability('negotiation');
    assert.strictEqual(agents.length, 2);
    assert.ok(agents.includes('agent1'));
    assert.ok(agents.includes('agent2'));
  });
  
  test('should get capabilities for an agent', () => {
    registry.register('negotiation', ['agent1']);
    registry.register('analysis', ['agent1']);
    registry.register('risk', ['agent2']);
    
    const caps = registry.getCapabilities('agent1');
    assert.strictEqual(caps.length, 2);
    assert.ok(caps.includes('negotiation'));
    assert.ok(caps.includes('analysis'));
  });
  
  test('should find best agent for capability', () => {
    registry.register('trading', ['agent1', 'agent2', 'agent3']);
    
    const best = registry.findBestAgent('trading');
    assert.ok(best !== null);
    assert.ok(['agent1', 'agent2', 'agent3'].includes(best));
  });
  
  test('should return null when no agent has capability', () => {
    registry.register('trading', ['agent1']);
    
    const best = registry.findBestAgent('unknown_capability');
    assert.strictEqual(best, null);
  });
  
  test('should check if agent has capability', () => {
    registry.register('trading', ['agent1']);
    
    assert.ok(registry.hasCapability('agent1', 'trading'));
    assert.ok(!registry.hasCapability('agent2', 'trading'));
  });
  
  test('should update performance metrics', () => {
    registry.register('trading', ['agent1']);
    registry.updatePerformance('agent1', 'trading', 0.8);
    
    const score = registry.performanceMetrics.get('agent1')?.get('trading');
    assert.strictEqual(score, 0.8);
  });
  
  test('should get correct stats', () => {
    registry.register('trading', ['agent1']);
    registry.register('analysis', ['agent2']);
    
    const stats = registry.getStats();
    assert.strictEqual(stats.totalCapabilities, 2);
    assert.strictEqual(stats.totalAgents, 2);
  });
  
  test('should handle multiple agents with same capability', () => {
    const agents = ['a1', 'a2', 'a3', 'a4'];
    registry.register('finance', agents);
    
    const result = registry.getAgentsWithCapability('finance');
    assert.strictEqual(result.length, 4);
  });
  
  test('should handle game state context in best agent selection', () => {
    registry.register('strategic', ['agent1', 'agent2']);
    
    const gameState = { urgency: 'high', turn: 'agent1' };
    const best = registry.findBestAgent('strategic', gameState);
    assert.ok(best !== null);
  });
  
  test('should clear all registries', () => {
    registry.register('trading', ['agent1']);
    registry.clear();
    
    const stats = registry.getStats();
    assert.strictEqual(stats.totalCapabilities, 0);
    assert.strictEqual(stats.totalAgents, 0);
  });
});