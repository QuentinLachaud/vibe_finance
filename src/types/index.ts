import type { CashFlow } from '../utils/simulationEngine';

// ── Currency ──
export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'INR' | 'JPY' | 'CNY';

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

// ── Saved Reports ──
export type ReportCategory = 'take-home-pay' | 'savings-calculator' | 'portfolio-simulation';

export interface SavedReport {
  id: string;
  name: string;
  category: ReportCategory;
  createdAt: string; // ISO timestamp
  /** Base64-encoded PDF data URL */
  dataUrl: string;
  /** Short summary line shown in the list */
  summary: string;
}
