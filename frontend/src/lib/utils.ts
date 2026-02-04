// Utility to join class names conditionally
export function cn(...args: (string | undefined | null | false)[]): string {
  return args
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
};

export function formatCurrency(amount: number, currency: string = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${symbol}${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
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
