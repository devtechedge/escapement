import { FIXTURES } from '../horology/fixtures';
import { FAULT_INFO } from '../horology/faults';
import { WHEELS } from '../horology/parts';
import {
  isTestCurrent,
  makeTestResult,
  regulationSnapshot,
  signatureFor,
} from '../horology/regulation';
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
  SocketId,
  Temperature,
  TestResult,
  WheelId,
} from '../horology/types';

let logCounter = 0;

export function makeLogEntry(
  at: number,
  kind: LogEntry['kind'],
  text: string,
  detail?: string,
): LogEntry {
  logCounter += 1;
  return { id: `${at}-${logCounter}`, at, kind, text, ...(detail ? { detail } : {}) };
}

function cloneParts(parts: Parts): Parts {
  return { ...parts };
}

export function makeCalibre(
  fixtureId: FixtureId,
  fault?: FaultId,
  name?: string,
): Calibre {
  const fixture = FIXTURES[fixtureId];
  const parts = cloneParts(fixture.parts);
  const activeFault = fault ?? fixture.fault;
  const serial = serialFor(parts, fixtureId);
  const fallbackName =
    activeFault === fixture.fault || activeFault === 'none'
      ? fixture.name
      : `Bench ${FAULT_INFO[activeFault].short}`;
  return {
    id: `${fixtureId}-${activeFault}-${serial}`,
    name: (name?.trim() || fallbackName).slice(0, 40),
    fixture: fixtureId,
    nominalVph: fixture.nominalVph,
    jewels: fixture.jewels,
    parts,
    regulator: fixture.regulator,
    temperature: 20,
    fault: activeFault,
    reserveHours: fixture.reserveHours,
    running: fixture.reserveHours > 0,
    serial,
  };
}

export function makeBenchState(
  fixtureId: FixtureId = 'school',
  fault?: FaultId,
  now = Date.now(),
): BenchState {
  const calibre = makeCalibre(fixtureId, fault);
  return {
    version: 1,
    calibre,
    selectedSocket: 'center',
    openDrawer: null,
    exploded: false,
    still: false,
    log: [makeLogEntry(now, 'state', `${calibre.name} mounted on the bench.`)],
    lastTest: null,
    savedAt: now,
  };
}

export function applyElapsed(state: BenchState, now = Date.now()): BenchState {
  const elapsedHours = Math.max(0, (now - state.savedAt) / 3_600_000);
  if (elapsedHours < 0.01) {
    return { ...state, savedAt: now };
  }
  const reserve = Math.max(0, state.calibre.reserveHours - elapsedHours);
  const stopped = reserve === 0 && state.calibre.running;
  const calibre: Calibre = {
    ...state.calibre,
    reserveHours: Math.round(reserve * 10) / 10,
    running: reserve > 0 ? state.calibre.running : false,
  };
  return {
    ...state,
    calibre,
    savedAt: now,
    log: stopped
      ? [
          ...state.log.slice(-39),
          makeLogEntry(now, 'state', 'Reserve exhausted while away. The movement stopped.'),
        ]
      : state.log,
  };
}

export function selectSocket(state: BenchState, socket: SocketId): BenchState {
  return {
    ...state,
    selectedSocket: socket,
    openDrawer: socket,
  };
}

export function toggleDrawer(state: BenchState, drawer: SocketId | 'pinions'): BenchState {
  return { ...state, openDrawer: state.openDrawer === drawer ? null : drawer };
}

export function setWheelOnParts(parts: Parts, socket: SocketId, wheel: WheelId): Parts {
  const next = cloneParts(parts);
  switch (socket) {
    case 'barrel':
      next.barrel = wheel as Parts['barrel'];
      break;
    case 'center':
      next.center = wheel as Parts['center'];
      break;
    case 'third':
      next.third = wheel as Parts['third'];
      break;
    case 'fourth':
      next.fourth = wheel as Parts['fourth'];
      break;
    case 'escape':
      next.escape = wheel as Parts['escape'];
      break;
    case 'balance':
      next.balance = wheel as Parts['balance'];
      break;
  }
  return next;
}

export function installWheel(
  state: BenchState,
  wheel: WheelId,
  now = Date.now(),
): BenchState {
  const socket = WHEELS[wheel].socket;
  if (state.calibre.parts[socket] === wheel) return state;
  const parts = setWheelOnParts(state.calibre.parts, socket, wheel);
  const calibre: Calibre = {
    ...state.calibre,
    parts,
    running: false,
    serial: serialFor(parts, state.calibre.fixture),
  };
  return {
    ...state,
    calibre,
    selectedSocket: socket,
    openDrawer: socket,
    log: [
      ...state.log.slice(-39),
      makeLogEntry(now, 'part', `Fitted ${WHEELS[wheel].label}. Movement stopped.`),
    ],
  };
}

export function installPinion(
  state: BenchState,
  leaves: PinionLeaves,
  now = Date.now(),
): BenchState {
  const socket = state.selectedSocket;
  if (socket !== 'third' && socket !== 'fourth' && socket !== 'escape') {
    return state;
  }
  const parts = cloneParts(state.calibre.parts);
  if (socket === 'third') {
    if (parts.thirdPinion === leaves) return state;
    parts.thirdPinion = leaves;
  }
  if (socket === 'fourth') {
    if (parts.fourthPinion === leaves) return state;
    parts.fourthPinion = leaves;
  }
  if (socket === 'escape') {
    if (parts.escapePinion === leaves) return state;
    parts.escapePinion = leaves;
  }
  const calibre: Calibre = {
    ...state.calibre,
    parts,
    running: false,
    serial: serialFor(parts, state.calibre.fixture),
  };
  return {
    ...state,
    calibre,
    log: [
      ...state.log.slice(-39),
      makeLogEntry(
        now,
        'part',
        `Fitted a ${leaves}-leaf pinion to the ${socket} wheel. Movement stopped.`,
      ),
    ],
  };
}

export function setRegulator(state: BenchState, value: number): BenchState {
  const regulator = Math.max(-10, Math.min(10, Math.round(value)));
  if (regulator === state.calibre.regulator) return state;
  return {
    ...state,
    calibre: { ...state.calibre, regulator },
  };
}

export function setTemperature(state: BenchState, temperature: Temperature): BenchState {
  if (temperature === state.calibre.temperature) return state;
  return { ...state, calibre: { ...state.calibre, temperature } };
}

export function wind(state: BenchState, turns: number, now = Date.now()): BenchState {
  const train = trainSnapshot(state.calibre);
  const max = train.reserveMax;
  const target = Math.min(max, state.calibre.reserveHours + turns * train.barrelHoursPerTurn);
  if (target <= state.calibre.reserveHours) return state;
  return {
    ...state,
    calibre: {
      ...state.calibre,
      reserveHours: Math.round(target * 10) / 10,
    },
    log: [
      ...state.log.slice(-39),
      makeLogEntry(
        now,
        'wind',
        `Wound ${turns} ${turns === 1 ? 'turn' : 'turns'}. Reserve ${Math.round(target)} h.`,
      ),
    ],
  };
}

export function startMovement(state: BenchState, now = Date.now()): BenchState {
  if (!trainSnapshot(state.calibre).coherent || state.calibre.reserveHours <= 0) {
    return state;
  }
  if (state.calibre.running) return state;
  return {
    ...state,
    calibre: { ...state.calibre, running: true },
    log: [
      ...state.log.slice(-39),
      makeLogEntry(now, 'state', 'Movement started.'),
    ],
  };
}

export function stopMovement(state: BenchState, now = Date.now()): BenchState {
  if (!state.calibre.running) return state;
  return {
    ...state,
    calibre: { ...state.calibre, running: false },
    log: [
      ...state.log.slice(-39),
      makeLogEntry(now, 'state', 'Movement stopped.'),
    ],
  };
}

export function completeTest(
  state: BenchState,
  result: TestResult,
  now = Date.now(),
): BenchState {
  const reserve = Math.max(0, state.calibre.reserveHours - 24);
  const running = reserve > 0 ? state.calibre.running : false;
  const detail = result.certified ? 'Certificate issued.' : 'Outside certificate tolerances.';
  return {
    ...state,
    calibre: {
      ...state.calibre,
      reserveHours: Math.round(reserve * 10) / 10,
      running,
    },
    lastTest: result,
    log: [
      ...state.log.slice(-39),
      makeLogEntry(
        now,
        'test',
        `Rate test ${result.rate >= 0 ? '+' : ''}${result.rate.toFixed(1)} s/d, ${Math.round(result.amplitude)}°, ${result.beatError.toFixed(1)} ms.`,
        detail,
      ),
    ],
  };
}

export function repair(state: BenchState, now = Date.now()): BenchState {
  const info = FAULT_INFO[state.calibre.fault];
  if (state.calibre.fault === 'none' || !info.fix) return state;
  const reserve = state.calibre.fault === 'set_mainspring' ? 0 : state.calibre.reserveHours;
  return {
    ...state,
    calibre: {
      ...state.calibre,
      fault: 'none',
      running: false,
      reserveHours: reserve,
    },
    log: [
      ...state.log.slice(-39),
      makeLogEntry(now, 'repair', info.fix, 'Condition corrected. Wind and test.'),
    ],
  };
}

export function newCalibre(
  state: BenchState,
  fixtureId: FixtureId,
  fault?: FaultId,
  now = Date.now(),
): BenchState {
  const activeFault = fault ?? FIXTURES[fixtureId].fault;
  const calibre = makeCalibre(fixtureId, activeFault);
  return {
    ...state,
    calibre,
    selectedSocket: 'center',
    openDrawer: null,
    exploded: false,
    lastTest: null,
    log: [
      ...state.log.slice(-39),
      makeLogEntry(now, 'state', `${calibre.name} mounted on the bench.`),
    ],
  };
}

export function importCalibre(
  state: BenchState,
  calibre: Calibre,
  log: LogEntry[] | undefined,
  lastTest: TestResult | null,
  now = Date.now(),
): BenchState {
  return {
    ...state,
    calibre,
    selectedSocket: 'center',
    openDrawer: null,
    exploded: false,
    lastTest,
    log: [
      ...(log ?? []).slice(-20),
      makeLogEntry(now, 'import', `Imported ${calibre.name}.`),
    ].slice(-40),
  };
}

export function renameCalibre(state: BenchState, name: string): BenchState {
  const clean = name.trim().slice(0, 40);
  if (!clean) return state;
  return { ...state, calibre: { ...state.calibre, name: clean } };
}

export function toggleExploded(state: BenchState): BenchState {
  return { ...state, exploded: !state.exploded };
}

export function setStill(state: BenchState, still: boolean): BenchState {
  return { ...state, still };
}

export function currentSignals(state: BenchState) {
  const train = trainSnapshot(state.calibre);
  const regulation = regulationSnapshot(state.calibre);
  const current = isTestCurrent(state.calibre, state.lastTest);
  return {
    train,
    regulation,
    testCurrent: current,
    certificate: Boolean(current && state.lastTest?.certified),
    running: state.calibre.running && train.coherent && state.calibre.reserveHours > 0,
  };
}

export function canRunTest(state: BenchState): boolean {
  const train = trainSnapshot(state.calibre);
  return train.coherent && state.calibre.reserveHours >= 24;
}

export function makeCurrentTest(state: BenchState, now = Date.now()): TestResult {
  return makeTestResult(state.calibre, now);
}

export function testSignature(state: BenchState): string {
  return signatureFor(state.calibre);
}

export function newSerial(parts: Parts, fixture: FixtureId): string {
  return serialFor(parts, fixture);
}

export type Signals = ReturnType<typeof currentSignals>;
