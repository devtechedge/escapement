import type { Calibre, Parts, TrainSnapshot } from './types';
import { WHEELS } from './parts';

export function trainSnapshot(calibre: Calibre): TrainSnapshot {
  const p: Parts = calibre.parts;
  const barrel = WHEELS[p.barrel].teeth;
  const center = WHEELS[p.center].teeth;
  const third = WHEELS[p.third].teeth;
  const missingFourth = p.fourth === null;
  const fourth = p.fourth === null ? 0 : WHEELS[p.fourth].teeth;
  const escape = WHEELS[p.escape].teeth;

  const thirdRevsPerHour = (center / p.thirdPinion) * 1;
  const fourthRevsPerHour = thirdRevsPerHour * (third / p.fourthPinion);
  const escapeRevsPerHour = fourthRevsPerHour * (fourth / p.escapePinion);
  const escapeVph = 2 * escape * escapeRevsPerHour;

  const centerToFourth = (center / p.thirdPinion) * (third / p.fourthPinion);
  const trainOk = !missingFourth && Math.abs(centerToFourth - 60) < 0.001;
  const beatOk = !missingFourth && Math.abs(escapeVph - calibre.nominalVph) < 0.5;
  const barrelHoursPerTurn = barrel / p.centerPinion;
  const reserveMax = barrelHoursPerTurn * 6;
  const balanceHz = calibre.nominalVph / 7200;

  return {
    centerToFourth,
    thirdRevsPerHour,
    fourthRevsPerHour,
    escapeRevsPerHour,
    escapeVph,
    nominalVph: calibre.nominalVph,
    balanceHz,
    barrelHoursPerTurn,
    reserveMax,
    trainOk,
    beatOk,
    coherent: trainOk && beatOk,
    missingFourth,
  };
}

export function trainHeadline(snapshot: TrainSnapshot): string {
  if (snapshot.missingFourth) {
    return 'Fourth wheel missing';
  }
  if (!snapshot.trainOk) {
    return `Train ${snapshot.centerToFourth.toFixed(2)}:1, needs 60:1`;
  }
  if (!snapshot.beatOk) {
    return `Beat ${Math.round(snapshot.escapeVph).toLocaleString('en-US')} vph, nominal ${snapshot.nominalVph.toLocaleString('en-US')}`;
  }
  return `${snapshot.nominalVph.toLocaleString('en-US')} vph`;
}
