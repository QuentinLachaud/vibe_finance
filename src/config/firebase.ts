import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

/* ── Read Vite env vars ── */
const apiKey         = import.meta.env.VITE_FIREBASE_API_KEY         as string | undefined;
const authDomain     = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN     as string | undefined;
const projectId      = import.meta.env.VITE_FIREBASE_PROJECT_ID      as string | undefined;
const storageBucket  = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET  as string | undefined;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const appId          = import.meta.env.VITE_FIREBASE_APP_ID          as string | undefined;

export const firebaseEnabled = Boolean(apiKey && authDomain && projectId && appId);

// 🔍 Debug: see exactly what Vite injected
console.log('[firebase] env loaded →', {
  apiKey:    apiKey ? `${apiKey.slice(0, 8)}…` : '❌ MISSING',
  authDomain: authDomain ?? '❌ MISSING',
  projectId:  projectId ?? '❌ MISSING',
  appId:      appId ? `${appId.slice(0, 12)}…` : '❌ MISSING',
  firebaseEnabled,
});

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    console.log('[firebase] ✅ initialized successfully');
  } catch (err) {
    console.error('[firebase] ❌ init failed:', err);
  }
} else {
  console.warn('[firebase] ⚠️  Firebase disabled — missing env vars');
}

export { app, auth, googleProvider };
