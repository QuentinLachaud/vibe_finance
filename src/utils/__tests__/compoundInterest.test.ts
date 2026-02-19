import { describe, it, expect } from 'vitest';
import {
  calculateCompoundInterest,
  type CompoundInterestInputs,
} from '../compoundInterest';

const base: CompoundInterestInputs = {
  initialInvestment: 10_000,
  recurringInvestment: 500,
  recurringFrequency: 'monthly',
  annualGrowthRate: 6,
  annualDepositIncrease: 0,
  years: 10,
};

function calc(overrides: Partial<CompoundInterestInputs> = {}) {
  return calculateCompoundInterest({ ...base, ...overrides });
}

describe('calculateCompoundInterest', () => {
  // ── Basic sanity ──

  it('returns correct number of year rows', () => {
    expect(calc().yearByYear).toHaveLength(10);
  });

  it('returns correct number of month rows', () => {
    expect(calc().monthByMonth).toHaveLength(120); // 10 years × 12 months
  });

  it('futureValue equals last yearByYear totalValue', () => {
    const r = calc();
    expect(r.futureValue).toBe(r.yearByYear[r.yearByYear.length - 1].totalValue);
  });

  it('futureValue equals last monthByMonth totalValue', () => {
    const r = calc();
    expect(r.futureValue).toBe(r.monthByMonth[r.monthByMonth.length - 1].totalValue);
  });

  it('totalDeposits + totalInterest ≈ futureValue', () => {
    const r = calc();
    // rounding may cause ±1
    expect(Math.abs(r.totalDeposits + r.totalInterest - r.futureValue)).toBeLessThanOrEqual(1);
  });

  // ── No recurring deposits ──

  it('compounds correctly with no deposits', () => {
    const r = calc({
      recurringInvestment: 0,
      initialInvestment: 10_000,
      annualGrowthRate: 6,
      years: 10,
    });
    // 10000 × (1 + 0.06/12)^120 ≈ 18 193
    expect(r.futureValue).toBeGreaterThan(18_100);
    expect(r.futureValue).toBeLessThan(18_300);
    expect(r.totalDeposits).toBe(10_000);
  });

  // ── Monthly vs Annual deposits should differ significantly ──

  it('monthly deposits contribute much more than annual deposits', () => {
    const monthly = calc({ recurringInvestment: 500, recurringFrequency: 'monthly' });
    const annual = calc({ recurringInvestment: 500, recurringFrequency: 'annually' });

    // Monthly: 500/mo × 12 × 10 = 60 000 in deposits (+ initial 10k = 70k)
    expect(monthly.totalDeposits).toBe(70_000);

    // Annual: 500/yr × 10 = 5 000 in deposits (+ initial 10k = 15k)
    expect(annual.totalDeposits).toBe(15_000);

    // Future values should differ by tens of thousands
    expect(monthly.futureValue - annual.futureValue).toBeGreaterThan(50_000);
  });

  it('£500/mo for 10yr at 6% gives ~£92k future value', () => {
    const r = calc({
      initialInvestment: 10_000,
      recurringInvestment: 500,
      recurringFrequency: 'monthly',
      annualGrowthRate: 6,
      years: 10,
    });
    // 70k deposits + ~30k interest ≈ 100,543
    expect(r.futureValue).toBeGreaterThan(99_000);
    expect(r.futureValue).toBeLessThan(102_000);
  });

  // ── Annual deposits ──

  it('£500/yr for 10yr at 6% produces correct deposits total', () => {
    const r = calc({
      recurringInvestment: 500,
      recurringFrequency: 'annually',
      years: 10,
    });
    expect(r.totalDeposits).toBe(15_000); // 10k initial + 500×10
  });

  // ── Deposit escalation ──

  it('deposit escalation increases contributions each year', () => {
    const flat = calc({ annualDepositIncrease: 0 });
    const escalated = calc({ annualDepositIncrease: 5 });

    expect(escalated.totalDeposits).toBeGreaterThan(flat.totalDeposits);
    expect(escalated.futureValue).toBeGreaterThan(flat.futureValue);
  });

  it('2% escalation on £500/mo: year 2 deposits per month = £510', () => {
    const r = calc({
      recurringInvestment: 500,
      recurringFrequency: 'monthly',
      annualDepositIncrease: 2,
      years: 2,
    });
    // Year 1: 500/mo × 12 = 6,000
    // Year 2: 510/mo × 12 = 6,120
    // Total deposits = 10,000 + 6,000 + 6,120 = 22,120
    expect(r.totalDeposits).toBe(22_120);
  });

  // ── Edge cases ──

  it('0% growth rate → no interest earned', () => {
    const r = calc({
      annualGrowthRate: 0,
      recurringInvestment: 100,
      recurringFrequency: 'monthly',
      years: 5,
    });
    expect(r.totalInterest).toBe(0);
    expect(r.futureValue).toBe(r.totalDeposits);
  });

  it('0 recurring investment → only initial compounds', () => {
    const r = calc({ recurringInvestment: 0, years: 1, annualGrowthRate: 12 });
    // 10,000 × (1 + 0.01)^12 ≈ 11,268
    expect(r.totalDeposits).toBe(10_000);
    expect(r.futureValue).toBeGreaterThan(11_200);
    expect(r.futureValue).toBeLessThan(11_300);
  });

  it('1 year returns 12 month rows and 1 year row', () => {
    const r = calc({ years: 1 });
    expect(r.yearByYear).toHaveLength(1);
    expect(r.monthByMonth).toHaveLength(12);
  });

  it('0 initial investment starts from zero', () => {
    const r = calc({ initialInvestment: 0, years: 1, recurringInvestment: 1000, recurringFrequency: 'monthly' });
    // First month deposits should be 1000
    expect(r.monthByMonth[0].deposits).toBe(1000);
  });

  // ── Month data correctness ──

  it('monthByMonth has correct year and monthInYear fields', () => {
    const r = calc({ years: 2 });
    // Month 13 = Year 2, monthInYear 1
    expect(r.monthByMonth[12].year).toBe(2);
    expect(r.monthByMonth[12].monthInYear).toBe(1);
    // Month 24 = Year 2, monthInYear 12
    expect(r.monthByMonth[23].year).toBe(2);
    expect(r.monthByMonth[23].monthInYear).toBe(12);
  });

  it('deposits are monotonically non-decreasing across months', () => {
    const r = calc({ years: 3 });
    for (let i = 1; i < r.monthByMonth.length; i++) {
      expect(r.monthByMonth[i].deposits).toBeGreaterThanOrEqual(
        r.monthByMonth[i - 1].deposits,
      );
    }
  });
});
