import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { LoadingCoin } from '../components/LoadingCoin';
import { LandingPage } from '../pages/LandingPage';
import { CalculatorPage } from '../pages/CalculatorPage';
import { SalaryLandingPage } from '../pages/SalaryLandingPage';
import { TakeHomePayPage } from '../pages/TakeHomePayPage';


const LAZY_RELOAD_PREFIX = 'takehomecalc-lazy-reload:';

function lazyWithReload(key: string, loader: () => Promise<{ default: ComponentType }>) {
  return lazy(async () => {
    const storageKey = `${LAZY_RELOAD_PREFIX}${key}`;
    try {
      const loaded = await loader();
      try { sessionStorage.removeItem(storageKey); } catch { /* storage may be blocked */ }
      return loaded;
    } catch (error) {
      let shouldReload = false;
      try {
        shouldReload = sessionStorage.getItem(storageKey) !== '1';
        if (shouldReload) sessionStorage.setItem(storageKey, '1');
        else sessionStorage.removeItem(storageKey);
      } catch {
        // If session storage is unavailable, fall through to the visible error boundary.
      }

      if (shouldReload && typeof window !== 'undefined') {
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}

type LazyRouteBoundaryState = { failed: boolean };

class LazyRouteBoundary extends Component<{ children: ReactNode }, LazyRouteBoundaryState> {
  state: LazyRouteBoundaryState = { failed: false };

  static getDerivedStateFromError(): LazyRouteBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[route] lazy page failed to load', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page-container">
        <div className="ps-page">
          <h1 className="ps-page-title">Page failed to load</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            The app was updated while this tab was open. Reload to fetch the latest page files.
          </p>
          <button
            className="ps-btn ps-btn--primary"
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

// Lazy-loaded heavy pages — instant tab switch, loading coin while JS loads
const CompoundInterestPage = lazyWithReload('compound-interest', () =>
  import('../pages/CompoundInterestPage').then((m) => ({ default: m.CompoundInterestPage })),
);
const NetWorthPage = lazyWithReload('net-worth', () =>
  import('../pages/NetWorthPage').then((m) => ({ default: m.NetWorthPage })),
);
const PortfolioSimulatorPage = lazyWithReload('portfolio', () =>
  import('../pages/PortfolioSimulatorPage').then((m) => ({ default: m.PortfolioSimulatorPage })),
);
const ReportsPage = lazyWithReload('reports', () =>
  import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazyWithReload('settings', () =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function Lazy({ children }: { children: ReactNode }) {
  return (
    <LazyRouteBoundary>
      <Suspense fallback={<LoadingCoin />}>{children}</Suspense>
    </LazyRouteBoundary>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/salary/:amountSlug', element: <SalaryLandingPage /> },
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
