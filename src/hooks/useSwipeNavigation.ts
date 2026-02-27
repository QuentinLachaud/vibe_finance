import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/** Ordered list of swipeable page paths (excludes settings / landing). */
const SWIPE_PAGES = [
  '/take-home-pay',
  '/calculator',
  '/compound-interest',
  '/net-worth',
  '/portfolio',
  '/reports',
];

const SWIPE_THRESHOLD = 60; // px – minimum distance for a swipe
const SWIPE_MAX_Y = 60;     // ignore if vertical scroll exceeds this
const MOBILE_MAX_WIDTH = 768;

/**
 * Enables horizontal swipe navigation between pages on mobile.
 * Attach the returned ref to the scrollable `<main>` wrapper.
 */
export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const idx = SWIPE_PAGES.indexOf(location.pathname);
      if (idx === -1) return; // not a swipeable page

      if (direction === 'left' && idx < SWIPE_PAGES.length - 1) {
        navigate(SWIPE_PAGES[idx + 1]);
      } else if (direction === 'right' && idx > 0) {
        navigate(SWIPE_PAGES[idx - 1]);
      }
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only on mobile-width viewports
      if (window.innerWidth > MOBILE_MAX_WIDTH) return;
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      tracking.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      // Ignore if mostly vertical scroll
      if (dy > SWIPE_MAX_Y) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      handleSwipe(dx < 0 ? 'left' : 'right');
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleSwipe]);

  return mainRef;
}
