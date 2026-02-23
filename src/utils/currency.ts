import type { CurrencyCode, CurrencyInfo } from '../types';

export type { CurrencyInfo } from '../types';

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  GBP: { code: 'GBP', symbol: '£', label: '£ GBP' },
  USD: { code: 'USD', symbol: '$', label: '$ USD' },
  EUR: { code: 'EUR', symbol: '€', label: '€ EUR' },
  INR: { code: 'INR', symbol: '₹', label: '₹ INR' },
  JPY: { code: 'JPY', symbol: '¥', label: '¥ JPY' },
  CNY: { code: 'CNY', symbol: '¥', label: '¥ CNY' },
};

const LOCALE_MAP: Record<CurrencyCode, string> = {
  GBP: 'en-GB',
  USD: 'en-US',
  EUR: 'de-DE',
  INR: 'en-IN',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
};

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode,
): string {
  const { symbol } = CURRENCIES[currencyCode];
  const locale = LOCALE_MAP[currencyCode] ?? 'en-GB';
  const maxFrac = currencyCode === 'JPY' ? 0 : 0;
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  })}`;
}
