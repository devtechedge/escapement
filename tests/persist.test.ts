import { describe, expect, it } from 'vitest';
import { makeBenchState } from '../src/state/bench';
import { makeShelfEntry } from '../src/state/shelf';
import {
  loadBench,
  readLocalBackup,
  readShelfLocal,
  saveBench,
  saveShelf,
} from '../src/state/persist';

describe('persistence fallbacks', () => {
  it('writes and reads the bench through localStorage when IndexedDB is absent', async () => {
    const state = makeBenchState('school');
    state.calibre.regulator = -2;
    saveBench(state);
    expect(readLocalBackup()?.calibre.regulator).toBe(-2);
    const loaded = await loadBench();
    expect(loaded?.calibre.serial).toBe(state.calibre.serial);
  });

  it('writes and reads the shelf through localStorage', async () => {
    const entry = makeShelfEntry(makeBenchState('school'), 1_000);
    saveShelf([entry]);
    expect(readShelfLocal()).toHaveLength(1);
    expect(readShelfLocal()[0].id).toBe(entry.id);
  });

  it('ignores malformed local data', () => {
    window.localStorage.setItem('escapement.bench.v1', '{broken');
    window.localStorage.setItem('escapement.shelf.v1', '{"shelf": [1, 2]}');
    expect(readLocalBackup()).toBeNull();
    expect(readShelfLocal()).toEqual([]);
  });

  it('keeps the shelf capped when reading a local backup', () => {
    const entries = Array.from({ length: 45 }, (_, index) => ({
      ...makeShelfEntry(makeBenchState('school'), 1_000 + index),
      id: `entry-${index}`,
      name: `Build ${index}`,
    }));
    window.localStorage.setItem('escapement.shelf.v1', JSON.stringify(entries));
    const shelf = readShelfLocal();
    expect(shelf).toHaveLength(45);
    saveShelf(shelf);
    expect(readShelfLocal().length).toBeLessThanOrEqual(45);
  });
});
