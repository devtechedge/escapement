import { describe, expect, it } from 'vitest';
import { buildCardSvg } from '../src/components/cardSvg';
import { regulationSnapshot } from '../src/horology/regulation';
import { trainSnapshot } from '../src/horology/train';
import { makeBenchState } from '../src/state/bench';

function card(state = makeBenchState('school')) {
  return buildCardSvg(
    state,
    regulationSnapshot(state.calibre),
    trainSnapshot(state.calibre),
    false,
    false,
    true,
  );
}

describe('SVG passport export', () => {
  it('writes a complete passport', () => {
    const svg = card();
    expect(svg).toContain('CALIBRE PASSPORT');
    expect(svg).toContain('ESC-');
    expect(svg).toContain('DETERMINISTIC BENCH MODEL');
    expect(svg).not.toContain('NaN');
  });

  it('escapes a hostile calibre name', () => {
    const state = makeBenchState('school');
    state.calibre.name = '<script>alert(1)</script>';
    const svg = card(state);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('marks a missing fourth wheel instead of drawing a wheel', () => {
    const state = makeBenchState('pocket');
    const svg = card(state);
    expect(svg).toContain('Fourth wheel missing');
    expect(svg).toContain('>missing<');
  });

  it('shows a stopped calibre without a fabricated rate', () => {
    const state = makeBenchState('marine');
    const svg = card(state);
    expect(svg).toContain('>Stopped<');
    expect(svg).not.toContain('+12.0 s/d');
  });
});
