// ── Compound Interest Calculation Engine ──

export interface CompoundInterestInputs {
  initialInvestment: number;
  recurringInvestment: number;
  recurringFrequency: 'monthly' | 'annually';
  annualGrowthRate: number; // percentage, e.g. 6
  annualDepositIncrease: number; // percentage, e.g. 2
  years: number;
  mode: 'deposit' | 'withdrawal'; // deposit adds money, withdrawal removes money
}

export interface YearData {
  year: number;
  deposits: number; // cumulative deposits contributed (incl. initial)
  withdrawals: number; // cumulative withdrawals (0 in deposit mode)
  interest: number; // cumulative interest earned
  totalValue: number; // portfolio value at end of this year
}

export interface MonthData {
  month: number; // 1-based absolute month (1 = first month ever)
  year: number;
  monthInYear: number; // 1–12
  deposits: number; // cumulative
  withdrawals: number; // cumulative
  interest: number; // cumulative
  totalValue: number;
}

export interface CompoundInterestResult {
  futureValue: number;
  totalInterest: number;
  totalDeposits: number;
  totalWithdrawals: number;
  initialInvestment: number;
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
    mode,
  } = inputs;

  const monthlyRate = annualGrowthRate / 100 / 12;
  const yearByYear: YearData[] = [];
  const monthByMonth: MonthData[] = [];

  let balance = initialInvestment;
  let cumulativeDeposits = initialInvestment;
  let cumulativeWithdrawals = 0;
  let absoluteMonth = 0;

  const isWithdrawal = mode === 'withdrawal';

  for (let y = 1; y <= years; y++) {
    // Escalation multiplier (year 1 = 1×, year 2 = 1+inc%, …)
    const yearMultiplier = Math.pow(1 + annualDepositIncrease / 100, y - 1);

    if (recurringFrequency === 'monthly') {
      const monthlyAmount = recurringInvestment * yearMultiplier;
      for (let m = 1; m <= 12; m++) {
        if (isWithdrawal) {
          // Withdraw — but don't let balance go below 0
          const withdrawal = Math.min(monthlyAmount, Math.max(0, balance));
          balance -= withdrawal;
          cumulativeWithdrawals += withdrawal;
        } else {
          balance += monthlyAmount;
          cumulativeDeposits += monthlyAmount;
        }
        balance *= 1 + monthlyRate;
        absoluteMonth++;

        const interest = balance - cumulativeDeposits + cumulativeWithdrawals;
        monthByMonth.push({
          month: absoluteMonth,
          year: y,
          monthInYear: m,
          deposits: Math.round(cumulativeDeposits),
          withdrawals: Math.round(cumulativeWithdrawals),
          interest: Math.round(interest),
          totalValue: Math.round(balance),
        });
      }
    } else {
      // Annual lump-sum
      const annualAmount = recurringInvestment * yearMultiplier;

      if (isWithdrawal) {
        const withdrawal = Math.min(annualAmount, Math.max(0, balance));
        balance -= withdrawal;
        cumulativeWithdrawals += withdrawal;
      } else {
        balance += annualAmount;
        cumulativeDeposits += annualAmount;
      }

      for (let m = 1; m <= 12; m++) {
        balance *= 1 + monthlyRate;
        absoluteMonth++;

        const interest = balance - cumulativeDeposits + cumulativeWithdrawals;
        monthByMonth.push({
          month: absoluteMonth,
          year: y,
          monthInYear: m,
          deposits: Math.round(cumulativeDeposits),
          withdrawals: Math.round(cumulativeWithdrawals),
          interest: Math.round(interest),
          totalValue: Math.round(balance),
        });
      }
    }

    const interest = balance - cumulativeDeposits + cumulativeWithdrawals;
    yearByYear.push({
      year: y,
      deposits: Math.round(cumulativeDeposits),
      withdrawals: Math.round(cumulativeWithdrawals),
      interest: Math.round(interest),
      totalValue: Math.round(balance),
    });
  }

  const totalInterest = balance - cumulativeDeposits + cumulativeWithdrawals;

  return {
    futureValue: Math.round(balance),
    totalInterest: Math.round(totalInterest),
    totalDeposits: Math.round(cumulativeDeposits),
    totalWithdrawals: Math.round(cumulativeWithdrawals),
    initialInvestment,
    yearByYear,
    monthByMonth,
  };
}
