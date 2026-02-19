import { describe, it, expect } from 'vitest';
import {
  normaliseToMonthly,
  totalExpenses,
  monthlySavings,
  savingsRate,
} from '../calculations';
import type { Expense } from '../../types';

const mockExpenses: Expense[] = [
  { id: '1', name: 'Rent', amount: 1200, icon: '🏠' },
  { id: '2', name: 'Food', amount: 400, icon: '🍔' },
  { id: '3', name: 'Transport', amount: 150, icon: '🚗' },
];

describe('normaliseToMonthly', () => {
  it('returns amount unchanged for monthly frequency', () => {
    expect(normaliseToMonthly(5000, 'monthly')).toBe(5000);
  });

  it('divides by 12 for annual frequency', () => {
    expect(normaliseToMonthly(60000, 'annually')).toBe(5000);
  });

  it('handles 0', () => {
    expect(normaliseToMonthly(0, 'monthly')).toBe(0);
    expect(normaliseToMonthly(0, 'annually')).toBe(0);
  });
});

describe('totalExpenses', () => {
  it('sums all expense amounts', () => {
    expect(totalExpenses(mockExpenses)).toBe(1750);
  });

  it('returns 0 for empty array', () => {
    expect(totalExpenses([])).toBe(0);
  });
});

describe('monthlySavings', () => {
  it('returns income minus expenses', () => {
    expect(monthlySavings(5000, mockExpenses)).toBe(3250);
  });

  it('returns negative when expenses exceed income', () => {
    expect(monthlySavings(1000, mockExpenses)).toBe(-750);
  });
});

describe('savingsRate', () => {
  it('returns correct percentage', () => {
    // 3250 / 5000 = 65%
    expect(savingsRate(5000, mockExpenses)).toBe(65);
  });

  it('returns 0 when income is 0', () => {
    expect(savingsRate(0, mockExpenses)).toBe(0);
  });

  it('returns 0 when income is negative', () => {
    expect(savingsRate(-100, mockExpenses)).toBe(0);
  });

  it('returns 100% when no expenses', () => {
    expect(savingsRate(5000, [])).toBe(100);
  });
});
