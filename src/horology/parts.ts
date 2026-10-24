import type { PinionLeaves, PinionSpec, SocketId, WheelId, WheelSpec } from './types';

export const WHEELS: Record<WheelId, WheelSpec> = {
  B80: {
    id: 'B80',
    socket: 'barrel',
    label: 'Barrel wheel',
    short: 'Barrel',
    teeth: 80,
    note: '80 teeth. Ten hours per barrel turn with the center pinion.',
  },
  C64: {
    id: 'C64',
    socket: 'center',
    label: 'Center wheel',
    short: 'Center',
    teeth: 64,
    note: '64 teeth. Carries the minute hand and drives the third pinion.',
  },
  T60: {
    id: 'T60',
    socket: 'third',
    label: 'Third wheel',
    short: 'Third',
    teeth: 60,
    note: '60 teeth. The intermediate wheel between center and fourth.',
  },
  F60: {
    id: 'F60',
    socket: 'fourth',
    label: 'Fourth wheel 60t',
    short: 'Fourth 60',
    teeth: 60,
    note: '60 teeth. With a 6-leaf escape pinion it gives 18,000 vph.',
  },
  F72: {
    id: 'F72',
    socket: 'fourth',
    label: 'Fourth wheel 72t',
    short: 'Fourth 72',
    teeth: 72,
    note: '72 teeth. With a 6-leaf escape pinion it gives 21,600 vph.',
  },
  F64: {
    id: 'F64',
    socket: 'fourth',
    label: 'Fourth wheel 64t',
    short: 'Fourth 64',
    teeth: 64,
    note: '64 teeth. With a 4-leaf escape pinion it gives 28,800 vph.',
  },
  E15: {
    id: 'E15',
    socket: 'escape',
    label: 'Escape wheel',
    short: 'Escape',
    teeth: 15,
    note: '15 pointed teeth. Two beats per tooth, one impulse per beat.',
  },
  BAL1: {
    id: 'BAL1',
    socket: 'balance',
    label: 'Balance wheel',
    short: 'Balance',
    teeth: 0,
    note: 'A compensated balance with a blued hairspring and a ruby impulse jewel.',
  },
};

export const PINIONS: Record<PinionLeaves, PinionSpec> = {
  4: { leaves: 4, label: 'Pinion 4', note: 'Four leaves. Fast, low torque, fussy.' },
  6: { leaves: 6, label: 'Pinion 6', note: 'Six leaves. The pocket watch compromise.' },
  8: { leaves: 8, label: 'Pinion 8', note: 'Eight leaves. Smooth, strong, slower.' },
};

export const WHEEL_OPTIONS: Record<SocketId, WheelId[]> = {
  barrel: ['B80'],
  center: ['C64'],
  third: ['T60'],
  fourth: ['F60', 'F72', 'F64'],
  escape: ['E15'],
  balance: ['BAL1'],
};

export const PINION_OPTIONS: PinionLeaves[] = [4, 6, 8];

export const SOCKET_LABELS: Record<SocketId, string> = {
  barrel: 'Barrel',
  center: 'Center',
  third: 'Third',
  fourth: 'Fourth',
  escape: 'Escape',
  balance: 'Balance',
};

export function teethOf(socket: SocketId, wheel: WheelId): number {
  if (socket === 'balance') return 0;
  return WHEELS[wheel].teeth;
}
