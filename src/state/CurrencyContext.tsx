import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { CurrencyCode } from '../types';
import { CURRENCIES, type CurrencyInfo } from '../utils/currency';

interface CurrencyContextValue {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'vibe-finance-currency';

function getInitialCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode;
    if (stored && CURRENCIES[stored]) return stored;
  } catch {
    // ignore
  }
  return 'GBP';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>(getInitialCurrency);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, code);
  }, [code]);

  const setCurrency = (c: CurrencyCode) => setCode(c);

  return (
    <CurrencyContext.Provider value={{ currency: CURRENCIES[code], setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx)
    throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
