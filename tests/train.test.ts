import { describe, expect, it } from 'vitest';
import { makeCalibre } from '../src/state/bench';
import { trainSnapshot } from '../src/horology/train';

describe('train arithmetic', () => {
  it('keeps the School coherent at 18,000 vph', () => {
    const snapshot = trainSnapshot(makeCalibre('school'));
    expect(snapshot.centerToFourth).toBeCloseTo(60, 6);
    expect(snapshot.escapeVph).toBe(18_000);
    expect(snapshot.coherent).toBe(true);
    expect(snapshot.reserveMax).toBe(60);
    expect(snapshot.balanceHz).toBe(2.5);
  });

  it('keeps the Pocket coherent at 21,600 vph', () => {
    const snapshot = trainSnapshot(makeCalibre('pocket'));
    expect(snapshot.escapeVph).toBe(21_600);
    expect(snapshot.coherent).toBe(true);
  });

  it('keeps the Marine coherent at 28,800 vph', () => {
    const snapshot = trainSnapshot(makeCalibre('marine'));
    expect(snapshot.escapeVph).toBe(28_800);
    expect(snapshot.coherent).toBe(true);
    expect(snapshot.balanceHz).toBe(4);
  });

  it('breaks the beat when the fourth wheel is swapped', () => {
    const calibre = makeCalibre('school');
    calibre.parts.fourth = 'F64';
    const snapshot = trainSnapshot(calibre);
    expect(snapshot.escapeVph).toBe(19_200);
    expect(snapshot.beatOk).toBe(false);
    expect(snapshot.coherent).toBe(false);
  });

  it('breaks the 60:1 ratio when a pinion is swapped', () => {
    const calibre = makeCalibre('school');
    calibre.parts.thirdPinion = 6;
    const snapshot = trainSnapshot(calibre);
    expect(snapshot.centerToFourth).toBeCloseTo(80, 6);
    expect(snapshot.trainOk).toBe(false);
    expect(snapshot.coherent).toBe(false);
  });
});
