export function polar(radius: number, angle: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export function gearPath(teeth: number, rootRadius: number, tipRadius: number): string {
  if (teeth < 3) return '';
  const step = (Math.PI * 2) / teeth;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    const root1 = a - step * 0.3;
    const tip1 = a - step * 0.14;
    const tip2 = a + step * 0.14;
    const root2 = a + step * 0.3;
    const [x1, y1] = polar(rootRadius, root1);
    const [x2, y2] = polar(tipRadius, tip1);
    const [x3, y3] = polar(tipRadius, tip2);
    const [x4, y4] = polar(rootRadius, root2);
    parts.push(
      `${i === 0 ? 'M' : 'L'} ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `L ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    );
  }
  return `${parts.join(' ')} Z`;
}

export function spiralPath(
  turns: number,
  startRadius: number,
  endRadius: number,
  points = 160,
): string {
  const parts: string[] = [];
  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    const angle = t * turns * Math.PI * 2;
    const radius = startRadius + (endRadius - startRadius) * t;
    const [x, y] = polar(radius, angle);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(' ');
}

export function spokePath(count: number, inner: number, outer: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const [x1, y1] = polar(inner, angle);
    const [x2, y2] = polar(outer, angle);
    parts.push(`M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`);
  }
  return parts.join(' ');
}

export function tickMarks(count: number, inner: number, outer: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const [x1, y1] = polar(inner, angle);
    const [x2, y2] = polar(outer, angle);
    parts.push(`M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`);
  }
  return parts.join(' ');
}
