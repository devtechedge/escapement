import { describe, expect, it } from 'vitest';
import { makeCalibre } from '../src/state/bench';
import { serialFor } from '../src/horology/serial';

describe('serial numbers', () => {
  it('is stable for the same build', () => {
    const first = makeCalibre('school');
    const second = makeCalibre('school');
    expect(first.serial).toBe(second.serial);
    expect(first.serial).toMatch(/^ESC-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('changes when the train changes', () => {
    const first = makeCalibre('school');
    const second = makeCalibre('school');
    second.parts.fourth = 'F64';
    expect(serialFor(second.parts, second.fixture)).not.toBe(
      serialFor(first.parts, first.fixture),
    );
  });
});
