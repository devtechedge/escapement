import type { FaultId, SocketId } from '../horology/types';

export const VIEW = 780;
export const CX = 390;
export const CY = 340;

export interface SocketGeometry {
  x: number;
  y: number;
  r: number;
}

export const SOCKETS: Record<SocketId, SocketGeometry> = {
  barrel: { x: 540, y: 450, r: 72 },
  center: { x: CX, y: CY, r: 60 },
  third: { x: 285, y: 430, r: 52 },
  fourth: { x: 360, y: 525, r: 44 },
  escape: { x: 455, y: 545, r: 28 },
  balance: { x: 278, y: 222, r: 58 },
};

export const PALLET = { x: 474, y: 500, r: 20 };

export const FAULT_SOCKET: Record<FaultId, SocketId | null> = {
  none: null,
  magnetized: 'balance',
  worn_pivot: 'fourth',
  set_mainspring: 'barrel',
  beat_error: 'balance',
  loose_cannon: 'center',
};

export const EVIDENCE_TAG: Record<FaultId, string | null> = {
  none: null,
  magnetized: 'Coils clumped',
  worn_pivot: 'Pivot worn',
  set_mainspring: 'Spring set',
  beat_error: 'Impulse off center',
  loose_cannon: 'Cannon loose',
};

export const EXPLODE_OFFSETS: Record<SocketId, [number, number]> = {
  barrel: [34, 26],
  center: [0, 0],
  third: [-34, 22],
  fourth: [-8, 44],
  escape: [36, 38],
  balance: [-40, -38],
};
