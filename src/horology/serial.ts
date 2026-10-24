import type { FixtureId, Parts } from './types';

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashHex(input: string): string {
  return hashString(input).toString(16).padStart(8, '0').toUpperCase();
}

export function serialFor(parts: Parts, fixture: FixtureId): string {
  const raw = hashHex(JSON.stringify({ parts, fixture }));
  return `ESC-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function seededUnit(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
