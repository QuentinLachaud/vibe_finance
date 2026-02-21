import type { CashFlow } from '../utils/simulationEngine';

// ── Currency ──
export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

// ── Scenarios ──
export interface SavedScenario {
  id: string;
  name: string;
  startingBalance: number;
  simulationEnd: string;
  cashFlows: CashFlow[];
}

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

// ── Expenses ──
export interface Expense {
  id: string;
  name: string;
  amount: number;
  icon?: string;
}

// ── Income ──
export type IncomeFrequency = 'monthly' | 'annually';

// ── Theme ──
export type ThemeMode = 'light' | 'dark';

// ── Navigation ──
export interface NavItem {
  label: string;
  path: string;
  isGold?: boolean;
  isSettings?: boolean;
}
