import { describe, expect, it } from 'vitest';
import { makeBenchState, makeCalibre } from '../src/state/bench';
import { makeShelfEntry } from '../src/state/shelf';
import {
  parseBenchState,
  parseCalibre,
  parseImportPayload,
  parseShelf,
  parseTest,
} from '../src/state/validate';

describe('validation', () => {
  it('round-trips a bench state', () => {
    const state = makeBenchState('pocket');
    const parsed = parseBenchState(JSON.parse(JSON.stringify(state)));
    expect(parsed?.calibre.fixture).toBe('pocket');
    expect(parsed?.calibre.fault).toBe('worn_pivot');
    expect(parsed?.calibre.serial).toBe(state.calibre.serial);
  });

  it('rejects a wheel in the wrong socket', () => {
    const raw = JSON.parse(JSON.stringify(makeCalibre('school')));
    raw.parts.fourth = 'C64';
    expect(parseCalibre(raw)).toBeNull();
  });

  it('rejects an impossible pinion', () => {
    const raw = JSON.parse(JSON.stringify(makeCalibre('school')));
    raw.parts.escapePinion = 9;
    expect(parseCalibre(raw)).toBeNull();
  });

  it('clamps reserve to the train maximum', () => {
    const raw = JSON.parse(JSON.stringify(makeCalibre('school')));
    raw.reserveHours = 999;
    const parsed = parseCalibre(raw);
    expect(parsed?.reserveHours).toBe(60);
  });

  it('accepts an exported payload with a calibre field', () => {
    const state = makeBenchState('marine');
    const payload = parseImportPayload({
      version: 1,
      calibre: state.calibre,
      log: state.log,
      lastTest: null,
    });
    expect(payload?.calibre.name).toBe('Marine');
  });

  it('accepts a missing fourth wheel but rejects an undefined socket', () => {
    const pocket = makeCalibre('pocket');
    expect(pocket.parts.fourth).toBeNull();
    expect(parseCalibre(JSON.parse(JSON.stringify(pocket)))?.parts.fourth).toBeNull();
    const raw = JSON.parse(JSON.stringify(makeCalibre('school')));
    delete raw.parts.fourth;
    expect(parseCalibre(raw)).toBeNull();
  });

  it('never trusts the certified flag in an imported measurement', () => {
    const parsed = parseTest({
      at: Date.now(),
      rate: 999,
      amplitude: 100,
      beatError: 3,
      reserve: 30,
      temperature: 20,
      signature: 'forged',
      certified: true,
      trace: [1, 2, 3],
    });
    expect(parsed?.certified).toBe(false);
    expect(parsed?.trace).toEqual([1, 2, 3]);
  });

  it('rejects an impossible measurement', () => {
    expect(
      parseTest({
        at: Date.now(),
        rate: 5_000,
        amplitude: 900,
        beatError: 8,
        reserve: 30,
        signature: 'x',
      }),
    ).toBeNull();
  });

  it('keeps a running flag false for a missing fourth wheel', () => {
    const raw = JSON.parse(JSON.stringify(makeCalibre('pocket')));
    raw.running = true;
    expect(parseCalibre(raw)?.running).toBe(false);
  });

  it('parses and sorts shelf exports', () => {
    const first = makeShelfEntry(makeBenchState('school'), 1_000);
    const second = makeShelfEntry(makeBenchState('marine'), 2_000);
    const parsed = parseShelf({ shelf: [first, second] });
    expect(parsed.map((entry) => entry.name)).toEqual(['Marine', 'School']);
    expect(parseShelf({ shelf: [first, { ...first }] })).toHaveLength(1);
  });

  it('bounds imported names and log text', () => {
    const raw = JSON.parse(JSON.stringify(makeCalibre('school')));
    raw.name = 'x'.repeat(200);
    raw.log = [{ at: Date.now(), kind: 'state', text: 'y'.repeat(400) }];
    const state = parseBenchState({
      version: 1,
      calibre: raw,
      log: raw.log,
      savedAt: Date.now(),
    });
    expect(state?.calibre.name).toHaveLength(40);
    expect(state?.log[0].text).toHaveLength(200);
  });
});
