import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIMER_SRC = resolve(process.cwd(), 'src/lib/stores/timer.svelte.ts');

describe('timer push frequency — Sprint-05 Faz 2 A3 regression', () => {
	it('setInterval (TICK_MS) callback does NOT invoke pushToRemote', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const match = src.match(/setInterval\(\(\) => \{[\s\S]*?\}, TICK_MS\);/);
		expect(match, 'setInterval(... TICK_MS) body not found in timer.svelte.ts').toBeTruthy();
		const body = match![0];
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
