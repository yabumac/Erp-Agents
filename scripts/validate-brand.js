#!/usr/bin/env node

/**
 * Brand Pack Completeness and Contrast Validator
 * Usage: node scripts/validate-brand.js <brand-name>
 */

const fs = require('fs');
const path = require('path');

const brandId = process.argv[2] || 'default';
const brandFile = path.resolve(__dirname, '..', 'packages', 'brand', brandId, 'brand.json');

if (!fs.existsSync(brandFile)) {
  console.error(`Error: Brand pack not found at ${brandFile}`);
  process.exit(1);
}

const brand = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
const errors = [];

if (!brand.id) errors.push('Missing "id"');
if (!brand.name) errors.push('Missing "name"');
if (!brand.tokens?.colors?.primary) errors.push('Missing token "colors.primary"');
if (!brand.tokens?.radius) errors.push('Missing token "radius"');
if (!brand.copy?.loginTitle) errors.push('Missing copy "loginTitle"');
if (!brand.defaultPersona?.name) errors.push('Missing default persona "name"');

if (errors.length > 0) {
  console.error(`Validation Failed for brand [${brandId}]:\n` + errors.map(e => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log(`Brand pack [${brandId}] passed all validation checks!`);
