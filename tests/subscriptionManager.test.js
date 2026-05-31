import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { SubscriptionManager, subscriptionManager } from '../src/game/hooks/subscriptionManager.js';
import { eventBus } from '../src/game/eventBus.js';

describe('SubscriptionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SubscriptionManager();
    eventBus.clearHistory();
  });

  afterEach(() => {
    manager.clear();
  });

  it('should be a singleton export', () => {
    assert.ok(subscriptionManager instanceof SubscriptionManager);
  });

  it('should create a named subscription', () => {
    let callCount = 0;
    
    manager.createSubscription('test_sub', 'dice_roll', () => callCount++);
    
    eventBus.publish('dice_roll', { value: 4 });
    
    assert.strictEqual(callCount, 1);
  });

  it('should cancel subscription by name', () => {
    let callCount = 0;
    
    manager.createSubscription('cancel_me', 'dice_roll', () => callCount++);
    manager.cancelSubscription('cancel_me');
    
    eventBus.publish('dice_roll', {});
    
    assert.strictEqual(callCount, 0);
  });

  it('should cancel all subscriptions for an event type', () => {
    let count1 = 0;
    let count2 = 0;
    
    manager.createSubscription('sub1', 'dice_roll', () => count1++);
    manager.createSubscription('sub2', 'dice_roll', () => count2++);
    manager.createSubscription('sub3', 'player_move', () => count2++);
    
    const cancelled = manager.cancelAll('dice_roll');
    
    assert.strictEqual(cancelled, 2);
    
    eventBus.publish('dice_roll', {});
    eventBus.publish('player_move', {});
    
    assert.strictEqual(count1, 0);
    assert.strictEqual(count2, 1); // Only player_move handler was called
  });

  it('should list all active subscriptions', () => {
    manager.createSubscription('sub1', 'dice_roll', () => {});
    manager.createSubscription('sub2', 'player_move', () => {});
    
    const list = manager.listSubscriptions();
    
    assert.strictEqual(list.length, 2);
    assert.ok(list.some(s => s.name === 'sub1'));
    assert.ok(list.some(s => s.name === 'sub2'));
  });

  it('should pause and resume subscription', () => {
    let callCount = 0;
    
    manager.createSubscription('pause_test', 'dice_roll', () => callCount++);
    
    eventBus.publish('dice_roll', {});
    assert.strictEqual(callCount, 1);
    
    manager.pauseSubscription('pause_test');
    
    eventBus.publish('dice_roll', {});
    assert.strictEqual(callCount, 1); // No change while paused
    
    manager.resumeSubscription('pause_test');
    
    eventBus.publish('dice_roll', {});
    assert.strictEqual(callCount, 2); // Resumed
  });

  it('should check if subscription exists', () => {
    manager.createSubscription('exists_check', 'dice_roll', () => {});
    
    assert.ok(manager.hasSubscription('exists_check'));
    assert.ok(!manager.hasSubscription('non_existent'));
  });

  it('should get subscription info', () => {
    manager.createSubscription('info_test', 'dice_roll', () => {});
    
    const info = manager.getSubscription('info_test');
    
    assert.ok(info);
    assert.strictEqual(info.name, 'info_test');
    assert.strictEqual(info.event, 'dice_roll');
    assert.strictEqual(info.paused, false);
  });

  it('should return null for non-existent subscription info', () => {
    const info = manager.getSubscription('non_existent');
    assert.strictEqual(info, null);
  });

  it('should get subscriptions for event type', () => {
    manager.createSubscription('sub1', 'dice_roll', () => {});
    manager.createSubscription('sub2', 'dice_roll', () => {});
    manager.createSubscription('sub3', 'player_move', () => {});
    
    const subs = manager.getSubscriptionsForEvent('dice_roll');
    
    assert.strictEqual(subs.length, 2);
    assert.ok(subs.includes('sub1'));
    assert.ok(subs.includes('sub2'));
  });

  it('should get total subscription count', () => {
    manager.createSubscription('sub1', 'dice_roll', () => {});
    manager.createSubscription('sub2', 'player_move', () => {});
    manager.createSubscription('sub3', 'turn_change', () => {});
    
    assert.strictEqual(manager.getCount(), 3);
  });

  it('should get active subscription count', () => {
    manager.createSubscription('sub1', 'dice_roll', () => {});
    manager.createSubscription('sub2', 'player_move', () => {});
    manager.createSubscription('sub3', 'turn_change', () => {});
    
    manager.pauseSubscription('sub2');
    
    assert.strictEqual(manager.getActiveCount(), 2);
  });

  it('should clear all subscriptions', () => {
    manager.createSubscription('sub1', 'dice_roll', () => {});
    manager.createSubscription('sub2', 'player_move', () => {});
    
    manager.clear();
    
    assert.strictEqual(manager.getCount(), 0);
  });

  it('should auto-generate name if not provided', () => {
    let callCount = 0;
    const handler = () => callCount++;
    
    const result = manager.createSubscription(null, 'dice_roll', handler);
    
    assert.ok(result.name.startsWith('sub_'));
    assert.strictEqual(callCount, 0);
    
    eventBus.publish('dice_roll', {});
    assert.strictEqual(callCount, 1);
  });

  it('should replace existing subscription with same name', () => {
    let count1 = 0;
    let count2 = 0;
    
    manager.createSubscription('replaced', 'dice_roll', () => count1++);
    manager.createSubscription('replaced', 'player_move', () => count2++);
    
    eventBus.publish('dice_roll', {});
    eventBus.publish('player_move', {});
    
    assert.strictEqual(count1, 0); // Original handler replaced
    assert.strictEqual(count2, 1);
  });

  it('should return false when cancelling non-existent subscription', () => {
    const result = manager.cancelSubscription('non_existent');
    assert.strictEqual(result, false);
  });

  it('should return false when pausing non-existent subscription', () => {
    const result = manager.pauseSubscription('non_existent');
    assert.strictEqual(result, false);
  });

  it('should return false when resuming non-paused subscription', () => {
    manager.createSubscription('not_paused', 'dice_roll', () => {});
    
    const result = manager.resumeSubscription('not_paused');
    assert.strictEqual(result, false);
  });
});