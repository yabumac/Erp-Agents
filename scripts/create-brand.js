#!/usr/bin/env node

/**
 * Brand Pack Scaffolding Generator
 * Usage: node scripts/create-brand.js <brand-name>
 */

const fs = require('fs');
const path = require('path');

const brandId = process.argv[2];
if (!brandId) {
  console.error('Error: Please provide a brand ID. Example: node scripts/create-brand.js acme');
  process.exit(1);
}

const targetDir = path.resolve(__dirname, '..', 'packages', 'brand', brandId);

if (fs.existsSync(targetDir)) {
  console.error(`Error: Brand directory already exists at ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(path.join(targetDir, 'assets'), { recursive: true });

const brandPackJson = {
  id: brandId,
  name: brandId.charAt(0).toUpperCase() + brandId.slice(1) + " Corp",
  legalName: brandId.charAt(0).toUpperCase() + brandId.slice(1) + " Holdings Ltd.",
  assets: {
    logoLight: `/brand/${brandId}/assets/logo-light.svg`,
    logoDark: `/brand/${brandId}/assets/logo-dark.svg`,
    favicon: `/brand/${brandId}/assets/favicon.ico`,
    appIcon: `/brand/${brandId}/assets/app-icon.png`
  },
  tokens: {
    colors: {
      primary: "210 100% 50%",
      primaryForeground: "0 0% 100%",
      background: "0 0% 100%",
      foreground: "220 15% 10%",
      card: "0 0% 100%",
      cardForeground: "220 15% 10%",
      border: "220 15% 90%",
      muted: "220 15% 95%",
      mutedForeground: "220 10% 45%",
      accent: "210 100% 95%",
      accentForeground: "210 100% 30%",
      destructive: "0 80% 60%"
    },
    radius: "0.375rem",
    fontFamily: "Inter, system-ui, sans-serif",
    density: "compact"
  },
  copy: {
    loginTitle: `Sign in to ${brandId.toUpperCase()}`,
    loginSubtitle: "Enterprise Business Operating System",
    emailFooter: `Powered by ${brandId.toUpperCase()}`,
    supportEmail: `support@${brandId}.com`
  },
  defaultPersona: {
    name: `${brandId.charAt(0).toUpperCase() + brandId.slice(1)} Assistant`,
    tone: "Professional, direct, respectful",
    signoff: "Kind regards,"
  }
};

fs.writeFileSync(path.join(targetDir, 'brand.json'), JSON.stringify(brandPackJson, null, 2));
fs.writeFileSync(path.join(targetDir, 'index.ts'), `export const brandPack = require('./brand.json');\nexport default brandPack;\n`);

console.log(`Successfully created brand pack [${brandId}] at ${targetDir}`);
