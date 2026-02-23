import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/* ── Read Vite env vars ── */
const apiKey         = "AIzaSyAl2bLDN0OleS72OmBCwUBQtWJRRlBOztU"         as string | undefined;
const authDomain     = "takehomecalc-c86a7.firebaseapp.com"     as string | undefined;
const projectId      = "takehomecalc-c86a7"      as string | undefined;
const storageBucket  = "takehomecalc-c86a7.firebasestorage.app"  as string | undefined;
const messagingSenderId = "350118392468" as string | undefined;
const appId          = "1:350118392468:web:1186f627471bbb313eba81"          as string | undefined;

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
let db: Firestore | null = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
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

export { app, auth, googleProvider, db };
