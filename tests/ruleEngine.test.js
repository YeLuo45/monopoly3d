/**
 * RuleEngine Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'assert';

// Import EventBus and RuleEngine
import { EventBus } from '../src/game/eventBus.js';
import { RuleEngine } from '../src/game/hooks/ruleEngine.js';

describe('RuleEngine', () => {
  let eventBus;
  let ruleEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    ruleEngine = new RuleEngine(eventBus);
  });

  afterEach(() => {
    ruleEngine.clearRules();
  });

  // Test 1: Constructor
  it('should initialize with eventBus and empty rules', () => {
    assert.ok(ruleEngine._eventBus === eventBus);
    assert.strictEqual(ruleEngine._rules.length, 0);
    assert.strictEqual(ruleEngine.isEnabled(), true);
  });

  // Test 2: addRule - basic rule
  it('should add a rule and return ruleId', () => {
    const ruleId = ruleEngine.addRule({
      event: 'test_event',
      condition: (data) => data.value > 10,
      action: () => 'fired',
    });

    assert.ok(typeof ruleId === 'string');
    assert.ok(ruleId.startsWith('re_rule_'));
    assert.strictEqual(ruleEngine._rules.length, 1);
  });

  // Test 3: addRule - with priority
  it('should sort rules by priority', () => {
    ruleEngine.addRule({
      event: 'priority_test',
      condition: () => true,
      action: () => {},
      priority: 1,
    });
    ruleEngine.addRule({
      event: 'priority_test',
      condition: () => true,
      action: () => {},
      priority: 10,
    });

    // Higher priority should be first
    assert.strictEqual(ruleEngine._rules[0].priority, 10);
  });

  // Test 4: removeRule
  it('should remove a rule by ID', () => {
    const ruleId = ruleEngine.addRule({
      event: 'remove_test',
      condition: () => true,
      action: () => {},
    });

    assert.strictEqual(ruleEngine._rules.length, 1);

    const removed = ruleEngine.removeRule(ruleId);
    assert.strictEqual(removed, true);
    assert.strictEqual(ruleEngine._rules.length, 0);
  });

  // Test 5: evaluate - condition matches
  it('should fire action when condition matches', () => {
    let fired = false;
    ruleEngine.addRule({
      event: 'evaluate_test',
      condition: (data) => data.trigger === true,
      action: () => {
        fired = true;
        return 'action_result';
      },
    });

    const results = ruleEngine.evaluate('evaluate_test', { trigger: true });
    assert.strictEqual(fired, true);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].result, 'action_result');
  });

  // Test 6: evaluate - condition doesn't match
  it('should not fire when condition fails', () => {
    ruleEngine.addRule({
      event: 'no_match_test',
      condition: (data) => data.value > 100,
      action: () => 'fired',
    });

    const results = ruleEngine.evaluate('no_match_test', { value: 5 });
    assert.strictEqual(results.length, 0);
  });

  // Test 7: evaluate - multiple rules
  it('should fire multiple matching rules', () => {
    let count = 0;
    ruleEngine.addRule({
      event: 'multi_test',
      condition: () => true,
      action: () => count++,
    });
    ruleEngine.addRule({
      event: 'multi_test',
      condition: () => true,
      action: () => count++,
    });

    ruleEngine.evaluate('multi_test', {});
    assert.strictEqual(count, 2);
  });

  // Test 8: property_threshold rule type
  it('should fire property_threshold rule when count exceeds threshold', () => {
    let fired = false;
    ruleEngine.addRule({
      event: 'property_update',
      condition: { playerId: 'player1', threshold: 3 },
      action: () => { fired = true; },
      ruleType: 'property_threshold',
    });

    // Below threshold
    let results = ruleEngine.evaluate('property_update', {
      playerId: 'player1',
      propertyCount: 2,
    });
    assert.strictEqual(fired, false);

    // Above threshold
    results = ruleEngine.evaluate('property_update', {
      playerId: 'player1',
      propertyCount: 4,
    });
    assert.strictEqual(fired, true);
  });

  // Test 9: money_change rule type
  it('should fire money_change rule when change exceeds threshold', () => {
    let fired = false;
    ruleEngine.addRule({
      event: 'money_update',
      condition: { playerId: 'player1', threshold: 100 },
      action: () => { fired = true; },
      ruleType: 'money_change',
    });

    // Small change
    ruleEngine.evaluate('money_update', {
      playerId: 'player1',
      change: 50,
    });
    assert.strictEqual(fired, false);

    // Large change
    ruleEngine.evaluate('money_update', {
      playerId: 'player1',
      change: 150,
    });
    assert.strictEqual(fired, true);
  });

  // Test 10: consecutive_turns rule type
  it('should fire consecutive_turns rule after threshold reached', () => {
    let fired = false;
    ruleEngine.addRule({
      event: 'turn_change',
      condition: { playerId: 'player1', threshold: 3 },
      action: () => { fired = true; },
      ruleType: 'consecutive_turns',
    });

    // Below threshold
    ruleEngine.evaluate('turn_change', {
      playerId: 'player1',
      consecutiveCount: 2,
    });
    assert.strictEqual(fired, false);

    // At threshold
    ruleEngine.evaluate('turn_change', {
      playerId: 'player1',
      consecutiveCount: 3,
    });
    assert.strictEqual(fired, true);
  });

  // Test 11: rent_overload rule type
  it('should fire rent_overload when rent > 50% of money', () => {
    let fired = false;
    ruleEngine.addRule({
      event: 'rent_collected',
      condition: { playerId: 'player1' },
      action: () => { fired = true; },
      ruleType: 'rent_overload',
    });

    // Rent is 30% - should not fire
    ruleEngine.evaluate('rent_collected', {
      playerId: 'player1',
      rent: 30,
      playerMoney: 100,
    });
    assert.strictEqual(fired, false);

    // Rent is 60% - should fire
    fired = false;
    ruleEngine.evaluate('rent_collected', {
      playerId: 'player1',
      rent: 60,
      playerMoney: 100,
    });
    assert.strictEqual(fired, true);
  });

  // Test 12: getActiveRules
  it('should return all enabled rules', () => {
    ruleEngine.addRule({
      event: 'active_test',
      condition: () => true,
      action: () => {},
    });

    const active = ruleEngine.getActiveRules();
    assert.strictEqual(active.length, 1);
  });

  // Test 13: enableRule/disableRule
  it('should enable and disable specific rules', () => {
    const ruleId = ruleEngine.addRule({
      event: 'toggle_test',
      condition: () => true,
      action: () => {},
    });

    assert.strictEqual(ruleEngine.isEnabled(), true);

    ruleEngine.disableRule(ruleId);
    let results = ruleEngine.evaluate('toggle_test', {});
    assert.strictEqual(results.length, 0);

    ruleEngine.enableRule(ruleId);
    results = ruleEngine.evaluate('toggle_test', {});
    assert.strictEqual(results.length, 1);
  });

  // Test 14: exportRules/importRules
  it('should export and import rules as JSON', () => {
    ruleEngine.addRule({
      event: 'export_test',
      condition: { playerId: 'player1', threshold: 3 },
      action: (data) => data.value * 2,
      priority: 5,
      ruleType: 'property_threshold',
    });

    const exported = ruleEngine.exportRules();
    assert.ok(typeof exported === 'string');

    // Create new engine and import
    const newEngine = new RuleEngine(eventBus);
    const count = newEngine.importRules(exported);
    assert.strictEqual(count, 1);
    assert.strictEqual(newEngine._rules.length, 1);
  });

  // Test 15: clearRules
  it('should clear all rules', () => {
    ruleEngine.addRule({
      event: 'clear_test',
      condition: () => true,
      action: () => {},
    });

    assert.strictEqual(ruleEngine._rules.length, 1);

    ruleEngine.clearRules();
    assert.strictEqual(ruleEngine._rules.length, 0);
  });

  // Test 16: setEnabled
  it('should disable entire engine when setEnabled(false)', () => {
    ruleEngine.addRule({
      event: 'disabled_test',
      condition: () => true,
      action: () => {},
    });

    ruleEngine.setEnabled(false);
    assert.strictEqual(ruleEngine.isEnabled(), false);

    const results = ruleEngine.evaluate('disabled_test', {});
    assert.strictEqual(results.length, 0);

    // Re-enable
    ruleEngine.setEnabled(true);
    const results2 = ruleEngine.evaluate('disabled_test', {});
    assert.strictEqual(results2.length, 1);
  });

  // Test 17: action receives eventBus
  it('should pass eventBus to action function', () => {
    let receivedBus = null;
    ruleEngine.addRule({
      event: 'bus_test',
      condition: () => true,
      action: (data, eventBus) => {
        receivedBus = eventBus;
        return 'done';
      },
    });

    ruleEngine.evaluate('bus_test', {});
    assert.strictEqual(receivedBus, eventBus);
  });

  // Test 18: getRulesForEvent
  it('should return rules for specific event', () => {
    ruleEngine.addRule({
      event: 'specific_event',
      condition: () => true,
      action: () => {},
    });
    ruleEngine.addRule({
      event: 'other_event',
      condition: () => true,
      action: () => {},
    });

    const rules = ruleEngine.getRulesForEvent('specific_event');
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].event, 'specific_event');
  });

  // Test 19: getStats
  it('should return rule statistics', () => {
    ruleEngine.addRule({
      event: 'stat_test',
      condition: () => true,
      action: () => {},
    });
    ruleEngine.evaluate('stat_test', {});
    ruleEngine.evaluate('stat_test', {});

    const stats = ruleEngine.getStats();
    assert.strictEqual(stats.totalRules, 1);
    assert.strictEqual(stats.enabledRules, 1);
    assert.strictEqual(stats.totalTriggers, 2);
    assert.ok(stats.byEvent.stat_test === 1);
  });

  // Test 20: rule triggerCount increment
  it('should increment triggerCount when rule fires', () => {
    const ruleId = ruleEngine.addRule({
      event: 'count_test',
      condition: () => true,
      action: () => {},
    });

    ruleEngine.evaluate('count_test', {});
    ruleEngine.evaluate('count_test', {});

    const rule = ruleEngine._rules.find(r => r.id === ruleId);
    assert.strictEqual(rule.triggerCount, 2);
  });
});