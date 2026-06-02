/**
 * Tests for AgentCoordinator
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AgentCoordinator, AgentType } from '../../src/game/ai/coordination/agentCoordinator.js';

describe('AgentCoordinator', () => {
  let coordinator;
  
  beforeEach(() => {
    coordinator = new AgentCoordinator();
  });
  
  afterEach(() => {
    coordinator.clear();
  });
  
  test('should register agents', () => {
    const success = coordinator.registerAgent('agent1', AgentType.STRATEGIC, ['negotiation', 'analysis']);
    assert.ok(success);
    
    const agent = coordinator.getAgent('agent1');
    assert.ok(agent !== null);
    assert.strictEqual(agent.id, 'agent1');
    assert.strictEqual(agent.type, AgentType.STRATEGIC);
  });
  
  test('should not register duplicate agents', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    const success = coordinator.registerAgent('agent1', AgentType.TACTICAL, []);
    assert.ok(!success);
  });
  
  test('should get all agents', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    coordinator.registerAgent('agent2', AgentType.TACTICAL, []);
    
    const agents = coordinator.getAllAgents();
    assert.strictEqual(agents.length, 2);
  });
  
  test('should unregister agents', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    const success = coordinator.unregisterAgent('agent1');
    assert.ok(success);
    assert.strictEqual(coordinator.getAgent('agent1'), null);
  });
  
  test('should delegate tasks to best agent', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, ['negotiation']);
    coordinator.registerAgent('agent2', AgentType.TACTICAL, ['analysis']);
    
    const taskId = coordinator.delegateTask(
      { type: 'negotiate' },
      ['negotiation']
    );
    
    assert.ok(taskId !== null);
  });
  
  test('should coordinate actions', () => {
    const actions = [
      { id: 'a1', priority: 5 },
      { id: 'a2', priority: 10 },
      { id: 'a3', priority: 3 }
    ];
    
    const coordinated = coordinator.coordinateAction(actions, { phase: 'building' });
    assert.strictEqual(coordinated.length, 3);
    // Highest priority first
    assert.strictEqual(coordinated[0].id, 'a2');
  });
  
  test('should send messages between agents', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    coordinator.registerAgent('agent2', AgentType.TACTICAL, []);
    
    const success = coordinator.sendMessage('agent1', 'agent2', { type: 'request', data: 'status' });
    assert.ok(success);
    
    const messages = coordinator.getMessages('agent2');
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].from, 'agent1');
  });
  
  test('should broadcast messages', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    coordinator.registerAgent('agent2', AgentType.TACTICAL, []);
    coordinator.registerAgent('agent3', AgentType.REACTIVE, []);
    
    const count = coordinator.broadcastMessage('agent1', { type: 'alert', data: 'turn-start' });
    assert.strictEqual(count, 2); // Broadcasts to all except sender
  });
  
  test('should get pending messages', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    coordinator.registerAgent('agent2', AgentType.TACTICAL, []);
    
    coordinator.sendMessage('agent2', 'agent1', { data: 'test' });
    
    const messages = coordinator.getMessages('agent1');
    assert.strictEqual(messages.length, 1);
    assert.ok(messages[0].read);
  });
  
  test('should resolve action dependencies', () => {
    const actions = [
      { id: 'a1', priority: 5 },
      { id: 'a2', priority: 5, dependsOn: ['a1'] },
      { id: 'a3', priority: 5, dependsOn: ['a2'] }
    ];
    
    const coordinated = coordinator.coordinateAction(actions, {});
    assert.strictEqual(coordinated[0].id, 'a1');
    assert.strictEqual(coordinated[1].id, 'a2');
    assert.strictEqual(coordinated[2].id, 'a3');
  });
  
  test('should pause and resume coordination', () => {
    coordinator.pause();
    assert.ok(coordinator.isPaused);
    
    coordinator.resume();
    assert.ok(!coordinator.isPaused);
  });
  
  test('should get coordinator stats', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, ['negotiation']);
    
    const stats = coordinator.getStats();
    assert.strictEqual(stats.agentCount, 1);
    assert.ok(stats.taskStats !== undefined);
  });
  
  test('should clear messages for agent', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, []);
    coordinator.registerAgent('agent2', AgentType.TACTICAL, []);
    
    coordinator.sendMessage('agent2', 'agent1', { data: 'test' });
    coordinator.clearMessages('agent1');
    
    const messages = coordinator.getMessages('agent1');
    assert.strictEqual(messages.length, 0);
  });
  
  test('should handle canHandleTask check', () => {
    coordinator.registerAgent('agent1', AgentType.STRATEGIC, ['negotiation']);
    
    assert.ok(coordinator.canHandleTask('agent1', ['negotiation']));
    assert.ok(!coordinator.canHandleTask('agent1', ['unknown']));
  });
});