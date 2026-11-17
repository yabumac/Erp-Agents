import { BrandPack, BrandLoader } from '@repo/core';

export function getThemeStyles(brandPack: BrandPack): Record<string, string> {
  const c = brandPack.tokens.colors;
  return {
    '--primary': c.primary,
    '--primary-foreground': c.primaryForeground,
    '--background': c.background,
    '--foreground': c.foreground,
    '--card': c.card,
    '--card-foreground': c.cardForeground,
    '--border': c.border,
    '--muted': c.muted,
    '--muted-foreground': c.mutedForeground,
    '--accent': c.accent,
    '--accent-foreground': c.accentForeground,
    '--destructive': c.destructive,
    '--radius': brandPack.tokens.radius,
    '--font-family': brandPack.tokens.fontFamily,
  };
}
