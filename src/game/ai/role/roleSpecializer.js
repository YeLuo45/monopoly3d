/**
 * RoleSpecializer - Assigns and manages agent roles
 */
export class RoleSpecializer {
  constructor(coordinator) {
    this.coordinator = coordinator;
    this.agentRoles = new Map();
    this.roleCapabilities = new Map();
    this.roleDefinitions = this._initRoleDefinitions();
  }

  _initRoleDefinitions() {
    return {
      STRATEGIST: {
        capabilities: ['strategy', 'planning', 'prediction'],
        priority: 1,
      },
      ANALYZER: {
        capabilities: ['analysis', 'patternRecognition', 'statistics'],
        priority: 2,
      },
      TRADER: {
        capabilities: ['trading', 'negotiation', 'propertyManagement'],
        priority: 1,
      },
      FINANCIER: {
        capabilities: ['finance', 'investment', 'riskAssessment'],
        priority: 2,
      },
    };
  }

  assignRole(agentId, role) {
    if (!this.roleDefinitions[role]) {
      return { valid: false, reason: 'Unknown role' };
    }
    this.agentRoles.set(agentId, role);
    return { valid: true, role };
  }

  getAgentRole(agentId) {
    return this.agentRoles.get(agentId) || null;
  }

  getAgentsByRole(role) {
    const agents = [];
    for (const [agent, r] of this.agentRoles) {
      if (r === role) agents.push(agent);
    }
    return agents;
  }

  getBestAgentForTask(taskCapability, gameState) {
    let bestAgent = null;
    let bestScore = -1;

    for (const [agentId, role] of this.agentRoles) {
      const roleDef = this.roleDefinitions[role];
      if (roleDef.capabilities.includes(taskCapability)) {
        const score = this._calculateFitScore(agentId, role, gameState);
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agentId;
        }
      }
    }
    return { agentId: bestAgent, score: bestScore };
  }

  _calculateFitScore(agentId, role, gameState) {
    return this.roleDefinitions[role]?.priority || 0;
  }

  recommendRole(agentId, gameState) {
    const recommendations = [];
    for (const [role, def] of Object.entries(this.roleDefinitions)) {
      recommendations.push({
        role,
        fitScore: def.priority,
        capabilities: def.capabilities,
      });
    }
    recommendations.sort((a, b) => b.fitScore - a.fitScore);
    return recommendations;
  }

  getAllRoles() {
    return Object.keys(this.roleDefinitions);
  }

  getRoleCapabilities(role) {
    return this.roleDefinitions[role]?.capabilities || [];
  }
}