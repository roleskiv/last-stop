import { store } from './store.ts';

let cached: { key: string; fmt: Intl.NumberFormat } | null = null;

/** Format minor units as money in the operator's currency. Demo play shows plain numbers. */
export function money(minor: number): string {
  const op = store.get().operator;
  const decimals = op?.currencyDecimals ?? 2;
  const currency = op?.currency ?? 'FUN';
  const key = `${currency}:${decimals}`;
  if (!cached || cached.key !== key) {
    let fmt: Intl.NumberFormat;
    try {
      fmt = currency === 'FUN'
        ? new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } catch {
      fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    cached = { key, fmt };
  }
  return cached.fmt.format(minor / 10 ** decimals);
}

/** Bet multiples, e.g. 12.5 -> "12.5x". */
export function mult(x: number): string {
  return `${x >= 100 ? Math.round(x).toLocaleString() : (Math.round(x * 100) / 100).toLocaleString()}x`;
}

export function clockTime(d = new Date()): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}
