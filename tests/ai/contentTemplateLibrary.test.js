import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ContentTemplateLibrary } from '../../src/game/ai/procgen/contentTemplateLibrary.js';

describe('ContentTemplateLibrary', () => {
  describe('addTemplate', () => {
    it('adds template to library', () => {
      const lib = new ContentTemplateLibrary();
      lib.addTemplate('test-template', { name: 'Test', fields: ['field1'] });
      const template = lib.getTemplate('test-template');
      assert.ok(template);
      assert.strictEqual(template.name, 'Test');
    });
  });

  describe('getTemplate', () => {
    it('returns existing template', () => {
      const lib = new ContentTemplateLibrary();
      lib.addTemplate('property', { name: 'Property Template', fields: ['name', 'price'] });
      const template = lib.getTemplate('property');
      assert.ok(template);
    });

    it('returns null for unknown template', () => {
      const lib = new ContentTemplateLibrary();
      const template = lib.getTemplate('nonexistent');
      assert.strictEqual(template, null);
    });
  });

  describe('fillTemplate', () => {
    it('fills template with params', () => {
      const lib = new ContentTemplateLibrary();
      lib.addTemplate('property', { name: 'Property', fields: ['name', 'price'] });
      const result = lib.fillTemplate('property', { name: 'Test Property', price: 100 });
      assert.ok(result);
      assert.strictEqual(result.name, 'Test Property');
      assert.strictEqual(result.price, 100);
    });

    it.skip('uses default values when params missing', () => {
      const lib = new ContentTemplateLibrary();
      lib.addTemplate('simple', { name: 'Simple', fields: ['name', 'count'], defaults: { count: 1 } });
      const result = lib.fillTemplate('simple', { name: 'Test' });
      assert.strictEqual(result.count, 1);
    });
  });

  describe('generateFromTemplate', () => {
    it.skip('generates content from template', () => {
      const lib = new ContentTemplateLibrary();
      lib.addTemplate('event', { name: 'Event', fields: ['type', 'amount'] });
      const result = lib.generateFromTemplate('event');
      assert.ok(result);
      assert.ok(result.type !== undefined);
    });

    it('returns null for unknown template', () => {
      const lib = new ContentTemplateLibrary();
      const result = lib.generateFromTemplate('nonexistent');
      assert.strictEqual(result, null);
    });
  });
});