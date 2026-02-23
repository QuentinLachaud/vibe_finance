import type { NavItem } from '../types';

export type PageNavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Take Home Pay', path: '/take-home-pay' },
  { label: 'Savings Calculator', path: '/' },
  { label: 'Compound Interest', path: '/compound-interest' },
  { label: 'Net Worth', path: '/net-worth' },
  { label: 'Portfolio Simulator', path: '/portfolio', isGold: true },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings', isSettings: true },
];

export const PAGE_NAV_ITEMS: PageNavItem[] = NAV_ITEMS
  .filter((item) => !item.isSettings)
  .map((item) => ({ label: item.label, href: item.path }));
