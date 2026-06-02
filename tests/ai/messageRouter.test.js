import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageRouter } from '../../src/game/ai/bus/messageRouter.js';
import { MessageBus } from '../../src/game/ai/bus/messageBus.js';

describe('MessageRouter', () => {
  let messageBus;
  let router;

  beforeEach(() => {
    messageBus = new MessageBus();
    router = new MessageRouter(messageBus);
  });

  describe('addRoute', () => {
    it('should add a channel route', () => {
      const remove = router.addRoute('test_type', { channel: 'output_channel' });
      assert.ok(typeof remove === 'function');
      assert.ok(router.hasRoute('test_type'));
    });

    it('should add an agent route', () => {
      router.addRoute('direct_type', { agent: 'target_agent' });
      assert.ok(router.hasRoute('direct_type'));
    });

    it('should add multiple destinations for same pattern', () => {
      router.addRoute('multi_type', { channel: 'ch1' });
      router.addRoute('multi_type', { channel: 'ch2' });

      const table = router.getRoutingTable();
      const rule = table.rules.find(r => r.pattern === 'multi_type');
      assert.strictEqual(rule.destinations.length, 2);
    });

    it('should return remove function', () => {
      const remove = router.addRoute('removable', { channel: 'test' });
      assert.strictEqual(router.getRouteCount(), 1);

      remove();
      assert.strictEqual(router.getRouteCount(), 0);
    });
  });

  describe('removeRoute', () => {
    it('should remove specific route', () => {
      router.addRoute('remove_test', { channel: 'ch1' });
      router.addRoute('remove_test', { channel: 'ch2' });

      router.removeRoute('remove_test', { channel: 'ch1' });

      const table = router.getRoutingTable();
      const rule = table.rules.find(r => r.pattern === 'remove_test');
      assert.strictEqual(rule.destinations.length, 1);
    });

    it('should remove all routes for pattern when no destination specified', () => {
      router.addRoute('remove_all', { channel: 'ch1' });
      router.addRoute('remove_all', { channel: 'ch2' });

      router.removeRoute('remove_all');

      assert.strictEqual(router.hasRoute('remove_all'), false);
    });

    it('should return false for non-existent pattern', () => {
      const result = router.removeRoute('nonexistent', { channel: 'test' });
      assert.strictEqual(result, false);
    });
  });

  describe('default route', () => {
    it('should set default route', () => {
      router.setDefaultRoute({ channel: 'default_channel' });
      assert.ok(router.getRoutingTable().defaultRoute);
    });

    it('should clear default route', () => {
      router.setDefaultRoute({ channel: 'default_channel' });
      router.clearDefaultRoute();
      assert.strictEqual(router.getRoutingTable().defaultRoute, null);
    });

    it('should use default route when no pattern matches', () => {
      router.setDefaultRoute({ channel: 'fallback' });

      let count = 0;
      messageBus.subscribe('fallback', 'agent1', () => count++);

      router.routeMessage({ type: 'unmatched', payload: {} });

      assert.strictEqual(count, 1);
    });
  });

  describe('routeMessage', () => {
    it('should route to matching channel', () => {
      router.addRoute('route_test', { channel: 'target_channel' });

      let received = null;
      messageBus.subscribe('target_channel', 'agent1', (msg) => {
        received = msg;
      });

      router.routeMessage({ type: 'route_test', payload: { data: 'test' } });

      assert.ok(received);
      assert.strictEqual(received.payload.data, 'test');
    });

    it('should route to matching agent', () => {
      router.addRoute('direct_msg', { agent: 'target_agent' });

      router.routeMessage({ type: 'direct_msg', payload: { data: 'direct' } });

      const messages = messageBus.getMessages('target_agent');
      assert.strictEqual(messages.length, 1);
    });

    it('should route based on payload type', () => {
      router.addRoute('action_type', { channel: 'action_channel' });

      let count = 0;
      messageBus.subscribe('action_channel', 'agent1', () => count++);

      router.routeMessage({
        type: 'some_type',
        payload: { type: 'action_type', data: 'test' }
      });

      assert.strictEqual(count, 1);
    });

    it('should support wildcard patterns', () => {
      router.addRoute('*_event', { channel: 'event_channel' });

      let count = 0;
      messageBus.subscribe('event_channel', 'agent1', () => count++);

      router.routeMessage({
        type: 'move_event',
        payload: { data: 'test' }
      });

      assert.strictEqual(count, 1);
    });

    it('should return empty array when no routes match and no default', () => {
      const results = router.routeMessage({ type: 'unmatched' });
      assert.strictEqual(results.length, 0);
    });

    it('should track routing statistics', () => {
      router.addRoute('stat_type', { channel: 'stat_channel' });
      messageBus.subscribe('stat_channel', 'agent1', () => {});

      router.routeMessage({ type: 'stat_type', payload: {} });

      const stats = router.getStats();
      assert.strictEqual(stats.totalRouted, 1);
      assert.strictEqual(stats.patternMatches, 1);
    });
  });

  describe('getRoutingTable', () => {
    it('should return full routing table', () => {
      router.addRoute('pattern1', { channel: 'ch1' });
      router.addRoute('pattern2', { agent: 'agent1' });

      const table = router.getRoutingTable();

      assert.ok(Array.isArray(table.rules));
      assert.strictEqual(table.rules.length, 2);
      assert.ok(table.defaultRoute === null || typeof table.defaultRoute === 'object');
      assert.ok(typeof table.stats === 'object');
    });
  });

  describe('clearRoutes', () => {
    it('should clear all routes', () => {
      router.addRoute('clear1', { channel: 'ch1' });
      router.addRoute('clear2', { agent: 'agent1' });
      router.setDefaultRoute({ channel: 'default' });

      router.clearRoutes();

      assert.strictEqual(router.getRouteCount(), 0);
      assert.strictEqual(router.getRoutingTable().defaultRoute, null);
    });
  });

  describe('pattern matching', () => {
    it('should match on message type', () => {
      router.addRoute('type_match', { channel: 'matched' });

      let count = 0;
      messageBus.subscribe('matched', 'agent1', () => count++);

      router.routeMessage({ type: 'type_match' });
      assert.strictEqual(count, 1);
    });

    it('should match on payload.action', () => {
      router.addRoute('buy_action', { channel: 'action_ch' });

      let count = 0;
      messageBus.subscribe('action_ch', 'agent1', () => count++);

      router.routeMessage({
        type: 'game_action',
        payload: { action: 'buy_action' }
      });

      assert.strictEqual(count, 1);
    });

    it('should match on payload.target', () => {
      router.addRoute('player1', { channel: 'player_channel' });

      let count = 0;
      messageBus.subscribe('player_channel', 'agent1', () => count++);

      router.routeMessage({
        type: 'game_event',
        payload: { target: 'player1' }
      });

      assert.strictEqual(count, 1);
    });
  });
});