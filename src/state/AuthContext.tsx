import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, firebaseEnabled } from '../config/firebase';
import { syncUserProfile } from '../services/userDataService';

// ── Types ──

interface AuthResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authEnabled: boolean;
  signInWithGoogle: () => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
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
      setUser(firebaseUser);
      setLoading(false);
      // Sync profile to Firestore on every login
      if (firebaseUser) {
        syncUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        }).catch((e) =>
          console.error('[auth] profile sync failed:', e),
        );
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async (): Promise<AuthResult> => {
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

      const result = await signInWithPopup(auth, provider);
      void result; // consumed by onAuthStateChanged
      return { ok: true };
    } catch (error: unknown) {

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

  const signUpWithEmail = async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
    if (!firebaseEnabled || !auth) {
      return { ok: false, message: 'Firebase is not configured.' };
    }
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(newUser, { displayName });
      }
      return { ok: true };
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? '';
      const raw = (error as { message?: string }).message ?? '';

      const messageMap: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/operation-not-allowed': 'Email/password sign-up is not enabled in Firebase Console.',
      };

      return { ok: false, message: messageMap[code] || `Sign-up failed (${code || 'unknown'}): ${raw}` };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!firebaseEnabled || !auth) {
      return { ok: false, message: 'Firebase is not configured.' };
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? '';
      const raw = (error as { message?: string }).message ?? '';

      const messageMap: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email. Try signing up.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
        'auth/user-disabled': 'This account has been disabled.',
      };

      return { ok: false, message: messageMap[code] || `Sign-in failed (${code || 'unknown'}): ${raw}` };
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      // Clear all app-cached data from localStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('vf-') || key.startsWith('vibe-finance'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem('vf-calculator');
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      console.error('[auth] sign-out failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authEnabled: firebaseEnabled, signInWithGoogle, signUpWithEmail, signInWithEmail, logout }}>
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
