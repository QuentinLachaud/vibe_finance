/**
 * Firestore persistence service for user scenarios.
 *
 * Collection structure:
 *   users/{uid}/scenarios/{scenarioId}
 *
 * Uses the modular Firebase SDK exclusively.
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ── Types ──

export interface Scenario {
  id: string;
  name: string;
  data: any;
  createdAt?: any;
  updatedAt?: any;
}

// ── Helpers ──

function scenariosCollection(uid: string) {
  if (!db) throw new Error('Firestore not initialised');
  return collection(db, 'users', uid, 'scenarios');
}

function scenarioDoc(uid: string, scenarioId: string) {
  if (!db) throw new Error('Firestore not initialised');
  return doc(db, 'users', uid, 'scenarios', scenarioId);
}

// ── API ──

/**
 * Fetches all scenarios for a given user.
 */
export async function getUserScenarios(uid: string): Promise<Scenario[]> {
  try {
    if (!db) return [];
    const snap = await getDocs(scenariosCollection(uid));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scenario);
  } catch (error) {
    console.error('[firestoreService] getUserScenarios failed:', error);
    return [];
  }
}

/**
 * Creates a new scenario document with server timestamps.
 */
export async function saveScenario(uid: string, scenario: Scenario): Promise<void> {
  try {
    if (!db) return;
    const { id, ...rest } = scenario;
    await setDoc(scenarioDoc(uid, id), {
      ...rest,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[firestoreService] saveScenario failed:', error);
  }
}

/**
 * Updates an existing scenario document; refreshes `updatedAt`.
 */
export async function updateScenario(uid: string, scenario: Scenario): Promise<void> {
  try {
    if (!db) return;
    const { id, ...rest } = scenario;
    const ref = scenarioDoc(uid, id);

    // If the doc doesn't exist yet, fall back to a full write.
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await saveScenario(uid, scenario);
      return;
    }

    await updateDoc(ref, {
      ...rest,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[firestoreService] updateScenario failed:', error);
  }
}

/**
 * Deletes a single scenario document.
 */
export async function deleteScenario(uid: string, scenarioId: string): Promise<void> {
  try {
    if (!db) return;
    await deleteDoc(scenarioDoc(uid, scenarioId));
  } catch (error) {
    console.error('[firestoreService] deleteScenario failed:', error);
  }
}

/**
 * Loads all user scenarios on login and returns them.
 *
 * This is intended to be called from the AuthProvider's `onAuthStateChanged`
 * callback so data is available immediately after authentication.
 *
 * The function returns the loaded scenarios so the caller can push them into
 * whatever global / local state mechanism the app uses.
 */
export async function loadUserDataOnLogin(uid: string): Promise<Scenario[]> {
  try {
    const scenarios = await getUserScenarios(uid);
    console.log(`[firestoreService] loaded ${scenarios.length} scenario(s) for user ${uid}`);
    return scenarios;
  } catch (error) {
    console.error('[firestoreService] loadUserDataOnLogin failed:', error);
    return [];
  }
}
