export type Region = 'england' | 'scotland';
export type SalaryPeriod = 'annual' | 'monthly' | 'weekly';

export interface TaxBandBreakdown {
  name: string;
  rate: string;
  amount: number;
}

export interface TaxBreakdown {
  grossAnnual: number;
  pensionSacrifice: number;
  taxableIncome: number;
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  totalDeductions: number;
  netAnnual: number;
  netMonthly: number;
  netWeekly: number;
  effectiveRate: number;
  taxBands: TaxBandBreakdown[];
  niBands: TaxBandBreakdown[];
}

const ENGLAND_BANDS = [
  { name: 'Basic Rate', lo: 0, hi: 37_700, rate: 0.20 },
  { name: 'Higher Rate', lo: 37_700, hi: 125_140, rate: 0.40 },
  { name: 'Additional Rate', lo: 125_140, hi: Infinity, rate: 0.45 },
];

const SCOTLAND_BANDS = [
  { name: 'Starter Rate', lo: 0, hi: 2_306, rate: 0.19 },
  { name: 'Basic Rate', lo: 2_306, hi: 13_991, rate: 0.20 },
  { name: 'Intermediate Rate', lo: 13_991, hi: 31_092, rate: 0.21 },
  { name: 'Higher Rate', lo: 31_092, hi: 62_430, rate: 0.42 },
  { name: 'Advanced Rate', lo: 62_430, hi: 125_140, rate: 0.45 },
  { name: 'Top Rate', lo: 125_140, hi: Infinity, rate: 0.48 },
];

const NI_THRESHOLD = 12_570;
const NI_UEL = 50_270;
const NI_RATE_MAIN = 0.08;
const NI_RATE_UPPER = 0.02;
const PERSONAL_ALLOWANCE = 12_570;
const PA_THRESHOLD = 100_000;

function calcPersonalAllowance(grossAnnual: number): number {
  if (grossAnnual <= PA_THRESHOLD) return PERSONAL_ALLOWANCE;
  const reduction = Math.floor((grossAnnual - PA_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

function calcIncomeTax(taxableIncome: number, bands: typeof ENGLAND_BANDS): { total: number; breakdown: TaxBandBreakdown[] } {
  let remaining = Math.max(0, taxableIncome);
  let total = 0;
  const breakdown: TaxBandBreakdown[] = [];

  for (const band of bands) {
    const bandWidth = band.hi - band.lo;
    const inBand = Math.min(remaining, bandWidth);

    if (inBand <= 0) {
      breakdown.push({ name: band.name, rate: `${(band.rate * 100).toFixed(0)}%`, amount: 0 });
      continue;
    }

    const tax = inBand * band.rate;
    total += tax;
    breakdown.push({
      name: band.name,
      rate: `${(band.rate * 100).toFixed(0)}%`,
      amount: Math.round(tax),
    });
    remaining -= inBand;
  }

  return { total, breakdown };
}

function calcNI(grossAnnual: number): { total: number; breakdown: TaxBandBreakdown[] } {
  const abovePT = Math.max(0, grossAnnual - NI_THRESHOLD);
  const mainBand = Math.min(abovePT, NI_UEL - NI_THRESHOLD);
  const upperBand = Math.max(0, abovePT - (NI_UEL - NI_THRESHOLD));

  const niMain = mainBand * NI_RATE_MAIN;
  const niUpper = upperBand * NI_RATE_UPPER;

  const breakdown: TaxBandBreakdown[] = [
    {
      name: `£${NI_THRESHOLD.toLocaleString('en-GB')}–£${NI_UEL.toLocaleString('en-GB')}`,
      rate: '8%',
      amount: Math.round(niMain),
    },
  ];

  if (upperBand > 0) {
    breakdown.push({
      name: `Above £${NI_UEL.toLocaleString('en-GB')}`,
      rate: '2%',
      amount: Math.round(niUpper),
    });
  }

  return { total: niMain + niUpper, breakdown };
}

export function annualiseSalary(amount: number, period: SalaryPeriod): number {
  switch (period) {
    case 'monthly':
      return amount * 12;
    case 'weekly':
      return amount * 52;
    default:
      return amount;
  }
}

export function calculateTakeHome(
  gross: number,
  region: Region,
  sacrificePct: number,
  sacrificeFixed: number,
): TaxBreakdown {
  const sacrificeFromPct = gross * (sacrificePct / 100);
  const pensionSacrifice = Math.round(sacrificeFromPct + sacrificeFixed);
  const adjustedGross = Math.max(0, gross - pensionSacrifice);
  const personalAllowance = calcPersonalAllowance(adjustedGross);
  const taxableIncome = Math.max(0, adjustedGross - personalAllowance);
  const bands = region === 'scotland' ? SCOTLAND_BANDS : ENGLAND_BANDS;
  const { total: incomeTax, breakdown: taxBands } = calcIncomeTax(taxableIncome, bands);
  const { total: nationalInsurance, breakdown: niBands } = calcNI(adjustedGross);
  const totalDeductions = Math.round(incomeTax + nationalInsurance);
  const netAnnual = adjustedGross - totalDeductions;

  return {
    grossAnnual: gross,
    pensionSacrifice,
    taxableIncome: Math.round(taxableIncome),
    personalAllowance,
    incomeTax: Math.round(incomeTax),
    nationalInsurance: Math.round(nationalInsurance),
    totalDeductions,
    netAnnual: Math.round(netAnnual),
    netMonthly: Math.round(netAnnual / 12),
    netWeekly: Math.round(netAnnual / 52),
    effectiveRate: gross > 0 ? Math.round(((incomeTax + nationalInsurance) / gross) * 1000) / 10 : 0,
    taxBands,
    niBands,
  };
}
