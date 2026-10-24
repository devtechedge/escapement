import { useEffect, useRef } from 'react';
import { formatAmplitude, formatBeat, formatRate, formatReserve } from '../horology/format';
import { WHEELS } from '../horology/parts';
import type {
  Calibre,
  RegulationSnapshot,
  SocketId,
  TrainSnapshot,
} from '../horology/types';
import { gearPath, spiralPath, spokePath, tickMarks } from './geometry';
import {
  CX,
  CY,
  EVIDENCE_TAG,
  EXPLODE_OFFSETS,
  FAULT_SOCKET,
  PALLET,
  SOCKETS,
  VIEW,
} from './layout';

interface MovementPlateProps {
  calibre: Calibre;
  train: TrainSnapshot;
  regulation: RegulationSnapshot;
  selectedSocket: SocketId;
  onSelect: (socket: SocketId) => void;
  exploded: boolean;
  still: boolean;
  running: boolean;
  testing: boolean;
  raking: boolean;
  light: { x: number; y: number };
}

const START_SECONDS = 10 * 3600 + 10 * 60 + 30;

function wheelAngle(socket: SocketId, hours: number, train: TrainSnapshot): number {
  switch (socket) {
    case 'barrel':
      return (hours / train.barrelHoursPerTurn) * 360;
    case 'center':
      return hours * 360;
    case 'third':
      return hours * train.thirdRevsPerHour * 360;
    case 'fourth':
      return hours * train.fourthRevsPerHour * 360;
    case 'escape':
      return hours * train.escapeRevsPerHour * 360;
    case 'balance':
      return 0;
  }
}

function shortLabel(calibre: Calibre, socket: SocketId): string {
  const wheel = calibre.parts[socket];
  if (socket === 'balance') return 'Balance';
  const spec = WHEELS[wheel];
  return `${spec.short} · ${spec.teeth}t`;
}

function wheelRadius(socket: SocketId): { root: number; tip: number } {
  switch (socket) {
    case 'barrel':
      return { root: 65, tip: 73 };
    case 'center':
      return { root: 53, tip: 61 };
    case 'third':
      return { root: 45, tip: 53 };
    case 'fourth':
      return { root: 37, tip: 45 };
    case 'escape':
      return { root: 22, tip: 29 };
    case 'balance':
      return { root: 52, tip: 58 };
  }
}

function handAngle(seconds: number, period: number): number {
  return ((seconds % period) / period) * 360;
}

export function MovementPlate({
  calibre,
  train,
  regulation,
  selectedSocket,
  onSelect,
  exploded,
  still,
  running,
  testing,
  raking,
  light,
}: MovementPlateProps) {
  const spinRefs = useRef<Partial<Record<SocketId, SVGGElement | null>>>({});
  const balanceRef = useRef<SVGGElement | null>(null);
  const palletRef = useRef<SVGGElement | null>(null);
  const hourRef = useRef<SVGGElement | null>(null);
  const minuteRef = useRef<SVGGElement | null>(null);
  const secondRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const setHands = (seconds: number) => {
      hourRef.current?.setAttribute(
        'transform',
        `rotate(${handAngle(seconds, 43_200)} ${CX} ${CY})`,
      );
      minuteRef.current?.setAttribute(
        'transform',
        `rotate(${handAngle(seconds, 3_600)} ${CX} ${CY})`,
      );
      secondRef.current?.setAttribute(
        'transform',
        `rotate(${handAngle(seconds, 60)} ${CX} ${CY})`,
      );
    };

    const setWheels = (seconds: number) => {
      const hours = seconds / 3600;
      (Object.keys(SOCKETS) as SocketId[]).forEach((socket) => {
        const angle = wheelAngle(socket, hours, train) % 360;
        spinRefs.current[socket]?.setAttribute('transform', `rotate(${angle.toFixed(2)})`);
      });
    };

    const setStatic = () => {
      setWheels(START_SECONDS);
      setHands(START_SECONDS);
      balanceRef.current?.setAttribute('transform', 'rotate(0)');
      palletRef.current?.setAttribute('transform', 'rotate(0)');
    };

    if (!running || still) {
      setStatic();
      return;
    }

    let frame = 0;
    let previous = performance.now();
    let wheelSeconds = START_SECONDS;
    let handSeconds = START_SECONDS;
    const balanceHz = testing ? 9 : train.balanceHz;
    const wheelSpeed = testing ? 60 : 1;
    const handSpeed = testing ? 7_200 : 1;

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      wheelSeconds += delta * wheelSpeed;
      handSeconds += delta * handSpeed;
      setWheels(wheelSeconds);
      setHands(handSeconds);

      const phase = (wheelSeconds - START_SECONDS) * Math.PI * 2 * balanceHz;
      const swing = Math.sin(phase) * 32;
      balanceRef.current?.setAttribute('transform', `rotate(${swing.toFixed(2)})`);
      palletRef.current?.setAttribute('transform', `rotate(${(-swing * 0.18).toFixed(2)})`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    running,
    still,
    testing,
    train,
    train.barrelHoursPerTurn,
    train.balanceHz,
    train.escapeRevsPerHour,
    train.fourthRevsPerHour,
    train.thirdRevsPerHour,
  ]);

  const faultSocket = FAULT_SOCKET[calibre.fault];
  const evidenceTag = EVIDENCE_TAG[calibre.fault];
  const faultPoint = faultSocket ? SOCKETS[faultSocket] : null;
  const lightX = light.x * VIEW;
  const lightY = light.y * VIEW;
  const evidenceNear =
    raking &&
    faultPoint !== null &&
    Math.hypot(lightX - faultPoint.x, lightY - faultPoint.y) < 132;
  const evidenceX = faultPoint ? Math.max(120, Math.min(VIEW - 130, faultPoint.x + 34)) : 0;
  const evidenceY = faultPoint ? Math.max(92, faultPoint.y - 48) : 0;

  return (
    <div className="movement-wrap">
      <svg
        className={`movement-svg ${testing ? 'is-testing' : ''} ${still ? 'is-still' : ''}`}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="group"
        aria-label="Watch movement plate. Select a wheel to inspect it."
      >
        <defs>
          <radialGradient id="plateBrass" cx="38%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#f1ddb0" />
            <stop offset="42%" stopColor="#d8b87a" />
            <stop offset="78%" stopColor="#b58f4f" />
            <stop offset="100%" stopColor="#8e6b37" />
          </radialGradient>
          <radialGradient id="wheelBrass" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#f6e6bc" />
            <stop offset="55%" stopColor="#cfa965" />
            <stop offset="100%" stopColor="#8c6a35" />
          </radialGradient>
          <radialGradient id="wheelSteel" cx="38%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#7f94ac" />
            <stop offset="55%" stopColor="#3d5068" />
            <stop offset="100%" stopColor="#1e2c3c" />
          </radialGradient>
          <radialGradient id="rubyJewel" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ff9a9a" />
            <stop offset="45%" stopColor="#b5122e" />
            <stop offset="100%" stopColor="#5c0715" />
          </radialGradient>
          <linearGradient id="paperLabel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6edd8" />
            <stop offset="100%" stopColor="#e9dcc0" />
          </linearGradient>
          <pattern
            id="geneva"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(38)"
          >
            <rect width="28" height="28" fill="none" />
            <path d="M 0 0 V 28" stroke="#6f5228" strokeWidth="7" opacity="0.22" />
            <path d="M 12 0 V 28" stroke="#f8e7bf" strokeWidth="2" opacity="0.22" />
          </pattern>
          <clipPath id="plateClip">
            <circle cx={CX} cy={CY} r="296" />
          </clipPath>
          <filter id="plateShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#3b2518" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter="url(#plateShadow)">
          <circle cx={CX} cy={CY} r="304" fill="url(#plateBrass)" stroke="#6d4b21" strokeWidth="4" />
        </g>
        <g clipPath="url(#plateClip)">
          <circle cx={CX} cy={CY} r="296" fill="url(#geneva)" />
          <circle cx={CX} cy={CY} r="296" fill="none" stroke="#f1dcae" strokeWidth="1" opacity="0.5" />
          <circle cx={CX} cy={CY} r="246" fill="none" stroke="#6d4b21" strokeWidth="1" opacity="0.3" />
          <text
            x={CX}
            y="92"
            textAnchor="middle"
            fontFamily="'Bodoni Moda', serif"
            fontSize="26"
            letterSpacing="8"
            fill="#4d3518"
          >
            ESCAPEMENT
          </text>
          <text
            x={CX}
            y="114"
            textAnchor="middle"
            fontFamily="'DM Mono', monospace"
            fontSize="9"
            letterSpacing="3"
            fill="#6d5129"
          >
            SWISS LEVER · No. 05
          </text>
          <text
            x={CX}
            y="704"
            textAnchor="middle"
            fontFamily="'DM Mono', monospace"
            fontSize="10"
            letterSpacing="3"
            fill="#4d3518"
          >
            {calibre.jewels} JEWELS · {calibre.fixture.toUpperCase()}
          </text>

          {[45, 135, 225, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = CX + Math.cos(rad) * 275;
            const y = CY + Math.sin(rad) * 275;
            return (
              <g key={angle}>
                <circle cx={x} cy={y} r="9" fill="#b99254" stroke="#6d4b21" strokeWidth="2" />
                <line
                  x1={x - 5}
                  y1={y}
                  x2={x + 5}
                  y2={y}
                  stroke="#4d3518"
                  strokeWidth="2"
                  transform={`rotate(${angle + 20} ${x} ${y})`}
                />
              </g>
            );
          })}

          <g className="train-lines" fill="none" stroke="#22364a" strokeWidth="1.2" opacity="0.32">
            <path d="M 540 450 L 390 340 L 285 430 L 360 525 L 455 545" strokeDasharray="3 5" />
            <path d="M 455 545 L 474 500" strokeDasharray="2 4" />
            <path d="M 474 500 L 278 222" strokeDasharray="2 4" opacity="0.5" />
          </g>

          {(Object.keys(SOCKETS) as SocketId[]).map((socket) => {
            if (socket === 'balance') return null;
            const spec = SOCKETS[socket];
            const wheelId = calibre.parts[socket];
            const wheelSpec = WHEELS[wheelId];
            const radius = wheelRadius(socket);
            const selected = selectedSocket === socket;
            const [dx, dy] = EXPLODE_OFFSETS[socket];
            const initial = wheelAngle(socket, START_SECONDS / 3600, train) % 360;
            const isEscape = socket === 'escape';
            const isBarrel = socket === 'barrel';
            const visualTeeth = isEscape ? wheelSpec.teeth : Math.min(wheelSpec.teeth, 48);
            return (
              <g
                key={socket}
                className={`movement-part ${selected ? 'is-selected' : ''}`}
                style={{
                  transform: exploded ? `translate(${dx}px, ${dy}px)` : 'none',
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${wheelSpec.label}. ${wheelSpec.teeth} teeth.`}
                aria-pressed={selected}
                onClick={() => onSelect(socket)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(socket);
                  }
                }}
              >
                <title>{`${wheelSpec.label}. ${wheelSpec.teeth} teeth.`}</title>
                <circle
                  className="focus-ring"
                  cx={spec.x}
                  cy={spec.y}
                  r={spec.r + 12}
                  fill="none"
                  stroke="var(--ruby)"
                  strokeWidth="2"
                  strokeDasharray="3 5"
                  opacity={selected ? 0.95 : 0}
                  pointerEvents="none"
                />
                <circle
                  cx={spec.x}
                  cy={spec.y}
                  r={spec.r + 2}
                  fill="transparent"
                  pointerEvents="all"
                />
                <g transform={`translate(${spec.x} ${spec.y})`}>
                  <g
                    ref={(element) => {
                      spinRefs.current[socket] = element;
                    }}
                    transform={`rotate(${initial})`}
                  >
                    <path
                      d={gearPath(visualTeeth, radius.root, radius.tip)}
                      fill={isEscape ? 'url(#wheelSteel)' : 'url(#wheelBrass)'}
                      stroke={isEscape ? '#152232' : '#6d4b21'}
                      strokeWidth="1"
                    />
                    <circle
                      r={radius.root - 6}
                      fill="none"
                      stroke={isEscape ? '#92a8bf' : '#f4dfad'}
                      strokeWidth={isBarrel ? 3 : 1.5}
                      opacity="0.7"
                    />
                    {isBarrel ? (
                      <>
                        <circle r={radius.root - 11} fill="#6d4b21" opacity="0.24" />
                        <path
                          d={spiralPath(
                            calibre.fault === 'set_mainspring' ? 2.2 : 4.2,
                            7,
                            radius.root - 14,
                          )}
                          fill="none"
                          stroke="#f0ddb0"
                          strokeWidth="4"
                          strokeLinecap="round"
                          opacity="0.85"
                        />
                      </>
                    ) : (
                      <path
                        d={spokePath(5, 9, radius.root - 9)}
                        stroke={isEscape ? '#9db3c9' : '#f0d9a2'}
                        strokeWidth={isEscape ? 3 : 5}
                        strokeLinecap="round"
                      />
                    )}
                    <circle r={isEscape ? 10 : 8} fill="#8e6b37" stroke="#513714" strokeWidth="2" />
                  </g>
                  <circle r="4.5" fill="url(#rubyJewel)" stroke="#5c0715" strokeWidth="1" />
                </g>
                <text
                  x={spec.x}
                  y={spec.y + spec.r + (socket === 'fourth' ? 21 : 17)}
                  textAnchor="middle"
                  fontFamily="'DM Mono', monospace"
                  fontSize="9"
                  letterSpacing="0.6"
                  fill="#4a3418"
                  pointerEvents="none"
                >
                  {shortLabel(calibre, socket)}
                </text>
              </g>
            );
          })}

          <g
            className={`movement-part ${selectedSocket === 'balance' ? 'is-selected' : ''}`}
            style={{
              transform: exploded
                ? `translate(${EXPLODE_OFFSETS.balance[0]}px, ${EXPLODE_OFFSETS.balance[1]}px)`
                : 'none',
            }}
            role="button"
            tabIndex={0}
            aria-label="Select balance wheel and hairspring."
            aria-pressed={selectedSocket === 'balance'}
            onClick={() => onSelect('balance')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect('balance');
              }
            }}
          >
            <title>Balance wheel and hairspring.</title>
            <circle
              className="focus-ring"
              cx={SOCKETS.balance.x}
              cy={SOCKETS.balance.y}
              r={SOCKETS.balance.r + 12}
              fill="none"
              stroke="var(--ruby)"
              strokeWidth="2"
              strokeDasharray="3 5"
              opacity={selectedSocket === 'balance' ? 0.95 : 0}
              pointerEvents="none"
            />
            <circle
              cx={SOCKETS.balance.x}
              cy={SOCKETS.balance.y}
              r={SOCKETS.balance.r + 4}
              fill="transparent"
              pointerEvents="all"
            />
            <g transform={`translate(${SOCKETS.balance.x} ${SOCKETS.balance.y})`}>
              <g ref={balanceRef} transform="rotate(0)">
                <circle
                  r="52"
                  fill="none"
                  stroke="url(#wheelBrass)"
                  strokeWidth="7"
                />
                <circle r="52" fill="none" stroke="#f4dfad" strokeWidth="1" opacity="0.5" />
                <path d={spokePath(3, 8, 48)} stroke="#c9a35f" strokeWidth="5" strokeLinecap="round" />
                <path
                  d={spiralPath(calibre.fault === 'magnetized' ? 3.5 : 7, 5, 39, 180)}
                  fill="none"
                  stroke={calibre.fault === 'magnetized' ? '#b84c4c' : '#384e66'}
                  strokeWidth={calibre.fault === 'magnetized' ? 2.6 : 1.6}
                  strokeLinecap="round"
                  opacity="0.95"
                />
                <circle r="4.5" fill="url(#rubyJewel)" stroke="#5c0715" strokeWidth="1" />
                <circle cx="0" cy="-44" r="3" fill="#5f4522" />
                <circle cx="38" cy="22" r="3" fill="#5f4522" />
              </g>
              <path
                d="M -64 -8 Q 0 -74 64 -8"
                fill="none"
                stroke="#6d4b21"
                strokeWidth="5"
                opacity="0.42"
              />
              <text
                x="0"
                y="78"
                textAnchor="middle"
                fontFamily="'DM Mono', monospace"
                fontSize="9"
                letterSpacing="0.6"
                fill="#4a3418"
                pointerEvents="none"
              >
                Balance · hairspring
              </text>
            </g>
          </g>

          <g transform={`translate(${PALLET.x} ${PALLET.y})`} pointerEvents="none">
            <circle r="20" fill="#8e6b37" opacity="0.28" />
            <g ref={palletRef} transform="rotate(0)">
              <path
                d="M -4 2 L 22 -15 L 26 -10 L 6 5 L 17 18 L 12 21 L -5 8 Z"
                fill="url(#wheelSteel)"
                stroke="#152232"
                strokeWidth="1.5"
              />
              <circle cx="-7" cy="1" r="3" fill="url(#rubyJewel)" />
              <circle cx="24" cy="-13" r="2.5" fill="#9db3c9" />
              <circle cx="15" cy="19" r="2.5" fill="#9db3c9" />
            </g>
            <text
              x="0"
              y="35"
              textAnchor="middle"
              fontFamily="'DM Mono', monospace"
              fontSize="8"
              fill="#4a3418"
              opacity="0.8"
            >
              pallet
            </text>
          </g>

          <g className="chapter-ring" pointerEvents="none">
            <circle cx={CX} cy={CY} r="94" fill="none" stroke="#5c4020" strokeWidth="1" opacity="0.55" />
            <path
              d={tickMarks(60, 88, 94)}
              stroke="#5c4020"
              strokeWidth="1"
              opacity="0.55"
            />
            {[0, 15, 30, 45].map((i) => {
              const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
              const x1 = CX + Math.cos(angle) * 82;
              const y1 = CY + Math.sin(angle) * 82;
              const x2 = CX + Math.cos(angle) * 94;
              const y2 = CY + Math.sin(angle) * 94;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#4d3518"
                  strokeWidth="2"
                />
              );
            })}
            {[
              { n: '12', a: -Math.PI / 2 },
              { n: '3', a: 0 },
              { n: '6', a: Math.PI / 2 },
              { n: '9', a: Math.PI },
            ].map(({ n, a }) => (
              <text
                key={n}
                x={CX + Math.cos(a) * 72}
                y={CY + Math.sin(a) * 72 + 5}
                textAnchor="middle"
                fontFamily="'Bodoni Moda', serif"
                fontSize="16"
                fill="#4d3518"
              >
                {n}
              </text>
            ))}
          </g>

          <g className="hands">
            <g ref={hourRef} transform={`rotate(${handAngle(START_SECONDS, 43_200)} ${CX} ${CY})`}>
              <path
                d={`M ${CX - 4} ${CY + 8} L ${CX - 2} ${CY - 50} L ${CX} ${CY - 57} L ${CX + 2} ${CY - 50} L ${CX + 4} ${CY + 8} Z`}
                fill="#22364a"
                stroke="#152232"
                strokeWidth="1"
              />
            </g>
            <g ref={minuteRef} transform={`rotate(${handAngle(START_SECONDS, 3_600)} ${CX} ${CY})`}>
              <path
                d={`M ${CX - 3} ${CY + 10} L ${CX - 1.5} ${CY - 78} L ${CX} ${CY - 85} L ${CX + 1.5} ${CY - 78} L ${CX + 3} ${CY + 10} Z`}
                fill="#22364a"
                stroke="#152232"
                strokeWidth="1"
              />
            </g>
            <g ref={secondRef} transform={`rotate(${handAngle(START_SECONDS, 60)} ${CX} ${CY})`}>
              <line
                x1={CX}
                y1={CY + 14}
                x2={CX}
                y2={CY - 96}
                stroke="#b5122e"
                strokeWidth="1.6"
              />
              <circle cx={CX} cy={CY - 96} r="3" fill="#b5122e" />
              <circle cx={CX} cy={CY} r="4" fill="#b5122e" />
            </g>
            <circle cx={CX} cy={CY} r="6" fill="#c9a35f" stroke="#5c4020" strokeWidth="1.5" />
          </g>

          {evidenceNear && faultPoint && evidenceTag ? (
            <g className="evidence" pointerEvents="none">
              <line
                x1={faultPoint.x}
                y1={faultPoint.y}
                x2={evidenceX}
                y2={evidenceY + 12}
                stroke="var(--ruby)"
                strokeWidth="1.4"
                strokeDasharray="3 3"
              />
              <circle cx={faultPoint.x} cy={faultPoint.y} r="4" fill="var(--ruby)" />
              <rect
                x={evidenceX - 10}
                y={evidenceY - 4}
                width="132"
                height="24"
                rx="2"
                fill="url(#paperLabel)"
                stroke="#9e7a43"
                strokeWidth="1"
              />
              <text
                x={evidenceX + 56}
                y={evidenceY + 12}
                textAnchor="middle"
                fontFamily="'DM Mono', monospace"
                fontSize="9"
                fill="#4d3518"
              >
                {evidenceTag}
              </text>
            </g>
          ) : null}
        </g>
      </svg>
      <p className="sr-only">
        Movement plate. {calibre.name}. {formatRate(regulation.rate)}, amplitude{' '}
        {formatAmplitude(regulation.amplitude)}, beat error {formatBeat(regulation.beatError)}, reserve{' '}
        {formatReserve(calibre.reserveHours)}. {regulation.faultLabel}.
      </p>
    </div>
  );
}
