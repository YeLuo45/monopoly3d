/**
 * EventFilter Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'assert';

// Import EventBus and EventFilter
import { EventBus } from '../src/game/eventBus.js';
import { EventFilter } from '../src/game/hooks/eventFilter.js';

describe('EventFilter', () => {
  let eventBus;
  let eventFilter;

  beforeEach(() => {
    eventBus = new EventBus();
    eventFilter = new EventFilter(eventBus);
  });

  afterEach(() => {
    eventBus.clearHistory();
  });

  // Test 1: Constructor
  it('should wrap eventBus on construction', () => {
    assert.ok(eventFilter._eventBus === eventBus);
  });

  // Test 2: addRule - basic filter rule
  it('should add filter rule and return ruleId', () => {
    const ruleId = eventFilter.addRule('test_event', (data) => data.value > 10);
    assert.ok(typeof ruleId === 'string');
    assert.ok(ruleId.startsWith('ef_rule_'));
  });

  // Test 3: addTransform - basic transform rule
  it('should add transform rule and return ruleId', () => {
    const ruleId = eventFilter.addTransform('test_event', (data) => ({
      ...data,
      transformed: true,
    }));
    assert.ok(typeof ruleId === 'string');
    assert.ok(ruleId.startsWith('ef_rule_'));
  });

  // Test 4: publishFiltered - events pass through rules
  it('should filter events based on rules', () => {
    let received = false;
    eventFilter.subscribe('filtered_event', () => {
      received = true;
    });

    // Add filter that blocks
    eventFilter.addRule('filtered_event', () => false);

    const result = eventFilter.publishFiltered('filtered_event', { value: 100 });
    assert.strictEqual(result, false);
    assert.strictEqual(received, false);
  });

  // Test 5: publishFiltered - passing event
  it('should allow events that pass filter', () => {
    let receivedData = null;
    eventFilter.subscribe('pass_event', (e) => {
      receivedData = e.detail;
    });

    eventFilter.addRule('pass_event', (data) => data.value > 10);

    const result = eventFilter.publishFiltered('pass_event', { value: 100 });
    assert.strictEqual(result, true);
    assert.strictEqual(receivedData.value, 100);
  });

  // Test 6: Transform rule modifies data
  it('should transform data before publishing', () => {
    let receivedData = null;
    eventFilter.subscribe('transform_event', (e) => {
      receivedData = e.detail;
    });

    eventFilter.addTransform('transform_event', (data) => ({
      ...data,
      modified: true,
    }));

    eventFilter.publishFiltered('transform_event', { original: true });
    assert.strictEqual(receivedData.original, true);
    assert.strictEqual(receivedData.modified, true);
  });

  // Test 7: Multiple transforms chain
  it('should chain multiple transforms', () => {
    let receivedData = null;
    eventFilter.subscribe('chained_event', (e) => {
      receivedData = e.detail;
    });

    eventFilter.addTransform('chained_event', (data) => ({ ...data, step1: 1 }));
    eventFilter.addTransform('chained_event', (data) => ({ ...data, step2: 2 }));

    eventFilter.publishFiltered('chained_event', {});
    assert.strictEqual(receivedData.step1, 1);
    assert.strictEqual(receivedData.step2, 2);
  });

  // Test 8: removeRule
  it('should remove a rule by ID', () => {
    eventFilter.addRule('remove_event', () => false);
    const ruleId = eventFilter.addRule('remove_event', () => true);

    assert.strictEqual(eventFilter.getRules('remove_event').length, 2);

    const removed = eventFilter.removeRule('remove_event', ruleId);
    assert.strictEqual(removed, true);
    assert.strictEqual(eventFilter.getRules('remove_event').length, 1);
  });

  // Test 9: getRules
  it('should return all rules for an event type', () => {
    eventFilter.addRule('list_event', () => true);
    eventFilter.addRule('list_event', () => true);

    const rules = eventFilter.getRules('list_event');
    assert.strictEqual(rules.length, 2);
  });

  // Test 10: clearRules
  it('should clear all rules for an event type', () => {
    eventFilter.addRule('clear_event', () => true);
    eventFilter.addTransform('clear_event', () => ({}));

    eventFilter.clearRules('clear_event');

    assert.strictEqual(eventFilter.getRules('clear_event').length, 0);
    assert.strictEqual(eventFilter.getTransformCount('clear_event'), 0);
  });

  // Test 11: subscribe/unsubscribe
  it('should allow subscribing to events', () => {
    let count = 0;
    const unsub = eventFilter.subscribe('sub_event', () => {
      count++;
    });

    eventFilter.publishFiltered('sub_event', {});
    eventFilter.publishFiltered('sub_event', {});

    assert.strictEqual(count, 2);

    unsub();
    eventFilter.publishFiltered('sub_event', {});
    assert.strictEqual(count, 2);
  });

  // Test 12: hasRules
  it('should check if event type has rules', () => {
    assert.strictEqual(eventFilter.hasRules('no_rules'), false);

    eventFilter.addRule('has_rules', () => true);
    assert.strictEqual(eventFilter.hasRules('has_rules'), true);
  });

  // Test 13: Filter error doesn't block other filters
  it('should handle filter errors gracefully', () => {
    let received = false;
    eventFilter.subscribe('error_filter_event', () => {
      received = true;
    });

    eventFilter.addRule('error_filter_event', () => {
      throw new Error('Filter error');
    });
    eventFilter.addRule('error_filter_event', () => true);

    const result = eventFilter.publishFiltered('error_filter_event', {});
    assert.strictEqual(result, true);
    assert.strictEqual(received, true);
  });
});