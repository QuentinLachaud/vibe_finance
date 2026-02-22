import { useCallback, useState } from 'react';
import { useAuth } from '../state/AuthContext';

/**
 * Returns a gate function: call it with an action callback.
 * If the user is logged in, action runs immediately.
 * If not, a login modal is shown; on success, the action runs.
 *
 * Usage:
 *   const { gate, loginModal } = useAuthGate();
 *   <button onClick={() => gate(() => doProtectedThing())}>Do thing</button>
 *   {loginModal}
 */
export function useAuthGate() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const gate = useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        setPending(() => action);
        setShowLogin(true);
      }
    },
    [user],
  );

  const onLoginSuccess = useCallback(() => {
    setShowLogin(false);
    if (pending) {
      // small delay to let auth state propagate
      setTimeout(() => {
        pending();
        setPending(null);
      }, 100);
    }
  }, [pending]);

  const onLoginClose = useCallback(() => {
    setShowLogin(false);
    setPending(null);
  }, []);

  return { gate, showLogin, onLoginSuccess, onLoginClose };
}
