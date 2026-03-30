import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatCurrency, formatNumber } from '../utils/formatters';

describe('Formatters Utils', () => {
    describe('formatDate', () => {
        it('should format valid date correctly', () => {
            const date = new Date('2024-01-01T10:00:00Z');
            // Note: format uses local time, but date-fns behavior depends on input.
            // We'll trust the formatter output for a fixed string first, 
            // but testing timezones can be tricky. 
            // Let's assume the system timezone or just check the format structure.
            // A safer test with date-fns format(date, 'dd/MM/yyyy') matches.

            // Using a string input to be safe with how the function works: new Date(value)
            expect(formatDate('2024-01-01')).toBe('01/01/2024');
        });

        it('should return empty string for null/undefined/empty', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate(undefined)).toBe('');
            expect(formatDate('')).toBe('');
        });

        it('should return empty string for invalid date', () => {
            expect(formatDate('invalid-date')).toBe('');
        });
    });

    describe('formatDateTime', () => {
        it('should format valid datetime correctly', () => {
            // We use a fixed string ISO to avoid timezone shifts affecting verification 
            // if we hardcode "01/01/2024 07:00" etc.
            // However, new Date('2024-01-01T12:00:00') without Z acts as local.
            // Let's use a specific local component string for consistent testing.
            expect(formatDateTime('2024-01-01T14:30:00')).toMatch(/01\/01\/2024 14:30/);
        });

        it('should return empty string for missing value', () => {
            expect(formatDateTime(null)).toBe('');
        });

        it('should return empty string for invalid input', () => {
            expect(formatDateTime('not-a-date')).toBe('');
        });
    });

    describe('formatCurrency', () => {
        it('should format VND by default', () => {
            expect(formatCurrency(100000)).toMatch(/100.000\s?₫/);
            // Note: The exact space (non-breaking or normal) might vary by node version/locale data.
            // Using regex or analyzing the exact string is safer. 
            // In vi-VN, it's often "100.000 ₫"
        });

        it('should format zero correctly', () => {
            expect(formatCurrency(0)).toMatch(/0\s?₫/);
        });

        it('should return empty for null/undefined', () => {
            expect(formatCurrency(null)).toBe('');
            expect(formatCurrency(undefined)).toBe('');
        });

        it('should handle string numbers', () => {
            expect(formatCurrency('50000')).toMatch(/50.000\s?₫/);
        });

        it('should support other currencies if provided', () => {
            const result = formatCurrency(100, 'USD', 'en-US');
            expect(result).toBe('$100');
        });
    });

    describe('formatNumber', () => {
        it('should format number with thousand separators', () => {
            expect(formatNumber(1234567)).toBe('1.234.567');
        });

        it('should handle float numbers', () => {
            // Intl default behavior for vi-VN usually uses comma for decimal
            // and dot for thousands.
            // formatNumber implementation: new Intl.NumberFormat(locale).format(Number(value))
            // Verify behavior:
            expect(formatNumber(1234.56)).toMatch(/1.234,56/); // vi-VN standard
        });

        it('should return empty for invalid/missing', () => {
            expect(formatNumber(null)).toBe('');
        });
    });
});
