/**
 * TaskQueueManager - Manage task queues for multi-agent system
 * 
 * Provides queue operations, priority management, and queue metadata
 * tracking for the AI task distribution system.
 */

export class TaskQueueManager {
  constructor() {
    /** @type {Map<string, Queue>} */
    this.queues = new Map();
    this._queueIdCounter = 0;
  }

  /**
   * Create a new task queue
   * @param {string} queueId - Unique identifier for the queue
   * @param {Object} options - Queue configuration options
   * @param {number} [options.priority=0] - Queue priority level
   * @param {number} [options.maxSize=Infinity] - Maximum queue size
   * @param {string} [options.description=''] - Queue description
   * @returns {Object} Queue metadata
   */
  createQueue(queueId, options = {}) {
    const {
      priority = 0,
      maxSize = Infinity,
      description = ''
    } = options;

    if (this.queues.has(queueId)) {
      throw new Error(`Queue '${queueId}' already exists`);
    }

    const queue = {
      id: queueId,
      tasks: [],
      priority,
      maxSize,
      description,
      createdAt: Date.now(),
      stats: {
        enqueued: 0,
        dequeued: 0,
        peeked: 0
      }
    };

    this.queues.set(queueId, queue);
    return this._createQueueMetadata(queue);
  }

  /**
   * Add a task to a queue
   * @param {string} queueId - Target queue identifier
   * @param {Object} task - Task to enqueue
   * @param {string} [task.id] - Task ID (auto-generated if not provided)
   * @param {Object} [task.data={}] - Task payload
   * @param {number} [task.priority=0] - Task priority within queue
   * @param {string} [task.type='default'] - Task type
   * @returns {string|null} Task ID if successful, null if queue full
   */
  enqueue(queueId, task = {}) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    if (queue.tasks.length >= queue.maxSize) {
      return null;
    }

    const taskId = task.id || `task_${Date.now()}_${++this._queueIdCounter}`;
    
    const taskEntry = {
      id: taskId,
      data: task.data || {},
      priority: task.priority || 0,
      type: task.type || 'default',
      enqueuedAt: Date.now(),
      status: 'pending'
    };

    // Insert based on priority (higher priority first)
    const insertIndex = queue.tasks.findIndex(t => t.priority < taskEntry.priority);
    if (insertIndex === -1) {
      queue.tasks.push(taskEntry);
    } else {
      queue.tasks.splice(insertIndex, 0, taskEntry);
    }

    queue.stats.enqueued++;
    return taskId;
  }

  /**
   * Remove and return the next task from the queue
   * @param {string} queueId - Queue to dequeue from
   * @returns {Object|null} Next task or null if queue empty
   */
  dequeue(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    if (queue.tasks.length === 0) {
      return null;
    }

    const task = queue.tasks.shift();
    task.status = 'dequeued';
    task.dequeuedAt = Date.now();
    queue.stats.dequeued++;

    return task;
  }

  /**
   * View the next task without removing it
   * @param {string} queueId - Queue to peek
   * @returns {Object|null} Next task or null if empty
   */
  peek(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    if (queue.tasks.length === 0) {
      return null;
    }

    queue.stats.peeked++;
    return { ...queue.tasks[0] };
  }

  /**
   * Get the number of tasks in a queue
   * @param {string} queueId - Queue to check
   * @returns {number} Number of pending tasks
   */
  getQueueSize(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    return queue.tasks.length;
  }

  /**
   * Clear all tasks from a queue
   * @param {string} queueId - Queue to clear
   * @returns {number} Number of tasks cleared
   */
  clearQueue(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    const clearedCount = queue.tasks.length;
    queue.tasks = [];
    return clearedCount;
  }

  /**
   * List all queues
   * @returns {Array} Array of queue metadata
   */
  getAllQueues() {
    return Array.from(this.queues.values()).map(q => this._createQueueMetadata(q));
  }

  /**
   * Set priority for a queue
   * @param {string} queueId - Queue to update
   * @param {number} priority - New priority value
   * @returns {boolean} Success status
   */
  setPriority(queueId, priority) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    queue.priority = priority;
    return true;
  }

  /**
   * Get current priority of a queue
   * @param {string} queueId - Queue to check
   * @returns {number} Current priority
   */
  getQueuePriority(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    return queue.priority;
  }

  /**
   * Get queue metadata without internal structures
   * @param {Object} queue - Internal queue object
   * @returns {Object} Public queue metadata
   */
  _createQueueMetadata(queue) {
    return {
      id: queue.id,
      size: queue.tasks.length,
      maxSize: queue.maxSize,
      priority: queue.priority,
      description: queue.description,
      createdAt: queue.createdAt,
      stats: { ...queue.stats }
    };
  }

  /**
   * Delete a queue completely
   * @param {string} queueId - Queue to delete
   * @returns {boolean} Success status
   */
  deleteQueue(queueId) {
    return this.queues.delete(queueId);
  }

  /**
   * Check if a queue exists
   * @param {string} queueId - Queue to check
   * @returns {boolean} True if exists
   */
  hasQueue(queueId) {
    return this.queues.has(queueId);
  }

  /**
   * Get queue statistics
   * @param {string} queueId - Queue to analyze
   * @returns {Object} Queue statistics
   */
  getQueueStats(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    return {
      ...queue.stats,
      currentSize: queue.tasks.length,
      maxSize: queue.maxSize,
      utilizationPercent: queue.maxSize === Infinity ? 0 : (queue.tasks.length / queue.maxSize) * 100
    };
  }

  /**
   * Get total tasks across all queues
   * @returns {number} Total task count
   */
  getTotalTasks() {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.tasks.length;
    }
    return total;
  }

  /**
   * Get all tasks from a specific queue (for debugging)
   * @param {string} queueId - Queue to inspect
   * @returns {Array} Copy of all tasks
   */
  getTasks(queueId) {
    const queue = this.queues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue '${queueId}' does not exist`);
    }

    return queue.tasks.map(t => ({ ...t }));
  }
}
