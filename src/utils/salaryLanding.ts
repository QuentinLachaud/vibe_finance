import { SITE_NAME, SITE_URL, TAX_YEAR_LABEL } from '../config/seo';
import { calculateTakeHome } from './takeHomeTax';

export const MIN_SALARY_LANDING_AMOUNT = 10_000;
export const MAX_SALARY_LANDING_AMOUNT = 500_000;

export const POPULAR_SALARY_AMOUNTS = [
  20_000,
  25_000,
  30_000,
  35_000,
  40_000,
  45_000,
  50_000,
  55_000,
  60_000,
  70_000,
  80_000,
  90_000,
  100_000,
  120_000,
  150_000,
];

export interface SalaryLandingFaq {
  question: string;
  answer: string;
}

export interface SalaryLandingData {
  amount: number;
  amountLabel: string;
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
  description: string;
  headline: string;
  intro: string;
  monthlySummary: string;
  taxSummary: string;
  scotlandSummary: string;
  relatedAmounts: number[];
  faq: SalaryLandingFaq[];
  england: ReturnType<typeof calculateTakeHome>;
  scotland: ReturnType<typeof calculateTakeHome>;
}

export function formatSalaryAmount(amount: number): string {
  return `£${amount.toLocaleString('en-GB')}`;
}

export function sanitiseSalaryAmount(amount: number): number {
  return Math.min(MAX_SALARY_LANDING_AMOUNT, Math.max(MIN_SALARY_LANDING_AMOUNT, Math.round(amount)));
}

export function parseSalarySlug(slug: string | undefined): number | null {
  if (!slug) return null;
  const match = slug.match(/(\d[\d,]*)/);
  if (!match) return null;

  const numeric = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  return sanitiseSalaryAmount(numeric);
}

export function buildSalarySlug(amount: number): string {
  return `${sanitiseSalaryAmount(amount)}-after-tax-uk`;
}

export function buildSalaryPath(amount: number): string {
  return `/salary/${buildSalarySlug(amount)}`;
}

function buildRelatedAmounts(amount: number): number[] {
  const nearby = [amount - 10_000, amount - 5_000, amount + 5_000, amount + 10_000]
    .filter((value) => value >= MIN_SALARY_LANDING_AMOUNT && value <= MAX_SALARY_LANDING_AMOUNT);

  const merged = Array.from(new Set([...nearby, ...POPULAR_SALARY_AMOUNTS]))
    .filter((value) => value !== amount)
    .sort((left, right) => Math.abs(left - amount) - Math.abs(right - amount));

  return merged.slice(0, 6);
}

export function buildSalaryLandingData(rawAmount: number): SalaryLandingData {
  const amount = sanitiseSalaryAmount(rawAmount);
  const amountLabel = formatSalaryAmount(amount);
  const england = calculateTakeHome(amount, 'england', 0, 0);
  const scotland = calculateTakeHome(amount, 'scotland', 0, 0);
  const canonicalPath = buildSalaryPath(amount);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const title = `${amountLabel} after tax in the UK: monthly take-home pay for ${TAX_YEAR_LABEL} | ${SITE_NAME}`;
  const description = `${amountLabel} after tax in the UK is about ${formatSalaryAmount(england.netMonthly)} per month and ${formatSalaryAmount(england.netAnnual)} per year using ${TAX_YEAR_LABEL} England tax and NI rates. Compare monthly, weekly and Scottish take-home pay.`;
  const headline = `${amountLabel} after tax in the UK`;
  const intro = `${amountLabel} gross salary gives you an estimated ${formatSalaryAmount(england.netMonthly)} per month after Income Tax and National Insurance in England for ${TAX_YEAR_LABEL}. If you are searching for “${amount.toLocaleString('en-GB')} after tax UK”, “${amount.toLocaleString('en-GB')} net UK”, or “${amount.toLocaleString('en-GB')} take home pay UK”, this is the figure most people mean.`;
  const monthlySummary = `That works out to roughly ${formatSalaryAmount(england.netWeekly)} per week, with total deductions of ${formatSalaryAmount(england.totalDeductions)} across the year.`;
  const taxSummary = `On a ${amountLabel} salary, estimated Income Tax is ${formatSalaryAmount(england.incomeTax)} and employee National Insurance is ${formatSalaryAmount(england.nationalInsurance)} using standard England, Wales and Northern Ireland bands.`;
  const scotlandSummary = `If you are a Scottish taxpayer, the same ${amountLabel} salary comes out at about ${formatSalaryAmount(scotland.netMonthly)} per month and ${formatSalaryAmount(scotland.netAnnual)} per year after tax.`;

  const faq: SalaryLandingFaq[] = [
    {
      question: `How much is ${amount.toLocaleString('en-GB')} after tax per month in the UK?`,
      answer: `Using ${TAX_YEAR_LABEL} England tax and NI rates, ${amountLabel} after tax is about ${formatSalaryAmount(england.netMonthly)} per month, or ${formatSalaryAmount(england.netAnnual)} per year.`,
    },
    {
      question: `How much tax do you pay on ${amount.toLocaleString('en-GB')} in the UK?`,
      answer: `Estimated deductions on ${amountLabel} are ${formatSalaryAmount(england.incomeTax)} of Income Tax and ${formatSalaryAmount(england.nationalInsurance)} of employee National Insurance in England, Wales and Northern Ireland.`,
    },
    {
      question: `Does ${amount.toLocaleString('en-GB')} after tax change in Scotland?`,
      answer: `Yes. Scotland has different tax bands. A ${amountLabel} salary is about ${formatSalaryAmount(scotland.netMonthly)} per month after tax for a Scottish taxpayer under ${TAX_YEAR_LABEL} rates.`,
    },
  ];

  return {
    amount,
    amountLabel,
    canonicalPath,
    canonicalUrl,
    title,
    description,
    headline,
    intro,
    monthlySummary,
    taxSummary,
    scotlandSummary,
    relatedAmounts: buildRelatedAmounts(amount),
    faq,
    england,
    scotland,
  };
}
