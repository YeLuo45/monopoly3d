/**
 * ChannelManager - Manage Message Channels
 * 
 * Provides channel lifecycle management, policies, and history
 * for the inter-agent message bus system.
 */

export class ChannelManager {
  /**
   * @param {MessageBus} messageBus - Associated message bus instance
   */
  constructor(messageBus) {
    this.messageBus = messageBus;
    
    // Channel configurations: channelId -> config
    this.channelConfigs = new Map();
    
    // Channel policies: channelId -> policy
    this.channelPolicies = new Map();
    
    // Channel message history: channelId -> messages[]
    this.channelHistory = new Map();
    
    // Default configuration
    this.defaultConfig = {
      maxHistory: 100,
      allowBroadcast: true,
      allowDirect: true,
      persistent: false
    };
  }

  /**
   * Create a new channel
   * @param {string} channelId - Unique channel identifier
   * @param {object} config - Channel configuration
   * @returns {object} Channel info
   */
  createChannel(channelId, config = {}) {
    if (this.channelConfigs.has(channelId)) {
      throw new Error(`Channel ${channelId} already exists`);
    }

    const mergedConfig = {
      ...this.defaultConfig,
      ...config,
      createdAt: Date.now()
    };

    this.channelConfigs.set(channelId, mergedConfig);
    this.channelHistory.set(channelId, []);

    // Set default policy
    if (!this.channelPolicies.has(channelId)) {
      this.channelPolicies.set(channelId, {
        type: 'broadcast',
        retention: mergedConfig.maxHistory,
        filter: null
      });
    }

    return {
      channelId,
      config: mergedConfig,
      createdAt: mergedConfig.createdAt
    };
  }

  /**
   * Delete a channel
   * @param {string} channelId - Channel to delete
   * @returns {boolean} True if deleted
   */
  deleteChannel(channelId) {
    if (!this.channelConfigs.has(channelId)) {
      return false;
    }

    // Unsubscribe all agents from this channel
    const subscribers = this.messageBus.getSubscribers(channelId);
    for (const agentId of subscribers) {
      this.messageBus.unsubscribe(channelId, agentId);
    }

    // Clean up
    this.channelConfigs.delete(channelId);
    this.channelPolicies.delete(channelId);
    this.channelHistory.delete(channelId);

    return true;
  }

  /**
   * Get channel configuration
   * @param {string} channelId - Channel identifier
   * @returns {object|null} Channel config or null
   */
  getChannelConfig(channelId) {
    return this.channelConfigs.get(channelId) || null;
  }

  /**
   * Get all channel IDs
   * @returns {string[]} Array of channel IDs
   */
  getChannels() {
    return Array.from(this.channelConfigs.keys());
  }

  /**
   * Get subscribers for a channel
   * @param {string} channelId - Channel identifier
   * @returns {string[]} Array of agent IDs
   */
  getChannelSubscribers(channelId) {
    if (!this.channelConfigs.has(channelId)) {
      return [];
    }

    return this.messageBus.getSubscribers(channelId);
  }

  /**
   * Set channel policy
   * @param {string} channelId - Channel identifier
   * @param {object} policy - Policy configuration
   * @returns {boolean} True if set successfully
   */
  setChannelPolicy(channelId, policy) {
    if (!this.channelConfigs.has(channelId)) {
      return false;
    }

    const currentPolicy = this.channelPolicies.get(channelId) || {};
    
    this.channelPolicies.set(channelId, {
      ...currentPolicy,
      ...policy,
      updatedAt: Date.now()
    });

    return true;
  }

  /**
   * Get channel policy
   * @param {string} channelId - Channel identifier
   * @returns {object|null} Policy or null
   */
  getChannelPolicy(channelId) {
    return this.channelPolicies.get(channelId) || null;
  }

  /**
   * Get channel message history
   * @param {string} channelId - Channel identifier
   * @param {number} count - Max messages to return
   * @returns {object[]} Array of historical messages
   */
  getChannelHistory(channelId, count = 50) {
    if (!this.channelConfigs.has(channelId)) {
      return [];
    }

    const history = this.channelHistory.get(channelId) || [];
    return history.slice(-count);
  }

  /**
   * Add message to channel history
   * @param {string} channelId - Channel identifier
   * @param {object} message - Message to record
   * @private
   */
  recordMessage(channelId, message) {
    const config = this.channelConfigs.get(channelId);
    if (!config) return;

    let history = this.channelHistory.get(channelId);
    if (!history) {
      history = [];
      this.channelHistory.set(channelId, history);
    }

    history.push({
      ...message,
      recordedAt: Date.now()
    });

    // Trim history if needed
    const maxHistory = config.maxHistory || 100;
    while (history.length > maxHistory) {
      history.shift();
    }
  }

  /**
   * Check if channel exists
   * @param {string} channelId - Channel identifier
   * @returns {boolean}
   */
  hasChannel(channelId) {
    return this.channelConfigs.has(channelId);
  }

  /**
   * Get channel statistics
   * @param {string} channelId - Channel identifier
   * @returns {object} Statistics object
   */
  getChannelStats(channelId) {
    const config = this.channelConfigs.get(channelId);
    if (!config) {
      return null;
    }

    const subscribers = this.messageBus.getSubscribers(channelId);
    const history = this.channelHistory.get(channelId) || [];

    return {
      channelId,
      subscriberCount: subscribers.length,
      messageCount: history.length,
      createdAt: config.createdAt,
      config: {
        maxHistory: config.maxHistory,
        allowBroadcast: config.allowBroadcast,
        allowDirect: config.allowDirect,
        persistent: config.persistent
      }
    };
  }

  /**
   * Get all channel statistics
   * @returns {object[]} Array of statistics
   */
  getAllChannelStats() {
    const stats = [];

    for (const channelId of this.channelConfigs.keys()) {
      stats.push(this.getChannelStats(channelId));
    }

    return stats;
  }

  /**
   * Clear channel history
   * @param {string} channelId - Channel identifier
   * @returns {boolean} True if cleared
   */
  clearChannelHistory(channelId) {
    if (!this.channelConfigs.has(channelId)) {
      return false;
    }

    this.channelHistory.set(channelId, []);
    return true;
  }

  /**
   * Update channel configuration
   * @param {string} channelId - Channel identifier
   * @param {object} updates - Config updates
   * @returns {boolean} True if updated
   */
  updateChannelConfig(channelId, updates) {
    const config = this.channelConfigs.get(channelId);
    if (!config) {
      return false;
    }

    // Don't allow updating certain fields
    delete updates.createdAt;
    delete updates.channelId;

    this.channelConfigs.set(channelId, {
      ...config,
      ...updates,
      updatedAt: Date.now()
    });

    return true;
  }
}