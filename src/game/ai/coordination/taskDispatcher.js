/**
 * TaskDispatcher - Dispatch Tasks to Appropriate Agents
 * 
 * Manages task queue, prioritization, and preemption for
 * multi-agent coordination.
 */

import { EventEmitter } from 'events';

export const TaskPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20
};

export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

export class TaskDispatcher extends EventEmitter {
  /**
   * @param {AgentCoordinator} coordinator - The agent coordinator
   */
  constructor(coordinator) {
    super();
    this.coordinator = coordinator;
    
    // Task queue
    this.taskQueue = [];
    this.activeTasks = new Map(); // taskId -> task
    this.taskHistory = new Map(); // taskId -> completed task
    
    // Task counters
    this.taskIdCounter = 0;
  }

  /**
   * Generate unique task ID
   * @returns {string}
   */
  generateTaskId() {
    return `task_${Date.now()}_${++this.taskIdCounter}`;
  }

  /**
   * Add a task to the queue
   * @param {Object} task - Task object with type, data, priority
   * @returns {string} - Task ID
   */
  enqueueTask(task) {
    const taskId = this.generateTaskId();
    
    const newTask = {
      id: taskId,
      type: task.type || 'general',
      data: task.data || {},
      priority: task.priority || TaskPriority.NORMAL,
      requiredCapabilities: task.requiredCapabilities || [],
      createdAt: Date.now(),
      status: TaskStatus.PENDING,
      assignedAgent: null,
      result: null
    };
    
    this.taskQueue.push(newTask);
    
    // Sort by priority (highest first)
    this.prioritizeTasks();
    
    this.emit('task:enqueued', newTask);
    
    return taskId;
  }

  /**
   * Get the next task for an agent
   * @param {string} agentId - The agent requesting a task
   * @returns {Object|null} - The next task or null
   */
  getNextTask(agentId) {
    // Find first task that matches agent capabilities
    for (let i = 0; i < this.taskQueue.length; i++) {
      const task = this.taskQueue[i];
      
      // Check if agent has required capabilities
      if (this.coordinator.canHandleTask(agentId, task.requiredCapabilities)) {
        // Remove from queue
        this.taskQueue.splice(i, 1);
        
        // Mark as in progress
        task.status = TaskStatus.IN_PROGRESS;
        task.assignedAgent = agentId;
        task.startedAt = Date.now();
        
        this.activeTasks.set(task.id, task);
        this.emit('task:started', task);
        
        return task;
      }
    }
    
    return null;
  }

  /**
   * Mark a task as completed
   * @param {string} taskId - The task ID
   * @param {Object} result - The task result
   * @returns {boolean} - Success
   */
  completeTask(taskId, result) {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;
    
    task.status = TaskStatus.COMPLETED;
    task.result = result;
    task.completedAt = Date.now();
    task.duration = task.completedAt - task.startedAt;
    
    this.activeTasks.delete(taskId);
    this.taskHistory.set(taskId, task);
    
    this.emit('task:completed', task);
    
    return true;
  }

  /**
   * Mark a task as failed
   * @param {string} taskId - The task ID
   * @param {string} reason - Failure reason
   * @returns {boolean} - Success
   */
  failTask(taskId, reason) {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;
    
    task.status = TaskStatus.FAILED;
    task.failureReason = reason;
    task.completedAt = Date.now();
    
    this.activeTasks.delete(taskId);
    this.taskHistory.set(taskId, task);
    
    this.emit('task:failed', task);
    
    return true;
  }

  /**
   * Cancel a task
   * @param {string} taskId - The task ID
   * @returns {boolean} - Success
   */
  cancelTask(taskId) {
    // Check active tasks
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.status = TaskStatus.CANCELLED;
      this.activeTasks.delete(taskId);
      this.taskHistory.set(taskId, activeTask);
      this.emit('task:cancelled', activeTask);
      return true;
    }
    
    // Check queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const [removed] = this.taskQueue.splice(queueIndex, 1);
      removed.status = TaskStatus.CANCELLED;
      this.taskHistory.set(taskId, removed);
      this.emit('task:cancelled', removed);
      return true;
    }
    
    return false;
  }

  /**
   * Sort tasks by priority
   * @param {Object[]} tasks - Array of tasks (optional, uses queue if not provided)
   * @returns {Object[]} - Sorted tasks
   */
  prioritizeTasks(tasks = null) {
    const toSort = tasks || this.taskQueue;
    
    toSort.sort((a, b) => {
      // First by priority (descending)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Then by creation time (ascending - older first)
      return a.createdAt - b.createdAt;
    });
    
    return toSort;
  }

  /**
   * Preempt current task for urgent one
   * @param {string} currentTaskId - The currently running task
   * @param {Object} newTask - The urgent new task
   * @returns {string|null} - New task ID or null
   */
  preemptTask(currentTaskId, newTask) {
    const currentTask = this.activeTasks.get(currentTaskId);
    if (!currentTask) return null;
    
    // Only preempt for high priority tasks
    if (newTask.priority < TaskPriority.HIGH) return null;
    
    // Save current task state
    currentTask.status = TaskStatus.PENDING;
    currentTask.preempted = true;
    
    // Re-add to front of queue
    this.taskQueue.unshift(currentTask);
    this.activeTasks.delete(currentTaskId);
    
    this.emit('task:preempted', currentTask);
    
    // Enqueue the urgent task
    return this.enqueueTask(newTask);
  }

  /**
   * Get pending tasks count
   * @returns {number}
   */
  getPendingCount() {
    return this.taskQueue.length;
  }

  /**
   * Get active tasks count
   * @returns {number}
   */
  getActiveCount() {
    return this.activeTasks.size;
  }

  /**
   * Get task statistics
   * @returns {Object}
   */
  getStats() {
    const completed = Array.from(this.taskHistory.values())
      .filter(t => t.status === TaskStatus.COMPLETED);
    const failed = Array.from(this.taskHistory.values())
      .filter(t => t.status === TaskStatus.FAILED);
    
    const avgDuration = completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.duration || 0), 0) / completed.length
      : 0;
    
    return {
      pending: this.taskQueue.length,
      active: this.activeTasks.size,
      completed: completed.length,
      failed: failed.length,
      averageDuration: avgDuration
    };
  }

  /**
   * Clear all tasks
   */
  clear() {
    this.taskQueue = [];
    this.activeTasks.clear();
    this.taskHistory.clear();
  }
}