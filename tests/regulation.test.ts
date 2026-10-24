import { describe, expect, it } from 'vitest';
import { FAULT_ORDER } from '../src/horology/faults';
import { makeCalibre } from '../src/state/bench';
import { regulationSnapshot } from '../src/horology/regulation';

describe('regulation', () => {
  it('starts the School fast and healthy', () => {
    const snapshot = regulationSnapshot(makeCalibre('school'));
    expect(snapshot.rate).toBeCloseTo(32, 1);
    expect(snapshot.amplitude).toBeGreaterThanOrEqual(250);
    expect(snapshot.amplitude).toBeLessThanOrEqual(320);
    expect(snapshot.beatError).toBe(0.2);
    expect(snapshot.certified).toBe(false);
  });

  it('certifies the School after eight regulator notches', () => {
    const calibre = makeCalibre('school');
    calibre.regulator = 0;
    const snapshot = regulationSnapshot(calibre);
    expect(snapshot.rate).toBeCloseTo(0, 1);
    expect(snapshot.certified).toBe(true);
  });

  it('loses amplitude with a worn fourth pivot', () => {
    const calibre = makeCalibre('pocket');
    const snapshot = regulationSnapshot(calibre);
    expect(snapshot.rate).toBeLessThan(0);
    expect(snapshot.amplitude).toBeLessThan(250);
    expect(snapshot.certified).toBe(false);
  });

  it('gains time with a magnetized hairspring', () => {
    const calibre = makeCalibre('marine');
    calibre.fault = 'magnetized';
    calibre.regulator = 0;
    calibre.reserveHours = 60;
    const snapshot = regulationSnapshot(calibre);
    expect(snapshot.rate).toBeGreaterThan(200);
    expect(snapshot.amplitude).toBeLessThan(250);
    expect(snapshot.certified).toBe(false);
  });

  it('will not certify a loose cannon pinion even with a good rate', () => {
    const calibre = makeCalibre('marine');
    calibre.fault = 'loose_cannon';
    calibre.regulator = 0;
    calibre.reserveHours = 60;
    const snapshot = regulationSnapshot(calibre);
    expect(snapshot.rate).toBeCloseTo(0, 1);
    expect(snapshot.beatError).toBeLessThan(0.5);
    expect(snapshot.certified).toBe(false);
  });

  it('drifts with temperature', () => {
    const cold = makeCalibre('marine');
    cold.reserveHours = 60;
    cold.regulator = 0;
    cold.temperature = 18;
    const warm = { ...cold, temperature: 26 as const };
    expect(regulationSnapshot(cold).rate).toBeGreaterThan(regulationSnapshot(warm).rate);
  });

  it('will not certify a movement with no reserve', () => {
    const marine = makeCalibre('marine');
    marine.regulator = 0;
    expect(marine.reserveHours).toBe(0);
    expect(regulationSnapshot(marine).certified).toBe(false);
  });

  it('will not certify an incomplete train', () => {
    const pocket = makeCalibre('pocket');
    pocket.fault = 'none';
    pocket.regulator = 0;
    pocket.reserveHours = 60;
    expect(regulationSnapshot(pocket).certified).toBe(false);
    pocket.parts.fourth = 'F72';
    expect(regulationSnapshot(pocket).certified).toBe(true);
  });

  it('reads every seeded fault with a distinct signal', () => {
    const faulted = FAULT_ORDER.map((fault) => {
      const calibre = makeCalibre('marine');
      calibre.fault = fault;
      calibre.reserveHours = 60;
      calibre.regulator = 0;
      return regulationSnapshot(calibre);
    });
    expect(faulted.map((snapshot) => snapshot.faultLabel)).toEqual([
      'Magnetized hairspring',
      'Worn fourth pivot',
      'Set mainspring',
      'Beat error',
      'Loose cannon pinion',
    ]);
    faulted.forEach((snapshot) => expect(snapshot.certified).toBe(false));
  });

  it('loses certification as reserve approaches the end of the mainspring', () => {
    const calibre = makeCalibre('school');
    calibre.regulator = 8;
    calibre.reserveHours = 60;
    const high = regulationSnapshot(calibre);
    calibre.reserveHours = 12;
    const low = regulationSnapshot(calibre);
    expect(low.rate).toBeGreaterThan(high.rate);
    expect(high.certified).toBe(false);
    expect(low.certified).toBe(false);
  });

  it('holds the beat error above tolerance on the beat-fault build', () => {
    const calibre = makeCalibre('marine');
    calibre.fault = 'beat_error';
    calibre.regulator = 0;
    calibre.reserveHours = 60;
    const snapshot = regulationSnapshot(calibre);
    expect(snapshot.beatError).toBeCloseTo(1.8, 2);
    expect(snapshot.certified).toBe(false);
  });
});
