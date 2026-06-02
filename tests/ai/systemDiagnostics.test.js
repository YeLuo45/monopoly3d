/**
 * Tests for SystemDiagnostics
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { SystemDiagnostics } from '../../src/game/ai/systemDiagnostics.js';
import { MultiAgentSystemFacade } from '../../src/game/ai/multiAgentSystemFacade.js';

describe('SystemDiagnostics', () => {
  let facade;
  let diagnostics;
  
  beforeEach(() => {
    facade = new MultiAgentSystemFacade();
    diagnostics = new SystemDiagnostics(facade);
  });
  
  afterEach(() => {
    facade.clear();
  });
  
  test('should create instance with facade reference', () => {
    assert.ok(diagnostics.multiAgentSystem === facade);
    assert.ok(Array.isArray(diagnostics.diagnosticHistory));
  });
  
  test('should run full diagnostics', async () => {
    await facade.initialize({ phase: 'playing' });
    
    const report = diagnostics.runFullDiagnostics();
    
    assert.ok(report.timestamp);
    assert.ok(report.duration >= 0);
    assert.ok('components' in report);
    assert.ok('overallHealth' in report);
    assert.ok('healthScore' in report);
    assert.ok('issues' in report);
    assert.ok('recommendations' in report);
  });
  
  test('should check specific component', async () => {
    await facade.initialize({});
    
    const result = diagnostics.checkComponent('coordinator');
    
    assert.ok('health' in result);
    assert.ok('status' in result);
  });
  
  test('should return error for unknown component', () => {
    const result = diagnostics.checkComponent('unknown-component');
    
    assert.strictEqual(result.health, 'unknown');
    assert.ok(result.error.includes('Unknown component'));
  });
  
  test('should generate formatted report', async () => {
    await facade.initialize({});
    
    const report = diagnostics.generateReport();
    
    assert.ok('text' in report);
    assert.ok('data' in report);
    assert.ok(report.text.includes('SYSTEM DIAGNOSTIC REPORT'));
  });
  
  test('should get recommendations', async () => {
    await facade.initialize({});
    
    const recommendations = diagnostics.getRecommendations();
    
    assert.ok(Array.isArray(recommendations));
  });
  
  test('should track diagnostic history', async () => {
    await facade.initialize({});
    
    diagnostics.runFullDiagnostics();
    diagnostics.runFullDiagnostics();
    
    const history = diagnostics.getHistory();
    assert.ok(history.length >= 2);
  });
  
  test('should clear diagnostic history', () => {
    diagnostics.diagnosticHistory = [{ id: 1 }, { id: 2 }];
    
    diagnostics.clearHistory();
    
    assert.strictEqual(diagnostics.diagnosticHistory.length, 0);
  });
});