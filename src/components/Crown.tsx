import { useRef, useState } from 'react';

interface CrownProps {
  onWind: () => void;
  disabled: boolean;
  turns: number;
  maxTurns: number;
}

export function Crown({ onWind, disabled, turns, maxTurns }: CrownProps) {
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rotationRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngle = useRef<number | null>(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const suppressClick = useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastAngle.current = Math.atan2(event.clientY - cy, event.clientX - cx);
    startPoint.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    draggingRef.current = true;
    setDragging(true);
    suppressClick.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best effort.
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current || disabled) return;
    const distance = Math.hypot(
      event.clientX - startPoint.current.x,
      event.clientY - startPoint.current.y,
    );
    if (distance > 8) moved.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(event.clientY - cy, event.clientX - cx);
    const previous = lastAngle.current;
    if (previous === null) {
      lastAngle.current = angle;
      return;
    }
    let delta = ((angle - previous) * 180) / Math.PI;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle.current = angle;
    let next = rotationRef.current + delta;
    let wound = false;
    if (Math.abs(next) >= 360) {
      next -= Math.sign(next) * 360;
      wound = true;
    }
    rotationRef.current = next;
    setRotation(next);
    if (wound) {
      suppressClick.current = true;
      onWind();
    }
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    lastAngle.current = null;
  };

  const onClick = () => {
    if (suppressClick.current || moved.current) {
      suppressClick.current = false;
      moved.current = false;
      return;
    }
    if (!disabled) onWind();
  };

  return (
    <div className="crown-wrap">
      <button
        type="button"
        className={`crown ${dragging ? 'is-dragging' : ''}`}
        aria-label="Wind the mainspring. Drag in a circle or press for one turn."
        disabled={disabled}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span
          className="crown-knob"
          style={{ transform: `rotate(${rotation}deg)` }}
          aria-hidden="true"
        >
          <span className="crown-grip" />
        </span>
      </button>
      <div className="crown-label">
        <span className="field-label">Wind</span>
        <span className="mono">{Math.min(maxTurns, Math.round(turns * 10) / 10)} / {maxTurns} turns</span>
      </div>
    </div>
  );
}
