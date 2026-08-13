import { describe, it, expect } from 'vitest';
import { formatLastSeen } from '$lib/utils/format';

describe('formatLastSeen — D-070 / Sprint-06 Faz 4 F6', () => {
	const NOW = Date.parse('2026-08-13T15:30:00Z');

	it('returns "şimdi" for < 60s', () => {
		expect(formatLastSeen(NOW - 30_000, NOW)).toBe('şimdi');
		expect(formatLastSeen(NOW - 0, NOW)).toBe('şimdi');
	});

	it('returns "Xdk önce" for < 60 dk', () => {
		expect(formatLastSeen(NOW - 5 * 60_000, NOW)).toBe('5dk önce');
		expect(formatLastSeen(NOW - 59 * 60_000, NOW)).toBe('59dk önce');
	});

	it('returns "Xsa önce" for < 24 saat', () => {
		expect(formatLastSeen(NOW - 60 * 60_000, NOW)).toBe('1sa önce');
		expect(formatLastSeen(NOW - 23 * 60 * 60_000, NOW)).toBe('23sa önce');
	});

	it('returns "dün HH:MM" for 1+ gün önce aynı saat diliminde', () => {
		// NOW = 2026-08-13 15:30, bir gün önce = 2026-08-12 15:00
		const yesterday = NOW - 24 * 60 * 60_000 - 30 * 60_000;
		const result = formatLastSeen(yesterday, NOW);
		expect(result).toMatch(/^dün \d{2}:\d{2}$/);
	});

	it('returns "DD.MM HH:MM" for >= 7 gün önce', () => {
		const weekAgo = NOW - 8 * 24 * 60 * 60_000;
		const result = formatLastSeen(weekAgo, NOW);
		expect(result).toMatch(/^\d{2}\.\d{2} \d{2}:\d{2}$/);
	});

	it('handles negative diff (clock skew — future timestamp)', () => {
		expect(formatLastSeen(NOW + 5_000, NOW)).toBe('şimdi');
	});

	it('uses Date.now() as default "now" parameter', () => {
		const recent = Date.now() - 5_000;
		expect(formatLastSeen(recent)).toBe('şimdi');
	});
});
