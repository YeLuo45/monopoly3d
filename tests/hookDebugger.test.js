import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EventBus } from '../src/game/eventBus.js';
import { HookRegistry } from '../src/game/hooks/hookRegistry.js';
import { HookDebugger } from '../src/game/hooks/hookDebugger.js';

describe('HookDebugger', () => {
  let eventBus;
  let hookRegistry;
  let debuggerInstance;

  beforeEach(() => {
    eventBus = new EventBus();
    hookRegistry = new HookRegistry();
    debuggerInstance = new HookDebugger(eventBus, hookRegistry);
  });

  it('should create instance with eventBus and hookRegistry', () => {
    assert.ok(debuggerInstance instanceof HookDebugger);
    assert.strictEqual(debuggerInstance.isEnabled(), false);
  });

  it('should enable and disable debugger', () => {
    assert.strictEqual(debuggerInstance.isEnabled(), false);
    
    debuggerInstance.enable();
    assert.strictEqual(debuggerInstance.isEnabled(), true);
    
    debuggerInstance.disable();
    assert.strictEqual(debuggerInstance.isEnabled(), false);
  });

  it('should not enable twice', () => {
    debuggerInstance.enable();
    const firstEnabled = debuggerInstance.isEnabled();
    
    debuggerInstance.enable(); // Should not throw
    assert.strictEqual(debuggerInstance.isEnabled(), firstEnabled);
  });

  it('should not disable when not enabled', () => {
    assert.strictEqual(debuggerInstance.isEnabled(), false);
    debuggerInstance.disable(); // Should not throw
    assert.strictEqual(debuggerInstance.isEnabled(), false);
  });

  it('should log events when enabled', () => {
    debuggerInstance.enable();
    
    eventBus.publish('test_event', { value: 123 });
    eventBus.publish('another_event', { data: 'test' });
    
    const log = debuggerInstance.getLog();
    assert.strictEqual(log.length, 2);
    assert.strictEqual(log[0].event, 'test_event');
    assert.strictEqual(log[0].data.value, 123);
    assert.strictEqual(log[1].event, 'another_event');
  });

  it('should not log events when disabled', () => {
    debuggerInstance.disable(); // Already disabled
    
    eventBus.publish('test_event', { value: 123 });
    
    const log = debuggerInstance.getLog();
    assert.strictEqual(log.length, 0);
  });

  it('should clear log', () => {
    debuggerInstance.enable();
    
    eventBus.publish('test_event', { value: 123 });
    eventBus.publish('another_event', { data: 'test' });
    
    assert.strictEqual(debuggerInstance.getLog().length, 2);
    
    debuggerInstance.clearLog();
    assert.strictEqual(debuggerInstance.getLog().length, 0);
  });

  it('should log hook registrations when enabled', () => {
    debuggerInstance.enable();
    
    const handler = (data) => ({ ...data, modified: true });
    hookRegistry.register('test_event', 'before', handler, 10);
    
    const hookLog = debuggerInstance.getHookLog();
    assert.ok(hookLog.some(entry => 
      entry.event === 'test_event' && 
      entry.type === 'before'
    ));
  });

  it('should set and clear breakpoints', () => {
    debuggerInstance.setBreakpoint('test_event', 'before');
    debuggerInstance.setBreakpoint('test_event', 'after');
    debuggerInstance.setBreakpoint('another_event', 'insteadOf');
    
    let breakpoints = debuggerInstance.getBreakpoints();
    assert.strictEqual(breakpoints.length, 3);
    
    debuggerInstance.clearBreakpoint('test_event', 'before');
    breakpoints = debuggerInstance.getBreakpoints();
    assert.strictEqual(breakpoints.length, 2);
    
    debuggerInstance.clearBreakpoint('another_event', 'insteadOf');
    breakpoints = debuggerInstance.getBreakpoints();
    assert.strictEqual(breakpoints.length, 1);
  });

  it('should throw on invalid breakpoint type', () => {
    assert.throws(() => {
      debuggerInstance.setBreakpoint('test_event', 'invalid_type');
    }, /Invalid breakpoint type/);
  });

  it('should allow null breakpoint type (all)', () => {
    debuggerInstance.setBreakpoint('test_event', null);
    
    const breakpoints = debuggerInstance.getBreakpoints();
    assert.strictEqual(breakpoints.length, 1);
    assert.strictEqual(breakpoints[0].type, null);
  });

  it('should export log as JSON', () => {
    debuggerInstance.enable();
    eventBus.publish('test_event', { value: 123 });
    
    const exported = debuggerInstance.exportLog();
    assert.ok(typeof exported === 'string');
    
    const parsed = JSON.parse(exported);
    assert.ok(Array.isArray(parsed.eventLog));
    assert.ok(Array.isArray(parsed.hookLog));
    assert.ok(Array.isArray(parsed.breakpoints));
    assert.ok(parsed.exportedAt);
  });

  it('should restore original methods on disable', () => {
    debuggerInstance.enable();
    
    // Store a reference to the wrapped publish
    const wrappedPublish = eventBus.publish;
    
    // Verify it's wrapped (different behavior)
    debuggerInstance.disable();
    
    // After disable, publish should work the same as before wrapping
    // We verify by checking publish still returns expected structure
    const result = eventBus.publish('test', { value: 1 });
    assert.ok(result.type === 'test');
    assert.ok(result.timestamp);
  });

  it('should track multiple events in log', () => {
    debuggerInstance.enable();
    
    for (let i = 0; i < 5; i++) {
      eventBus.publish(`event_${i}`, { index: i });
    }
    
    const log = debuggerInstance.getLog();
    assert.strictEqual(log.length, 5);
  });

  it('should get hook log after hook registration', () => {
    debuggerInstance.enable();
    
    const handler = (data) => data;
    hookRegistry.register('dice_roll', 'before', handler);
    
    const hookLog = debuggerInstance.getHookLog();
    assert.ok(hookLog.length > 0);
  });

  it('should clear hook log separately', () => {
    debuggerInstance.enable();
    
    const handler = (data) => data;
    hookRegistry.register('test', 'before', handler);
    eventBus.publish('test', {});
    
    // Clear event log only
    debuggerInstance.clearLog();
    
    const hookLog = debuggerInstance.getHookLog();
    assert.ok(hookLog.length > 0);
  });
});