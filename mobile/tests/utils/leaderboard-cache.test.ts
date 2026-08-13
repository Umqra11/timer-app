/**
 * Leaderboard cache — Sprint-06 Faz 4 F7 (D-074).
 * IndexedDB-backed leaderboard cache (idb-keyval).
 * Pure helpers tested with vi.mock — IndexedDB stub.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory store for the stub — mimics idb-keyval semantics.
const memStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
	get: vi.fn(async (key: string) => memStore.get(key)),
	set: vi.fn(async (key: string, value: unknown) => {
		memStore.set(key, value);
	}),
	del: vi.fn(async (key: string) => {
		memStore.delete(key);
	}),
	clear: vi.fn(async () => memStore.clear())
}));

import { loadCached, saveCache, clearCache } from '$lib/cache/idb';

beforeEach(() => memStore.clear());

describe('leaderboard-cache — Sprint-06 Faz 4 F7 (D-074)', () => {
	it('loadCached returns null when key missing', async () => {
		expect(await loadCached('leaderboard:room1')).toBeNull();
	});

	it('saveCache + loadCached round-trip', async () => {
		const data = [{ uid: 'a', username: 'Alice' }];
		await saveCache('leaderboard:room1', data);
		expect(await loadCached('leaderboard:room1')).toEqual(data);
	});

	it('clearCache removes the entry', async () => {
		await saveCache('leaderboard:room1', { foo: 'bar' });
		await clearCache('leaderboard:room1');
		expect(await loadCached('leaderboard:room1')).toBeNull();
	});

	it('saveCache respects TTL — expired entries return null', async () => {
		// Save with 0ms TTL → expired immediately
		await saveCache('leaderboard:room1', { foo: 'bar' }, 0);
		// Tiny delay to ensure expiry
		await new Promise((r) => setTimeout(r, 5));
		expect(await loadCached('leaderboard:room1')).toBeNull();
	});
});
