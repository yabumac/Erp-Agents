import { NavItem, BrandPack } from '@repo/core';

export interface AppShellProps {
  brand: BrandPack;
  navigation: { group: string; items: NavItem[] }[];
  currentPath: string;
  activeTenantName: string;
  pendingApprovalsCount?: number;
  user: { name: string; email: string; avatarUrl?: string };
}

export function formatNavigationGroupTitle(group: string): string {
  const map: Record<string, string> = {
    communicate: 'Communicate',
    sell: 'Sell & CRM',
    operate: 'Operations & ERP',
    finance: 'Finance & Invoicing',
    insights: 'Automations & Insights',
    admin: 'Administration',
  };
  return map[group] || group.charAt(0).toUpperCase() + group.slice(1);
}
