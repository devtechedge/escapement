import type { FixtureId, Parts } from './types';

export interface Fixture {
  id: FixtureId;
  name: string;
  nominalVph: number;
  jewels: number;
  parts: Parts;
  regulator: number;
  reserveHours: number;
  fault: 'none' | 'worn_pivot';
  blurb: string;
}

const baseParts: Parts = {
  barrel: 'B80',
  center: 'C64',
  third: 'T60',
  fourth: 'F60',
  escape: 'E15',
  balance: 'BAL1',
  centerPinion: 8,
  thirdPinion: 8,
  fourthPinion: 8,
  escapePinion: 6,
};

export const FIXTURES: Record<FixtureId, Fixture> = {
  school: {
    id: 'school',
    name: 'School',
    nominalVph: 18_000,
    jewels: 17,
    parts: { ...baseParts },
    regulator: 8,
    reserveHours: 60,
    fault: 'none',
    blurb: 'A slow 18,000 vph lever movement. It runs, but the regulator is set fast.',
  },
  pocket: {
    id: 'pocket',
    name: 'Pocket',
    nominalVph: 21_600,
    jewels: 19,
    parts: {
      ...baseParts,
      fourth: 'F72',
    },
    regulator: 0,
    reserveHours: 30,
    fault: 'worn_pivot',
    blurb: 'A 21,600 vph pocket movement, partly apart. The fourth wheel pivot is worn.',
  },
  marine: {
    id: 'marine',
    name: 'Marine',
    nominalVph: 28_800,
    jewels: 21,
    parts: {
      ...baseParts,
      fourth: 'F64',
      escapePinion: 4,
    },
    regulator: 0,
    reserveHours: 0,
    fault: 'none',
    blurb: 'A high-beat 28,800 vph marine movement, clean and unwound.',
  },
};

export const FIXTURE_ORDER: FixtureId[] = ['school', 'pocket', 'marine'];
