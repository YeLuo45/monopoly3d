import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TeamBuilder } from '../../src/game/ai/role/teamBuilder.js';
import { RoleRegistry } from '../../src/game/ai/role/roleRegistry.js';

function createMockCoordinator() {
  return { registerAgent: () => {}, getAgent: () => null };
}

describe('TeamBuilder', () => {
  describe('createTeam', () => {
    it('creates team with config', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      const result = builder.createTeam('team1', { name: 'Test Team', roles: ['STRATEGIST', 'ANALYZER'] });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(builder.getTeamSize('team1'), 0);
    });
  });

  describe('addAgentToTeam', () => {
    it('adds agent to team', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      builder.createTeam('team1', { name: 'Test', roles: ['STRATEGIST'] });
      const result = builder.addAgentToTeam('team1', 'agent1', 'STRATEGIST');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(builder.getTeamSize('team1'), 1);
    });

    it('rejects when team full', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      builder.createTeam('team1', { name: 'Test', roles: ['STRATEGIST'] });
      builder.addAgentToTeam('team1', 'agent1', 'STRATEGIST');
      const result = builder.addAgentToTeam('team1', 'agent2', 'ANALYZER');
      assert.strictEqual(result.valid, false);
    });
  });

  describe('removeAgentFromTeam', () => {
    it('removes agent from team', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      builder.createTeam('team1', { name: 'Test', roles: ['STRATEGIST'] });
      builder.addAgentToTeam('team1', 'agent1', 'STRATEGIST');
      const result = builder.removeAgentFromTeam('team1', 'agent1');
      assert.strictEqual(result, true);
      assert.strictEqual(builder.getTeamSize('team1'), 0);
    });
  });

  describe('getTeamForAgent', () => {
    it('returns team for agent', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      builder.createTeam('team1', { name: 'Test', roles: ['STRATEGIST'] });
      builder.addAgentToTeam('team1', 'agent1', 'STRATEGIST');
      const team = builder.getTeamForAgent('agent1');
      assert.strictEqual(team.id, 'team1');
    });

    it('returns null for agent without team', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      const team = builder.getTeamForAgent('agent1');
      assert.strictEqual(team, null);
    });
  });

  describe('suggestTeamComposition', () => {
    it('returns role suggestions', () => {
      const registry = new RoleRegistry();
      const coordinator = createMockCoordinator();
      const builder = new TeamBuilder(registry, coordinator);
      const suggestions = builder.suggestTeamComposition({});
      assert.ok(suggestions.length > 0);
    });
  });
});