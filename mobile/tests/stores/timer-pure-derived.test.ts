import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIMER_SRC = resolve(process.cwd(), 'src/lib/stores/timer.svelte.ts');

describe('P3 tick refactor — Sprint-06 Faz 6 (D-077) pure \$derived', () => {
	it('declares elapsedMs as $derived (not $state)', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		// Match `const elapsedMs = $derived(...)` declaration
		const match = src.match(/const\s+elapsedMs\s*=\s*\$derived\(/);
		expect(
			match,
			'elapsedMs must be $derived (pure function) — mutative $state is anti-pattern per D-077'
		).toBeTruthy();
	});

	it('elapsedMs is NOT declared as $state', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		// Match `let elapsedMs = $state(...)` — should NOT exist
		const mutativeDecl = src.match(/let\s+elapsedMs\s*=\s*\$state\(/);
		expect(
			mutativeDecl,
			'elapsedMs must NOT be $state — must be $derived for pure function (D-077)'
		).toBeNull();
	});

	it('tick callback (TICK_MS) does NOT mutate elapsedMs', () => {
		const src = readFileSync(TIMER_SRC, 'utf-8');
		const tickMatch = src.match(
			/setInterval\(\(\) => \{[\s\S]*?\}\s*,\s*TICK_MS\s*\)/
		);
		expect(tickMatch, 'setInterval(... TICK_MS) body not found').toBeTruthy();
		const body = tickMatch![0];
		// `elapsedMs += ...` is the mutative pattern we want to eliminate.
		// Allow `nowTick = ...` (the reactive trigger) but not direct elapsedMs mutation.
		expect(
			body.includes('elapsedMs +='),
			'tick callback must NOT use "elapsedMs +=" (mutative). Use nowTick state for reactive trigger.'
		).toBe(false);
		expect(
			body.includes('nowTick'),
			'tick callback must update nowTick state to trigger $derived re-evaluation'
		).toBe(true);
	});
});
