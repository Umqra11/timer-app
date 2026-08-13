import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOMS_SRC = resolve(process.cwd(), 'src/lib/firebase/rooms.ts');

describe('subscribeRoomMembers — Sprint-06 Faz 4 F7 (D-074) N+1 fix', () => {
	function getBody(): string {
		const src = readFileSync(ROOMS_SRC, 'utf-8');
		const startIdx = src.indexOf('export function subscribeRoomMembers');
		if (startIdx < 0) throw new Error('subscribeRoomMembers export not found');
		// Take 4500 chars after — function is ~88 lines, safely within window.
		return src.slice(startIdx, startIdx + 4500);
	}

	it('subscribeRoomMembers function body contains Promise.all', () => {
		const body = getBody();
		expect(
			body.includes('Promise.all'),
			'subscribeRoomMembers must use Promise.all for parallel getDoc (N+1 → 1 round-trip)'
		).toBe(true);
	});

	it('await getDoc is no longer inside a for-of loop body', () => {
		const body = getBody();
		// for-loop with await getDoc inside body = N+1 waterfall (anti-pattern).
		const forAwaitGetDoc = /for\s*\([^)]*\)\s*\{[\s\S]*?await\s+getDoc/;
		expect(
			forAwaitGetDoc.test(body),
			'await getDoc must NOT be inside a for-loop body (N+1 anti-pattern)'
		).toBe(false);
	});
});
