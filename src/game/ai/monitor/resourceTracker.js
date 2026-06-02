/**
 * ResourceTracker - Tracks and manages resource usage for agents
 * Part of Direction D v7: Agent Performance Monitoring System
 */

export class ResourceTracker {
  constructor() {
    // Track usage: Map<agentId, Map<resourceType, { current, limit, history }>>
    this.usage = new Map();
    
    // Resource types
    this.resourceTypes = ['cpu', 'memory', 'network', 'storage', 'apiCalls', 'tokens'];
  }

  /**
   * Track resource usage for an agent
   * @param {string} resourceType - Type of resource (cpu, memory, network, storage, apiCalls, tokens)
   * @param {number} amount - Amount of resource used
   * @param {string} agentId - Agent identifier
   */
  trackUsage(resourceType, amount, agentId) {
    if (!this.resourceTypes.includes(resourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }
    
    if (!this.usage.has(agentId)) {
      this.usage.set(agentId, new Map());
    }
    
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage.has(resourceType)) {
      agentUsage.set(resourceType, {
        current: 0,
        limit: Infinity,
        history: [],
        peak: 0
      });
    }
    
    const resourceData = agentUsage.get(resourceType);
    resourceData.current += amount;
    resourceData.history.push({
      amount,
      timestamp: Date.now()
    });
    
    // Update peak
    if (resourceData.current > resourceData.peak) {
      resourceData.peak = resourceData.current;
    }
    
    // Keep only last 1000 history entries
    if (resourceData.history.length > 1000) {
      resourceData.history.shift();
    }
  }

  /**
   * Get current usage for an agent and resource type
   * @param {string} agentId - Agent identifier
   * @param {string} resourceType - Type of resource
   * @returns {number} Current usage amount
   */
  getUsage(agentId, resourceType) {
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage) {
      return 0;
    }
    
    const resourceData = agentUsage.get(resourceType);
    return resourceData ? resourceData.current : 0;
  }

  /**
   * Set a resource limit for an agent
   * @param {string} agentId - Agent identifier
   * @param {string} resourceType - Type of resource
   * @param {number} limit - Resource limit
   */
  setLimit(agentId, resourceType, limit) {
    if (!this.resourceTypes.includes(resourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }
    
    if (!this.usage.has(agentId)) {
      this.usage.set(agentId, new Map());
    }
    
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage.has(resourceType)) {
      agentUsage.set(resourceType, {
        current: 0,
        limit: limit,
        history: [],
        peak: 0
      });
    } else {
      agentUsage.get(resourceType).limit = limit;
    }
  }

  /**
   * Check if a resource limit is exceeded
   * @param {string} agentId - Agent identifier
   * @param {string} resourceType - Type of resource
   * @returns {Object} Object with exceeded flag and usage details
   */
  checkLimit(agentId, resourceType) {
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage) {
      return { exceeded: false, current: 0, limit: Infinity, percentage: 0 };
    }
    
    const resourceData = agentUsage.get(resourceType);
    if (!resourceData) {
      return { exceeded: false, current: 0, limit: Infinity, percentage: 0 };
    }
    
    const current = resourceData.current;
    const limit = resourceData.limit;
    const exceeded = current > limit;
    const percentage = limit > 0 ? (current / limit) * 100 : 0;
    
    return {
      exceeded,
      current,
      limit,
      percentage,
      overAmount: exceeded ? current - limit : 0
    };
  }

  /**
   * Reset usage for a specific resource
   * @param {string} agentId - Agent identifier
   * @param {string} resourceType - Type of resource (optional, resets all if not provided)
   */
  resetUsage(agentId, resourceType = null) {
    if (resourceType) {
      const agentUsage = this.usage.get(agentId);
      if (agentUsage && agentUsage.has(resourceType)) {
        const resourceData = agentUsage.get(resourceType);
        resourceData.current = 0;
        resourceData.history = [];
      }
    } else {
      if (this.usage.has(agentId)) {
        const agentUsage = this.usage.get(agentId);
        for (const [, resourceData] of agentUsage) {
          resourceData.current = 0;
          resourceData.history = [];
        }
      }
    }
  }

  /**
   * Get usage history for a resource
   * @param {string} agentId - Agent identifier
   * @param {string} resourceType - Type of resource
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Array of history entries
   */
  getHistory(agentId, resourceType, limit = 100) {
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage) {
      return [];
    }
    
    const resourceData = agentUsage.get(resourceType);
    if (!resourceData) {
      return [];
    }
    
    return resourceData.history.slice(-limit);
  }

  /**
   * Get peak usage for a resource
   * @param {string} agentId - Agent identifier
   * @param {string} resourceType - Type of resource
   * @returns {number} Peak usage value
   */
  getPeak(agentId, resourceType) {
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage) {
      return 0;
    }
    
    const resourceData = agentUsage.get(resourceType);
    return resourceData ? resourceData.peak : 0;
  }

  /**
   * Get all resource usage for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Object} Usage summary for all resource types
   */
  getAllUsage(agentId) {
    const agentUsage = this.usage.get(agentId);
    if (!agentUsage) {
      return {};
    }
    
    const result = {};
    for (const [type, data] of agentUsage) {
      result[type] = {
        current: data.current,
        limit: data.limit,
        peak: data.peak,
        percentage: data.limit > 0 ? (data.current / data.limit) * 100 : 0
      };
    }
    
    return result;
  }
}