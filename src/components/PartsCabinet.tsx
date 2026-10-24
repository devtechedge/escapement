import { useEffect, useRef } from 'react';
import { FAULT_INFO } from '../horology/faults';
import { PINION_OPTIONS, SOCKET_LABELS, WHEELS, WHEEL_OPTIONS } from '../horology/parts';
import type { Parts, PinionLeaves, SocketId, WheelId } from '../horology/types';
import type { BenchState } from '../horology/types';

interface PartsCabinetProps {
  state: BenchState;
  onSelect: (socket: SocketId) => void;
  onToggleDrawer: (drawer: SocketId | 'pinions') => void;
  onInstallWheel: (wheel: WheelId) => void;
  onInstallPinion: (leaves: PinionLeaves) => void;
  onRepair: () => void;
  disabled: boolean;
}

const SOCKET_ORDER: SocketId[] = ['barrel', 'center', 'third', 'fourth', 'escape', 'balance'];

function pinionFor(parts: Parts, socket: SocketId): PinionLeaves | null {
  if (socket === 'third') return parts.thirdPinion;
  if (socket === 'fourth') return parts.fourthPinion;
  if (socket === 'escape') return parts.escapePinion;
  return null;
}

function drawerMeta(socket: SocketId, state: BenchState): string {
  const wheel = WHEELS[state.calibre.parts[socket]];
  if (socket === 'balance') return 'hairspring';
  if (socket === 'fourth') return `${wheel.teeth}t · ${WHEEL_OPTIONS.fourth.length} variants`;
  return `${wheel.teeth}t`;
}

export function PartsCabinet({
  state,
  onSelect,
  onToggleDrawer,
  onInstallWheel,
  onInstallPinion,
  onRepair,
  disabled,
}: PartsCabinetProps) {
  const { calibre } = state;
  const selectedWheel = WHEELS[calibre.parts[state.selectedSocket]];
  const selectedPinion = pinionFor(calibre.parts, state.selectedSocket);
  const fault = FAULT_INFO[calibre.fault];
  const selectedLabel = SOCKET_LABELS[state.selectedSocket];
  const selectedDrawerRef = useRef<HTMLButtonElement | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    selectedDrawerRef.current?.scrollIntoView({ block: 'nearest' });
  }, [state.selectedSocket]);

  return (
    <aside className="cabinet" aria-label="Parts cabinet">
      <div className="cabinet-head">
        <div>
          <div className="field-label">Parts</div>
          <h2>Spares cabinet</h2>
        </div>
        <span className="cabinet-count">07</span>
      </div>

      <div className="drawers">
        {SOCKET_ORDER.map((socket, index) => {
          const open = state.openDrawer === socket;
          const selected = state.selectedSocket === socket;
          return (
            <div className={`drawer-wrap ${open ? 'is-open' : ''}`} key={socket}>
              <button
                type="button"
                ref={selected ? selectedDrawerRef : undefined}
                className={`drawer ${selected ? 'is-selected' : ''}`}
                onClick={() => {
                  if (open) onToggleDrawer(socket);
                  else onSelect(socket);
                }}
                aria-expanded={open}
                aria-controls={`drawer-${socket}`}
                title={drawerMeta(socket, state)}
              >
                <span className="drawer-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="drawer-name">{SOCKET_LABELS[socket]}</span>
                <span className="drawer-meta">{drawerMeta(socket, state)}</span>
                <span className="drawer-knob" aria-hidden="true" />
              </button>
              {open ? (
                <div className="drawer-panel" id={`drawer-${socket}`}>
                  {WHEEL_OPTIONS[socket].map((wheel) => {
                    const spec = WHEELS[wheel];
                    const installed = calibre.parts[socket] === wheel;
                    return (
                      <button
                        type="button"
                        key={wheel}
                        className={`part-tag ${installed ? 'is-installed' : ''}`}
                        onClick={() => onInstallWheel(wheel)}
                        disabled={disabled}
                        aria-pressed={installed}
                      >
                        <span>{spec.short}</span>
                        <span className="mono">{spec.teeth ? `${spec.teeth}t` : '—'}</span>
                      </button>
                    );
                  })}
                  <p className="drawer-note">
                    {WHEELS[calibre.parts[socket]].note}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}

        <div className={`drawer-wrap ${state.openDrawer === 'pinions' ? 'is-open' : ''}`}>
          <button
            type="button"
            className="drawer"
            onClick={() => onToggleDrawer('pinions')}
            aria-expanded={state.openDrawer === 'pinions'}
            aria-controls="drawer-pinions"
          >
            <span className="drawer-index">07</span>
            <span className="drawer-name">Pinions</span>
            <span className="drawer-meta">4 · 6 · 8 leaves</span>
            <span className="drawer-knob" aria-hidden="true" />
          </button>
          {state.openDrawer === 'pinions' ? (
            <div className="drawer-panel" id="drawer-pinions">
              <p className="drawer-note">
                Select a train wheel, then fit its pinion. The center pinion is fixed at eight leaves.
              </p>
              <div className="pinion-grid">
                {PINION_OPTIONS.map((leaves) => {
                  const installed = selectedPinion === leaves;
                  return (
                    <button
                      type="button"
                      key={leaves}
                      className={`part-tag ${installed ? 'is-installed' : ''}`}
                      onClick={() => onInstallPinion(leaves)}
                      disabled={disabled || selectedPinion === null}
                      aria-pressed={installed}
                    >
                      <span>{leaves} leaves</span>
                    </button>
                  );
                })}
              </div>
              {selectedPinion === null ? (
                <p className="drawer-note">The {selectedLabel} has no swappable pinion.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="inspector">
        <div className="field-label">On the bench</div>
        <h3>{selectedWheel.label}</h3>
        <p className="inspector-line">
          {selectedWheel.teeth ? `${selectedWheel.teeth} teeth` : 'hairspring'} ·{' '}
          {selectedPinion === null ? 'fixed pinion' : `${selectedPinion} leaves`} ·{' '}
          {calibre.jewels} jewels
        </p>
        {calibre.fault !== 'none' ? (
          <div className="condition">
            <div className="condition-head">
              <span className="ruby-dot" aria-hidden="true" />
              <strong>{fault.label}</strong>
            </div>
            <p>{fault.evidence}</p>
            <button
              type="button"
              className="button button-service"
              onClick={onRepair}
              disabled={disabled}
            >
              {fault.fix}
            </button>
          </div>
        ) : (
          <p className="condition-ok">Condition sound. The selected part is in order.</p>
        )}
      </div>
    </aside>
  );
}
