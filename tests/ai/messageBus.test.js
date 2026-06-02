import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { MessageBus, messageBus } from '../../src/game/ai/bus/messageBus.js';

describe('MessageBus', () => {
  let bus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  afterEach(() => {
    bus.reset();
  });

  describe('publish and subscribe', () => {
    it('should publish message to channel', () => {
      let received = null;
      bus.subscribe('test_channel', 'agent1', (msg) => {
        received = msg;
      });

      bus.publish('test_channel', { data: 'hello' });

      assert.ok(received);
      assert.strictEqual(received.channel, 'test_channel');
      assert.strictEqual(received.payload.data, 'hello');
    });

    it('should return correct subscriber count on publish', () => {
      bus.subscribe('channel1', 'agent1', () => {});
      bus.subscribe('channel1', 'agent2', () => {});
      bus.subscribe('channel1', 'agent3', () => {});

      const count = bus.publish('channel1', { data: 'test' });
      assert.strictEqual(count, 3);
    });

    it('should notify all subscribers', () => {
      let count1 = 0;
      let count2 = 0;

      bus.subscribe('channel', 'agent1', () => count1++);
      bus.subscribe('channel', 'agent2', () => count2++);

      bus.publish('channel', { data: 'test' });

      assert.strictEqual(count1, 1);
      assert.strictEqual(count2, 1);
    });

    it('should return 0 for empty channel publish', () => {
      const count = bus.publish('nonexistent', { data: 'test' });
      assert.strictEqual(count, 0);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe agent from channel', () => {
      let callCount = 0;
      const handler = () => callCount++;

      bus.subscribe('channel', 'agent1', handler);
      bus.publish('channel', { data: 'test' });
      assert.strictEqual(callCount, 1);

      bus.unsubscribe('channel', 'agent1');
      bus.publish('channel', { data: 'test' });
      assert.strictEqual(callCount, 1);
    });

    it('should return false when unsubscribing non-subscriber', () => {
      const result = bus.unsubscribe('channel', 'nonexistent');
      assert.strictEqual(result, false);
    });
  });

  describe('direct messaging', () => {
    it('should send direct message to agent', () => {
      bus.send('agent2', 'agent1', { data: 'direct message' });

      const messages = bus.getMessages('agent2');
      assert.strictEqual(messages.length, 1);
      assert.strictEqual(messages[0].from, 'agent1');
      assert.strictEqual(messages[0].payload.data, 'direct message');
    });

    it('should get messages for agent', () => {
      bus.send('agent1', 'agent2', { data: 'msg1' });
      bus.send('agent1', 'agent3', { data: 'msg2' });

      const messages = bus.getMessages('agent1');
      assert.strictEqual(messages.length, 2);
    });

    it('should filter unread messages', () => {
      bus.send('agent1', 'agent2', { data: 'msg1' });
      bus.send('agent1', 'agent3', { data: 'msg2' });

      const unread = bus.getMessages('agent1', true);
      assert.strictEqual(unread.length, 2);
      assert.strictEqual(unread[0].read, true);
    });

    it('should mark messages as read', () => {
      bus.send('agent1', 'agent2', { data: 'msg1' });

      bus.getMessages('agent1');
      const unreadCount = bus.getUnreadCount('agent1');
      assert.strictEqual(unreadCount, 0);
    });
  });

  describe('channel management', () => {
    it('should list all channels', () => {
      bus.subscribe('channel1', 'agent1', () => {});
      bus.subscribe('channel2', 'agent1', () => {});
      bus.subscribe('channel3', 'agent1', () => {});

      const channels = bus.getChannelList();
      assert.strictEqual(channels.length, 3);
    });

    it('should get subscribers for channel', () => {
      bus.subscribe('channel', 'agent1', () => {});
      bus.subscribe('channel', 'agent2', () => {});

      const subscribers = bus.getSubscribers('channel');
      assert.strictEqual(subscribers.length, 2);
      assert.ok(subscribers.includes('agent1'));
      assert.ok(subscribers.includes('agent2'));
    });

    it('should check subscription status', () => {
      bus.subscribe('channel', 'agent1', () => {});

      assert.strictEqual(bus.isSubscribed('channel', 'agent1'), true);
      assert.strictEqual(bus.isSubscribed('channel', 'agent2'), false);
    });
  });

  describe('broadcast to multiple channels', () => {
    it('should publish to multiple channels', () => {
      let count1 = 0;
      let count2 = 0;

      bus.subscribe('channel1', 'agent1', () => count1++);
      bus.subscribe('channel2', 'agent2', () => count2++);

      const results = bus.publishMulti(['channel1', 'channel2'], { data: 'multi' });

      assert.strictEqual(results.channel1, 1);
      assert.strictEqual(results.channel2, 1);
      assert.strictEqual(count1, 1);
      assert.strictEqual(count2, 1);
    });
  });

  describe('message history', () => {
    it('should track message history', () => {
      bus.publish('channel', { data: 'test' });
      bus.send('agent1', 'agent2', { data: 'direct' });

      const history = bus.getHistory(10);
      assert.ok(history.length >= 2);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 1005; i++) {
        bus.publish('channel', { index: i });
      }

      const history = bus.getHistory();
      assert.ok(history.length <= 1000);
    });
  });

  describe('clear messages', () => {
    it('should clear all messages for agent', () => {
      bus.send('agent1', 'agent2', { data: 'msg1' });
      bus.send('agent1', 'agent3', { data: 'msg2' });

      bus.clearMessages('agent1');

      const messages = bus.getMessages('agent1');
      assert.strictEqual(messages.length, 0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      bus.subscribe('channel', 'agent1', () => {});
      bus.send('agent1', 'agent2', { data: 'msg' });

      bus.reset();

      assert.strictEqual(bus.channels.size, 0);
      assert.strictEqual(bus.directMessages.size, 0);
      assert.strictEqual(bus.messageHistory.length, 0);
    });
  });

  describe('singleton', () => {
    it('should export singleton instance', () => {
      assert.ok(messageBus instanceof MessageBus);
    });
  });
});