import { useRef } from 'react';
import { FAULT_INFO, FAULT_ORDER } from '../horology/faults';
import { FIXTURE_ORDER, FIXTURES } from '../horology/fixtures';
import { formatRate, formatReserve } from '../horology/format';
import type { Calibre, FaultId, FixtureId } from '../horology/types';
import type { Signals } from '../state/bench';

interface BrassRailProps {
  calibre: Calibre;
  signals: Signals;
  testing: boolean;
  still: boolean;
  certificate: boolean;
  onSelectFixture: (fixture: FixtureId) => void;
  onNewCalibre: (fault: FaultId) => void;
  onToggleRun: () => void;
  onWind: () => void;
  onToggleStill: () => void;
  onHelp: () => void;
  theme: 'day' | 'night';
  onToggleTheme: () => void;
  shelfCount: number;
  onOpenShelf: () => void;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" className="theme-icon" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.2v1.7M8 13.1v1.7M1.2 8h1.7M13.1 8h1.7M3.2 3.2l1.2 1.2M11.6 11.6l1.2 1.2M3.2 12.8l1.2-1.2M11.6 4.4l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" className="theme-icon" aria-hidden="true">
      <path
        d="M12.2 10.5A5.4 5.4 0 0 1 5.5 3.8 5.6 5.6 0 1 0 12.2 10.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EscapeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="brand-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 3.4v3.1M12 17.5v3.1M3.4 12h3.1M17.5 12h3.1" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M8.2 5.8l1.6 2.5M15.8 18.2l-1.6-2.5M5.8 15.8l2.5-1.6M18.2 8.2l-2.5 1.6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function BrassRail({
  calibre,
  signals,
  testing,
  still,
  certificate,
  onSelectFixture,
  onNewCalibre,
  onToggleRun,
  onWind,
  onToggleStill,
  onHelp,
  theme,
  onToggleTheme,
  shelfCount,
  onOpenShelf,
}: BrassRailProps) {
  const { train, regulation, running } = signals;
  const status = testing
    ? 'Testing'
    : !train.coherent
      ? 'Out of train'
      : running
        ? still
          ? 'Running · still'
          : 'Running'
        : 'Stopped';
  const reservePercent = Math.min(100, (calibre.reserveHours / train.reserveMax) * 100);
  const canRun = train.coherent && calibre.reserveHours > 0 && !testing;
  const newMenu = useRef<HTMLDetailsElement | null>(null);
  const choose = (fault: FaultId) => {
    newMenu.current?.removeAttribute('open');
    onNewCalibre(fault);
  };

  return (
    <header className="rail">
      <div className="rail-brand">
        <EscapeIcon />
        <div>
          <h1 className="wordmark">ESCAPEMENT</h1>
          <div className="eyebrow">Watchmaker's bench · No. 05</div>
        </div>
      </div>

      <div className="rail-case">
        <label className="field-label" htmlFor="case-select">
          Case
        </label>
        <select
          id="case-select"
          className="case-select"
          value={calibre.fixture}
          onChange={(event) => onSelectFixture(event.target.value as FixtureId)}
          disabled={testing}
        >
          {FIXTURE_ORDER.map((fixture) => (
            <option key={fixture} value={fixture}>
              {FIXTURES[fixture].name} · {FIXTURES[fixture].nominalVph.toLocaleString('en-US')} vph
            </option>
          ))}
        </select>
      </div>

      <div className="rail-status">
        <span className={`status-dot ${running && !testing ? 'is-live' : ''}`} aria-hidden="true" />
        <span className="status-text">{status}</span>
        {certificate ? <span className="cert-chip">Certified</span> : null}
      </div>

      <div className="rail-rate" aria-label="Current predicted rate">
        <span className="field-label">Rate</span>
        <strong>{calibre.reserveHours > 0 ? formatRate(regulation.rate) : 'Stopped'}</strong>
      </div>

      <div className="rail-reserve">
        <div className="reserve-head">
          <span className="field-label">Reserve</span>
          <span className="mono">{formatReserve(calibre.reserveHours)} / {Math.round(train.reserveMax)} h</span>
        </div>
        <div
          className="reserve-track"
          role="meter"
          aria-label="Power reserve"
          aria-valuemin={0}
          aria-valuemax={Math.round(train.reserveMax)}
          aria-valuenow={Math.round(calibre.reserveHours)}
        >
          <span style={{ width: `${reservePercent}%` }} />
        </div>
      </div>

      <div className="rail-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={onToggleRun}
          disabled={testing || (!canRun && !running)}
          aria-label={running ? 'Stop the movement' : 'Run the movement'}
        >
          {running ? 'Stop' : 'Run'}
        </button>
        <button
          type="button"
          className="button"
          onClick={onWind}
          disabled={testing || calibre.reserveHours >= train.reserveMax}
          aria-label="Wind the mainspring one turn"
        >
          Wind
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={onToggleStill}
          aria-pressed={still}
          aria-label="Toggle still mode"
        >
          Still
        </button>
        <button
          type="button"
          className="button button-quiet shelf-button"
          onClick={onOpenShelf}
          aria-label={`Open the calibre shelf, ${shelfCount} saved`}
        >
          Shelf <span className="shelf-button-count">{shelfCount}</span>
        </button>
        <details className="new-menu" ref={newMenu}>
          <summary className="button button-quiet" aria-label="Start a new calibre">
            New
          </summary>
          <div className="new-menu-panel">
            <button type="button" onClick={() => choose('none')} disabled={testing}>
              Clean build
            </button>
            {FAULT_ORDER.map((fault) => (
              <button
                key={fault}
                type="button"
                onClick={() => choose(fault)}
                disabled={testing}
              >
                {FAULT_INFO[fault].label}
              </button>
            ))}
          </div>
        </details>
        <button
          type="button"
          className="button button-icon"
          onClick={onHelp}
          aria-label="Open bench help"
        >
          ?
        </button>
        <button
          type="button"
          className="button button-icon theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'day' ? 'Switch to the night bench' : 'Switch to the day bench'}
          aria-pressed={theme === 'night'}
          title={theme === 'day' ? 'Night bench' : 'Day bench'}
        >
          {theme === 'day' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  );
}
