/**
 * HookDebugger - Debugging utility for EventBus + HookRegistry system
 * 
 * Features:
 * - Intercept and log all eventBus.publish() calls
 * - Intercept and log all hookRegistry hook registrations and executions
 * - Set breakpoints on events (before, after, insteadOf hooks)
 * - Export logs as JSON for analysis
 */

class HookDebugger {
  constructor(eventBus, hookRegistry) {
    this.eventBus = eventBus;
    this.hookRegistry = hookRegistry;
    this._enabled = false;
    this._eventLog = [];
    this._hookLog = [];
    this._breakpoints = new Map();
    this._maxEventLogSize = 1000;
    this._maxHookLogSize = 1000;
    this._originalPublish = null;
    this._originalRegister = null;
    this._originalUnregister = null;
    this._originalExecuteBefore = null;
    this._originalExecuteAfter = null;
    this._originalExecuteInsteadOf = null;
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    
    this._originalPublish = this.eventBus.publish.bind(this.eventBus);
    this.eventBus.publish = (event, data) => this._interceptPublish(event, data);
    
    this._originalRegister = this.hookRegistry.register.bind(this.hookRegistry);
    this.hookRegistry.register = (event, type, handler, priority) => 
      this._interceptRegister(event, type, handler, priority);
    
    this._originalUnregister = this.hookRegistry.unregister.bind(this.hookRegistry);
    this.hookRegistry.unregister = (event, type, handlerId) => 
      this._interceptUnregister(event, type, handlerId);
    
    this._originalExecuteBefore = this.hookRegistry.executeBefore.bind(this.hookRegistry);
    this.hookRegistry.executeBefore = (event, data) => 
      this._interceptExecuteBefore(event, data);
    
    this._originalExecuteAfter = this.hookRegistry.executeAfter.bind(this.hookRegistry);
    this.hookRegistry.executeAfter = (event, data) => 
      this._interceptExecuteAfter(event, data);
    
    this._originalExecuteInsteadOf = this.hookRegistry.executeInsteadOf.bind(this.hookRegistry);
    this.hookRegistry.executeInsteadOf = (event, data, originalFn) => 
      this._interceptExecuteInsteadOf(event, data, originalFn);
  }

  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    
    if (this._originalPublish) {
      this.eventBus.publish = this._originalPublish;
      this._originalPublish = null;
    }
    if (this._originalRegister) {
      this.hookRegistry.register = this._originalRegister;
      this._originalRegister = null;
    }
    if (this._originalUnregister) {
      this.hookRegistry.unregister = this._originalUnregister;
      this._originalUnregister = null;
    }
    if (this._originalExecuteBefore) {
      this.hookRegistry.executeBefore = this._originalExecuteBefore;
      this._originalExecuteBefore = null;
    }
    if (this._originalExecuteAfter) {
      this.hookRegistry.executeAfter = this._originalExecuteAfter;
      this._originalExecuteAfter = null;
    }
    if (this._originalExecuteInsteadOf) {
      this.hookRegistry.executeInsteadOf = this._originalExecuteInsteadOf;
      this._originalExecuteInsteadOf = null;
    }
  }

  isEnabled() {
    return this._enabled;
  }

  _interceptPublish(event, data) {
    if (this._shouldBreak(event, 'publish')) {
      debugger;
    }
    
    let result;
    try {
      result = this._originalPublish(event, data);
    } catch (e) {
      this._logEvent('publish_error', event, null, data, e);
      throw e;
    }
    
    this._logEvent('publish', event, null, data, result);
    return result;
  }

  _interceptRegister(event, type, handler, priority) {
    this._logHook('register', event, type, null, handler, { priority }, null);
    const handlerId = this._originalRegister(event, type, handler, priority);
    this._logHook('register_complete', event, type, handlerId, handler, { priority }, handlerId);
    return handlerId;
  }

  _interceptUnregister(event, type, handlerId) {
    const result = this._originalUnregister(event, type, handlerId);
    this._logHook('unregister', event, type, handlerId, null, {}, result);
    return result;
  }

  _interceptExecuteBefore(event, data) {
    if (this._shouldBreak(event, 'before')) {
      debugger;
    }
    
    this._logHook('before', event, 'before', null, null, data, null);
    
    let result;
    try {
      result = this._originalExecuteBefore(event, data);
    } catch (e) {
      this._logHook('before_error', event, 'before', null, null, data, e);
      throw e;
    }
    
    this._logHook('after', event, 'before', null, null, data, result);
    return result;
  }

  _interceptExecuteAfter(event, data) {
    if (this._shouldBreak(event, 'after')) {
      debugger;
    }
    
    this._logHook('before', event, 'after', null, null, data, null);
    
    let result;
    try {
      this._originalExecuteAfter(event, data);
    } catch (e) {
      this._logHook('after_error', event, 'after', null, null, data, e);
      throw e;
    }
    
    this._logHook('after', event, 'after', null, null, data, 'executed');
    return result;
  }

  _interceptExecuteInsteadOf(event, data, originalFn) {
    if (this._shouldBreak(event, 'insteadOf')) {
      debugger;
    }
    
    this._logHook('before', event, 'insteadOf', null, null, data, null);
    
    let result;
    try {
      result = this._originalExecuteInsteadOf(event, data, originalFn);
    } catch (e) {
      this._logHook('insteadOf_error', event, 'insteadOf', null, null, data, e);
      throw e;
    }
    
    this._logHook('after', event, 'insteadOf', null, null, data, result);
    return result;
  }

  _logEvent(type, event, handler, data, result) {
    this._eventLog.push({
      timestamp: Date.now(),
      type,
      event,
      handler,
      data,
      result,
    });
    
    if (this._eventLog.length > this._maxEventLogSize) {
      this._eventLog.shift();
    }
  }

  _logHook(type, event, hookType, hookId, handler, data, result) {
    this._hookLog.push({
      timestamp: Date.now(),
      event,
      type: hookType,
      hookId,
      handler,
      data,
      result,
    });
    
    if (this._hookLog.length > this._maxHookLogSize) {
      this._hookLog.shift();
    }
  }

  _shouldBreak(event, type) {
    const breakpoints = this._breakpoints.get(event);
    if (!breakpoints) return false;
    return breakpoints.has(type) || breakpoints.has(null);
  }

  getLog() {
    return [...this._eventLog];
  }

  clearLog() {
    this._eventLog = [];
  }

  getHookLog() {
    return [...this._hookLog];
  }

  setBreakpoint(event, type) {
    if (type !== null && !['before', 'after', 'insteadOf', 'publish'].includes(type)) {
      throw new Error(`Invalid breakpoint type: ${type}`);
    }
    
    if (!this._breakpoints.has(event)) {
      this._breakpoints.set(event, new Set());
    }
    
    this._breakpoints.get(event).add(type);
  }

  clearBreakpoint(event, type) {
    const breakpoints = this._breakpoints.get(event);
    if (!breakpoints) return;
    
    breakpoints.delete(type);
    
    if (breakpoints.size === 0) {
      this._breakpoints.delete(event);
    }
  }

  getBreakpoints() {
    const result = [];
    this._breakpoints.forEach((types, event) => {
      types.forEach(type => {
        result.push({ event, type });
      });
    });
    return result;
  }

  exportLog() {
    return JSON.stringify({
      eventLog: this._eventLog,
      hookLog: this._hookLog,
      breakpoints: this.getBreakpoints(),
      exportedAt: Date.now(),
    }, null, 2);
  }
}

export { HookDebugger };

// Lazy singleton for browser context (avoids Node.js test environment issues)
let _hookDebuggerInstance = null;
export function getHookDebugger() {
  if (!_hookDebuggerInstance) {
    // eslint-disable-next-line no-undef
    _hookDebuggerInstance = new HookDebugger(eventBus, hookRegistry);
  }
  return _hookDebuggerInstance;
}

// Backward-compatible singleton alias
// Guards: only create in browser (where eventBus/hookRegistry globals exist)
// In Node.js test, this returns null; consumers should handle null or use getHookDebugger()
export const hookDebugger = (() => {
  try {
    if (typeof window !== 'undefined') {
      const eb = globalThis.eventBus;
      const hr = globalThis.hookRegistry;
      if (eb && hr) {
        _hookDebuggerInstance = new HookDebugger(eb, hr);
        return _hookDebuggerInstance;
      }
    }
  } catch (_e) { /* not in browser context or globals not yet set */ }
  return null;
})();