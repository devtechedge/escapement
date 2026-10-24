import { useEffect, useRef } from 'react';
import { formatDate, formatTime } from '../horology/format';
import type { SavedCalibre } from '../horology/types';

interface ShelfDialogProps {
  open: boolean;
  shelf: SavedCalibre[];
  importError: string | null;
  onClose: () => void;
  onSaveCurrent: () => void;
  onLoad: (entry: SavedCalibre) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function ShelfDialog({
  open,
  shelf,
  importError,
  onClose,
  onSaveCurrent,
  onLoad,
  onDuplicate,
  onDelete,
  onRename,
  onExport,
  onImport,
}: ShelfDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="shelf-dialog"
      aria-labelledby="shelf-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="shelf-sheet">
        <div className="help-head">
          <div>
            <div className="field-label">Calibre shelf</div>
            <h2 id="shelf-title">Saved builds</h2>
          </div>
          <button type="button" className="text-button" onClick={onClose} aria-label="Close shelf">
            Close
          </button>
        </div>
        <p className="shelf-intro">
          Every saved build keeps its parts, regulator, condition, and test history in this
          browser. Load one, duplicate it, or remove it. Switching calibres also saves the current
          bench here first.
        </p>
        <div className="shelf-actions">
          <button type="button" className="button button-primary" onClick={onSaveCurrent}>
            Save current bench
          </button>
          <button type="button" className="text-button" onClick={onExport}>
            Export shelf
          </button>
          <label className="text-button import-label">
            Import shelf
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        {importError ? (
          <p className="import-error" role="status" aria-live="polite">
            {importError}
          </p>
        ) : null}
        {shelf.length === 0 ? (
          <p className="shelf-empty">
            The shelf is empty. Save the current bench, then switch calibres without losing it.
          </p>
        ) : (
          <ul className="shelf-list">
            {shelf.map((entry) => (
              <li key={entry.id} className="shelf-entry">
                <div className="shelf-entry-head">
                  <input
                    className="shelf-name"
                    defaultValue={entry.name}
                    aria-label={`Name for ${entry.name}`}
                    maxLength={40}
                    onBlur={(event) => onRename(entry.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                  />
                  <span className="mono shelf-serial">{entry.calibre.serial}</span>
                </div>
                <p className="shelf-meta">
                  {entry.calibre.fixture.toUpperCase()} · {entry.calibre.fault === 'none' ? 'Sound' : entry.calibre.fault.replaceAll('_', ' ')} ·{' '}
                  {entry.lastTest ? formatTime(entry.lastTest.at) : 'untested'} · saved{' '}
                  {formatDate(entry.savedAt)}
                </p>
                <div className="shelf-entry-actions">
                  <button type="button" className="text-button" onClick={() => onLoad(entry)}>
                    Load
                  </button>
                  <button type="button" className="text-button" onClick={() => onDuplicate(entry.id)}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="text-button shelf-delete"
                    onClick={() => {
                      if (window.confirm(`Remove ${entry.name} from the shelf?`)) onDelete(entry.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
