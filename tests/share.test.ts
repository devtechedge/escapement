import { describe, expect, it } from 'vitest';
import { decodeBuildHash, encodeBuild } from '../src/lib/share';
import { makeCalibre } from '../src/state/bench';

describe('share links', () => {
  it('round-trips a build and its theme', () => {
    const calibre = makeCalibre('school');
    calibre.regulator = -4;
    calibre.temperature = 26;
    calibre.name = 'Observatory';
    const decoded = decodeBuildHash(`#build=${encodeBuild(calibre, 'night')}`);
    expect(decoded?.calibre.name).toBe('Observatory');
    expect(decoded?.calibre.regulator).toBe(-4);
    expect(decoded?.calibre.temperature).toBe(26);
    expect(decoded?.calibre.parts).toEqual(calibre.parts);
    expect(decoded?.calibre.running).toBe(false);
    expect(decoded?.theme).toBe('night');
  });

  it('round-trips a missing fourth wheel', () => {
    const calibre = makeCalibre('pocket');
    const decoded = decodeBuildHash(`#build=${encodeBuild(calibre, 'day')}`);
    expect(decoded?.calibre.parts.fourth).toBeNull();
    expect(decoded?.calibre.running).toBe(false);
    expect(decoded?.theme).toBe('day');
  });

  it('rejects a hash that is not a build', () => {
    expect(decodeBuildHash('')).toBeNull();
    expect(decodeBuildHash('#bench=abc')).toBeNull();
    expect(decodeBuildHash('#build=not-base64')).toBeNull();
  });

  it('rejects a build with an invalid wheel', () => {
    const calibre = makeCalibre('school');
    const encoded = encodeBuild(calibre, 'day');
    const raw = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
    raw.parts.fourth = 'C64';
    const tampered = btoa(JSON.stringify(raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeBuildHash(`#build=${tampered}`)).toBeNull();
  });

  it('rejects an unknown fixture', () => {
    const calibre = makeCalibre('school');
    const encoded = encodeBuild(calibre, 'day');
    const raw = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
    raw.fixture = 'moon';
    const tampered = btoa(JSON.stringify(raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeBuildHash(`#build=${tampered}`)).toBeNull();
  });
});
