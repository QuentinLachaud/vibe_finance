import { useEffect, useRef, useCallback, useState } from 'react';
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

export type SwipeDirection = 'left' | 'right';

type SwipeIndicatorState = {
  visible: boolean;
  direction: SwipeDirection;
  progress: number; // 0..1
};

/**
 * Enables horizontal swipe navigation between pages on mobile.
 * Attach the returned ref to the scrollable `<main>` wrapper.
 */
export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef(0);
  const startY = useRef(0);
  const startTarget = useRef<EventTarget | null>(null);
  const tracking = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<SwipeIndicatorState>({
    visible: false,
    direction: 'left',
    progress: 0,
  });
  const [isNavigating, setIsNavigating] = useState(false);

  const canSwipeTo = useCallback((direction: SwipeDirection) => {
    const idx = SWIPE_PAGES.indexOf(location.pathname);
    if (idx === -1) return false;
    if (direction === 'left') return idx < SWIPE_PAGES.length - 1;
    return idx > 0;
  }, [location.pathname]);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const idx = SWIPE_PAGES.indexOf(location.pathname);
      if (idx === -1) return; // not a swipeable page

      if (direction === 'left' && idx < SWIPE_PAGES.length - 1) {
        setIsNavigating(true);
        navigate(SWIPE_PAGES[idx + 1]);
      } else if (direction === 'right' && idx > 0) {
        setIsNavigating(true);
        navigate(SWIPE_PAGES[idx - 1]);
      }
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    if (!isNavigating) return;
    const timeout = window.setTimeout(() => setIsNavigating(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  useEffect(() => {
    setIsNavigating(false);
    setIndicator((prev) => ({ ...prev, visible: false, progress: 0 }));
  }, [location.pathname]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('input, textarea, select, button, a, [role="button"]'));
    };

    const onTouchStart = (e: TouchEvent) => {
      // Only on mobile-width viewports
      if (window.innerWidth > MOBILE_MAX_WIDTH) return;
      if (isInteractiveTarget(e.target)) return;
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTarget.current = e.target;
      tracking.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      // Stop tracking when user is clearly scrolling vertically
      if (dy > SWIPE_MAX_Y && dy > Math.abs(dx)) {
        tracking.current = false;
        setIndicator((prev) => ({ ...prev, visible: false, progress: 0 }));
        return;
      }

      if (Math.abs(dx) < 8) {
        setIndicator((prev) => ({ ...prev, visible: false, progress: 0 }));
        return;
      }

      const direction: SwipeDirection = dx < 0 ? 'left' : 'right';
      if (!canSwipeTo(direction)) {
        setIndicator((prev) => ({ ...prev, visible: false, progress: 0 }));
        return;
      }

      setIndicator({
        visible: true,
        direction,
        progress: Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD),
      });
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;

      if (isInteractiveTarget(startTarget.current)) {
        setIndicator((prev) => ({ ...prev, visible: false, progress: 0 }));
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      setIndicator((prev) => ({ ...prev, visible: false, progress: 0 }));

      // Ignore if mostly vertical scroll
      if (dy > SWIPE_MAX_Y) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      handleSwipe(dx < 0 ? 'left' : 'right');
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [canSwipeTo, handleSwipe]);

  return {
    mainRef,
    indicator,
    isNavigating,
  };
}
