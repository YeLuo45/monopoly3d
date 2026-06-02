import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ChannelManager } from '../../src/game/ai/bus/channelManager.js';
import { MessageBus } from '../../src/game/ai/bus/messageBus.js';

describe('ChannelManager', () => {
  let messageBus;
  let channelManager;

  beforeEach(() => {
    messageBus = new MessageBus();
    channelManager = new ChannelManager(messageBus);
  });

  describe('createChannel', () => {
    it('should create a new channel', () => {
      const result = channelManager.createChannel('test_channel');

      assert.strictEqual(result.channelId, 'test_channel');
      assert.ok(result.createdAt);
      assert.strictEqual(result.config.maxHistory, 100);
    });

    it('should create channel with custom config', () => {
      const result = channelManager.createChannel('custom', {
        maxHistory: 50,
        allowBroadcast: false
      });

      assert.strictEqual(result.config.maxHistory, 50);
      assert.strictEqual(result.config.allowBroadcast, false);
    });

    it('should throw if channel already exists', () => {
      channelManager.createChannel('dup_channel');
      assert.throws(() => {
        channelManager.createChannel('dup_channel');
      }, /already exists/);
    });
  });

  describe('deleteChannel', () => {
    it('should delete existing channel', () => {
      channelManager.createChannel('to_delete');
      
      const result = channelManager.deleteChannel('to_delete');
      
      assert.strictEqual(result, true);
      assert.strictEqual(channelManager.hasChannel('to_delete'), false);
    });

    it('should return false for non-existent channel', () => {
      const result = channelManager.deleteChannel('nonexistent');
      assert.strictEqual(result, false);
    });

    it('should unsubscribe all agents on delete', () => {
      channelManager.createChannel('channel');
      messageBus.subscribe('channel', 'agent1', () => {});
      messageBus.subscribe('channel', 'agent2', () => {});

      channelManager.deleteChannel('channel');

      assert.strictEqual(messageBus.isSubscribed('channel', 'agent1'), false);
      assert.strictEqual(messageBus.isSubscribed('channel', 'agent2'), false);
    });
  });

  describe('getChannels', () => {
    it('should return all channel IDs', () => {
      channelManager.createChannel('ch1');
      channelManager.createChannel('ch2');
      channelManager.createChannel('ch3');

      const channels = channelManager.getChannels();

      assert.strictEqual(channels.length, 3);
      assert.ok(channels.includes('ch1'));
      assert.ok(channels.includes('ch2'));
      assert.ok(channels.includes('ch3'));
    });

    it('should return empty array when no channels', () => {
      const channels = channelManager.getChannels();
      assert.strictEqual(channels.length, 0);
    });
  });

  describe('getChannelSubscribers', () => {
    it('should return subscribers for channel', () => {
      channelManager.createChannel('subs_channel');
      messageBus.subscribe('subs_channel', 'agent1', () => {});
      messageBus.subscribe('subs_channel', 'agent2', () => {});

      const subscribers = channelManager.getChannelSubscribers('subs_channel');

      assert.strictEqual(subscribers.length, 2);
    });

    it('should return empty array for non-existent channel', () => {
      const subscribers = channelManager.getChannelSubscribers('nonexistent');
      assert.strictEqual(subscribers.length, 0);
    });
  });

  describe('channel policies', () => {
    it('should set and get channel policy', () => {
      channelManager.createChannel('policy_channel');

      const policy = {
        type: 'filtered',
        retention: 200,
        filter: { keyword: 'test' }
      };

      channelManager.setChannelPolicy('policy_channel', policy);
      const retrieved = channelManager.getChannelPolicy('policy_channel');

      assert.strictEqual(retrieved.type, 'filtered');
      assert.strictEqual(retrieved.retention, 200);
      assert.strictEqual(retrieved.filter.keyword, 'test');
    });

    it('should return null for non-existent channel policy', () => {
      const policy = channelManager.getChannelPolicy('nonexistent');
      assert.strictEqual(policy, null);
    });
  });

  describe('channel history', () => {
    it('should get channel history', () => {
      channelManager.createChannel('history_channel');

      // Record some messages via the message bus
      messageBus.publish('history_channel', { data: 'msg1' });
      messageBus.publish('history_channel', { data: 'msg2' });

      const history = channelManager.getChannelHistory('history_channel', 10);
      assert.ok(Array.isArray(history));
    });

    it('should return empty for non-existent channel history', () => {
      const history = channelManager.getChannelHistory('nonexistent');
      assert.strictEqual(history.length, 0);
    });
  });

  describe('channel statistics', () => {
    it('should get channel stats', () => {
      channelManager.createChannel('stats_channel');
      messageBus.subscribe('stats_channel', 'agent1', () => {});
      messageBus.subscribe('stats_channel', 'agent2', () => {});

      const stats = channelManager.getChannelStats('stats_channel');

      assert.strictEqual(stats.channelId, 'stats_channel');
      assert.strictEqual(stats.subscriberCount, 2);
      assert.ok(stats.createdAt);
    });

    it('should get all channel stats', () => {
      channelManager.createChannel('all_stats1');
      channelManager.createChannel('all_stats2');

      const allStats = channelManager.getAllChannelStats();
      assert.strictEqual(allStats.length, 2);
    });

    it('should return null for non-existent channel stats', () => {
      const stats = channelManager.getChannelStats('nonexistent');
      assert.strictEqual(stats, null);
    });
  });

  describe('channel config update', () => {
    it('should update channel config', () => {
      channelManager.createChannel('update_channel');

      const updated = channelManager.updateChannelConfig('update_channel', {
        maxHistory: 75,
        persistent: true
      });

      assert.strictEqual(updated, true);
      assert.strictEqual(channelManager.getChannelConfig('update_channel').maxHistory, 75);
      assert.strictEqual(channelManager.getChannelConfig('update_channel').persistent, true);
    });
  });

  describe('clear history', () => {
    it('should clear channel history', () => {
      channelManager.createChannel('clear_channel');
      messageBus.publish('clear_channel', { data: 'msg' });

      const cleared = channelManager.clearChannelHistory('clear_channel');
      assert.strictEqual(cleared, true);

      const history = channelManager.getChannelHistory('clear_channel');
      assert.strictEqual(history.length, 0);
    });
  });
});