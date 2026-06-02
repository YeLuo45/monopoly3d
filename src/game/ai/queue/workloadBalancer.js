/**
 * WorkloadBalancer - Balance workload across agents
 * 
 * Analyzes task distribution and provides recommendations for
 * optimizing agent workload to maximize throughput.
 */

import { TaskQueueManager } from './taskQueueManager.js';

export class WorkloadBalancer {
  /**
   * @param {TaskQueueManager} queueManager - Queue manager instance
   */
  constructor(queueManager) {
    this.queueManager = queueManager;
    
    /** @type {Map<string, number>} */
    this.agentLoads = new Map();
    
    /** @type {Map<string, string>} */
    this.taskAgentAssignment = new Map();
    
    this._batchSizeRecommendations = {
      small: 5,
      medium: 10,
      large: 20
    };
  }

  /**
   * Rebalance all queues by redistributing tasks
   * @returns {Object} Rebalancing result summary
   */
  rebalance() {
    const queues = this.queueManager.getAllQueues();
    const result = {
      queuesAnalyzed: queues.length,
      tasksMoved: 0,
      agentsAffected: new Set()
    };

    // Calculate total tasks and average load
    let totalTasks = 0;
    for (const queue of queues) {
      totalTasks += queue.size;
    }

    const avgTasksPerAgent = this.agentLoads.size > 0 
      ? totalTasks / this.agentLoads.size 
      : totalTasks;

    // Redistribute tasks from overloaded agents
    for (const [agentId, load] of this.agentLoads.entries()) {
      if (load > avgTasksPerAgent * 1.5) {
        const excessLoad = load - Math.floor(avgTasksPerAgent);
        result.agentsAffected.add(agentId);
        result.tasksMoved += excessLoad;
      }
    }

    return result;
  }

  /**
   * Get the current load for a specific agent
   * @param {string} agentId - Agent to check
   * @returns {number} Number of tasks assigned to agent
   */
  getAgentLoad(agentId) {
    return this.agentLoads.get(agentId) || 0;
  }

  /**
   * Register an agent with the balancer
   * @param {string} agentId - Agent to register
   * @param {number} [initialLoad=0] - Initial task count
   */
  registerAgent(agentId, initialLoad = 0) {
    this.agentLoads.set(agentId, initialLoad);
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent to remove
   * @returns {boolean} Success status
   */
  unregisterAgent(agentId) {
    return this.agentLoads.delete(agentId);
  }

  /**
   * Assign a task to an agent
   * @param {string} taskId - Task to assign
   * @param {string} agentId - Target agent
   * @returns {boolean} Success status
   */
  assignTaskToAgent(taskId, agentId) {
    this.taskAgentAssignment.set(taskId, agentId);
    const currentLoad = this.agentLoads.get(agentId) || 0;
    this.agentLoads.set(agentId, currentLoad + 1);
    return true;
  }

  /**
   * Release a task from an agent
   * @param {string} taskId - Task to release
   * @returns {boolean} Success status
   */
  releaseTaskFromAgent(taskId) {
    const agentId = this.taskAgentAssignment.get(taskId);
    if (!agentId) return false;

    this.taskAgentAssignment.delete(taskId);
    const currentLoad = this.agentLoads.get(agentId) || 1;
    this.agentLoads.set(agentId, Math.max(0, currentLoad - 1));
    return true;
  }

  /**
   * Suggest load adjustments for agents
   * @returns {Array} Array of adjustment recommendations
   */
  suggestLoadAdjustment() {
    const recommendations = [];
    const agents = Array.from(this.agentLoads.entries());
    
    if (agents.length === 0) return recommendations;

    const loads = agents.map(([, load]) => load);
    const minLoad = Math.min(...loads);
    const maxLoad = Math.max(...loads);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

    for (const [agentId, load] of agents) {
      const deviation = load - avgLoad;
      const percentDeviation = avgLoad > 0 ? (deviation / avgLoad) * 100 : 0;

      if (load > avgLoad * 1.3) {
        recommendations.push({
          agentId,
          action: 'offload',
          currentLoad: load,
          recommendedLoad: Math.floor(avgLoad),
          reason: `Overloaded by ${Math.round(percentDeviation)}%`
        });
      } else if (load < avgLoad * 0.7 && load < minLoad + 2) {
        recommendations.push({
          agentId,
          action: 'accept_more',
          currentLoad: load,
          recommendedLoad: Math.ceil(avgLoad),
          reason: `Underutilized by ${Math.round(-percentDeviation)}%`
        });
      }
    }

    return recommendations;
  }

  /**
   * Get optimal batch size recommendations
   * @param {string} [strategy='auto'] - Strategy: 'small', 'medium', 'large', 'auto'
   * @returns {Object} Batch size recommendations
   */
  getOptimalBatchSize(strategy = 'auto') {
    const agentCount = this.agentLoads.size;
    const totalTasks = this.queueManager.getTotalTasks();
    
    let baseSize;
    
    if (strategy === 'auto') {
      // Determine optimal based on system state
      if (agentCount <= 2) {
        baseSize = this._batchSizeRecommendations.large;
      } else if (agentCount <= 5) {
        baseSize = this._batchSizeRecommendations.medium;
      } else {
        baseSize = this._batchSizeRecommendations.small;
      }
    } else {
      baseSize = this._batchSizeRecommendations[strategy] || 10;
    }

    // Adjust based on queue pressure
    let pressureMultiplier = 1;
    if (totalTasks > agentCount * 20) {
      pressureMultiplier = 1.5; // Higher pressure = smaller batches for faster processing
    } else if (totalTasks < agentCount * 5) {
      pressureMultiplier = 0.8; // Low pressure = larger batches for efficiency
    }

    const optimalSize = Math.max(1, Math.round(baseSize * pressureMultiplier));

    return {
      batchSize: optimalSize,
      strategy,
      agentCount,
      totalTasks,
      pressureMultiplier
    };
  }

  /**
   * Get load distribution statistics
   * @returns {Object} Load distribution stats
   */
  getLoadDistribution() {
    const loads = Array.from(this.agentLoads.values());
    
    if (loads.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        variance: 0,
        stdDev: 0
      };
    }

    const sum = loads.reduce((a, b) => a + b, 0);
    const avg = sum / loads.length;
    const squaredDiffs = loads.map(load => Math.pow(load - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: loads.length,
      min: Math.min(...loads),
      max: Math.max(...loads),
      avg: Math.round(avg * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100
    };
  }

  /**
   * Find the least loaded agent
   * @returns {string|null} Agent ID or null if no agents
   */
  findLeastLoadedAgent() {
    if (this.agentLoads.size === 0) return null;

    let minAgent = null;
    let minLoad = Infinity;

    for (const [agentId, load] of this.agentLoads.entries()) {
      if (load < minLoad) {
        minLoad = load;
        minAgent = agentId;
      }
    }

    return minAgent;
  }

  /**
   * Find the most loaded agent
   * @returns {string|null} Agent ID or null if no agents
   */
  findMostLoadedAgent() {
    if (this.agentLoads.size === 0) return null;

    let maxAgent = null;
    let maxLoad = -Infinity;

    for (const [agentId, load] of this.agentLoads.entries()) {
      if (load > maxLoad) {
        maxLoad = load;
        maxAgent = agentId;
      }
    }

    return maxAgent;
  }

  /**
   * Get all registered agents
   * @returns {Array} Array of agent info
   */
  getRegisteredAgents() {
    return Array.from(this.agentLoads.entries()).map(([id, load]) => ({
      agentId: id,
      currentLoad: load
    }));
  }
}
