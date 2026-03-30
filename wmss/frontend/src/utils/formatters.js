import { format } from 'date-fns';

const DATE_FORMAT = 'dd/MM/yyyy';
const DEFAULT_LOCALE = 'vi-VN';

export function formatDate(value) {
  if (!value) return '';
  try {
    return format(new Date(value), DATE_FORMAT);
  } catch {
    return '';
  }
}

export function formatDateTime(value) {
  if (!value) return '';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return '';
  }
}

export function formatCurrency(value, currency = 'VND', locale = DEFAULT_LOCALE) {
  if (value == null) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(Number(value));
}

export function formatNumber(value, locale = DEFAULT_LOCALE) {
  if (value == null) return '';
  return new Intl.NumberFormat(locale).format(Number(value));
}
