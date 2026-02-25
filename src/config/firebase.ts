import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;

export const firebaseEnabled = Boolean(apiKey && authDomain && projectId && appId);

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

type PageViewPayload = {
  page_path: string;
  page_title?: string;
  page_location?: string;
};

let pendingPageView: PageViewPayload | null = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error('[firebase] initialization failed:', err);
  }
} else {
  console.warn('[firebase] Firebase disabled: missing required VITE_FIREBASE_* values.');
}

if (app && typeof window !== 'undefined' && measurementId) {
  void isSupported()
    .then((supported) => {
      if (!supported || !app) return;

      analytics = getAnalytics(app);
      if (pendingPageView) {
        logEvent(analytics, 'page_view', pendingPageView);
        pendingPageView = null;
      }
    })
    .catch((err) => {
      console.warn('[firebase] analytics unavailable:', err);
    });
}

export function trackPageView(path: string, title?: string): void {
  const payload: PageViewPayload = {
    page_path: path,
    page_title: title,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  if (!analytics) {
    pendingPageView = payload;
    return;
  }

  logEvent(analytics, 'page_view', payload);
}

export { app, auth, db, analytics };
