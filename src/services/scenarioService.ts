import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedScenario } from '../types';

function scenariosCol(uid: string) {
  if (!db) throw new Error('Firestore not initialised');
  return collection(db, 'users', uid, 'scenarios');
}

export async function loadScenarios(uid: string): Promise<SavedScenario[]> {
  if (!db) return [];
  const snap = await getDocs(scenariosCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedScenario);
}

export async function saveScenario(uid: string, scenario: SavedScenario): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid, 'scenarios', scenario.id), scenario);
}

export async function removeScenario(uid: string, scenarioId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'users', uid, 'scenarios', scenarioId));
}

/** Bulk-write all scenarios (used for initial sync). */
export async function syncAllScenarios(uid: string, scenarios: SavedScenario[]): Promise<void> {
  if (!db) return;
  await Promise.all(scenarios.map((s) => saveScenario(uid, s)));
}
