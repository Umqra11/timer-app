import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIMER_SRC = resolve(process.cwd(), 'src/lib/stores/timer.svelte.ts');

describe('timer push frequency — Sprint-05 Faz 2 A3 regression', () => {
	it('setInterval (TICK_MS) callback does NOT invoke pushToRemote', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		// Robust: pick the setInterval whose interval arg is TICK_MS literal (not the
		// 60s heartbeat helper or other functions that happen to contain a `}`).
		const setIntervalRegex = /setInterval\([\s\S]*?\}\s*,\s*(TICK_MS|\d[\d_]*)\s*\)/g;
		const matches = [...src.matchAll(setIntervalRegex)];
		const match = matches.find((m) => m[1] === 'TICK_MS');
		expect(match, 'setInterval(... TICK_MS) body not found in timer.svelte.ts').toBeTruthy();
		const startToken = '() => {';
		const startIdx = match![0].indexOf(startToken) + startToken.length;
		const endIdx = match![0].lastIndexOf('}');
		const body = match![0].slice(startIdx, endIdx);
		expect(
			body.includes('pushToRemote'),
			'tick callback must NOT invoke pushToRemote (would cause 5/min rate-limit spike)'
		).toBe(false);
		expect(
			body.includes('httpsCallable'),
			'tick callback must NOT invoke httpsCallable (would cause rate-limit rejection)'
		).toBe(false);
	});
});
