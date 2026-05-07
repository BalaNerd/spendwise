// Utility to join class names conditionally
export function cn(...args: (string | undefined | null | false)[]): string {
  return args
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}

/**
 * Currency formatter
 * Uses Intl.NumberFormat and user-selected currency code.
 * Falls back gracefully if the currency code is invalid.
 */
export function formatCurrency(amount: number, currency: string = 'INR') {
  const value = Number.isFinite(amount) ? Number(amount) : 0;

  const format = (code: string) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  try {
    return format(currency);
  } catch {
    // Fallback to USD if an unknown currency code is provided
    return format('USD');
  }
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Percentage change between two numbers (e.g. this month vs last month) */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
