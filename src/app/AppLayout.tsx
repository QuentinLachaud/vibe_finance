import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { LoadingCoin } from '../components/LoadingCoin';
import { trackPageView } from '../config/firebase';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export function AppLayout() {
  const location = useLocation();
  const { mainRef, indicator, isNavigating } = useSwipeNavigation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path, document.title);
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="app-layout">
      <Header />
      <main className="app-main" ref={mainRef}>
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
    </div>
  );
}
