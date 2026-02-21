import type { NavItem } from '../types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Savings Calculator', path: '/' },
  { label: 'Compound Interest Calculator', path: '/compound-interest' },
  { label: 'Take Home Pay', path: '/take-home-pay' },
  { label: 'Net Worth', path: '/net-worth' },
  { label: 'Portfolio Simulator', path: '/portfolio', isGold: true },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings', isSettings: true },
];
