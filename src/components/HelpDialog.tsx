import { useEffect, useRef } from 'react';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<[string, string]> = [
  ['R', 'Raking light on or off'],
  ['E', 'Exploded movement'],
  ['W', 'Wind one mainspring turn'],
  ['T', 'Run the 24 hour rate test'],
  ['C', 'Go to the calibre passport'],
  ['L', 'Switch the bench between day and night'],
  ['Space', 'Start or stop the movement'],
  ['?', 'Open this bench note'],
  ['Escape', 'Close this bench note'],
];

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="help-dialog"
      aria-labelledby="help-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="help-sheet">
        <div className="help-head">
          <div>
            <div className="field-label">Bench note</div>
            <h2 id="help-title">How to read the movement</h2>
          </div>
          <button type="button" className="text-button" onClick={onClose} aria-label="Close help">
            Close
          </button>
        </div>
        <p className="help-intro">
          Select a wheel on the plate to inspect it. Open a cabinet drawer to fit a spare. Drag
          the crown to wind. Turn the regulator one notch at a time. Run the timing stand before
          you trust a rate.
        </p>
        <div className="help-columns">
          <div>
            <h3>Shortcuts</h3>
            <dl className="shortcut-list">
              {SHORTCUTS.map(([key, description]) => (
                <div key={key}>
                  <dt><kbd>{key}</kbd></dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3>What the model does</h3>
            <p>
              The train is real arithmetic. Center to fourth is 60:1. The escape wheel rate follows
              the nominal balance frequency. Reserve is mainspring turns times the barrel ratio.
              The regulator moves the rate by four seconds per day per notch.
            </p>
            <p>
              Rate, amplitude and beat error are deterministic from those parts, the winding, the
              temperature and the seeded condition. The same build and actions always give the same
              result. This is a teaching model, not a certified chronometer.
            </p>
            <p className="help-fine">
              Everything stays in this browser. No account, no analytics, no network requests after
              load.
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
