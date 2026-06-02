import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RoleRegistry } from '../../src/game/ai/role/roleRegistry.js';

describe('RoleRegistry', () => {
  describe('constructor', () => {
    it('initializes with default roles', () => {
      const registry = new RoleRegistry();
      const roles = registry.getAllRoles();
      assert.strictEqual(roles.length, 4);
    });
  });

  describe('registerRole', () => {
    it('registers new role', () => {
      const registry = new RoleRegistry();
      registry.registerRole('CUSTOM_ROLE', {
        description: 'Custom role',
        color: '#red',
        capabilities: ['custom'],
        maxInstances: 1,
      });
      const role = registry.getRole('CUSTOM_ROLE');
      assert.strictEqual(role.id, 'CUSTOM_ROLE');
    });
  });

  describe('getRole', () => {
    it('returns existing role', () => {
      const registry = new RoleRegistry();
      const role = registry.getRole('STRATEGIST');
      assert.strictEqual(role.id, 'STRATEGIST');
      assert.ok(role.capabilities.includes('strategy'));
    });

    it('returns null for unknown role', () => {
      const registry = new RoleRegistry();
      assert.strictEqual(registry.getRole('UNKNOWN'), null);
    });
  });

  describe('getRoleByCapability', () => {
    it('finds roles with capability', () => {
      const registry = new RoleRegistry();
      const roles = registry.getRoleByCapability('trading');
      assert.ok(roles.includes('TRADER'));
    });

    it('returns empty for unknown capability', () => {
      const registry = new RoleRegistry();
      const roles = registry.getRoleByCapability('nonexistent');
      assert.strictEqual(roles.length, 0);
    });
  });
});