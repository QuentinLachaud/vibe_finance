import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { CalculatorPage } from '../pages/CalculatorPage';
import { CompoundInterestPage } from '../pages/CompoundInterestPage';
import { PortfolioSimulatorPage } from '../pages/PortfolioSimulatorPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <CalculatorPage /> },
      { path: '/compound-interest', element: <CompoundInterestPage /> },
      { path: '/retirement', element: <PlaceholderPage title="Retirement Calculator" /> },
      { path: '/portfolio', element: <PortfolioSimulatorPage /> },
      { path: '/settings', element: <PlaceholderPage title="Settings" /> },
    ],
  },
]);
