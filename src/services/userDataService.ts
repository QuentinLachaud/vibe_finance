/**
 * Unified Firestore persistence service for all user data.
 *
 * Schema:
 *   users/{uid}/
 *     profile/info          → { displayName, email, photoURL, createdAt, lastLogin }
 *     scenarios/{id}        → SavedScenario
 *     netWorth/data         → NetWorthData (single doc, full snapshot)
 *     settings/prefs        → { currency, theme }
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedScenario, SavedBudget } from '../types';
import type { NetWorthData } from '../pages/NetWorthPage';

// ── Helpers ──

function userDoc(uid: string, ...path: string[]) {
  if (!db) throw new Error('Firestore not initialised');
  return doc(db, 'users', uid, ...path);
}

function userCol(uid: string, ...path: string[]) {
  if (!db) throw new Error('Firestore not initialised');
  return collection(db, 'users', uid, ...path);
}

// ── Profile ──

export async function syncUserProfile(uid: string, profile: {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<void> {
  if (!db) return;
  const ref = userDoc(uid, 'profile', 'info');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { ...profile, lastLogin: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, { ...profile, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
  }
}

// ── Scenarios ──

export async function loadScenarios(uid: string): Promise<SavedScenario[]> {
  if (!db) return [];
  const snap = await getDocs(userCol(uid, 'scenarios'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedScenario);
}

export async function saveScenario(uid: string, scenario: SavedScenario): Promise<void> {
  if (!db) return;
  await setDoc(userDoc(uid, 'scenarios', scenario.id), scenario as unknown as DocumentData);
}

export async function removeScenario(uid: string, scenarioId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(userDoc(uid, 'scenarios', scenarioId));
}

export async function syncAllScenarios(uid: string, scenarios: SavedScenario[]): Promise<void> {
  if (!db) return;
  await Promise.all(scenarios.map((s) => saveScenario(uid, s)));
}

// ── Net Worth ──

export async function loadNetWorth(uid: string): Promise<NetWorthData | null> {
  if (!db) return null;
  const snap = await getDoc(userDoc(uid, 'netWorth', 'data'));
  if (!snap.exists()) return null;
  return snap.data() as NetWorthData;
}

export async function saveNetWorth(uid: string, data: NetWorthData): Promise<void> {
  if (!db) return;
  await setDoc(userDoc(uid, 'netWorth', 'data'), data as unknown as DocumentData);
}

// ── User Settings (currency, theme) ──

export interface UserSettings {
  currency?: string;
  theme?: string;
}

export async function loadUserSettings(uid: string): Promise<UserSettings | null> {
  if (!db) return null;
  const snap = await getDoc(userDoc(uid, 'settings', 'prefs'));
  if (!snap.exists()) return null;
  return snap.data() as UserSettings;
}

export async function saveUserSettings(uid: string, settings: UserSettings): Promise<void> {
  if (!db) return;
  await setDoc(userDoc(uid, 'settings', 'prefs'), settings, { merge: true });
}

// ── Saved Budgets ──

export async function loadBudgets(uid: string): Promise<SavedBudget[]> {
  if (!db) return [];
  const snap = await getDocs(userCol(uid, 'budgets'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedBudget);
}

export async function saveBudget(uid: string, budget: SavedBudget): Promise<void> {
  if (!db) return;
  await setDoc(userDoc(uid, 'budgets', budget.id), budget as unknown as DocumentData);
}

export async function removeBudget(uid: string, budgetId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(userDoc(uid, 'budgets', budgetId));
}
