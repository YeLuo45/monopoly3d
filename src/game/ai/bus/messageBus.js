/**
 * MessageBus - Inter-Agent Message Passing System
 * 
 * Provides pub/sub messaging for AI agents with support for:
 * - Channel-based broadcasting
 * - Direct agent-to-agent messaging
 * - Message queuing and retrieval
 */

export class MessageBus {
  constructor() {
    // Channel subscriptions: channelId -> Map<agentId, handler>
    this.channels = new Map();
    
    // Direct messages: agentId -> Message[]
    this.directMessages = new Map();
    
    // Message metadata
    this.messageId = 0;
    this.messageHistory = [];
  }

  /**
   * Publish a message to a channel (broadcast to all subscribers)
   * @param {string} channel - Channel name
   * @param {object} message - Message payload
   * @returns {number} Number of subscribers notified
   */
  publish(channel, message) {
    const msg = {
      id: ++this.messageId,
      type: 'broadcast',
      channel,
      payload: message,
      timestamp: Date.now()
    };

    this._addToHistory(msg);

    let notifiedCount = 0;
    const subscribers = this.channels.get(channel);

    if (subscribers) {
      for (const [agentId, handler] of subscribers) {
        try {
          handler(msg);
          notifiedCount++;
        } catch (error) {
          console.error(`MessageBus: Handler error for agent ${agentId} on channel ${channel}:`, error);
        }
      }
    }

    return notifiedCount;
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   * @param {string} agentId - Agent identifier
   * @param {function} handler - Message handler function
   * @returns {function} Unsubscribe function
   */
  subscribe(channel, agentId, handler) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Map());
    }

    const subscribers = this.channels.get(channel);
    subscribers.set(agentId, handler);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, agentId);
    };
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   * @param {string} agentId - Agent identifier
   * @returns {boolean} True if unsubscribed successfully
   */
  unsubscribe(channel, agentId) {
    const subscribers = this.channels.get(channel);

    if (subscribers && subscribers.has(agentId)) {
      subscribers.delete(agentId);
      
      // Clean up empty channels
      if (subscribers.size === 0) {
        this.channels.delete(channel);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Send a direct message to a specific agent
   * @param {string} toAgent - Target agent ID
   * @param {string} fromAgent - Source agent ID
   * @param {object} message - Message payload
   * @returns {object} Message envelope
   */
  send(toAgent, fromAgent, message) {
    const msg = {
      id: ++this.messageId,
      type: 'direct',
      to: toAgent,
      from: fromAgent,
      payload: message,
      timestamp: Date.now(),
      read: false
    };

    this._addToHistory(msg);

    // Add to recipient's message queue
    if (!this.directMessages.has(toAgent)) {
      this.directMessages.set(toAgent, []);
    }

    this.directMessages.get(toAgent).push(msg);

    return msg;
  }

  /**
   * Get messages for an agent
   * @param {string} agentId - Agent identifier
   * @param {boolean} unreadOnly - If true, return only unread messages
   * @returns {object[]} Array of messages
   */
  getMessages(agentId, unreadOnly = false) {
    const messages = this.directMessages.get(agentId) || [];

    if (unreadOnly) {
      return messages.filter(msg => !msg.read).map(msg => {
        msg.read = true;
        return msg;
      });
    }

    // Mark all as read
    messages.forEach(msg => {
      msg.read = true;
    });

    return [...messages];
  }

  /**
   * Get count of unread messages for an agent
   * @param {string} agentId - Agent identifier
   * @returns {number} Unread message count
   */
  getUnreadCount(agentId) {
    const messages = this.directMessages.get(agentId) || [];
    return messages.filter(msg => !msg.read).length;
  }

  /**
   * Clear all messages for an agent
   * @param {string} agentId - Agent identifier
   */
  clearMessages(agentId) {
    this.directMessages.delete(agentId);
  }

  /**
   * Get list of channels with subscriber count
   * @returns {object[]} Array of channel info
   */
  getChannelList() {
    const result = [];
    
    for (const [channelId, subscribers] of this.channels) {
      result.push({
        channel: channelId,
        subscriberCount: subscribers.size
      });
    }
    
    return result;
  }

  /**
   * Get all subscribers for a channel
   * @param {string} channel - Channel name
   * @returns {string[]} Array of agent IDs
   */
  getSubscribers(channel) {
    const subscribers = this.channels.get(channel);
    
    if (!subscribers) {
      return [];
    }
    
    return Array.from(subscribers.keys());
  }

  /**
   * Check if agent is subscribed to a channel
   * @param {string} channel - Channel name
   * @param {string} agentId - Agent identifier
   * @returns {boolean}
   */
  isSubscribed(channel, agentId) {
    const subscribers = this.channels.get(channel);
    return subscribers ? subscribers.has(agentId) : false;
  }

  /**
   * Broadcast a message to multiple channels
   * @param {string[]} channels - Array of channel names
   * @param {object} message - Message payload
   * @returns {object} Results per channel
   */
  publishMulti(channels, message) {
    const results = {};

    for (const channel of channels) {
      results[channel] = this.publish(channel, message);
    }

    return results;
  }

  /**
   * Add message to history
   * @param {object} msg - Message to store
   * @private
   */
  _addToHistory(msg) {
    this.messageHistory.push(msg);

    // Keep history limited to last 1000 messages
    if (this.messageHistory.length > 1000) {
      this.messageHistory.shift();
    }
  }

  /**
   * Get message history
   * @param {number} count - Max messages to return
   * @returns {object[]} Historical messages
   */
  getHistory(count = 100) {
    return this.messageHistory.slice(-count);
  }

  /**
   * Clear all data (for testing)
   */
  reset() {
    this.channels.clear();
    this.directMessages.clear();
    this.messageHistory = [];
    this.messageId = 0;
  }
}

// Singleton instance
export const messageBus = new MessageBus();