/**
 * IndexedDB-backed cache layer — Sprint-06 Faz 4 F7 (D-074).
 *
 * idb-keyval (~600 byte, promise-based, IndexedDB) — svelte-persisted-store
 * localStorage alternatifi YANLIŞ (sync, 5-10MB cap, first paint blocks).
 *
 * Pattern: leaderboard cache + ttl (default 30s — fresh data on hydrate,
 * stale protection against rapid stale reads).
 *
 * Tüm helper'lar pure — IndexedDB stub'ı vitest'te `vi.mock('idb-keyval')` ile
 * çalışır.
 */
import { get, set, del } from 'idb-keyval';

const PREFIX = 'kronometre:';

type Envelope<T> = { value: T; expiresAt: number };

function envelopeKey(key: string): string {
	return `${PREFIX}${key}`;
}

export async function loadCached<T>(key: string): Promise<T | null> {
	const env = await get<Envelope<T>>(envelopeKey(key));
	if (!env) return null;
	if (Date.now() > env.expiresAt) {
		await del(envelopeKey(key));
		return null;
	}
	return env.value;
}

export async function saveCache<T>(key: string, data: T, ttlMs = 30_000): Promise<void> {
	const env: Envelope<T> = { value: data, expiresAt: Date.now() + ttlMs };
	await set(envelopeKey(key), env);
}

export async function clearCache(key: string): Promise<void> {
	await del(envelopeKey(key));
}
