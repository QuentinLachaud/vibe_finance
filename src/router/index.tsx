import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { CalculatorPage } from '../pages/CalculatorPage';
import { CompoundInterestPage } from '../pages/CompoundInterestPage';
import { PortfolioSimulatorPage } from '../pages/PortfolioSimulatorPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <CalculatorPage /> },
      { path: '/compound-interest', element: <CompoundInterestPage /> },
      { path: '/retirement', element: <Navigate to="/" replace /> },
      { path: '/portfolio', element: <PortfolioSimulatorPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
