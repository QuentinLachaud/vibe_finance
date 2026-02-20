import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, firebaseEnabled } from '../config/firebase';

// ── Types ──

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authEnabled: boolean;
  signInWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

// ── Context ──

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[auth] onAuthStateChanged →', firebaseUser?.email ?? 'null');
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async (): Promise<{ ok: boolean; message?: string }> => {
    console.log('[auth] signInWithGoogle called, firebaseEnabled =', firebaseEnabled, ', auth =', !!auth);

    if (!firebaseEnabled || !auth) {
      return {
        ok: false,
        message: 'Firebase is not configured. Add VITE_FIREBASE_* keys to .env and restart the dev server.',
      };
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      console.log('[auth] calling signInWithPopup…');
      const result = await signInWithPopup(auth, provider);
      console.log('[auth] ✅ success →', result.user.displayName, result.user.email);
      return { ok: true };
    } catch (error: unknown) {
      console.error('[auth] ❌ signInWithPopup error:', error);

      const code = (error as { code?: string }).code ?? '';
      const raw  = (error as { message?: string }).message ?? '';

      const messageMap: Record<string, string> = {
        'auth/unauthorized-domain':
          `This domain is not authorized in Firebase. Go to Firebase Console → Authentication → Settings → Authorized domains and add "localhost".`,
        'auth/popup-blocked':
          'Popup was blocked by the browser. Allow popups for localhost and try again.',
        'auth/popup-closed-by-user':
          'Sign-in popup was closed. Please try again.',
        'auth/operation-not-allowed':
          'Google sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → Google and enable it.',
        'auth/internal-error':
          'Firebase internal error. Check that Google provider is enabled in Firebase Console.',
        'auth/cancelled-popup-request':
          'Multiple popups were opened. Please try again.',
      };

      const message = messageMap[code]
        || `Sign-in failed (${code || 'unknown'}): ${raw}`;
      return { ok: false, message };
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error('[auth] sign-out failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authEnabled: firebaseEnabled, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
