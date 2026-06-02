import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RoleSpecializer } from '../../src/game/ai/role/roleSpecializer.js';

function createMockCoordinator() {
  return { registerAgent: () => {}, getAgent: () => null };
}

describe('RoleSpecializer', () => {
  describe('assignRole', () => {
    it('assigns valid role to agent', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const result = specializer.assignRole('agent1', 'STRATEGIST');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.role, 'STRATEGIST');
    });

    it('rejects unknown role', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const result = specializer.assignRole('agent1', 'UNKNOWN_ROLE');
      assert.strictEqual(result.valid, false);
    });
  });

  describe('getAgentRole', () => {
    it('returns assigned role', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      specializer.assignRole('agent1', 'ANALYZER');
      assert.strictEqual(specializer.getAgentRole('agent1'), 'ANALYZER');
    });

    it('returns null for unassigned agent', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      assert.strictEqual(specializer.getAgentRole('agent1'), null);
    });
  });

  describe('getAgentsByRole', () => {
    it('returns agents with matching role', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      specializer.assignRole('agent1', 'STRATEGIST');
      specializer.assignRole('agent2', 'STRATEGIST');
      specializer.assignRole('agent3', 'TRADER');
      const strategists = specializer.getAgentsByRole('STRATEGIST');
      assert.strictEqual(strategists.length, 2);
    });
  });

  describe('getBestAgentForTask', () => {
    it('returns best agent for capability', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      specializer.assignRole('agent1', 'STRATEGIST');
      specializer.assignRole('agent2', 'ANALYZER');
      const result = specializer.getBestAgentForTask('strategy', {});
      assert.strictEqual(result.agentId, 'agent1');
    });

    it('returns null when no agent has capability', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const result = specializer.getBestAgentForTask('nonexistent', {});
      assert.strictEqual(result.agentId, null);
    });
  });

  describe('recommendRole', () => {
    it('returns sorted role recommendations', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const recs = specializer.recommendRole('agent1', {});
      assert.strictEqual(recs.length, 4);
      assert.ok(recs.length > 0);
    });
  });

  describe('getAllRoles', () => {
    it('returns all available roles', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const roles = specializer.getAllRoles();
      assert.strictEqual(roles.length, 4);
    });
  });

  describe('getRoleCapabilities', () => {
    it('returns capabilities for valid role', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const caps = specializer.getRoleCapabilities('STRATEGIST');
      assert.ok(caps.includes('strategy'));
    });

    it('returns empty for unknown role', () => {
      const coordinator = createMockCoordinator();
      const specializer = new RoleSpecializer(coordinator);
      const caps = specializer.getRoleCapabilities('UNKNOWN');
      assert.strictEqual(caps.length, 0);
    });
  });
});