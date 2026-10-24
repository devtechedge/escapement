import { FAULT_INFO } from '../horology/faults';
import {
  formatAmplitude,
  formatBeat,
  formatDate,
  formatRate,
  formatReserve,
  formatTime,
  formatVph,
} from '../horology/format';
import { WHEELS } from '../horology/parts';
import type { BenchState, RegulationSnapshot, TrainSnapshot } from '../horology/types';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function row(x: number, y: number, label: string, value: string): string {
  return `
    <text x="${x}" y="${y}" font-family="'DM Mono', monospace" font-size="9" letter-spacing="1.1" fill="#8a6b43">${escapeXml(label.toUpperCase())}</text>
    <text x="${x + 112}" y="${y}" font-family="'Public Sans', Arial, sans-serif" font-size="12" fill="#3a2a1a">${escapeXml(value)}</text>
  `;
}

export function buildCardSvg(
  state: BenchState,
  regulation: RegulationSnapshot,
  train: TrainSnapshot,
  testCurrent: boolean,
  certificate: boolean,
): string {
  const { calibre, lastTest } = state;
  const name = escapeXml(calibre.name.length > 28 ? `${calibre.name.slice(0, 26)}…` : calibre.name);
  const parts = calibre.parts;
  const nodes = [
    { x: 50, y: 380, label: 'B', teeth: WHEELS[parts.barrel].teeth },
    { x: 118, y: 354, label: 'C', teeth: WHEELS[parts.center].teeth },
    { x: 186, y: 380, label: 'T', teeth: WHEELS[parts.third].teeth },
    { x: 254, y: 354, label: 'F', teeth: WHEELS[parts.fourth].teeth },
    { x: 322, y: 380, label: 'E', teeth: WHEELS[parts.escape].teeth },
  ];
  const trace = lastTest?.trace ?? [];
  const traceLimit = Math.max(10, ...trace.map((value) => Math.abs(value))) * 1.2;
  const tracePoints = trace
    .map((value, index) => {
      const x = 44 + (index / Math.max(1, trace.length - 1)) * 300;
      const y = 484 - (value / traceLimit) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stamp = certificate
    ? { label: 'BENCH CERTIFIED', color: '#b5122e', fill: 'none', dash: 'none' }
    : testCurrent && lastTest
      ? { label: 'NOT CERTIFIED', color: '#6b5540', fill: 'none', dash: 'none' }
      : lastTest
        ? { label: 'TEST STALE', color: '#6b5540', fill: 'none', dash: '4 4' }
        : { label: 'UNTESTED', color: '#6b5540', fill: 'none', dash: '4 4' };

  const condition =
    calibre.fault === 'none' ? 'Condition sound' : FAULT_INFO[calibre.fault].label;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="840" height="560" viewBox="0 0 840 560" role="img" aria-label="Escapement calibre passport">
  <rect width="840" height="560" fill="#f3e9d2"/>
  <rect x="1" y="1" width="838" height="558" fill="none" stroke="#c9b28b" stroke-width="2"/>
  <rect x="18" y="18" width="804" height="524" fill="none" stroke="#d8c7a5" stroke-width="1"/>
  <text x="44" y="48" font-family="'DM Mono', monospace" font-size="10" letter-spacing="2.6" fill="#8a6b43">CALIBRE PASSPORT</text>
  <text x="796" y="48" text-anchor="end" font-family="'DM Mono', monospace" font-size="9" letter-spacing="1.4" fill="#8a6b43">ESCAPEMENT · BENCH No. 05</text>
  <text x="44" y="92" font-family="'Bodoni Moda', Georgia, serif" font-size="32" fill="#3a2a1a">${name}</text>
  <text x="796" y="92" text-anchor="end" font-family="'DM Mono', monospace" font-size="10" fill="#6b5540">${escapeXml(calibre.serial)}</text>
  <line x1="44" y1="114" x2="796" y2="114" stroke="#b49a70" stroke-width="1"/>
  <text x="44" y="142" font-family="'DM Mono', monospace" font-size="9" letter-spacing="2" fill="#8a6b43">MOVEMENT</text>
  ${row(44, 168, 'Fixture', calibre.fixture.toUpperCase())}
  ${row(44, 192, 'Beat', formatVph(calibre.nominalVph))}
  ${row(44, 216, 'Train', `${train.centerToFourth.toFixed(2)} : 1`)}
  ${row(44, 240, 'Jewels', String(calibre.jewels))}
  ${row(44, 264, 'Reserve', `${formatReserve(calibre.reserveHours)} / ${Math.round(train.reserveMax)} h`)}
  ${row(44, 288, 'Condition', condition)}
  <text x="430" y="142" font-family="'DM Mono', monospace" font-size="9" letter-spacing="2" fill="#8a6b43">CURRENT</text>
  ${row(430, 168, 'Rate', formatRate(regulation.rate))}
  ${row(430, 192, 'Amplitude', formatAmplitude(regulation.amplitude))}
  ${row(430, 216, 'Beat error', formatBeat(regulation.beatError))}
  ${row(430, 240, 'Regulator', calibre.regulator > 0 ? `+${calibre.regulator}` : String(calibre.regulator))}
  ${row(430, 264, 'Temperature', `${calibre.temperature} °C`)}
  ${row(430, 288, 'Verdict', certificate ? 'Certified' : testCurrent ? 'Measured' : lastTest ? 'Stale test' : 'Untested')}
  <line x1="44" y1="312" x2="796" y2="312" stroke="#d8c7a5" stroke-width="1"/>
  <text x="44" y="338" font-family="'DM Mono', monospace" font-size="9" letter-spacing="2" fill="#8a6b43">TRAIN</text>
  <path d="M 50 380 L 118 354 L 186 380 L 254 354 L 322 380" fill="none" stroke="#b49a70" stroke-width="1" stroke-dasharray="3 3"/>
  ${nodes
    .map(
      (node) => `
    <circle cx="${node.x}" cy="${node.y}" r="10" fill="none" stroke="#9e7a43" stroke-width="1.2"/>
    <circle cx="${node.x}" cy="${node.y}" r="3" fill="#b5122e"/>
    <text x="${node.x}" y="${node.y - 16}" text-anchor="middle" font-family="'DM Mono', monospace" font-size="8" fill="#3a2a1a">${node.label}</text>
    <text x="${node.x}" y="${node.y + 25}" text-anchor="middle" font-family="'DM Mono', monospace" font-size="7" fill="#6b5540">${node.teeth}t</text>
  `,
    )
    .join('')}
  <text x="186" y="418" text-anchor="middle" font-family="'DM Mono', monospace" font-size="8" letter-spacing="1" fill="#6b5540">${train.centerToFourth.toFixed(2)} : 1 · ${formatVph(train.escapeVph)}</text>
  <text x="430" y="338" font-family="'DM Mono', monospace" font-size="9" letter-spacing="2" fill="#8a6b43">MEASUREMENT</text>
  ${row(430, 364, 'Tested', lastTest ? `${formatDate(lastTest.at)} ${formatTime(lastTest.at)}` : '-')}
  ${row(430, 388, 'At', lastTest ? `${lastTest.temperature} °C / ${formatReserve(lastTest.reserve)}` : '-')}
  ${row(430, 412, 'Rate', lastTest ? formatRate(lastTest.rate) : '-')}
  ${row(430, 436, 'Amplitude', lastTest ? formatAmplitude(lastTest.amplitude) : '-')}
  ${row(430, 460, 'Beat error', lastTest ? formatBeat(lastTest.beatError) : '-')}
  <text x="44" y="446" font-family="'DM Mono', monospace" font-size="8" letter-spacing="1" fill="#8a6b43">LATEST TRACE</text>
  <line x1="44" y1="484" x2="344" y2="484" stroke="#b49a70" stroke-width="1" stroke-dasharray="2 3"/>
  ${trace.length > 0 ? `<polyline points="${tracePoints}" fill="none" stroke="#b5122e" stroke-width="1.4" stroke-linejoin="round"/>` : `<text x="194" y="474" text-anchor="middle" font-family="'DM Mono', monospace" font-size="8" fill="#8a6b43">NO MEASUREMENT</text>`}
  <g transform="translate(712 486) rotate(-10)">
    <circle r="50" fill="${stamp.fill}" stroke="${stamp.color}" stroke-width="2" stroke-dasharray="${stamp.dash}"/>
    <circle r="43" fill="none" stroke="${stamp.color}" stroke-width="0.8" stroke-dasharray="${stamp.dash}"/>
    <text x="0" y="-6" text-anchor="middle" font-family="'DM Mono', monospace" font-size="8" letter-spacing="1.2" fill="${stamp.color}">${stamp.label.split(' ')[0]}</text>
    <text x="0" y="8" text-anchor="middle" font-family="'DM Mono', monospace" font-size="8" letter-spacing="1.2" fill="${stamp.color}">${stamp.label.split(' ').slice(1).join(' ') || 'ESC'}</text>
    <text x="0" y="24" text-anchor="middle" font-family="'DM Mono', monospace" font-size="7" fill="${stamp.color}">${lastTest ? formatDate(lastTest.at) : 'NO TEST'}</text>
  </g>
  <line x1="44" y1="508" x2="620" y2="508" stroke="#b49a70" stroke-width="1"/>
  <text x="44" y="528" font-family="'DM Mono', monospace" font-size="8" letter-spacing="1" fill="#8a6b43">DETERMINISTIC BENCH MODEL · NOT A CERTIFIED CHRONOMETER</text>
  <text x="796" y="528" text-anchor="end" font-family="'DM Mono', monospace" font-size="8" fill="#8a6b43">ESCAPEMENT / 05</text>
</svg>`;
}
