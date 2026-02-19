// ── Compound Interest Calculation Engine ──

export interface CompoundInterestInputs {
  initialInvestment: number;
  recurringInvestment: number;
  recurringFrequency: 'monthly' | 'annually';
  annualGrowthRate: number; // percentage, e.g. 6
  annualDepositIncrease: number; // percentage, e.g. 2
  years: number;
}

export interface YearData {
  year: number;
  deposits: number; // cumulative deposits contributed by end of this year
  interest: number; // cumulative interest earned by end of this year
  totalValue: number; // portfolio value at end of this year
}

export interface MonthData {
  month: number; // 1-based absolute month (1 = first month ever)
  year: number;
  monthInYear: number; // 1–12
  deposits: number; // cumulative
  interest: number; // cumulative
  totalValue: number;
}

export interface CompoundInterestResult {
  futureValue: number;
  totalInterest: number;
  totalDeposits: number;
  yearByYear: YearData[];
  monthByMonth: MonthData[];
}

export function calculateCompoundInterest(
  inputs: CompoundInterestInputs,
): CompoundInterestResult {
  const {
    initialInvestment,
    recurringInvestment,
    recurringFrequency,
    annualGrowthRate,
    annualDepositIncrease,
    years,
  } = inputs;

  const monthlyRate = annualGrowthRate / 100 / 12;
  const yearByYear: YearData[] = [];
  const monthByMonth: MonthData[] = [];

  let balance = initialInvestment;
  let cumulativeDeposits = initialInvestment;
  let absoluteMonth = 0;

  for (let y = 1; y <= years; y++) {
    // Deposit escalation multiplier (year 1 = 1×, year 2 = 1+inc%, …)
    const yearMultiplier = Math.pow(1 + annualDepositIncrease / 100, y - 1);

    if (recurringFrequency === 'monthly') {
      // User enters the MONTHLY amount → deposit that each month
      const monthlyDeposit = recurringInvestment * yearMultiplier;
      for (let m = 1; m <= 12; m++) {
        balance += monthlyDeposit;
        cumulativeDeposits += monthlyDeposit;
        balance *= 1 + monthlyRate;
        absoluteMonth++;

        monthByMonth.push({
          month: absoluteMonth,
          year: y,
          monthInYear: m,
          deposits: Math.round(cumulativeDeposits),
          interest: Math.round(balance - cumulativeDeposits),
          totalValue: Math.round(balance),
        });
      }
    } else {
      // User enters the ANNUAL amount → lump-sum at start of year, compound monthly
      const annualDeposit = recurringInvestment * yearMultiplier;
      balance += annualDeposit;
      cumulativeDeposits += annualDeposit;

      for (let m = 1; m <= 12; m++) {
        balance *= 1 + monthlyRate;
        absoluteMonth++;

        monthByMonth.push({
          month: absoluteMonth,
          year: y,
          monthInYear: m,
          deposits: Math.round(cumulativeDeposits),
          interest: Math.round(balance - cumulativeDeposits),
          totalValue: Math.round(balance),
        });
      }
    }

    yearByYear.push({
      year: y,
      deposits: Math.round(cumulativeDeposits),
      interest: Math.round(balance - cumulativeDeposits),
      totalValue: Math.round(balance),
    });
  }

  return {
    futureValue: Math.round(balance),
    totalInterest: Math.round(balance - cumulativeDeposits),
    totalDeposits: Math.round(cumulativeDeposits),
    yearByYear,
    monthByMonth,
  };
}
