import {
  createContext,
  useContext,
  useReducer,
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
  | { type: 'ADD_EXPENSE'; payload: { name: string; amount: number } }
  | { type: 'REMOVE_EXPENSE'; payload: string }
  | { type: 'UPDATE_EXPENSE'; payload: { id: string; name?: string; amount?: number } };

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
  { id: generateId(), name: 'Housing', amount: 1200 },
  { id: generateId(), name: 'Groceries', amount: 350 },
  { id: generateId(), name: 'Transportation', amount: 200 },
  { id: generateId(), name: 'Dining Out', amount: 150 },
];

const initialState: CalculatorState = {
  income: 4500,
  incomeFrequency: 'monthly',
  expenses: defaultExpenses,
};

// ── Context ──
interface CalculatorContextValue {
  state: CalculatorState;
  dispatch: Dispatch<Action>;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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
