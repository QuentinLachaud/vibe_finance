import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './state/ThemeContext';
import { CurrencyProvider } from './state/CurrencyContext';
import { CalculatorProvider } from './state/CalculatorContext';
import { router } from './router';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <CalculatorProvider>
          <RouterProvider router={router} />
        </CalculatorProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
