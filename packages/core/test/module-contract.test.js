const { test, describe } = require('node:test');
const assert = require('node:assert');

const { validateModuleManifest } = require('../src/testing/contract-validator');

describe('Tier 3: Module Contract Verification Suite', () => {
  test('A compliant module manifest passes contract validation', () => {
    const validManifest = {
      id: 'notes',
      name: 'Internal Notes',
      version: '1.0.0',
      description: 'Collaborative notes',
      icon: 'FileText',
      group: 'operate',
      permissions: [
        {
          id: 'notes.view',
          name: 'View Notes',
          description: 'View notes',
          category: 'General',
          defaultRoles: ['Owner'],
        },
      ],
      navigation: [{ id: 'nav-1', label: 'Notes', href: '', icon: 'FileText', requiredPermissions: ['notes.view'] }],
      routes: [{ path: '', title: 'Notes', requiredPermissions: ['notes.view'] }],
      api: [],
      migrations: [{ version: 1, name: 'init', up: 'CREATE TABLE notes_items ();' }],
      events: { emits: [], handles: [] },
    };

    const res = validateModuleManifest(validManifest);
    assert.strictEqual(res.valid, true, `Manifest should be valid, errors: ${res.errors.join(', ')}`);
    assert.strictEqual(res.errors.length, 0);
  });

  test('Fails when permissions do not use module namespace prefix', () => {
    const invalidManifest = {
      id: 'mail',
      name: 'Mail',
      version: '1.0.0',
      group: 'communicate',
      permissions: [
        {
          id: 'invalid_unprefixed_permission',
          name: 'Bad',
          description: 'Bad',
          category: 'Bad',
          defaultRoles: [],
        },
      ],
      navigation: [],
      routes: [],
      api: [],
      migrations: [],
      events: { emits: [], handles: [] },
    };

    const res = validateModuleManifest(invalidManifest);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('must start with module namespace "mail."')));
  });

  test('Fails when required fields are missing', () => {
    const missingFields = {
      id: 'test',
    };

    const res = validateModuleManifest(missingFields);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.length >= 3);
  });
});
