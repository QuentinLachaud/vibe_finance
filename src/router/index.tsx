import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { LoadingCoin } from '../components/LoadingCoin';
import { LandingPage } from '../pages/LandingPage';
import { CalculatorPage } from '../pages/CalculatorPage';
import { SalaryLandingPage } from '../pages/SalaryLandingPage';
import { TakeHomePayPage } from '../pages/TakeHomePayPage';
import { CompoundInterestPage } from '../pages/CompoundInterestPage';
import { NetWorthPage } from '../pages/NetWorthPage';
import { PortfolioSimulatorPage } from '../pages/PortfolioSimulatorPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';


export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/salary/:amountSlug', element: <SalaryLandingPage /> },
      { path: '/calculator', element: <CalculatorPage /> },
      { path: '/compound-interest', element: <CompoundInterestPage /> },
      { path: '/take-home-pay', element: <TakeHomePayPage /> },
      { path: '/net-worth', element: <NetWorthPage /> },
      { path: '/retirement', element: <Navigate to="/calculator" replace /> },
      { path: '/portfolio', element: <PortfolioSimulatorPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
