import type { BenchState, SavedCalibre } from '../horology/types';
import { parseBenchState, parseShelf } from './validate';

const DB_NAME = 'escapement-bench';
const STORE = 'state';
const SHELF_STORE = 'shelf';
const KEY = 'bench';
const LOCAL_KEY = 'escapement.bench.v1';
const SHELF_LOCAL_KEY = 'escapement.shelf.v1';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
        if (!db.objectStoreNames.contains(SHELF_STORE)) {
          db.createObjectStore(SHELF_STORE);
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

export function readShelfLocal(): SavedCalibre[] {
  try {
    const raw = window.localStorage.getItem(SHELF_LOCAL_KEY);
    if (!raw) return [];
    return parseShelf(JSON.parse(raw));
  } catch {
    return [];
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

async function readShelfIndexed(): Promise<SavedCalibre[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SHELF_STORE, 'readonly');
      const request = tx.objectStore(SHELF_STORE).getAll();
      request.onsuccess = () => resolve(parseShelf(request.result));
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
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

export async function loadShelf(): Promise<SavedCalibre[]> {
  const indexed = await readShelfIndexed();
  if (indexed.length > 0) return indexed;
  return readShelfLocal();
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

async function writeShelfIndexed(shelf: SavedCalibre[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(SHELF_STORE, 'readwrite');
    const store = tx.objectStore(SHELF_STORE);
    store.clear();
    shelf.forEach((entry) => store.put(entry, entry.id));
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

export function saveShelf(shelf: SavedCalibre[]): void {
  try {
    window.localStorage.setItem(SHELF_LOCAL_KEY, JSON.stringify({ version: 1, shelf }));
  } catch {
    // Storage can be unavailable or full. The session still works.
  }
  void writeShelfIndexed(shelf);
}
