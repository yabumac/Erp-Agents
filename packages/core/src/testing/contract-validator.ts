import { ModuleManifest } from '../types/manifest';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateModuleManifest(manifest: any): ValidationResult {
  const errors: string[] = [];

  if (!manifest) {
    return { valid: false, errors: ['Manifest is null or undefined'] };
  }

  // Required scalar fields
  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Manifest missing valid string "id"');
  }
  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Manifest missing valid string "name"');
  }
  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Manifest missing valid string "version"');
  }
  if (!manifest.group || typeof manifest.group !== 'string') {
    errors.push('Manifest missing valid string "group"');
  }

  // Arrays
  if (!Array.isArray(manifest.permissions)) {
    errors.push('Manifest "permissions" must be an array');
  } else {
    for (const p of manifest.permissions) {
      if (!p.id || !p.id.startsWith(`${manifest.id}.`)) {
        errors.push(`Permission [${p?.id}] must start with module namespace "${manifest.id}."`);
      }
    }
  }

  if (!Array.isArray(manifest.navigation)) {
    errors.push('Manifest "navigation" must be an array');
  }

  if (!Array.isArray(manifest.routes)) {
    errors.push('Manifest "routes" must be an array');
  }

  if (!Array.isArray(manifest.api)) {
    errors.push('Manifest "api" must be an array');
  }

  if (!Array.isArray(manifest.migrations)) {
    errors.push('Manifest "migrations" must be an array');
  } else {
    for (const m of manifest.migrations) {
      if (typeof m.version !== 'number') {
        errors.push(`Migration [${m.name}] version must be a number`);
      }
    }
  }

  if (!manifest.events || !Array.isArray(manifest.events.emits) || !Array.isArray(manifest.events.handles)) {
    errors.push('Manifest "events" must define "emits" and "handles" arrays');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
