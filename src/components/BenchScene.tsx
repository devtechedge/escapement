import { useRef, useState } from 'react';
import type {
  Calibre,
  RegulationSnapshot,
  SocketId,
  TrainSnapshot,
} from '../horology/types';
import { Crown } from './Crown';
import { MovementPlate } from './MovementPlate';
import { RegulatorRack } from './RegulatorRack';

interface BenchSceneProps {
  calibre: Calibre;
  train: TrainSnapshot;
  regulation: RegulationSnapshot;
  selectedSocket: SocketId;
  onSelect: (socket: SocketId) => void;
  exploded: boolean;
  onToggleExploded: () => void;
  still: boolean;
  running: boolean;
  testing: boolean;
  raking: boolean;
  onToggleRaking: () => void;
  onRegulator: (value: number) => void;
  onWind: () => void;
  disabled: boolean;
  turns: number;
  maxTurns: number;
  showHint: boolean;
}

interface LightPosition {
  x: number;
  y: number;
}

export function BenchScene({
  calibre,
  train,
  regulation,
  selectedSocket,
  onSelect,
  exploded,
  onToggleExploded,
  still,
  running,
  testing,
  raking,
  onToggleRaking,
  onRegulator,
  onWind,
  disabled,
  turns,
  maxTurns,
  showHint,
}: BenchSceneProps) {
  const [light, setLight] = useState<LightPosition>({ x: 0.22, y: 0.52 });
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const plateRef = useRef<HTMLDivElement | null>(null);

  const setFromPointer = (clientX: number, clientY: number) => {
    const plate = plateRef.current;
    if (!plate) return;
    const rect = plate.getBoundingClientRect();
    setLight({
      x: Math.max(0.03, Math.min(0.97, (clientX - rect.left) / rect.width)),
      y: Math.max(0.03, Math.min(0.97, (clientY - rect.top) / rect.height)),
    });
  };

  const onLampPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!raking) return;
    draggingRef.current = true;
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best effort.
    }
    setFromPointer(event.clientX, event.clientY);
  };

  const onLampPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    setFromPointer(event.clientX, event.clientY);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  };

  const onLampKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -0.03;
    if (event.key === 'ArrowRight') dx = 0.03;
    if (event.key === 'ArrowUp') dy = -0.03;
    if (event.key === 'ArrowDown') dy = 0.03;
    if (!dx && !dy) return;
    event.preventDefault();
    setLight((current) => ({
      x: Math.max(0.03, Math.min(0.97, current.x + dx)),
      y: Math.max(0.03, Math.min(0.97, current.y + dy)),
    }));
  };

  return (
    <div className="plate-stage">
      <div className="scene-tools">
        <button
          type="button"
          className={`tool ${raking ? 'is-active' : ''}`}
          onClick={onToggleRaking}
          aria-pressed={raking}
        >
          Raking light <kbd>R</kbd>
        </button>
        <button
          type="button"
          className={`tool ${exploded ? 'is-active' : ''}`}
          onClick={onToggleExploded}
          aria-pressed={exploded}
        >
          Explode <kbd>E</kbd>
        </button>
      </div>

      <div className="plate-wrap" ref={plateRef}>
        <MovementPlate
          calibre={calibre}
          train={train}
          regulation={regulation}
          selectedSocket={selectedSocket}
          onSelect={onSelect}
          exploded={exploded}
          still={still}
          running={running}
          testing={testing}
          raking={raking}
          light={light}
        />
        {raking ? (
          <>
            <div
              className="raking-overlay"
              aria-hidden="true"
              style={{
                background: `radial-gradient(circle at ${light.x * 100}% ${light.y * 100}%, rgba(255, 246, 218, 0.5) 0%, rgba(255, 236, 186, 0.16) 20%, rgba(70, 43, 20, 0.12) 68%, rgba(60, 35, 16, 0.24) 100%)`,
              }}
            />
            <button
              type="button"
              className={`lamp-grip ${dragging ? 'is-dragging' : ''}`}
              style={{ left: `${light.x * 100}%`, top: `${light.y * 100}%` }}
              aria-label="Raking light. Drag to move it, or use the arrow keys."
              onPointerDown={onLampPointerDown}
              onPointerMove={onLampPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onLampKeyDown}
            >
              <span className="lamp-shade" aria-hidden="true" />
              <span className="lamp-beam" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {showHint ? (
        <p className="bench-hint">
          <span className="bench-hint-mark" aria-hidden="true" />
          Move the regulator one notch, then run a test and read the passport.
        </p>
      ) : null}
      <div className="plate-controls">
        <RegulatorRack value={calibre.regulator} onChange={onRegulator} disabled={disabled} />
        <Crown
          onWind={onWind}
          disabled={disabled || turns >= maxTurns}
          turns={turns}
          maxTurns={maxTurns}
        />
      </div>
    </div>
  );
}
