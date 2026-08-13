import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIMER_SRC = resolve(process.cwd(), 'src/lib/stores/timer.svelte.ts');

describe('60s presence heartbeat — Sprint-06 Faz 3 P2', () => {
	it('declares a 60_000ms heartbeat interval (60s, <120s, >30s)', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		// Pattern: setInterval(<callback>, 60_000) — underscores optional
		const match = src.match(/setInterval\([^,]+,\s*60_?000\s*\)/);
		expect(
			match,
			'setInterval(... 60_000) heartbeat interval not found in timer.svelte.ts'
		).toBeTruthy();
	});

	it('heartbeat callback invokes pushToRemote (not just any tick)', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		// Find all setInterval calls; pick the one whose interval argument is 60_000.
		const setIntervalRegex = /setInterval\([\s\S]*?\}\s*,\s*(\d[\d_]*)\s*\)/g;
		const matches = [...src.matchAll(setIntervalRegex)];
		const heartbeatMatch = matches.find((m) =>
			m[1].replaceAll('_', '') === '60000'
		);
		expect(heartbeatMatch, '60s heartbeat interval not found').toBeTruthy();
		// Body is everything between `() => {` and the closing `}` (before the interval arg).
		const startToken = '() => {';
		const startIdx = heartbeatMatch![0].indexOf(startToken) + startToken.length;
		const endIdx = heartbeatMatch![0].lastIndexOf('}');
		const body = heartbeatMatch![0].slice(startIdx, endIdx);
		expect(
			body.includes('pushToRemote'),
			'60s heartbeat callback must invoke pushToRemote (presence refresh)'
		).toBe(true);
	});

	it('TICK_MS (100ms) callback does NOT invoke pushToRemote — A3 regression guard', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		// Find all setInterval calls; pick the one whose interval argument is TICK_MS.
		const setIntervalRegex = /setInterval\([\s\S]*?\}\s*,\s*(TICK_MS|\d[\d_]*)\s*\)/g;
		const matches = [...src.matchAll(setIntervalRegex)];
		const tickMatch = matches.find((m) => m[1] === 'TICK_MS');
		expect(tickMatch, 'setInterval(... TICK_MS) body not found').toBeTruthy();
		const startToken = '() => {';
		const startIdx = tickMatch![0].indexOf(startToken) + startToken.length;
		const endIdx = tickMatch![0].lastIndexOf('}');
		const body = tickMatch![0].slice(startIdx, endIdx);
		expect(
			body.includes('pushToRemote'),
			'tick callback must NOT invoke pushToRemote (A3 regression: 5/min rate limit)'
		).toBe(false);
	});

	it('declares clearPresenceHeartbeat helper that calls clearInterval', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const helperMatch = src.match(
			/function\s+clearPresenceHeartbeat\s*\(\s*\)\s*\{[\s\S]*?clearInterval/
		);
		expect(
			helperMatch,
			'clearPresenceHeartbeat() helper not found (must call clearInterval)'
		).toBeTruthy();
	});

	it('heartbeat is cleared in pause() body', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const pauseBody = src.match(/pause\(\)\s*\{[\s\S]*?^\s{2}\},/m)?.[0] ?? '';
		expect(
			pauseBody.includes('clearPresenceHeartbeat'),
			'pause() must call clearPresenceHeartbeat'
		).toBe(true);
	});

	it('heartbeat is cleared in finish() body', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const finishBody = src.match(/finish\(\)\s*\{[\s\S]*?^\s{2}\},/m)?.[0] ?? '';
		expect(
			finishBody.includes('clearPresenceHeartbeat'),
			'finish() must call clearPresenceHeartbeat'
		).toBe(true);
	});

	it('heartbeat is cleared in reset() body', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const resetBody = src.match(/reset\(\)\s*\{[\s\S]*?^\s{2}\},/m)?.[0] ?? '';
		expect(
			resetBody.includes('clearPresenceHeartbeat'),
			'reset() must call clearPresenceHeartbeat'
		).toBe(true);
	});

	it('heartbeat is set in start() body when status transitions to running', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const startBody = src.match(/start\(\)\s*\{[\s\S]*?^\s{2}\},/m)?.[0] ?? '';
		const startsHeartbeat =
			startBody.includes('startPresenceHeartbeat') ||
			(startBody.includes('setInterval') && startBody.includes('60_?000'));
		expect(
			startsHeartbeat,
			'start() must invoke startPresenceHeartbeat() (or inline setInterval with 60_000) when entering running'
		).toBe(true);
	});

	it('heartbeat is set in resume() body when paused → running', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const resumeBody = src.match(/resume\(\)\s*\{[\s\S]*?^\s{2}\},/m)?.[0] ?? '';
		const resumesHeartbeat =
			resumeBody.includes('startPresenceHeartbeat') ||
			(resumeBody.includes('setInterval') && resumeBody.includes('60_?000'));
		expect(
			resumesHeartbeat,
			'resume() must invoke startPresenceHeartbeat() (or inline setInterval with 60_000) when re-entering running'
		).toBe(true);
	});
});
