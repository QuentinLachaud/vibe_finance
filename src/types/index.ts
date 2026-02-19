// ── Currency ──
export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

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
}
