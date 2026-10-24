import { formatTime } from '../horology/format';
import type { LogEntry } from '../horology/types';

export function BenchLog({ entries }: { entries: LogEntry[] }) {
  const recent = entries.slice(-6).reverse();
  return (
    <section className="bench-log" aria-label="Bench log">
      <div className="log-head">
        <span className="field-label">Bench log</span>
        <span className="mono log-count">{entries.length} entries</span>
      </div>
      {recent.length === 0 ? (
        <p className="log-empty">No entries yet.</p>
      ) : (
        <ol className="log-list">
          {recent.map((entry) => (
            <li key={entry.id}>
              <span className="mono log-time">{formatTime(entry.at)}</span>
              <span className={`log-kind kind-${entry.kind}`}>{entry.kind}</span>
              <span className="log-text">{entry.text}</span>
              {entry.detail ? <span className="log-detail">{entry.detail}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
