/**
 * Tests for BehaviorTree
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { BehaviorTree, SelectorNode, SequenceNode, ConditionNode, ActionNode } from '../../src/game/ai/analysis/behaviorTree.js';

describe('BehaviorTree', () => {
  test('constructor initializes with root node', () => {
    const node = new ActionNode('test', () => ({ success: true }));
    const tree = new BehaviorTree(node);
    assert.strictEqual(tree.rootNode, node);
  });

  test('evaluate returns failure when no root node', () => {
    const tree = new BehaviorTree(null);
    const result = tree.evaluate({});
    assert.strictEqual(result.success, false);
  });

  test('evaluate executes action node correctly', () => {
    const actionNode = new ActionNode('testAction', (ctx) => ({
      success: true,
      action: ctx.action,
      result: 'executed',
    }));
    const tree = new BehaviorTree(actionNode);
    
    const result = tree.evaluate({ action: 'test' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, 'test');
  });

  test('SelectorNode succeeds when child succeeds', () => {
    const selector = new SelectorNode('test', [
      new ActionNode('fail', () => ({ success: false })),
      new ActionNode('succeed', () => ({ success: true, action: 'ok' })),
    ]);
    
    const result = selector.evaluate({});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, 'ok');
  });

  test('SelectorNode fails when all children fail', () => {
    const selector = new SelectorNode('test', [
      new ActionNode('fail1', () => ({ success: false })),
      new ActionNode('fail2', () => ({ success: false })),
    ]);
    
    const result = selector.evaluate({});
    assert.strictEqual(result.success, false);
  });

  test('SequenceNode succeeds when all children succeed', () => {
    const sequence = new SequenceNode('test', [
      new ActionNode('step1', () => ({ success: true })),
      new ActionNode('step2', () => ({ success: true })),
    ]);
    
    const result = sequence.evaluate({});
    assert.strictEqual(result.success, true);
  });

  test('SequenceNode fails when child fails', () => {
    const sequence = new SequenceNode('test', [
      new ActionNode('step1', () => ({ success: true })),
      new ActionNode('step2', () => ({ success: false })),
      new ActionNode('step3', () => ({ success: true })),
    ]);
    
    const result = sequence.evaluate({});
    assert.strictEqual(result.success, false);
  });

  test('ConditionNode evaluates condition function', () => {
    const condition = new ConditionNode('test', (ctx) => ctx.value > 5);
    
    const result1 = condition.evaluate({ value: 10 });
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.conditionMet, true);
    
    const result2 = condition.evaluate({ value: 3 });
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result2.conditionMet, false);
  });

  test('toDotGraph generates valid DOT format', () => {
    const actionNode = new ActionNode('test', () => ({ success: true }));
    const tree = new BehaviorTree(actionNode);
    const dot = tree.toDotGraph();
    
    assert.ok(dot.includes('digraph BehaviorTree'));
    assert.ok(dot.includes('node [shape=box]'));
    assert.ok(dot.includes('}'));
  });

  test('buildPropertyBuyTree creates valid root node', () => {
    const rootNode = BehaviorTree.buildPropertyBuyTree();
    assert.ok(rootNode);
    assert.strictEqual(rootNode.type, 'selector');
  });

  test('buildRentPayTree creates valid root node', () => {
    const rootNode = BehaviorTree.buildRentPayTree();
    assert.ok(rootNode);
    assert.strictEqual(rootNode.type, 'selector');
  });

  test('buildQuestionAnswerTree creates valid root node', () => {
    const rootNode = BehaviorTree.buildQuestionAnswerTree();
    assert.ok(rootNode);
    assert.strictEqual(rootNode.type, 'selector');
  });

  test('fromPattern creates tree from pattern', () => {
    const pattern = { type: 'property_buy' };
    const tree = BehaviorTree.fromPattern(pattern);
    assert.ok(tree.rootNode);
  });

  test('property buy tree evaluates correctly with enough money', () => {
    const rootNode = BehaviorTree.buildPropertyBuyTree();
    const tree = new BehaviorTree(rootNode);
    const context = {
      playerMoney: 1000,
      propertyPrice: 200,
      propertyValue: 300,
      propertyName: 'Boardwalk',
    };
    
    const result = tree.evaluate(context);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, 'buy');
  });

  test('rent pay tree evaluates correctly when can afford', () => {
    const rootNode = BehaviorTree.buildRentPayTree();
    const tree = new BehaviorTree(rootNode);
    const context = {
      playerMoney: 1000,
      rentAmount: 100,
      negotiationSkill: 0.3,
    };
    
    const result = tree.evaluate(context);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, 'pay');
  });
});