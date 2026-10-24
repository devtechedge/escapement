import { useEffect, useState } from 'react';
import { FAULT_INFO } from '../horology/faults';
import {
  formatAmplitude,
  formatBeat,
  formatRate,
  formatReserve,
  formatTime,
} from '../horology/format';
import type {
  Calibre,
  RegulationSnapshot,
  Temperature,
  TestResult,
  TrainSnapshot,
} from '../horology/types';

export interface TestRun {
  active: boolean;
  startedAt: number;
  duration: number;
  result: TestResult | null;
}

interface TimingStandProps {
  calibre: Calibre;
  train: TrainSnapshot;
  regulation: RegulationSnapshot;
  testing: boolean;
  test: TestRun;
  lastTest: TestResult | null;
  testCurrent: boolean;
  certificate: boolean;
  canTest: boolean;
  onRunTest: () => void;
  onTemperature: (temperature: Temperature) => void;
  still: boolean;
}

const TEMPERATURES: Temperature[] = [18, 20, 23, 26];
const TRACE_WIDTH = 236;
const TRACE_HEIGHT = 52;

function traceGeometry(trace: number[]) {
  if (trace.length === 0) {
    return { points: '', zeroY: TRACE_HEIGHT / 2, lastX: 0, lastY: TRACE_HEIGHT / 2 };
  }
  const limit = Math.max(12, ...trace.map((value) => Math.abs(value))) * 1.18;
  const step = (TRACE_WIDTH - 20) / Math.max(1, trace.length - 1);
  const points = trace
    .map((value, index) => {
      const x = 10 + index * step;
      const y = TRACE_HEIGHT / 2 - (value / limit) * (TRACE_HEIGHT / 2 - 5);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return {
    points,
    zeroY: TRACE_HEIGHT / 2,
    lastX: 10 + (trace.length - 1) * step,
    lastY: TRACE_HEIGHT / 2 - (trace[trace.length - 1] / limit) * (TRACE_HEIGHT / 2 - 5),
  };
}

export function TimingStand({
  calibre,
  train,
  regulation,
  testing,
  test,
  lastTest,
  testCurrent,
  certificate,
  canTest,
  onRunTest,
  onTemperature,
  still,
}: TimingStandProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!test.active) {
      setProgress(test.result || lastTest ? 1 : 0);
      return;
    }
    let frame = 0;
    const tick = () => {
      const ratio = Math.min(1, (Date.now() - test.startedAt) / test.duration);
      setProgress(ratio);
      if (ratio < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [test.active, test.startedAt, test.duration, test.result, lastTest]);

  const result = test.result ?? lastTest;
  const trace = result?.trace ?? [];
  const geometry = traceGeometry(trace);
  const clipWidth = 10 + (TRACE_WIDTH - 20) * progress;
  const verdict = !result
    ? 'Untested'
    : !testCurrent
      ? 'Stale'
      : certificate
        ? 'Certified'
        : 'Outside';
  const subLabel = !train.coherent
    ? 'Train must be coherent'
    : calibre.reserveHours < 24
      ? 'Wind to 24 h to test'
      : still
        ? '24 h in 1 s · still'
        : '24 h in 12 s';

  return (
    <section className="timing-stand" aria-label="Timing stand">
      <div className="stand-head">
        <div>
          <div className="field-label">Timing stand</div>
          <h2>Rate · amplitude · beat</h2>
        </div>
        <span className={`stand-verdict is-${verdict.toLowerCase()}`}>{verdict}</span>
      </div>

      <div className="live-readout">
        <div className="live-rate">
          <span className="rate-number">{formatRate(regulation.rate)}</span>
          <span className="live-caption">predicted</span>
        </div>
        <div className="live-small">
          <div>
            <span className="field-label">Amplitude</span>
            <strong>{formatAmplitude(regulation.amplitude)}</strong>
          </div>
          <div>
            <span className="field-label">Beat error</span>
            <strong>{formatBeat(regulation.beatError)}</strong>
          </div>
        </div>
      </div>

      <div className="trace-box">
        <div className="trace-head">
          <span className="field-label">Rate trace</span>
          <span className="mono trace-unit">s/d · 24 h</span>
        </div>
        <svg
          className="trace-svg"
          viewBox={`0 0 ${TRACE_WIDTH} ${TRACE_HEIGHT}`}
          role="img"
          aria-label={
            result
              ? `Rate trace over 24 hours. ${formatRate(result.rate)}.`
              : 'No rate trace yet.'
          }
        >
          <defs>
            <clipPath id="trace-clip">
              <rect x="0" y="0" width={clipWidth} height={TRACE_HEIGHT} />
            </clipPath>
          </defs>
          <line
            x1="10"
            y1={geometry.zeroY}
            x2={TRACE_WIDTH - 10}
            y2={geometry.zeroY}
            stroke="var(--steel-line)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
          <line x1="10" y1="6" x2={TRACE_WIDTH - 10} y2="6" stroke="var(--steel-line)" strokeWidth="0.7" opacity="0.35" />
          <line
            x1="10"
            y1={TRACE_HEIGHT - 6}
            x2={TRACE_WIDTH - 10}
            y2={TRACE_HEIGHT - 6}
            stroke="var(--steel-line)"
            strokeWidth="0.7"
            opacity="0.35"
          />
          {trace.length > 0 ? (
            <g clipPath="url(#trace-clip)">
              <polyline
                points={geometry.points}
                fill="none"
                stroke="var(--ruby)"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ) : (
            <text
              x={TRACE_WIDTH / 2}
              y={TRACE_HEIGHT / 2 - 5}
              textAnchor="middle"
              fontFamily="'DM Mono', monospace"
              fontSize="8"
              fill="var(--steel-line)"
            >
              NO MEASUREMENT
            </text>
          )}
          {trace.length > 0 && progress > 0 ? (
            <circle
              cx={progress >= 1 ? geometry.lastX : 10 + (TRACE_WIDTH - 20) * progress}
              cy={progress >= 1 ? geometry.lastY : geometry.zeroY}
              r="2.6"
              fill="var(--ruby)"
            />
          ) : null}
          <text
            x="10"
            y="9"
            fontFamily="'DM Mono', monospace"
            fontSize="7"
            fill="var(--steel-line)"
          >
            +
          </text>
          <text
            x="10"
            y={TRACE_HEIGHT - 3}
            fontFamily="'DM Mono', monospace"
            fontSize="7"
            fill="var(--steel-line)"
          >
            −
          </text>
        </svg>
        <div className="tick-pair" aria-hidden="true">
          <span className="tick-label">tick</span>
          <span className="tick-mark" />
          <span
            className="tick-mark"
            style={{ marginLeft: `${10 + (result?.beatError ?? 0.2) * 12}px` }}
          />
          <span className="tick-label">tock</span>
        </div>
      </div>

      <div className="measurement-row">
        <div>
          <span className="field-label">Measured</span>
          <strong className="mono">
            {result && !testing ? formatRate(result.rate) : '-'}
          </strong>
        </div>
        <div>
          <span className="field-label">Amp</span>
          <strong className="mono">
            {result && !testing ? formatAmplitude(result.amplitude) : '-'}
          </strong>
        </div>
        <div>
          <span className="field-label">Beat</span>
          <strong className="mono">
            {result && !testing ? formatBeat(result.beatError) : '-'}
          </strong>
        </div>
        <div>
          <span className="field-label">At</span>
          <strong className="mono">{result ? `${result.temperature}°C` : '-'}</strong>
        </div>
      </div>

      {result ? (
        <p className="test-note">
          {testCurrent ? 'Measured' : 'Last measured'} {formatTime(result.at)} at{' '}
          {formatReserve(result.reserve)} reserve. {certificate ? 'Within certificate tolerances.' : 'Run a fresh test after any change.'}
        </p>
      ) : (
        <p className="test-note">The timing stand measures the current build. Wind to 24 h, then run a test.</p>
      )}

      <div className="test-progress" aria-hidden="true">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div className="stand-actions">
        <button
          type="button"
          className="button button-primary test-button"
          onClick={onRunTest}
          disabled={!canTest || testing}
        >
          {testing ? `Testing ${Math.round(progress * 100)}%` : 'Run test'}
          <small>{testing ? 'Simulating 24 hours' : subLabel}</small>
        </button>
        <div className="temperature" aria-label="Test temperature">
          <span className="field-label">Temp °C</span>
          <div className="temperature-buttons">
            {TEMPERATURES.map((temperature) => (
              <button
                type="button"
                key={temperature}
                className={calibre.temperature === temperature ? 'is-active' : ''}
                onClick={() => onTemperature(temperature)}
                aria-pressed={calibre.temperature === temperature}
                disabled={testing}
              >
                {temperature}
              </button>
            ))}
          </div>
        </div>
      </div>

      {calibre.fault !== 'none' ? (
        <p className="stand-fault">
          <span className="ruby-dot" aria-hidden="true" /> {FAULT_INFO[calibre.fault].label}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {testing
          ? 'Timing test running.'
          : result
            ? `Timing result: ${formatRate(result.rate)}, amplitude ${formatAmplitude(result.amplitude)}, beat error ${formatBeat(result.beatError)}. ${verdict}.`
            : 'No measurement yet.'}
      </p>
    </section>
  );
}
