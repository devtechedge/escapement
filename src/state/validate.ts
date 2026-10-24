import { FIXTURES } from '../horology/fixtures';
import { WHEELS, WHEEL_OPTIONS } from '../horology/parts';
import { serialFor } from '../horology/serial';
import { trainSnapshot } from '../horology/train';
import type {
  BenchState,
  Calibre,
  FaultId,
  FixtureId,
  LogEntry,
  Parts,
  PinionLeaves,
  SavedCalibre,
  SocketId,
  Temperature,
  TestResult,
  WheelId,
} from '../horology/types';

type RecordValue = Record<string, unknown>;

const SOCKETS: SocketId[] = ['barrel', 'center', 'third', 'fourth', 'escape', 'balance'];
const PINION_VALUES: PinionLeaves[] = [4, 6, 8];
const TEMPERATURES: Temperature[] = [18, 20, 23, 26];
const FAULTS: FaultId[] = ['none', 'magnetized', 'worn_pivot', 'set_mainspring', 'beat_error', 'loose_cannon'];
const LOG_KINDS: LogEntry['kind'][] = ['test', 'part', 'wind', 'repair', 'regulate', 'state', 'import'];

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function cleanString(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

function parseParts(raw: unknown): Parts | null {
  if (!isRecord(raw)) return null;
  const wheelFor = (socket: SocketId): WheelId | null => {
    const value = raw[socket];
    if (typeof value !== 'string') return null;
    if (!WHEEL_OPTIONS[socket].includes(value as WheelId)) return null;
    if (WHEELS[value as WheelId].socket !== socket) return null;
    return value as WheelId;
  };

  const barrel = wheelFor('barrel');
  const center = wheelFor('center');
  const third = wheelFor('third');
  const escape = wheelFor('escape');
  const balance = wheelFor('balance');
  const centerPinion = raw.centerPinion;
  const thirdPinion = raw.thirdPinion;
  const fourthPinion = raw.fourthPinion;
  const escapePinion = raw.escapePinion;
  let fourth: Parts['fourth'] = null;
  if (raw.fourth !== null) {
    const parsedFourth = wheelFor('fourth');
    if (!parsedFourth) return null;
    fourth = parsedFourth as Exclude<Parts['fourth'], null>;
  }

  if (!barrel || !center || !third || !escape || !balance) return null;
  if (centerPinion !== 8) return null;
  if (!PINION_VALUES.includes(thirdPinion as PinionLeaves)) return null;
  if (!PINION_VALUES.includes(fourthPinion as PinionLeaves)) return null;
  if (!PINION_VALUES.includes(escapePinion as PinionLeaves)) return null;

  return {
    barrel: barrel as Parts['barrel'],
    center: center as Parts['center'],
    third: third as Parts['third'],
    fourth,
    escape: escape as Parts['escape'],
    balance: balance as Parts['balance'],
    centerPinion: 8,
    thirdPinion: thirdPinion as PinionLeaves,
    fourthPinion: fourthPinion as PinionLeaves,
    escapePinion: escapePinion as PinionLeaves,
  };
}

export function parseCalibre(raw: unknown): Calibre | null {
  if (!isRecord(raw)) return null;
  const fixture = raw.fixture;
  if (typeof fixture !== 'string' || !(fixture in FIXTURES)) return null;
  const fixtureId = fixture as FixtureId;
  const fixtureData = FIXTURES[fixtureId];
  const parts = parseParts(raw.parts);
  if (!parts) return null;

  const regulatorRaw = finiteNumber(raw.regulator);
  const regulator = regulatorRaw === null ? 0 : Math.max(-10, Math.min(10, Math.round(regulatorRaw)));
  const temperature = TEMPERATURES.includes(raw.temperature as Temperature)
    ? (raw.temperature as Temperature)
    : 20;
  const fault = FAULTS.includes(raw.fault as FaultId) ? (raw.fault as FaultId) : 'none';
  const reserveRaw = finiteNumber(raw.reserveHours) ?? 0;
  const serial = serialFor(parts, fixtureId);
  const provisional: Calibre = {
    id: `${fixtureId}-${fault}-${serial}`,
    name: cleanupName(raw.name) ?? fixtureData.name,
    fixture: fixtureId,
    nominalVph: fixtureData.nominalVph,
    jewels: fixtureData.jewels,
    parts,
    regulator,
    temperature,
    fault,
    reserveHours: Math.max(0, reserveRaw),
    running: raw.running === true && parts.fourth !== null,
    serial,
  };
  const reserveMax = trainSnapshot(provisional).reserveMax;
  provisional.reserveHours = Math.max(0, Math.min(reserveMax, Math.round(reserveRaw * 10) / 10));
  return provisional;
}

function cleanupName(value: unknown): string | null {
  return cleanString(value, 40);
}

export function parseTest(raw: unknown): TestResult | null {
  if (!isRecord(raw)) return null;
  const at = finiteNumber(raw.at);
  const rate = finiteNumber(raw.rate);
  const amplitude = finiteNumber(raw.amplitude);
  const beatError = finiteNumber(raw.beatError);
  const reserve = finiteNumber(raw.reserve);
  const signature = cleanString(raw.signature, 600);
  if (at === null || rate === null || amplitude === null || beatError === null || reserve === null || !signature) {
    return null;
  }
  if (amplitude < 0 || amplitude > 400 || beatError < 0 || beatError > 5 || Math.abs(rate) > 2000) {
    return null;
  }
  const temperature = TEMPERATURES.includes(raw.temperature as Temperature)
    ? (raw.temperature as Temperature)
    : 20;
  const trace = Array.isArray(raw.trace)
    ? raw.trace
        .map((point) => finiteNumber(point))
        .filter((point): point is number => point !== null)
        .slice(0, 48)
    : [];
  return {
    at,
    rate,
    amplitude,
    beatError,
    reserve: Math.max(0, reserve),
    temperature,
    signature,
    certified: false,
    trace,
  };
}

function parseLog(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: LogEntry[] = [];
  raw.slice(-50).forEach((item, index) => {
    if (!isRecord(item)) return;
    const at = finiteNumber(item.at);
    const kind = LOG_KINDS.includes(item.kind as LogEntry['kind'])
      ? (item.kind as LogEntry['kind'])
      : 'state';
    const text = cleanString(item.text, 200);
    if (at === null || !text) return;
    const detail = cleanString(item.detail, 200);
    entries.push({
      id: typeof item.id === 'string' ? item.id.slice(0, 80) : `${at}-${index}`,
      at,
      kind,
      text,
      ...(detail ? { detail } : {}),
    });
  });
  return entries;
}

export function parseBenchState(raw: unknown): BenchState | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const calibre = parseCalibre(raw.calibre);
  if (!calibre) return null;
  const selectedSocket = SOCKETS.includes(raw.selectedSocket as SocketId)
    ? (raw.selectedSocket as SocketId)
    : 'center';
  const openDrawer =
    raw.openDrawer === 'pinions' || SOCKETS.includes(raw.openDrawer as SocketId)
      ? (raw.openDrawer as SocketId | 'pinions')
      : null;
  const savedAt = finiteNumber(raw.savedAt) ?? Date.now();
  return {
    version: 1,
    calibre,
    selectedSocket,
    openDrawer,
    exploded: raw.exploded === true,
    still: raw.still === true,
    log: parseLog(raw.log),
    lastTest: parseTest(raw.lastTest),
    savedAt,
  };
}

function parseShelfEntry(raw: unknown, index: number): SavedCalibre | null {
  if (!isRecord(raw)) return null;
  const calibre = parseCalibre(raw.calibre);
  if (!calibre) return null;
  const name = cleanupName(raw.name) ?? calibre.name;
  const savedAt = finiteNumber(raw.savedAt) ?? Date.now();
  const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 80) : `shelf-${calibre.serial}-${index}`;
  return {
    id,
    name,
    calibre,
    lastTest: parseTest(raw.lastTest),
    log: parseLog(raw.log),
    savedAt,
  };
}

export function parseShelf(raw: unknown): SavedCalibre[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.shelf)
      ? raw.shelf
      : [];
  const entries: SavedCalibre[] = [];
  const seen = new Set<string>();
  list.slice(0, 50).forEach((item, index) => {
    const entry = parseShelfEntry(item, index);
    if (!entry || seen.has(entry.id)) return;
    seen.add(entry.id);
    entries.push(entry);
  });
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}

export function parseShelfPayload(raw: unknown): SavedCalibre[] | null {
  if (!isRecord(raw) && !Array.isArray(raw)) return null;
  const entries = parseShelf(raw);
  return entries.length > 0 ? entries : null;
}

export interface ImportPayload {
  calibre: Calibre;
  log?: LogEntry[];
  lastTest?: TestResult | null;
}

export function parseImportPayload(raw: unknown): ImportPayload | null {
  if (!isRecord(raw)) return null;
  if ('calibre' in raw) {
    const calibre = parseCalibre(raw.calibre);
    if (!calibre) return null;
    return {
      calibre,
      log: parseLog(raw.log),
      lastTest: parseTest(raw.lastTest),
    };
  }
  const calibre = parseCalibre(raw);
  if (!calibre) return null;
  return { calibre };
}
