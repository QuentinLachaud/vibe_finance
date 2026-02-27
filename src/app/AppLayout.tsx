import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { trackPageView } from '../config/firebase';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export function AppLayout() {
  const location = useLocation();
  const mainRef = useSwipeNavigation();

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
    </div>
  );
}
