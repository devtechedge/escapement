import type { Calibre, Parts, RegulationSnapshot, TestResult } from './types';
import { faultInfo } from './faults';
import { hashString, seededUnit, serialFor } from './serial';
import { trainSnapshot } from './train';

export const CERT_RATE = 10;
export const CERT_AMP_MIN = 250;
export const CERT_AMP_MAX = 320;
export const CERT_BEAT = 0.5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function signatureFor(calibre: Calibre): string {
  return JSON.stringify({
    v: 1,
    fixture: calibre.fixture,
    nominalVph: calibre.nominalVph,
    jewels: calibre.jewels,
    parts: calibre.parts,
    regulator: calibre.regulator,
    temperature: calibre.temperature,
    fault: calibre.fault,
  });
}

export function regulationSnapshot(calibre: Calibre): RegulationSnapshot {
  const train = trainSnapshot(calibre);
  const reserveFraction = clamp(calibre.reserveHours / train.reserveMax, 0, 1);
  const fault = faultInfo(calibre.fault);

  const temperatureDrift = -0.9 * (calibre.temperature - 20);
  const isochronism = 12 * (1 - reserveFraction);
  const rate = calibre.regulator * 4 + temperatureDrift + isochronism + fault.rate;

  const jewelFactor = 1 - (21 - calibre.jewels) * 0.02;
  const reserveTorque = 0.55 + 0.45 * reserveFraction;
  const amplitude = clamp(
    210 + 80 * reserveTorque * jewelFactor + fault.amplitude,
    90,
    340,
  );

  const beatError = clamp(0.2 + fault.beat, 0, 3);
  const certified =
    calibre.fault === 'none' &&
    Math.abs(rate) <= CERT_RATE &&
    amplitude >= CERT_AMP_MIN &&
    amplitude <= CERT_AMP_MAX &&
    beatError < CERT_BEAT;

  return {
    rate: Math.round(rate * 10) / 10,
    amplitude: Math.round(amplitude * 10) / 10,
    beatError: Math.round(beatError * 100) / 100,
    reserveFraction,
    certified,
    signature: signatureFor(calibre),
    evidence: fault.evidence,
    faultLabel: fault.label,
    faultFix: fault.fix,
  };
}

export function makeTrace(calibre: Calibre, rate: number): number[] {
  const seed = hashString(serialFor(calibre.parts, calibre.fixture));
  return Array.from({ length: 24 }, (_, i) => {
    const drift = (seededUnit(seed, i) - 0.5) * 2.4;
    const wave = Math.sin((i + (seed % 9)) * 0.7) * 1.6;
    return Math.round((rate + drift + wave) * 10) / 10;
  });
}

export function makeTestResult(calibre: Calibre, at: number): TestResult {
  const regulation = regulationSnapshot(calibre);
  return {
    at,
    rate: regulation.rate,
    amplitude: regulation.amplitude,
    beatError: regulation.beatError,
    reserve: Math.round(calibre.reserveHours),
    temperature: calibre.temperature,
    signature: regulation.signature,
    certified: regulation.certified,
    trace: makeTrace(calibre, regulation.rate),
  };
}

export function isTestCurrent(calibre: Calibre, result: TestResult | null): boolean {
  return Boolean(result && result.signature === signatureFor(calibre));
}

export function effectiveRunning(calibre: Calibre): boolean {
  return calibre.running && trainSnapshot(calibre).coherent && calibre.reserveHours > 0;
}

export function updateSerial(parts: Parts, fixture: Calibre['fixture']): string {
  return serialFor(parts, fixture);
}
