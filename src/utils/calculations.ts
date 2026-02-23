import type { Expense, IncomeFrequency } from '../types';

/** Normalise income to a monthly figure */
export function normaliseToMonthly(
  amount: number,
  frequency: IncomeFrequency,
): number {
  return frequency === 'annually' ? amount / 12 : amount;
}

/** Sum all expense amounts */
export function totalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Monthly savings = monthly income − total expenses */
export function monthlySavings(
  monthlyIncome: number,
  expenses: Expense[],
): number {
  return monthlyIncome - totalExpenses(expenses);
}

/** Savings rate as percentage (0 – 100) */
export function savingsRate(
  monthlyIncome: number,
  expenses: Expense[],
): number {
  if (monthlyIncome <= 0) return 0;
  const savings = monthlySavings(monthlyIncome, expenses);
  return Math.max(0, Math.round((savings / monthlyIncome) * 100));
}
