import { describe, expect, it } from 'vitest';
import { FAULT_INFO, FAULT_ORDER } from '../src/horology/faults';
import { makeTestResult, regulationSnapshot } from '../src/horology/regulation';
import { trainSnapshot } from '../src/horology/train';
import {
  applyElapsed,
  canRunTest,
  completeTest,
  currentSignals,
  importCalibre,
  installPinion,
  installWheel,
  makeBenchState,
  makeCalibre,
  repair,
  selectSocket,
  startMovement,
  stopMovement,
  wind,
} from '../src/state/bench';
import { parseImportPayload } from '../src/state/validate';

const HOUR = 3_600_000;

describe('bench state', () => {
  it('mounts the Pocket without its fourth wheel and records the missing part', () => {
    const state = makeBenchState('pocket');
    expect(state.calibre.parts.fourth).toBeNull();
    expect(state.calibre.running).toBe(false);
    expect(state.log[0].text).toContain('fourth wheel is in the spares tray');
    expect(canRunTest(state)).toBe(false);
  });

  it('fits the fourth wheel, completes the train, and still requires a start', () => {
    const pocket = makeBenchState('pocket');
    const fitted = installWheel(pocket, 'F72');
    expect(fitted.calibre.parts.fourth).toBe('F72');
    expect(trainSnapshot(fitted.calibre).coherent).toBe(true);
    expect(fitted.calibre.running).toBe(false);
    expect(fitted.log.at(-1)?.text).toContain('Train complete');
    expect(canRunTest(fitted)).toBe(false);
    expect(canRunTest(startMovement(fitted))).toBe(true);
  });

  it('will not run a test on a stopped movement', () => {
    const running = makeBenchState('school');
    expect(canRunTest(running)).toBe(true);
    const stopped = stopMovement(running);
    expect(canRunTest(stopped)).toBe(false);
    expect(canRunTest(startMovement(stopped))).toBe(true);
  });

  it('will not start a movement with no reserve or an incomplete train', () => {
    const marine = makeBenchState('marine');
    expect(marine.calibre.reserveHours).toBe(0);
    expect(startMovement(marine)).toBe(marine);
    const pocket = makeBenchState('pocket');
    pocket.calibre.reserveHours = 30;
    expect(startMovement(pocket)).toBe(pocket);
  });

  it('winds whole turns and caps at the reserve maximum', () => {
    const state = makeBenchState('school');
    state.calibre.reserveHours = 20;
    expect(wind(state, 1).calibre.reserveHours).toBe(30);
    expect(wind(state, 99).calibre.reserveHours).toBe(60);
    const full = makeBenchState('school');
    expect(wind(full, 1)).toBe(full);
    expect(wind(full, 1).calibre.reserveHours).toBe(60);
  });

  it('drains reserve while away and stops at zero', () => {
    const state = makeBenchState('school');
    state.calibre.reserveHours = 2;
    state.calibre.running = true;
    state.savedAt = Date.now() - 3 * HOUR;
    const next = applyElapsed(state, Date.now());
    expect(next.calibre.reserveHours).toBe(0);
    expect(next.calibre.running).toBe(false);
    expect(next.log.at(-1)?.text).toContain('Reserve exhausted');
  });

  it('keeps running through an absence while reserve remains', () => {
    const state = makeBenchState('school');
    state.calibre.reserveHours = 20;
    state.calibre.running = true;
    state.savedAt = Date.now() - 2 * HOUR;
    const next = applyElapsed(state, Date.now());
    expect(next.calibre.reserveHours).toBe(18);
    expect(next.calibre.running).toBe(true);
    expect(next.log.at(-1)?.text).not.toContain('Reserve exhausted');
  });

  it('rejects an imported measurement and cannot mint a certificate from it', () => {
    const calibre = makeCalibre('school');
    const imported = parseImportPayload({
      version: 1,
      calibre: JSON.parse(JSON.stringify(calibre)),
      lastTest: {
        at: Date.now(),
        rate: 999,
        amplitude: 100,
        beatError: 3,
        reserve: 30,
        temperature: 20,
        signature: 'forged',
        certified: true,
        trace: [],
      },
    });
    expect(imported?.lastTest?.certified).toBe(false);
    const state = importCalibre(makeBenchState('school'), imported!.calibre, imported!.log, null);
    expect(state.lastTest).toBeNull();
    const running = startMovement(state);
    expect(currentSignals(running).certificate).toBe(false);
  });

  it('requires a current test, tolerance, and a running movement to certify', () => {
    const state = makeBenchState('school');
    state.calibre.regulator = 0;
    state.calibre.reserveHours = 36;
    state.lastTest = makeTestResult(state.calibre, Date.now());
    expect(currentSignals(state).certificate).toBe(true);
    expect(currentSignals(stopMovement(state)).certificate).toBe(false);
    const changed = { ...state, calibre: { ...state.calibre, regulator: 1 } };
    expect(currentSignals(changed).testCurrent).toBe(false);
    expect(currentSignals(changed).certificate).toBe(false);
  });

  it('withdraws a certificate when winding moves the rate outside tolerance', () => {
    const state = makeBenchState('school');
    state.calibre.regulator = -3;
    state.calibre.reserveHours = 36;
    state.lastTest = makeTestResult(state.calibre, Date.now());
    expect(currentSignals(state).certificate).toBe(true);
    const woundOnce = wind(state, 1);
    expect(currentSignals(woundOnce).certificate).toBe(true);
    const woundTwice = wind(state, 2);
    expect(currentSignals(woundTwice).certificate).toBe(false);
    expect(currentSignals(woundTwice).testCurrent).toBe(true);
  });

  it('stores the final measurement and certifies the School after a test', () => {
    const state = makeBenchState('school');
    state.calibre.regulator = 0;
    const completed = completeTest(state, Date.now());
    expect(completed.calibre.reserveHours).toBe(36);
    expect(completed.lastTest?.reserve).toBe(36);
    expect(completed.lastTest?.certified).toBe(true);
    expect(completed.log.at(-1)?.detail).toBe('Certificate issued.');
    expect(currentSignals(completed).certificate).toBe(true);
  });

  it('reports an outside result when the final reserve drifts the rate', () => {
    const pocket = repair(makeBenchState('pocket'));
    const running = startMovement(pocket);
    expect(running.calibre.reserveHours).toBe(30);
    const completed = completeTest(running, Date.now());
    expect(completed.calibre.reserveHours).toBe(6);
    expect(completed.lastTest?.rate).toBeCloseTo(10.8, 1);
    expect(completed.lastTest?.certified).toBe(false);
    expect(completed.log.at(-1)?.detail).toBe('Outside certificate tolerances.');
  });

  it('stops the movement and withholds a certificate when a test exhausts reserve', () => {
    const state = makeBenchState('school');
    state.calibre.regulator = 0;
    state.calibre.reserveHours = 24;
    const completed = completeTest(state, Date.now());
    expect(completed.calibre.reserveHours).toBe(0);
    expect(completed.calibre.running).toBe(false);
    expect(completed.lastTest?.certified).toBe(false);
    expect(completed.log.at(-1)?.detail).toContain('Reserve exhausted');
    expect(currentSignals(completed).certificate).toBe(false);
  });

  it('repairs every seeded fault', () => {
    FAULT_ORDER.forEach((fault) => {
      const state = makeBenchState('marine');
      state.calibre.fault = fault;
      state.calibre.reserveHours = 60;
      state.calibre.running = true;
      const fixed = repair(state);
      expect(fixed.calibre.fault).toBe('none');
      expect(fixed.calibre.running).toBe(false);
      expect(fixed.log.at(-1)?.text).toBe(FAULT_INFO[fault].fix);
      expect(regulationSnapshot(fixed.calibre).faultLabel).toBe('In order');
    });
  });

  it('repairs the Pocket and fits its missing fourth wheel in one service', () => {
    const pocket = makeBenchState('pocket');
    const repaired = repair(pocket);
    expect(repaired.calibre.fault).toBe('none');
    expect(repaired.calibre.parts.fourth).toBe('F72');
    expect(trainSnapshot(repaired.calibre).coherent).toBe(true);
    expect(repaired.calibre.serial).not.toBe(pocket.calibre.serial);
  });

  it('stops the movement when a wheel is swapped and records the socket', () => {
    const state = makeBenchState('school');
    const next = installWheel(state, 'F64');
    expect(next.calibre.parts.fourth).toBe('F64');
    expect(next.calibre.running).toBe(false);
    expect(next.selectedSocket).toBe('fourth');
    expect(next.openDrawer).toBe('fourth');
    expect(next.log.at(-1)?.text).toContain('Fourth wheel 64t');
  });

  it('fits a pinion only to a selected train wheel', () => {
    const state = makeBenchState('school');
    const selected = selectSocket(state, 'third');
    const next = installPinion(selected, 6);
    expect(next.calibre.parts.thirdPinion).toBe(6);
    expect(next.calibre.running).toBe(false);
    expect(next.log.at(-1)?.text).toContain('6-leaf pinion');
  });
});
