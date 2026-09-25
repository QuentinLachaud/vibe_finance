import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { trackPageView } from '../config/firebase';

/* ── Compact SVG icons for the bottom tab bar ── */
const TAB_ICONS: Record<string, ReactNode> = {
  '/take-home-pay': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 14h4"/></svg>
  ),
  '/calculator': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  '/compound-interest': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  '/net-worth': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  ),
  '/portfolio': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10h-10V2z"/></svg>
  ),
  more: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
};

const TAB_LABELS: Record<string, string> = {
  '/take-home-pay': 'Pay',
  '/calculator': 'Save',
  '/portfolio': 'Portfolio',
  more: 'More',
};

const BOTTOM_NAV_PAGES = [
  '/take-home-pay',
  '/calculator',
  '/portfolio',
] as const;

const MORE_PAGES = [
  { path: '/compound-interest', label: 'Compound interest', detail: 'Forecast investment growth' },
  { path: '/net-worth', label: 'Net worth', detail: 'Track assets and liabilities' },
  { path: '/reports', label: 'Reports', detail: 'Create and download reports' },
  { path: '/settings', label: 'Settings', detail: 'Preferences and account' },
] as const;

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path, document.title);
  }, [location.pathname, location.search, location.hash]);

  const currentPageIndex = BOTTOM_NAV_PAGES.findIndex((path) => path === location.pathname);
  const isMoreRoute = MORE_PAGES.some((item) => item.path === location.pathname);
  const showBottomNav = currentPageIndex !== -1 || isMoreRoute;

  useEffect(() => setMoreOpen(false), [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  return (
    <div className="app-layout">
      <Header />
      <main className={`app-main ${showBottomNav ? 'app-main--has-bottom-nav' : ''}`}>
        <Outlet />
      </main>


      {/* ── Mobile Bottom Navigation ── */}
      {showBottomNav && (
        <nav className="mobile-bottom-nav" aria-label="Tool navigation">
          {BOTTOM_NAV_PAGES.map((path, i) => {
            const isActive = i === currentPageIndex;
            return (
              <button
                key={path}
                className={`mobile-bottom-nav__tab ${isActive ? 'mobile-bottom-nav__tab--active' : ''}`}
                onClick={() => {
                  if (!isActive) navigate(path);
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="mobile-bottom-nav__icon">{TAB_ICONS[path]}</span>
                <span className="mobile-bottom-nav__label">{TAB_LABELS[path]}</span>
              </button>
            );
          })}
          <button
            className={`mobile-bottom-nav__tab ${isMoreRoute ? 'mobile-bottom-nav__tab--active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
          >
            <span className="mobile-bottom-nav__icon">{TAB_ICONS.more}</span>
            <span className="mobile-bottom-nav__label">{TAB_LABELS.more}</span>
          </button>
        </nav>
      )}
      {moreOpen && (
        <div className="mobile-more-overlay" role="presentation" onClick={() => setMoreOpen(false)}>
          <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="More tools" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-more-sheet__handle" />
            <div className="mobile-more-sheet__heading">
              <h2>More</h2>
              <button className="mobile-more-sheet__close" onClick={() => setMoreOpen(false)} aria-label="Close more tools">×</button>
            </div>
            <nav className="mobile-more-sheet__list" aria-label="More tools">
              {MORE_PAGES.map((item) => (
                <button key={item.path} className="mobile-more-sheet__item" onClick={() => navigate(item.path)}>
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
