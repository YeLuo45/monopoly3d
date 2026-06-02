/**
 * TeamBuilder - Assembles agent teams based on game needs
 */
export class TeamBuilder {
  constructor(roleRegistry, coordinator) {
    this.roleRegistry = roleRegistry;
    this.coordinator = coordinator;
    this.teams = new Map();
    this.agentTeams = new Map();
  }

  createTeam(teamId, config) {
    const team = {
      id: teamId,
      name: config.name || `Team ${teamId}`,
      roles: config.roles || [],
      agents: [],
      createdAt: Date.now(),
    };
    this.teams.set(teamId, team);
    return { valid: true, teamId };
  }

  addAgentToTeam(teamId, agentId, role) {
    const team = this.teams.get(teamId);
    if (!team) return { valid: false, reason: 'Team not found' };

    if (team.agents.length >= team.roles.length) {
      return { valid: false, reason: 'Team is full' };
    }

    team.agents.push(agentId);
    this.agentTeams.set(agentId, teamId);
    return { valid: true };
  }

  removeAgentFromTeam(teamId, agentId) {
    const team = this.teams.get(teamId);
    if (!team) return false;
    team.agents = team.agents.filter(a => a !== agentId);
    this.agentTeams.delete(agentId);
    return true;
  }

  getTeamForAgent(agentId) {
    const teamId = this.agentTeams.get(agentId);
    return teamId ? this.teams.get(teamId) : null;
  }

  getTeamSize(teamId) {
    const team = this.teams.get(teamId);
    return team ? team.agents.length : 0;
  }

  suggestTeamComposition(gameState) {
    const suggestions = [];
    for (const role of this.roleRegistry.getAllRoles()) {
      suggestions.push({
        role: role.id,
        recommendedCount: Math.min(role.maxInstances, 2),
        purpose: role.description,
      });
    }
    return suggestions;
  }
}