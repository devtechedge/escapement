import { useEffect, useState } from 'react';
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
import type {
  BenchState,
  RegulationSnapshot,
  TrainSnapshot,
} from '../horology/types';

interface CalibreCardProps {
  state: BenchState;
  regulation: RegulationSnapshot;
  train: TrainSnapshot;
  testCurrent: boolean;
  certificate: boolean;
  onRename: (name: string) => void;
  onExportJson: () => void;
  onExportSvg: () => void;
  onImport: (file: File) => void;
  importError: string | null;
  disabled: boolean;
}

function TrainDiagram({ state, train }: { state: BenchState; train: TrainSnapshot }) {
  const { parts } = state.calibre;
  const nodes = [
    { key: 'barrel', x: 28, y: 58, teeth: WHEELS[parts.barrel].teeth, label: 'B' },
    { key: 'center', x: 80, y: 34, teeth: WHEELS[parts.center].teeth, label: 'C' },
    { key: 'third', x: 132, y: 58, teeth: WHEELS[parts.third].teeth, label: 'T' },
    { key: 'fourth', x: 184, y: 34, teeth: WHEELS[parts.fourth].teeth, label: 'F' },
    { key: 'escape', x: 232, y: 58, teeth: WHEELS[parts.escape].teeth, label: 'E' },
  ];
  return (
    <svg className="train-diagram" viewBox="0 0 260 88" aria-label="Train schematic">
      <path
        d="M 28 58 L 80 34 L 132 58 L 184 34 L 232 58"
        fill="none"
        stroke="var(--card-line)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {nodes.map((node) => (
        <g key={node.key}>
          <circle cx={node.x} cy={node.y} r="10" fill="none" stroke="var(--card-brass)" strokeWidth="1.2" />
          <circle cx={node.x} cy={node.y} r="3" fill="var(--ruby)" />
          <text
            x={node.x}
            y={node.y - 15}
            textAnchor="middle"
            fontFamily="'DM Mono', monospace"
            fontSize="7.5"
            fill="var(--card-ink)"
          >
            {node.label}
          </text>
        </g>
      ))}
      <text
        x="130"
        y="82"
        textAnchor="middle"
        fontFamily="'DM Mono', monospace"
        fontSize="7.5"
        letterSpacing="1.2"
        fill="var(--card-muted)"
      >
        {train.centerToFourth.toFixed(2)} : 1 · {formatVph(train.escapeVph)}
      </text>
    </svg>
  );
}

function TraceSpark({ trace }: { trace: number[] }) {
  if (trace.length === 0) {
    return <div className="card-trace is-empty">No trace</div>;
  }
  const width = 236;
  const height = 38;
  const limit = Math.max(10, ...trace.map((value) => Math.abs(value))) * 1.2;
  const step = width / Math.max(1, trace.length - 1);
  const points = trace
    .map((value, index) => {
      const x = index * step;
      const y = height / 2 - (value / limit) * (height / 2 - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="card-trace" viewBox={`0 0 ${width} ${height}`} aria-label="Latest rate trace">
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="var(--card-line)"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--ruby)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalibreCard({
  state,
  regulation,
  train,
  testCurrent,
  certificate,
  onRename,
  onExportJson,
  onExportSvg,
  onImport,
  importError,
  disabled,
}: CalibreCardProps) {
  const { calibre } = state;
  const lastTest = state.lastTest;
  const [nameDraft, setNameDraft] = useState(calibre.name);

  useEffect(() => {
    setNameDraft(calibre.name);
  }, [calibre.name]);

  const commitName = () => {
    if (nameDraft.trim()) onRename(nameDraft);
    else setNameDraft(calibre.name);
  };

  const stampState = certificate
    ? 'is-certified'
    : lastTest && !testCurrent
      ? 'is-stale'
      : lastTest
        ? 'is-outside'
        : 'is-untested';

  const stampLabel = certificate
    ? 'BENCH CERTIFIED'
    : lastTest && !testCurrent
      ? 'TEST STALE'
      : lastTest
        ? 'NOT CERTIFIED'
        : 'UNTESTED';

  const measurementText = !lastTest
    ? 'Untested. The rate and amplitude above are predicted from the current build.'
    : !testCurrent
      ? `Last measured ${formatTime(lastTest.at)}, now stale. The build changed.`
      : `Measured ${formatTime(lastTest.at)} at ${lastTest.temperature} °C, ${formatReserve(lastTest.reserve)} reserve.`;

  return (
    <article
      id="calibre-card"
      className={`calibre-card ${stampState}`}
      aria-label="Calibre passport"
    >
      <div className="card-head">
        <div>
          <div className="field-label">Calibre passport</div>
          <h2>
            <input
              className="name-input"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              aria-label="Calibre name"
              maxLength={40}
              disabled={disabled}
            />
          </h2>
        </div>
        <div className="card-serial">
          <span className="field-label">Serial</span>
          <span className="mono">{calibre.serial}</span>
        </div>
      </div>

      <div className="card-rule" />

      <div className="card-top">
        <TrainDiagram state={state} train={train} />
        <dl className="passport-specs">
          <div>
            <dt>Condition</dt>
            <dd>{calibre.fault === 'none' ? 'Sound' : FAULT_INFO[calibre.fault].short}</dd>
          </div>
          <div>
            <dt>Beat</dt>
            <dd className="mono">{formatVph(calibre.nominalVph)}</dd>
          </div>
          <div>
            <dt>Jewels</dt>
            <dd className="mono">{calibre.jewels}</dd>
          </div>
          <div>
            <dt>Reserve</dt>
            <dd className="mono">{formatReserve(calibre.reserveHours)}</dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd className="mono">{formatRate(regulation.rate)}</dd>
          </div>
          <div>
            <dt>Amplitude</dt>
            <dd className="mono">{formatAmplitude(regulation.amplitude)}</dd>
          </div>
          <div>
            <dt>Beat error</dt>
            <dd className="mono">{formatBeat(regulation.beatError)}</dd>
          </div>
          <div>
            <dt>Regulator</dt>
            <dd className="mono">{calibre.regulator > 0 ? `+${calibre.regulator}` : calibre.regulator}</dd>
          </div>
        </dl>
      </div>

      <div className="card-trace-wrap">
        <div className="trace-head">
          <span className="field-label">Latest trace</span>
          <span className="mono">{lastTest ? formatDate(lastTest.at) : '—'}</span>
        </div>
        <TraceSpark trace={lastTest?.trace ?? []} />
        <p className="measurement-text">{measurementText}</p>
      </div>

      <div className="card-footer">
        <div className={`stamp ${stampState}`} aria-label={stampLabel}>
          <span className="stamp-top">{stampLabel}</span>
          <span className="stamp-line" />
          <span className="stamp-bottom">
            {lastTest ? formatDate(lastTest.at) : 'ESC · 05'}
          </span>
        </div>
        <div className="card-tools">
          <button type="button" className="text-button" onClick={onExportSvg}>
            SVG
          </button>
          <button type="button" className="text-button" onClick={onExportJson}>
            JSON
          </button>
          <label className="text-button import-label">
            Import
            <input
              type="file"
              accept=".json,application/json"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
      {importError ? (
        <p className="import-error" role="status" aria-live="polite">
          {importError}
        </p>
      ) : null}
    </article>
  );
}
