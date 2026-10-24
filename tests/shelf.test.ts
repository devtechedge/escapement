import { describe, expect, it } from 'vitest';
import { makeTestResult } from '../src/horology/regulation';
import { makeBenchState } from '../src/state/bench';
import {
  addShelfEntry,
  duplicateShelfEntry,
  loadShelfEntry,
  makeShelfEntry,
  removeShelfEntry,
  renameShelfEntry,
  saveCurrentToShelf,
  shelfDownloadPayload,
  shelfKey,
} from '../src/state/shelf';
import { parseShelf, parseShelfPayload } from '../src/state/validate';

function schoolWithTest() {
  const state = makeBenchState('school');
  state.calibre.regulator = 0;
  state.lastTest = makeTestResult(state.calibre, Date.now());
  return state;
}

describe('calibre shelf', () => {
  it('saves the current build with its measurement and history', () => {
    const state = schoolWithTest();
    const entry = makeShelfEntry(state, 1_000);
    expect(entry.calibre.serial).toBe(state.calibre.serial);
    expect(entry.calibre.running).toBe(false);
    expect(entry.lastTest?.rate).toBe(state.lastTest?.rate);
    expect(entry.log.length).toBeGreaterThan(0);
    expect(entry.savedAt).toBe(1_000);
  });

  it('deduplicates an identical build and uses the existing id', () => {
    const state = schoolWithTest();
    const first = saveCurrentToShelf([], state, 1_000);
    expect(first.existed).toBe(false);
    const second = saveCurrentToShelf(first.shelf, state, 2_000);
    expect(second.existed).toBe(true);
    expect(second.shelf).toHaveLength(1);
    expect(second.shelf[0].id).toBe(first.shelf[0].id);
    expect(second.shelf[0].savedAt).toBe(2_000);
  });

  it('treats a different name or regulator as a different build', () => {
    const state = schoolWithTest();
    const first = saveCurrentToShelf([], state, 1_000);
    const renamed = { ...state, calibre: { ...state.calibre, name: 'School B' } };
    const second = saveCurrentToShelf(first.shelf, renamed, 2_000);
    expect(second.shelf).toHaveLength(2);
    const adjusted = {
      ...state,
      calibre: { ...state.calibre, regulator: state.calibre.regulator + 1 },
    };
    const third = saveCurrentToShelf(second.shelf, adjusted, 3_000);
    expect(third.shelf).toHaveLength(3);
    expect(shelfKey(third.entry)).toContain('9');
  });

  it('sorts newest first and caps the shelf at forty entries', () => {
    let shelf = [] as ReturnType<typeof makeShelfEntry>[];
    for (let index = 0; index < 45; index += 1) {
      const state = makeBenchState('school');
      state.calibre.name = `Build ${index}`;
      shelf = addShelfEntry(shelf, makeShelfEntry(state, 1_000 + index));
    }
    expect(shelf).toHaveLength(40);
    expect(shelf[0].name).toBe('Build 44');
    expect(shelf.at(-1)?.name).toBe('Build 5');
  });

  it('loads a saved build stopped, with a fresh selection and a log line', () => {
    const state = schoolWithTest();
    const entry = makeShelfEntry(state, 1_000);
    const current = makeBenchState('marine');
    const loaded = loadShelfEntry(current, entry, 2_000);
    expect(loaded.calibre.serial).toBe(entry.calibre.serial);
    expect(loaded.calibre.running).toBe(false);
    expect(loaded.selectedSocket).toBe('center');
    expect(loaded.openDrawer).toBeNull();
    expect(loaded.lastTest?.rate).toBe(entry.lastTest?.rate);
    expect(loaded.log.at(-1)?.text).toContain('Loaded School from the shelf');
  });

  it('renames a shelf entry and its calibre', () => {
    const entry = makeShelfEntry(schoolWithTest(), 1_000);
    const shelf = renameShelfEntry([entry], entry.id, '  Observatory  ');
    expect(shelf[0].name).toBe('Observatory');
    expect(shelf[0].calibre.name).toBe('Observatory');
    expect(renameShelfEntry(shelf, entry.id, '   ')[0].name).toBe('Observatory');
  });

  it('duplicates an entry with a distinct id and name', () => {
    const entry = makeShelfEntry(schoolWithTest(), 1_000);
    const shelf = duplicateShelfEntry([entry], entry.id, 2_000);
    expect(shelf).toHaveLength(2);
    expect(shelf[0].id).not.toBe(entry.id);
    expect(shelf[0].name).toBe('Copy of School');
    expect(shelf[0].calibre.name).toBe('Copy of School');
    expect(shelf[0].lastTest?.rate).toBe(entry.lastTest?.rate);
  });

  it('removes an entry by id', () => {
    const entry = makeShelfEntry(schoolWithTest(), 1_000);
    expect(removeShelfEntry([entry], entry.id)).toHaveLength(0);
    expect(removeShelfEntry([entry], 'missing')).toHaveLength(1);
  });

  it('exports and re-imports the shelf through the validator', () => {
    const state = schoolWithTest();
    const entry = makeShelfEntry(state, 1_000);
    const payload = shelfDownloadPayload([entry], 2_000);
    expect(payload.version).toBe(1);
    expect(payload.shelf[0].calibre.serial).toBe(entry.calibre.serial);
    const parsed = parseShelfPayload(JSON.parse(JSON.stringify(payload)));
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].id).toBe(entry.id);
    expect(parseShelf(payload.shelf)[0].name).toBe('School');
  });

  it('rejects an empty or malformed shelf payload', () => {
    expect(parseShelfPayload(null)).toBeNull();
    expect(parseShelfPayload({ shelf: [] })).toBeNull();
    expect(parseShelf({ shelf: [{ id: 'x' }] })).toHaveLength(0);
  });

  it('deduplicates ids during a shelf import', () => {
    const entry = makeShelfEntry(schoolWithTest(), 1_000);
    const parsed = parseShelf([entry, { ...entry, savedAt: 2_000 }]);
    expect(parsed).toHaveLength(1);
  });
});
