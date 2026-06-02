import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnomalyDetector } from '../../src/game/ai/selfHeal/anomalyDetector.js';

function createMockPerformanceMonitor() {
  return {
    getAgentMetrics: (agentId, type, range) => {
      if (agentId === 'stable-agent') {
        return [
          { responseTime: 100, errorRate: 0.01, cpuUsage: 0.3, timestamp: Date.now() },
        ];
      }
      if (agentId === 'unstable-agent') {
        return [
          { responseTime: 500, errorRate: 0.3, cpuUsage: 0.9, timestamp: Date.now() },
        ];
      }
      return [];
    }
  };
}

describe('AnomalyDetector', () => {
  describe('establishBaseline', () => {
    it('establishes baseline for agent with metrics', () => {
      const monitor = createMockPerformanceMonitor();
      const detector = new AnomalyDetector(monitor);
      const baseline = detector.establishBaseline('stable-agent');
      assert.ok(baseline);
      assert.strictEqual(baseline.responseTime, 100);
    });

    it('returns null for agent with no metrics', () => {
      const monitor = createMockPerformanceMonitor();
      const detector = new AnomalyDetector(monitor);
      const baseline = detector.establishBaseline('unknown');
      assert.strictEqual(baseline, null);
    });
  });

  describe('detectAnomalies', () => {
    it.skip('returns empty for stable agent', () => {
      const monitor = createMockPerformanceMonitor();
      const detector = new AnomalyDetector(monitor);
      detector.establishBaseline('stable-agent');
      const anomalies = detector.detectAnomalies('stable-agent');
      assert.strictEqual(anomalies.length, 0);
    });

    it.skip('detects anomalies for unstable agent', () => {
      const monitor = createMockPerformanceMonitor();
      const detector = new AnomalyDetector(monitor);
      detector.establishBaseline('stable-agent');
      const anomalies = detector.detectAnomalies('unstable-agent');
      assert.ok(anomalies.length > 0);
    });

    it('returns empty for agent without baseline', () => {
      const monitor = createMockPerformanceMonitor();
      const detector = new AnomalyDetector(monitor);
      const anomalies = detector.detectAnomalies('unknown');
      assert.strictEqual(anomalies.length, 0);
    });
  });

  describe('setThreshold', () => {
    it('updates threshold value', () => {
      const monitor = createMockPerformanceMonitor();
      const detector = new AnomalyDetector(monitor);
      detector.setThreshold('errorRate', 0.05);
      assert.strictEqual(detector.thresholds.errorRate, 0.05);
    });
  });
});