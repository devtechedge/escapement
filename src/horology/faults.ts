import type { FaultId } from './types';

export interface FaultInfo {
  label: string;
  short: string;
  evidence: string | null;
  fix: string | null;
  rate: number;
  amplitude: number;
  beat: number;
}

export const FAULT_INFO: Record<FaultId, FaultInfo> = {
  none: {
    label: 'In order',
    short: 'Sound',
    evidence: null,
    fix: null,
    rate: 0,
    amplitude: 0,
    beat: 0,
  },
  magnetized: {
    label: 'Magnetized hairspring',
    short: 'Magnetized',
    evidence: 'The hairspring coils are clumped and stick together under the raking light.',
    fix: 'Demagnetize the hairspring',
    rate: 240,
    amplitude: -50,
    beat: 0.1,
  },
  worn_pivot: {
    label: 'Worn fourth pivot',
    short: 'Worn pivot',
    evidence: 'The fourth wheel pivot is discolored and dry. The wheel rocks in its jewel.',
    fix: 'Replace the fourth wheel',
    rate: -180,
    amplitude: -60,
    beat: 0.2,
  },
  set_mainspring: {
    label: 'Set mainspring',
    short: 'Set spring',
    evidence: 'The mainspring lies flat in the barrel. It has lost its curve and its torque.',
    fix: 'Fit a new mainspring',
    rate: -90,
    amplitude: -80,
    beat: 0,
  },
  beat_error: {
    label: 'Beat error',
    short: 'Beat error',
    evidence: 'The impulse pin sits off center. The tick and the tock are not evenly spaced.',
    fix: 'Center the collet',
    rate: 25,
    amplitude: -10,
    beat: 1.6,
  },
  loose_cannon: {
    label: 'Loose cannon pinion',
    short: 'Loose cannon',
    evidence: 'The cannon pinion rocks on the center arbor. The hands can slip without the movement losing rate.',
    fix: 'Crimp the cannon pinion',
    rate: 0,
    amplitude: 0,
    beat: 0,
  },
};

export const FAULT_ORDER: FaultId[] = [
  'magnetized',
  'worn_pivot',
  'set_mainspring',
  'beat_error',
  'loose_cannon',
];

export function faultInfo(fault: FaultId): FaultInfo {
  return FAULT_INFO[fault];
}
