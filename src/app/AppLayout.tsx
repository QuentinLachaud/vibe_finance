import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { LoadingCoin } from '../components/LoadingCoin';
import { trackPageView } from '../config/firebase';
import { useSwipeNavigation, SWIPE_PAGES } from '../hooks/useSwipeNavigation';

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
  '/reports': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
};

const TAB_LABELS: Record<string, string> = {
  '/take-home-pay': 'Pay',
  '/calculator': 'Save',
  '/compound-interest': 'Grow',
  '/net-worth': 'Worth',
  '/portfolio': 'Sim',
  '/reports': 'Reports',
};

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mainRef, indicator, isNavigating, swipeDx, slideDirection, currentPageIndex } =
    useSwipeNavigation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path, document.title);
  }, [location.pathname, location.search, location.hash]);

  // Build slide class for enter animation
  const slideClass = slideDirection
    ? `app-main--slide-in-from-${slideDirection === 'left' ? 'right' : 'left'}`
    : '';

  // Inline transform for live drag feedback (only when actively dragging)
  const dragStyle: React.CSSProperties =
    swipeDx !== 0
      ? { transform: `translateX(${swipeDx}px)`, transition: 'none' }
      : {};

  const showBottomNav = currentPageIndex !== -1;

  return (
    <div className="app-layout">
      <Header />
      <main
        className={`app-main ${slideClass} ${showBottomNav ? 'app-main--has-bottom-nav' : ''}`}
        ref={mainRef}
        style={dragStyle}
      >
        <Outlet />
      </main>

      {indicator.visible && (
        <div
          className={`swipe-nav-indicator swipe-nav-indicator--${indicator.direction}`}
          style={{
            transform: `translateY(-50%) scale(${0.72 + indicator.progress * 0.55})`,
            opacity: 0.24 + indicator.progress * 0.76,
          }}
          aria-hidden="true"
        >
          <span className="swipe-nav-indicator__circle">
            {indicator.direction === 'left' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </span>
        </div>
      )}

      {isNavigating && (
        <div className="swipe-loading-overlay">
          <LoadingCoin text="Opening view…" />
        </div>
      )}

      {/* ── Mobile Bottom Navigation ── */}
      {showBottomNav && (
        <nav className="mobile-bottom-nav" aria-label="Tool navigation">
          {SWIPE_PAGES.map((path, i) => {
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
        </nav>
      )}
    </div>
  );
}
