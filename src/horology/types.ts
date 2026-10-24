export type FixtureId = 'school' | 'pocket' | 'marine';

export type SocketId = 'barrel' | 'center' | 'third' | 'fourth' | 'escape' | 'balance';

export type PinionSocketId = 'third' | 'fourth' | 'escape';

export type FaultId =
  | 'none'
  | 'magnetized'
  | 'worn_pivot'
  | 'set_mainspring'
  | 'beat_error'
  | 'loose_cannon';

export type WheelId = 'B80' | 'C64' | 'T60' | 'F60' | 'F72' | 'F64' | 'E15' | 'BAL1';

export type PinionLeaves = 4 | 6 | 8;

export type Temperature = 18 | 20 | 23 | 26;

export interface WheelSpec {
  id: WheelId;
  socket: SocketId;
  label: string;
  short: string;
  teeth: number;
  note: string;
}

export interface PinionSpec {
  leaves: PinionLeaves;
  label: string;
  note: string;
}

export interface Parts {
  barrel: 'B80';
  center: 'C64';
  third: 'T60';
  fourth: 'F60' | 'F72' | 'F64';
  escape: 'E15';
  balance: 'BAL1';
  centerPinion: 8;
  thirdPinion: PinionLeaves;
  fourthPinion: PinionLeaves;
  escapePinion: PinionLeaves;
}

export interface Calibre {
  id: string;
  name: string;
  fixture: FixtureId;
  nominalVph: number;
  jewels: number;
  parts: Parts;
  regulator: number;
  temperature: Temperature;
  fault: FaultId;
  reserveHours: number;
  running: boolean;
  serial: string;
}

export interface TrainSnapshot {
  centerToFourth: number;
  thirdRevsPerHour: number;
  fourthRevsPerHour: number;
  escapeRevsPerHour: number;
  escapeVph: number;
  nominalVph: number;
  balanceHz: number;
  barrelHoursPerTurn: number;
  reserveMax: number;
  trainOk: boolean;
  beatOk: boolean;
  coherent: boolean;
}

export interface RegulationSnapshot {
  rate: number;
  amplitude: number;
  beatError: number;
  reserveFraction: number;
  certified: boolean;
  signature: string;
  evidence: string | null;
  faultLabel: string;
  faultFix: string | null;
}

export interface Snapshot extends TrainSnapshot, RegulationSnapshot {
  reserveHours: number;
  running: boolean;
}

export interface LogEntry {
  id: string;
  at: number;
  kind: 'test' | 'part' | 'wind' | 'repair' | 'regulate' | 'state' | 'import';
  text: string;
  detail?: string;
}

export interface TestResult {
  at: number;
  rate: number;
  amplitude: number;
  beatError: number;
  reserve: number;
  temperature: Temperature;
  signature: string;
  certified: boolean;
  trace: number[];
}

export interface BenchState {
  version: 1;
  calibre: Calibre;
  selectedSocket: SocketId;
  openDrawer: SocketId | 'pinions' | null;
  exploded: boolean;
  still: boolean;
  log: LogEntry[];
  lastTest: TestResult | null;
  savedAt: number;
}
