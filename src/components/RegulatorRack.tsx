import { useRef } from 'react';

interface RegulatorRackProps {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

export function RegulatorRack({ value, onChange, disabled }: RegulatorRackProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 20 - 10));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best effort.
    }
    setFromClientX(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || disabled) return;
    setFromClientX(event.clientX);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = value;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - 1;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + 1;
        break;
      case 'Home':
        next = -10;
        break;
      case 'End':
        next = 10;
        break;
      case 'PageDown':
        next = value - 5;
        break;
      case 'PageUp':
        next = value + 5;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(Math.max(-10, Math.min(10, next)));
  };

  const position = ((value + 10) / 20) * 100;

  return (
    <div className={`regulator ${disabled ? 'is-disabled' : ''}`}>
      <div className="regulator-head">
        <span className="field-label">Regulator</span>
        <span className="mono regulator-value">{value > 0 ? `+${value}` : value}</span>
        <span className="regulator-note">1 notch = 4 s/d</span>
        {disabled ? <span className="regulator-note regulator-status">Test in progress</span> : null}
      </div>
      <div
        className="regulator-track"
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Regulator index. Each notch moves the rate four seconds per day."
        aria-valuemin={-10}
        aria-valuemax={10}
        aria-valuenow={value}
        aria-disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div className="regulator-ticks" aria-hidden="true">
          {Array.from({ length: 21 }, (_, index) => (
            <span
              key={index}
              className={`regulator-tick ${index % 5 === 0 ? 'is-major' : ''} ${index === value + 10 ? 'is-current' : ''}`}
            />
          ))}
        </div>
        <span className="regulator-index" style={{ left: `${position}%` }} aria-hidden="true" />
        <span className="regulator-labels" aria-hidden="true">
          <span>-10</span>
          <span>0</span>
          <span>+10</span>
        </span>
      </div>
    </div>
  );
}
