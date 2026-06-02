/**
 * TaskScheduler - Schedule tasks across time for delayed/recurring execution
 * 
 * Manages time-based task scheduling including one-time delayed tasks
 * and recurring tasks with configurable intervals.
 */

import { TaskQueueManager } from './taskQueueManager.js';

export class TaskScheduler {
  /**
   * @param {TaskQueueManager} queueManager - Queue manager instance
   */
  constructor(queueManager) {
    this.queueManager = queueManager;
    
    /** @type {Map<string, ScheduledTask>} */
    this.scheduledTasks = new Map();
    
    /** @type {Map<string, RecurringTask>} */
    this.recurringTasks = new Map();
    
    this._taskIdCounter = 0;
  }

  /**
   * Schedule a task for future execution
   * @param {Object} task - Task to schedule
   * @param {number} delay - Delay in milliseconds
   * @param {string} [targetQueue='default'] - Queue to add task to when due
   * @returns {string} Scheduled task ID
   */
  scheduleTask(task, delay, targetQueue = 'default') {
    const taskId = task.id || `scheduled_${Date.now()}_${++this._taskIdCounter}`;
    
    const scheduledTask = {
      id: taskId,
      task,
      delay,
      targetQueue,
      scheduledAt: Date.now(),
      executeAt: Date.now() + delay,
      status: 'scheduled',
      type: 'one-time'
    };

    this.scheduledTasks.set(taskId, scheduledTask);
    return taskId;
  }

  /**
   * Schedule a recurring task
   * @param {Object} task - Task to schedule
   * @param {number} interval - Interval in milliseconds
   * @param {string} [targetQueue='default'] - Queue to add task to when due
   * @returns {string} Recurring task ID
   */
  scheduleRecurring(task, interval, targetQueue = 'default') {
    const taskId = task.id || `recurring_${Date.now()}_${++this._taskIdCounter}`;
    
    const recurringTask = {
      id: taskId,
      task,
      interval,
      targetQueue,
      scheduledAt: Date.now(),
      lastExecutedAt: null,
      nextExecutionAt: Date.now() + interval,
      status: 'active',
      type: 'recurring',
      executionCount: 0
    };

    this.recurringTasks.set(taskId, recurringTask);
    return taskId;
  }

  /**
   * Cancel a scheduled or recurring task
   * @param {string} taskId - Task ID to cancel
   * @returns {boolean} Success status
   */
  cancelScheduled(taskId) {
    const oneTimeResult = this.scheduledTasks.delete(taskId);
    const recurringResult = this.recurringTasks.delete(taskId);
    
    if (oneTimeResult) {
      return true;
    }
    
    if (recurringResult) {
      return true;
    }
    
    return false;
  }

  /**
   * Process due tasks (call this on each game tick)
   * @param {number} [currentTime=Date.now()] - Current timestamp
   * @returns {Array} Array of tasks that were executed
   */
  tick(currentTime = Date.now()) {
    const executedTasks = [];

    // Process one-time scheduled tasks
    for (const [taskId, scheduledTask] of this.scheduledTasks.entries()) {
      if (scheduledTask.executeAt <= currentTime) {
        try {
          // Add to target queue
          this.queueManager.enqueue(scheduledTask.targetQueue, {
            ...scheduledTask.task,
            scheduledFrom: taskId
          });
          
          scheduledTask.status = 'executed';
          scheduledTask.executedAt = currentTime;
          executedTasks.push({ ...scheduledTask });
          
          this.scheduledTasks.delete(taskId);
        } catch (error) {
          scheduledTask.status = 'failed';
          scheduledTask.error = error.message;
        }
      }
    }

    // Process recurring tasks
    for (const [taskId, recurringTask] of this.recurringTasks.entries()) {
      if (recurringTask.nextExecutionAt <= currentTime) {
        try {
          // Add to target queue
          this.queueManager.enqueue(recurringTask.targetQueue, {
            ...recurringTask.task,
            scheduledFrom: taskId,
            executionCount: recurringTask.executionCount
          });
          
          recurringTask.lastExecutedAt = currentTime;
          recurringTask.nextExecutionAt = currentTime + recurringTask.interval;
          recurringTask.executionCount++;
          executedTasks.push({ ...recurringTask });
        } catch (error) {
          recurringTask.status = 'failed';
          recurringTask.error = error.message;
        }
      }
    }

    return executedTasks;
  }

  /**
   * Get all scheduled tasks (one-time and recurring)
   * @returns {Array} Array of scheduled task info
   */
  getScheduledTasks() {
    const oneTime = Array.from(this.scheduledTasks.values()).map(t => ({
      id: t.id,
      task: t.task,
      type: 'one-time',
      status: t.status,
      executeAt: t.executeAt,
      delay: t.delay
    }));

    const recurring = Array.from(this.recurringTasks.values()).map(t => ({
      id: t.id,
      task: t.task,
      type: 'recurring',
      status: t.status,
      nextExecutionAt: t.nextExecutionAt,
      interval: t.interval,
      executionCount: t.executionCount
    }));

    return [...oneTime, ...recurring];
  }

  /**
   * Get count of pending scheduled tasks
   * @returns {Object} Counts of each type
   */
  getScheduledTaskCounts() {
    return {
      oneTime: this.scheduledTasks.size,
      recurring: this.recurringTasks.size,
      total: this.scheduledTasks.size + this.recurringTasks.size
    };
  }

  /**
   * Pause a recurring task
   * @param {string} taskId - Task ID to pause
   * @returns {boolean} Success status
   */
  pauseRecurring(taskId) {
    const task = this.recurringTasks.get(taskId);
    if (!task) return false;
    
    task.status = 'paused';
    return true;
  }

  /**
   * Resume a paused recurring task
   * @param {string} taskId - Task ID to resume
   * @returns {boolean} Success status
   */
  resumeRecurring(taskId) {
    const task = this.recurringTasks.get(taskId);
    if (!task) return false;
    
    task.status = 'active';
    return true;
  }

  /**
   * Update the interval of a recurring task
   * @param {string} taskId - Task ID to update
   * @param {number} newInterval - New interval in milliseconds
   * @returns {boolean} Success status
   */
  updateRecurringInterval(taskId, newInterval) {
    const task = this.recurringTasks.get(taskId);
    if (!task) return false;
    
    task.interval = newInterval;
    return true;
  }

  /**
   * Clear all scheduled tasks
   * @returns {Object} Counts of cleared tasks
   */
  clearAll() {
    const counts = this.getScheduledTaskCounts();
    this.scheduledTasks.clear();
    this.recurringTasks.clear();
    return counts;
  }

  /**
   * Check if a task is scheduled
   * @param {string} taskId - Task ID to check
   * @returns {boolean} True if scheduled
   */
  isScheduled(taskId) {
    return this.scheduledTasks.has(taskId) || this.recurringTasks.has(taskId);
  }
}
