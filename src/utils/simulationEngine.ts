// ── Monte Carlo Portfolio Simulation Engine ──

// ── Types ──

export type CashFlowType = 'one-off' | 'recurring-deposit' | 'recurring-withdrawal';

export interface CashFlow {
  id: string;
  type: CashFlowType;
  label: string;
  amount: number;
  /** Annual growth rate as percentage (e.g. 6 = 6%) */
  growthRate: number;
  /** For one-off: the exact date. For recurring: start date. */
  startDate: string; // "YYYY-MM"
  /** For recurring only — end date (inclusive). */
  endDate?: string; // "YYYY-MM"
  /** For recurring: 'monthly' | 'annually' */
  frequency?: 'monthly' | 'annually';
  /** Whether this cash flow is included in the simulation. */
  enabled: boolean;
}

export interface SimulationInputs {
  startingBalance: number;
  cashFlows: CashFlow[];
  /** Annual volatility as percentage (e.g. 12 = 12%). Default 12. */
  volatility: number;
  /** Number of simulation paths. Default 500. */
  numPaths: number;
  /** Optional override for simulation end date "YYYY-MM". */
  endOverride?: string;
}

export interface TimeStep {
  /** Display label, e.g. "2025", "Jan 2026" */
  label: string;
  /** Absolute month index (0 = simulation start) */
  monthIndex: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

export interface SimulationResult {
  timeSteps: TimeStep[];
  finalMedian: number;
  finalP10: number;
  finalP90: number;
}

// ── Helpers ──

/** Parse "YYYY-MM" to {year, month} (month is 1-based). */
export function parseYM(s: string): { year: number; month: number } {
  const [y, m] = s.split('-').map(Number);
  return { year: y, month: m };
}

/** Convert {year, month} to absolute month count from epoch. */
export function toAbsMonth(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/** Absolute month back to label. */
function absMonthToLabel(abs: number): string {
  const year = Math.floor(abs / 12);
  return String(year);
}

/** Box-Muller transform: generate standard normal random. */
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Compute percentile from sorted array (linear interpolation). */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── Simulation ──

/**
 * Determine the simulation time range from cash flows.
 * Start: earliest cash flow date (or today if none).
 * End: latest cash flow end date (or start + 30 years).
 */
function getSimulationRange(cashFlows: CashFlow[], endOverride?: string): {
  startAbs: number;
  endAbs: number;
} {
  const now = new Date();
  const currentAbs = toAbsMonth(now.getFullYear(), now.getMonth() + 1);

  let startAbs = currentAbs;
  let endAbs = currentAbs + 30 * 12; // default 30 years

  if (cashFlows.length > 0) {
    const starts = cashFlows.map((s) => {
      const p = parseYM(s.startDate);
      return toAbsMonth(p.year, p.month);
    });
    const ends = cashFlows
      .filter((s) => s.endDate)
      .map((s) => {
        const p = parseYM(s.endDate!);
        return toAbsMonth(p.year, p.month);
      });

    startAbs = Math.min(currentAbs, ...starts);
    if (ends.length > 0) {
      endAbs = Math.max(endAbs, ...ends);
    }
    // Also ensure we cover at least 1 year past all one-off events
    const oneOffs = cashFlows
      .filter((s) => s.type === 'one-off')
      .map((s) => {
        const p = parseYM(s.startDate);
        return toAbsMonth(p.year, p.month);
      });
    if (oneOffs.length > 0) {
      endAbs = Math.max(endAbs, Math.max(...oneOffs) + 12);
    }
  }

  // Apply endOverride if provided
  if (endOverride) {
    const eo = parseYM(endOverride);
    endAbs = toAbsMonth(eo.year, eo.month);
  }

  return { startAbs, endAbs };
}

/**
 * For a given month (absolute), compute net cash flow from all cash flows.
 * Returns the sum of deposits/withdrawals applying that month.
 */
function monthlyCashFlowAt(absMonth: number, cashFlows: CashFlow[]): number {
  let flow = 0;

  for (const s of cashFlows) {
    const sStart = parseYM(s.startDate);
    const sStartAbs = toAbsMonth(sStart.year, sStart.month);

    if (s.type === 'one-off') {
      if (absMonth === sStartAbs) {
        flow += s.amount;
      }
      continue;
    }

    // Recurring
    const sEnd = s.endDate ? parseYM(s.endDate) : null;
    const sEndAbs = sEnd ? toAbsMonth(sEnd.year, sEnd.month) : Infinity;

    if (absMonth < sStartAbs || absMonth > sEndAbs) continue;

    if (s.frequency === 'monthly') {
      // Apply every month in range
      flow += s.type === 'recurring-withdrawal' ? -s.amount : s.amount;
    } else {
      // Annually: apply on the anniversary month
      const monthInYear = absMonth % 12;
      const startMonthInYear = sStartAbs % 12;
      if (monthInYear === startMonthInYear) {
        flow += s.type === 'recurring-withdrawal' ? -s.amount : s.amount;
      }
    }
  }

  return flow;
}

/**
 * Blend the growth rate based on active cash flows at a given month.
 * Weighted average by absolute value of their amounts.
 */
function blendedMonthlyReturn(
  absMonth: number,
  cashFlows: CashFlow[],
  defaultAnnualGrowth: number,
): number {
  let totalWeight = 0;
  let weightedGrowth = 0;

  for (const s of cashFlows) {
    const sStart = parseYM(s.startDate);
    const sStartAbs = toAbsMonth(sStart.year, sStart.month);

    if (s.type === 'one-off') {
      if (absMonth === sStartAbs) {
        totalWeight += Math.abs(s.amount);
        weightedGrowth += s.growthRate * Math.abs(s.amount);
      }
      continue;
    }

    const sEnd = s.endDate ? parseYM(s.endDate) : null;
    const sEndAbs = sEnd ? toAbsMonth(sEnd.year, sEnd.month) : Infinity;
    if (absMonth >= sStartAbs && absMonth <= sEndAbs) {
      totalWeight += Math.abs(s.amount);
      weightedGrowth += s.growthRate * Math.abs(s.amount);
    }
  }

  const annualGrowth = totalWeight > 0
    ? weightedGrowth / totalWeight
    : defaultAnnualGrowth;

  return annualGrowth / 100 / 12;
}

/**
 * Run Monte Carlo simulation.
 */
export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const { startingBalance, cashFlows: allCashFlows, volatility, numPaths, endOverride } = inputs;
  const cashFlows = allCashFlows.filter(s => s.enabled);
  const monthlyVol = volatility / 100 / Math.sqrt(12);

  const { startAbs, endAbs } = getSimulationRange(cashFlows, endOverride);
  const totalMonths = endAbs - startAbs;

  if (totalMonths <= 0) {
    return {
      timeSteps: [],
      finalMedian: startingBalance,
      finalP10: startingBalance,
      finalP90: startingBalance,
    };
  }

  // Simulate all paths: paths[pathIdx][monthIdx] = portfolio value
  const paths: number[][] = [];

  for (let p = 0; p < numPaths; p++) {
    const path: number[] = new Array(totalMonths + 1);
    path[0] = startingBalance;

    for (let m = 1; m <= totalMonths; m++) {
      const absMonth = startAbs + m;
      const cashFlow = monthlyCashFlowAt(absMonth, cashFlows);
      const monthlyReturn = blendedMonthlyReturn(absMonth, cashFlows, 6);
      const randomReturn = monthlyReturn + monthlyVol * randn();

      let value = path[m - 1] * (1 + randomReturn) + cashFlow;
      if (value < 0) value = 0;
      path[m] = value;
    }

    paths.push(path);
  }

  // Build timesteps — sample yearly for cleaner charts (or monthly if < 5 years)
  const useMonthly = totalMonths <= 60;
  const stepSize = useMonthly ? 1 : 12;
  const timeSteps: TimeStep[] = [];

  for (let m = 0; m <= totalMonths; m += stepSize) {
    // Also include the last month if stepping misses it
    const values = paths.map((path) => path[Math.min(m, totalMonths)]).sort((a, b) => a - b);

    timeSteps.push({
      label: absMonthToLabel(startAbs + m),
      monthIndex: m,
      p10: Math.round(percentile(values, 10)),
      p25: Math.round(percentile(values, 25)),
      median: Math.round(percentile(values, 50)),
      p75: Math.round(percentile(values, 75)),
      p90: Math.round(percentile(values, 90)),
    });
  }

  // Ensure last timestep is included
  const lastTs = timeSteps[timeSteps.length - 1];
  if (lastTs && lastTs.monthIndex !== totalMonths) {
    const values = paths.map((path) => path[totalMonths]).sort((a, b) => a - b);
    timeSteps.push({
      label: absMonthToLabel(endAbs),
      monthIndex: totalMonths,
      p10: Math.round(percentile(values, 10)),
      p25: Math.round(percentile(values, 25)),
      median: Math.round(percentile(values, 50)),
      p75: Math.round(percentile(values, 75)),
      p90: Math.round(percentile(values, 90)),
    });
  }

  const finalValues = paths.map((path) => path[totalMonths]).sort((a, b) => a - b);

  return {
    timeSteps,
    finalMedian: Math.round(percentile(finalValues, 50)),
    finalP10: Math.round(percentile(finalValues, 10)),
    finalP90: Math.round(percentile(finalValues, 90)),
  };
}

/** Generate a unique ID. */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Get current month as "YYYY-MM". */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Format "YYYY-MM" to "Jan 2025". */
export function formatMonth(ym: string): string {
  const { year, month } = parseYM(ym);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[month - 1]} ${year}`;
}
