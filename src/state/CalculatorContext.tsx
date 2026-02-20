import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { Expense, IncomeFrequency } from '../types';
import { generateId } from '../utils/ids';

// ── State shape ──
export interface CalculatorState {
  income: number;
  incomeFrequency: IncomeFrequency;
  expenses: Expense[];
}

// ── Actions ──
type Action =
  | { type: 'SET_INCOME'; payload: number }
  | { type: 'SET_INCOME_FREQUENCY'; payload: IncomeFrequency }
  | { type: 'ADD_EXPENSE'; payload: { name: string; amount: number; icon?: string } }
  | { type: 'REMOVE_EXPENSE'; payload: string }
  | { type: 'UPDATE_EXPENSE'; payload: { id: string; name?: string; amount?: number; icon?: string } };

function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case 'SET_INCOME':
      return { ...state, income: action.payload };
    case 'SET_INCOME_FREQUENCY':
      return { ...state, incomeFrequency: action.payload };
    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [
          ...state.expenses,
          {
            id: generateId(),
            name: action.payload.name,
            amount: action.payload.amount,
            icon: action.payload.icon,
          },
        ],
      };
    case 'REMOVE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e,
        ),
      };
    default:
      return state;
  }
}

// ── Default state ──
const defaultExpenses: Expense[] = [
  { id: generateId(), name: 'Housing', amount: 1200, icon: '🏠' },
  { id: generateId(), name: 'Groceries', amount: 350, icon: '🛒' },
  { id: generateId(), name: 'Transportation', amount: 200, icon: '🚌' },
  { id: generateId(), name: 'Dining Out', amount: 150, icon: '🍽️' },
];

const initialState: CalculatorState = {
  income: 4500,
  incomeFrequency: 'monthly',
  expenses: defaultExpenses,
};

// ── Persistence ──
const CALC_STORAGE_KEY = 'vf-calculator';

function loadInitialState(): CalculatorState {
  try {
    const raw = localStorage.getItem(CALC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.income === 'number' && Array.isArray(parsed.expenses)) {
        return parsed as CalculatorState;
      }
    }
  } catch {
    // ignore
  }
  return initialState;
}

// ── Context ──
interface CalculatorContextValue {
  state: CalculatorState;
  dispatch: Dispatch<Action>;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState);

  // Persist state on every change
  useEffect(() => {
    try {
      localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return (
    <CalculatorContext.Provider value={{ state, dispatch }}>
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx)
    throw new Error('useCalculator must be used within CalculatorProvider');
  return ctx;
}
