import { makeLogEntry } from './bench';
import type { BenchState, Calibre, LogEntry, SavedCalibre, TestResult } from '../horology/types';

let shelfCounter = 0;

export function cloneCalibre(calibre: Calibre): Calibre {
  return { ...calibre, parts: { ...calibre.parts } };
}

export function cloneTest(test: TestResult | null): TestResult | null {
  return test ? { ...test, trace: [...test.trace] } : null;
}

function cloneLog(log: LogEntry[]): LogEntry[] {
  return log.slice(-20).map((entry) => ({ ...entry }));
}

export function makeShelfEntry(state: BenchState, now = Date.now()): SavedCalibre {
  shelfCounter += 1;
  return {
    id: `shelf-${state.calibre.serial}-${now.toString(36)}-${shelfCounter}`,
    name: state.calibre.name,
    calibre: { ...cloneCalibre(state.calibre), running: false },
    lastTest: cloneTest(state.lastTest),
    log: cloneLog(state.log),
    savedAt: now,
  };
}

export function shelfKey(entry: SavedCalibre): string {
  const c = entry.calibre;
  return [
    c.serial,
    c.regulator,
    c.temperature,
    c.fault,
    c.parts.fourth === null ? 'missing' : 'fitted',
    entry.name,
  ].join('|');
}

export function addShelfEntry(shelf: SavedCalibre[], entry: SavedCalibre): SavedCalibre[] {
  const key = shelfKey(entry);
  const existing = shelf.find((item) => shelfKey(item) === key);
  const next = existing
    ? shelf.map((item) => (item.id === existing.id ? { ...entry, id: existing.id } : item))
    : [entry, ...shelf];
  return next.sort((a, b) => b.savedAt - a.savedAt).slice(0, 40);
}

export function saveCurrentToShelf(
  shelf: SavedCalibre[],
  state: BenchState,
  now = Date.now(),
): { shelf: SavedCalibre[]; entry: SavedCalibre; existed: boolean } {
  const entry = makeShelfEntry(state, now);
  const existed = shelf.some((item) => shelfKey(item) === shelfKey(entry));
  return { shelf: addShelfEntry(shelf, entry), entry, existed };
}

export function removeShelfEntry(shelf: SavedCalibre[], id: string): SavedCalibre[] {
  return shelf.filter((entry) => entry.id !== id);
}

export function renameShelfEntry(
  shelf: SavedCalibre[],
  id: string,
  name: string,
): SavedCalibre[] {
  const clean = name.trim().slice(0, 40);
  if (!clean) return shelf;
  return shelf.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          name: clean,
          calibre: { ...entry.calibre, name: clean },
          savedAt: Date.now(),
        }
      : entry,
  );
}

export function duplicateShelfEntry(
  shelf: SavedCalibre[],
  id: string,
  now = Date.now(),
): SavedCalibre[] {
  const source = shelf.find((entry) => entry.id === id);
  if (!source) return shelf;
  shelfCounter += 1;
  const copy: SavedCalibre = {
    ...source,
    id: `shelf-${source.calibre.serial}-${now.toString(36)}-${shelfCounter}`,
    name: `Copy of ${source.name}`.slice(0, 40),
    calibre: { ...cloneCalibre(source.calibre), name: `Copy of ${source.name}`.slice(0, 40) },
    lastTest: cloneTest(source.lastTest),
    log: cloneLog(source.log),
    savedAt: now,
  };
  return [copy, ...shelf].slice(0, 40);
}

export function loadShelfEntry(state: BenchState, entry: SavedCalibre, now = Date.now()): BenchState {
  return {
    ...state,
    calibre: { ...cloneCalibre(entry.calibre), running: false },
    selectedSocket: 'center',
    openDrawer: null,
    exploded: false,
    lastTest: cloneTest(entry.lastTest),
    log: [
      ...cloneLog(entry.log),
      makeLogEntry(now, 'state', `Loaded ${entry.name} from the shelf.`),
    ].slice(-40),
    savedAt: now,
  };
}

export function shelfDownloadPayload(shelf: SavedCalibre[], now = Date.now()) {
  return {
    version: 1,
    exportedAt: now,
    shelf: shelf.map((entry) => ({
      ...entry,
      calibre: cloneCalibre(entry.calibre),
      lastTest: cloneTest(entry.lastTest),
      log: cloneLog(entry.log),
    })),
  };
}
