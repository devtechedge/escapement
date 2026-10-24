export function formatSigned(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return (0).toFixed(digits);
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}`;
}

export function formatRate(value: number): string {
  return `${formatSigned(value)} s/d`;
}

export function formatAmplitude(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatBeat(value: number): string {
  return `${value.toFixed(1)} ms`;
}

export function formatReserve(value: number): string {
  return `${Math.max(0, Math.round(value))} h`;
}

export function formatVph(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} vph`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatSerial(serial: string): string {
  return serial.replace(/^ESC-/, '');
}

export function fileStamp(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
