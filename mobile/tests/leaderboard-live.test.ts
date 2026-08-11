import { describe, it, expect } from 'vitest';
import { liveSeconds } from '$lib/utils/live-timer';

describe('liveSeconds', () => {
	it('running: weekly + elapsedMs + tick', () => {
		const now = 1_700_000_000_000;
		const entry = {
			uid: 'u1',
			username: 'x',
			totalSeconds: 100,
			status: 'running' as const,
			effective: 'running' as const,
			elapsedMs: 5000,
			lastSeen: now - 10_000,
			weeklySeconds: 60
		};
		expect(liveSeconds(entry, now)).toBe(60 + 5 + 10);
	});

	it('paused: weekly + elapsedMs, no tick', () => {
		const now = 1_700_000_000_000;
		const entry = {
			uid: 'u1',
			username: 'x',
			totalSeconds: 100,
			status: 'paused' as const,
			effective: 'paused' as const,
			elapsedMs: 5000,
			lastSeen: now - 10_000,
			weeklySeconds: 60
		};
		expect(liveSeconds(entry, now)).toBe(60 + 5);
	});

	it('finished-late: weekly + elapsedMs, no tick', () => {
		const now = 1_700_000_000_000;
		const entry = {
			uid: 'u1',
			username: 'x',
			totalSeconds: 100,
			status: 'finished' as const,
			effective: 'finished-late' as const,
			elapsedMs: 5000,
			lastSeen: now - 60_000,
			weeklySeconds: 60
		};
		expect(liveSeconds(entry, now)).toBe(60 + 5);
	});
});
