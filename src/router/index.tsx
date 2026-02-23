import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { LoadingCoin } from '../components/LoadingCoin';
import { LandingPage } from '../pages/LandingPage';
import { CalculatorPage } from '../pages/CalculatorPage';
import { TakeHomePayPage } from '../pages/TakeHomePayPage';

// Lazy-loaded heavy pages — instant tab switch, loading coin while JS loads
const CompoundInterestPage = lazy(() =>
  import('../pages/CompoundInterestPage').then((m) => ({ default: m.CompoundInterestPage })),
);
const NetWorthPage = lazy(() =>
  import('../pages/NetWorthPage').then((m) => ({ default: m.NetWorthPage })),
);
const PortfolioSimulatorPage = lazy(() =>
  import('../pages/PortfolioSimulatorPage').then((m) => ({ default: m.PortfolioSimulatorPage })),
);
const ReportsPage = lazy(() =>
  import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingCoin />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/calculator', element: <CalculatorPage /> },
      { path: '/compound-interest', element: <Lazy><CompoundInterestPage /></Lazy> },
      { path: '/take-home-pay', element: <TakeHomePayPage /> },
      { path: '/net-worth', element: <Lazy><NetWorthPage /></Lazy> },
      { path: '/retirement', element: <Navigate to="/calculator" replace /> },
      { path: '/portfolio', element: <Lazy><PortfolioSimulatorPage /></Lazy> },
      { path: '/reports', element: <Lazy><ReportsPage /></Lazy> },
      { path: '/settings', element: <Lazy><SettingsPage /></Lazy> },
    ],
  },
]);
