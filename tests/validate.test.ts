import { describe, expect, it } from 'vitest';
import { makeBenchState, makeCalibre } from '../src/state/bench';
import { parseBenchState, parseCalibre, parseImportPayload } from '../src/state/validate';

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
});
