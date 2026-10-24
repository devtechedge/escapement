import { describe, expect, it } from 'vitest';
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
});
