import type { BenchState } from '../horology/types';
import { parseBenchState } from './validate';

const DB_NAME = 'escapement-bench';
const STORE = 'state';
const KEY = 'bench';
const LOCAL_KEY = 'escapement.bench.v1';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function readLocalBackup(): BenchState | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return parseBenchState(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readIndexed(): Promise<BenchState | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(parseBenchState(request.result));
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    } finally {
      db.close();
    }
  });
}

export async function loadBench(): Promise<BenchState | null> {
  const indexed = await readIndexed();
  if (indexed) return indexed;
  return readLocalBackup();
}

async function writeIndexed(state: BenchState): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(state, KEY);
  } catch {
    // The local backup is the fallback.
  } finally {
    db.close();
  }
}

export function saveBench(state: BenchState): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable or full. The session still works.
  }
  void writeIndexed(state);
}
