import { FIXTURES } from '../horology/fixtures';
import { parseCalibre } from '../state/validate';
import type { BenchTheme, Calibre } from '../horology/types';

interface BuildPayload {
  v: 1;
  fixture: string;
  name: string;
  parts: unknown;
  regulator: number;
  temperature: number;
  fault: string;
  theme: BenchTheme;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string | null {
  try {
    const base = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base + '='.repeat((4 - (base.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeBuild(calibre: Calibre, theme: BenchTheme): string {
  const payload: BuildPayload = {
    v: 1,
    fixture: calibre.fixture,
    name: calibre.name,
    parts: calibre.parts,
    regulator: calibre.regulator,
    temperature: calibre.temperature,
    fault: calibre.fault,
    theme,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeBuildHash(hash: string): { calibre: Calibre; theme: BenchTheme } | null {
  const clean = hash.replace(/^#/, '');
  if (!clean.startsWith('build=')) return null;
  const json = fromBase64Url(clean.slice('build='.length));
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<BuildPayload>;
    if (raw.v !== 1 || typeof raw.fixture !== 'string' || !(raw.fixture in FIXTURES)) return null;
    const fixture = raw.fixture as keyof typeof FIXTURES;
    const calibre = parseCalibre({
      fixture,
      name: raw.name,
      parts: raw.parts,
      regulator: raw.regulator,
      temperature: raw.temperature,
      fault: raw.fault,
      reserveHours: FIXTURES[fixture].reserveHours,
      running: false,
    });
    if (!calibre) return null;
    return {
      calibre: { ...calibre, running: false },
      theme: raw.theme === 'night' ? 'night' : 'day',
    };
  } catch {
    return null;
  }
}
