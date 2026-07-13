// RTL-safe numeric display: minus sign stays on the left (e.g. −15, not 15−).
export function formatScoreNum(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0';
  if (n < 0) return `−${Math.abs(n)}`;
  return String(n);
}

export function ScoreNum({ value }) {
  return <span className="num-ltr" dir="ltr">{formatScoreNum(value)}</span>;
}

export function formatRoundTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds === '') return '—';
  const n = Number(totalSeconds);
  if (Number.isNaN(n) || n < 0) return '—';
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function roundTimeToSeconds(minutes, seconds) {
  const m = Math.max(0, Number(minutes) || 0);
  const s = Math.max(0, Math.min(59, Number(seconds) || 0));
  return m * 60 + s;
}
