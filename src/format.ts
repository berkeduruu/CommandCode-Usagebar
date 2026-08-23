export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function formatTokens(tokens: number): string {
  const value = Math.max(0, Math.round(tokens));
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return thousands >= 100 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1)}K`;
  }
  return String(value);
}

export function formatPercent(value: number, decimals = 0): string {
  return `${decimals === 0 ? Math.round(value) : value.toFixed(decimals)}%`;
}

export function formatUsd(value: number, zeroLabel = '$0.00'): string {
  if (!Number.isFinite(value) || value === 0) {
    return zeroLabel;
  }

  const absolute = Math.abs(value);
  const decimals = absolute < 0.01 ? 6 : 2;
  return `$${value.toFixed(decimals).replace(/(\.\d*?[1-9])0+$/, '$1')}`;
}

export function formatUtcDateTime(timestamp: string | number): string {
  const date = new Date(timestampMs(timestamp));
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatUtcDateKey(timestamp: string | number): string {
  const date = new Date(timestampMs(timestamp));
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function timestampMs(value: string | number): number {
  if (typeof value === 'number') {
    return value < 10_000_000_000 ? value * 1000 : value;
  }

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }

  return Date.parse(trimmed);
}

export function formatResetAt(resetAt?: number, now = Date.now()): string {
  if (!resetAt || !Number.isFinite(resetAt)) {
    return 'Billing period';
  }

  const remainingMs = resetAt - now;
  if (remainingMs <= 0) {
    return 'Resetting soon';
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (days === 0 && minutes > 0) {
    parts.push(`${minutes}m`);
  }
  return `in ${parts.join(' ')}`;
}

export function formatResetDate(resetAt?: number): string {
  if (!resetAt || !Number.isFinite(resetAt)) {
    return 'Not available';
  }
  return formatUtcDateTime(resetAt);
}

export function formatProgressBar(percent: number, dots = 10): string {
  const filled = Math.round((clamp(percent) / 100) * dots);
  return `${'●'.repeat(filled)}${'○'.repeat(dots - filled)}`;
}

export function startOfUtcDay(date = new Date()): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function endOfUtcDay(date = new Date()): number {
  return startOfUtcDay(date) + 24 * 60 * 60 * 1000 - 1;
}

export function sumTokens(record: { tokensIn: number; tokensOut: number; tokensTotal: number }): number {
  if (record.tokensTotal > 0) {
    return record.tokensTotal;
  }
  return record.tokensIn + record.tokensOut;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]|])/g, '\\$1').replace(/\r?\n/g, ' ');
}
