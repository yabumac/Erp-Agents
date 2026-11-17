export interface BrandTokens {
  colors: {
    primary: string;
    primaryForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    border: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
  };
  radius: string;
  fontFamily: string;
  density: 'compact' | 'comfortable';
}

export interface BrandPack {
  id: string;
  name: string;
  legalName: string;
  assets: {
    logoLight: string;
    logoDark: string;
    favicon: string;
    appIcon: string;
    emailHeaderLogo?: string;
  };
  tokens: BrandTokens;
  copy: {
    loginTitle: string;
    loginSubtitle: string;
    emailFooter: string;
    supportEmail: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
  defaultPersona: {
    name: string;
    tone: string;
    signoff: string;
  };
}

export const DEFAULT_BRAND_PACK: BrandPack = {
  id: 'default',
  name: 'Antigravity OS',
  legalName: 'Antigravity Systems Inc.',
  assets: {
    logoLight: '/brand/default/logo-light.svg',
    logoDark: '/brand/default/logo-dark.svg',
    favicon: '/brand/default/favicon.ico',
    appIcon: '/brand/default/app-icon.png',
  },
  tokens: {
    colors: {
      primary: '221.2 83.2% 53.3%',
      primaryForeground: '210 40% 98%',
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      border: '214.3 31.8% 91.4%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
    },
    radius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    density: 'comfortable',
  },
  copy: {
    loginTitle: 'Sign in to your operating workspace',
    loginSubtitle: 'Unified communications, CRM, finance, and operations',
    emailFooter: 'Sent securely via Antigravity OS',
    supportEmail: 'support@example.com',
  },
  defaultPersona: {
    name: 'Platform Assistant',
    tone: 'Professional, calm, concise',
    signoff: 'Best regards,',
  },
};

export class BrandLoader {
  private static brands: Map<string, BrandPack> = new Map([
    ['default', DEFAULT_BRAND_PACK],
  ]);

  public static register(pack: BrandPack): void {
    BrandLoader.brands.set(pack.id, pack);
  }

  public static get(brandId: string): BrandPack {
    return BrandLoader.brands.get(brandId) || DEFAULT_BRAND_PACK;
  }

  public static generateCssVariables(pack: BrandPack): string {
    const c = pack.tokens.colors;
    return `
:root {
  --primary: ${c.primary};
  --primary-foreground: ${c.primaryForeground};
  --background: ${c.background};
  --foreground: ${c.foreground};
  --card: ${c.card};
  --card-foreground: ${c.cardForeground};
  --border: ${c.border};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --accent: ${c.accent};
  --accent-foreground: ${c.accentForeground};
  --destructive: ${c.destructive};
  --radius: ${pack.tokens.radius};
  --font-family: ${pack.tokens.fontFamily};
}
    `.trim();
  }
}
