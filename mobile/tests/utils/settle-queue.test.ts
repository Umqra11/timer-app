import { describe, it, expect, beforeEach } from 'vitest';
import {
	enqueuePending,
	dequeuePending,
	peekPending,
	installSettleFlush
} from '$lib/utils/settle-queue';
import type { PendingWrite } from '$lib/utils/settle-queue';

const KEY = 'kronometre.pendingWrites';

const sampleWrite = (overrides: Partial<PendingWrite> = {}): Omit<PendingWrite, 'id' | 'ts'> => ({
	roomId: 'r1',
	status: 'running' as const,
	elapsedMs: 0,
	uid: 'u1',
	...overrides
});

describe('settle queue', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('enqueuePending: stores in localStorage', () => {
		enqueuePending(sampleWrite());
		const q = peekPending();
		expect(q).toHaveLength(1);
		expect(q[0].roomId).toBe('r1');
		expect(q[0].status).toBe('running');
		expect(q[0].id).toBeDefined();
		expect(q[0].ts).toBeGreaterThan(0);
	});

	it('peekPending: returns empty array on no entry', () => {
		expect(peekPending()).toHaveLength(0);
	});

	it('peekPending: returns empty array on SSR (no window)', () => {
		const originalWindow = globalThis.window;
		// SSR simulation — window optional at type level
		delete (globalThis as { window?: unknown }).window;
		expect(peekPending()).toHaveLength(0);
		(globalThis as { window: unknown }).window = originalWindow;
	});

	it('dequeuePending: removes by id', () => {
		enqueuePending(sampleWrite());
		const id = peekPending()[0].id;
		dequeuePending(id);
		expect(peekPending()).toHaveLength(0);
	});

	it('keeps FIFO order across multiple enqueues', () => {
		enqueuePending(sampleWrite({ roomId: 'first' }));
		enqueuePending(sampleWrite({ roomId: 'second' }));
		enqueuePending(sampleWrite({ roomId: 'third' }));
		const q = peekPending();
		expect(q.map((w) => w.roomId)).toEqual(['first', 'second', 'third']);
	});

	it('caps at MAX_PENDING (FIFO evicts oldest, latest wins)', () => {
		for (let i = 0; i < 60; i++) {
			enqueuePending(sampleWrite({ roomId: `r${i}` }));
		}
		const q = peekPending();
		expect(q.length).toBeLessThanOrEqual(50);
		// Latest keeps, oldest evict
		expect(q[q.length - 1].roomId).toBe('r59');
	});

	it('installSettleFlush: drains queue via writer when online event fires', async () => {
		const written: PendingWrite[] = [];
		enqueuePending(sampleWrite({ roomId: 'drain-me' }));
		const detach = await installSettleFlush(async (w) => {
			written.push(w);
			return true;
		});
		// Drain happens in installSettleFlush's initial flush
		await new Promise((r) => setTimeout(r, 0));
		expect(written).toHaveLength(1);
		expect(peekPending()).toHaveLength(0);
		detach();
	});

	it('installSettleFlush: keeps entry in queue when writer fails', async () => {
		enqueuePending(sampleWrite({ roomId: 'keep-me' }));
		const detach = await installSettleFlush(async () => false);
		await new Promise((r) => setTimeout(r, 0));
		expect(peekPending()).toHaveLength(1);
		detach();
	});

	it('localStorage corruption returns empty (graceful)', () => {
		localStorage.setItem(KEY, 'not json {');
		expect(peekPending()).toHaveLength(0);
	});
});
