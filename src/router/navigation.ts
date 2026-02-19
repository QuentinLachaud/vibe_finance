import type { NavItem } from '../types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Savings Calculator', path: '/' },
  { label: 'Compound Interest Calculator', path: '/compound-interest' },
  { label: 'Retirement Calculator', path: '/retirement' },
  { label: 'Portfolio Simulator', path: '/portfolio', isGold: true },
  { label: 'Settings', path: '/settings', isSettings: true },
];
