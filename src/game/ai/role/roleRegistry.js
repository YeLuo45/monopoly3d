/**
 * RoleRegistry - Manages available roles and their definitions
 */
export class RoleRegistry {
  constructor() {
    this.roles = new Map();
    this._initDefaultRoles();
  }

  _initDefaultRoles() {
    this.registerRole('STRATEGIST', {
      description: 'High-level game strategy and long-term planning',
      color: '#gold',
      capabilities: ['strategy', 'planning', 'prediction', 'resourceManagement'],
      maxInstances: 1,
    });
    this.registerRole('ANALYZER', {
      description: 'Data analysis and pattern recognition',
      color: '#blue',
      capabilities: ['analysis', 'patternRecognition', 'statistics', 'reporting'],
      maxInstances: 2,
    });
    this.registerRole('TRADER', {
      description: 'Property trading and negotiation',
      color: '#green',
      capabilities: ['trading', 'negotiation', 'propertyManagement', 'bidding'],
      maxInstances: 3,
    });
    this.registerRole('FINANCIER', {
      description: 'Financial management and investment',
      color: '#silver',
      capabilities: ['finance', 'investment', 'riskAssessment', 'budgeting'],
      maxInstances: 2,
    });
  }

  registerRole(roleId, definition) {
    this.roles.set(roleId, {
      ...definition,
      id: roleId,
      createdAt: Date.now(),
    });
  }

  getRole(roleId) {
    return this.roles.get(roleId) || null;
  }

  getAllRoles() {
    return Array.from(this.roles.values());
  }

  getRoleByCapability(capability) {
    const matches = [];
    for (const [id, role] of this.roles) {
      if (role.capabilities.includes(capability)) {
        matches.push(id);
      }
    }
    return matches;
  }
}