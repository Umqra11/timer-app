import { describe, it, expect } from 'vitest';
import { formatHumanShort } from '$lib/utils/format';

describe('formatHumanShort — D-072 modal unit (F4)', () => {
	it('returns "0dk" for 0 or negative', () => {
		expect(formatHumanShort(0)).toBe('0dk');
		expect(formatHumanShort(-5)).toBe('0dk');
	});

	it('returns seconds for < 60s', () => {
		expect(formatHumanShort(1)).toBe('1sn');
		expect(formatHumanShort(45)).toBe('45sn');
		expect(formatHumanShort(59)).toBe('59sn');
	});

	it('returns minutes for < 60 dk', () => {
		expect(formatHumanShort(60)).toBe('1dk');
		expect(formatHumanShort(139)).toBe('2dk');
		expect(formatHumanShort(3540)).toBe('59dk');
	});

	it('returns exact hours without trailing minutes', () => {
		expect(formatHumanShort(3600)).toBe('1sa');
		expect(formatHumanShort(7200)).toBe('2sa');
	});

	it('returns hours+minutes when remMin > 0', () => {
		expect(formatHumanShort(3660)).toBe('1sa 1dk');
		expect(formatHumanShort(5400)).toBe('1sa 30dk');
		expect(formatHumanShort(9000)).toBe('2sa 30dk');
	});
});
