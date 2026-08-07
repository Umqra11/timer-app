/**
 * Presence — D-006 + D-019
 *
 * `rooms/{roomId}/presence/{uid}` doc'ları, odaya kimlerin katıldığını ve
 * timer durumlarını canlı tutar.
 *
 * Schema:
 *   - status: 'idle' | 'running' | 'paused' | 'finished'
 *   - elapsedMs: number   (son session'ın birikmiş süresi)
 *   - username: string    (presence listesinde göstermek için — denormalize)
 *   - updatedAt: timestamp
 *
 * Cross-device timer senkronu (D-019): timer.svelte.ts, 100ms tick'lerini
 * Firestore'a yazmaz (maliyetli). Bunun yerine, state değişimlerinde
 * (start/pause/resume/stop) snapshot yazar ve odadaki diğer client'lar
 * onSnapshot ile günceller. Aynı tarayıcı sekmeleri arası için hâlâ
 * BroadcastChannel kullanılır (anında).
 *
 * "finished" durumu: kullanıcı seansı durdurduğunda (handleStop) tek seferlik
 * olarak yazılır, bir sonraki start'ta tekrar 'running' olur.
 */

import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';

export type PresenceStatus = 'idle' | 'running' | 'paused' | 'finished';

export type PresenceDoc = {
	uid: string;
	username: string;
	status: PresenceStatus;
	elapsedMs: number;
	updatedAt: number; // unix ms (yerelde resolve edilir)
};

const presenceRef = (roomId: string, uid: string) =>
	`rooms/${roomId}/presence/${uid}`;

/** Kendi presence'ımızı yaz — timer state değişimlerinde çağrılır. */
export async function writePresence(
	roomId: string,
	username: string,
	status: PresenceStatus,
	elapsedMs: number
): Promise<void> {
	const db = getDb();
	if (!db) return;
	const uid = getDeviceUid();
	await setDoc(doc(db, presenceRef(roomId, uid)), {
		uid,
		username,
		status,
		elapsedMs,
		updatedAt: serverTimestamp()
	});
}

/** Odadaki tüm presence'ları canlı dinle. */
export function subscribeRoomPresence(
	roomId: string,
	cb: (list: PresenceDoc[]) => void
): () => void {
	const db = getDb();
	if (!db) {
		cb([]);
		return () => {};
	}
	const uid = getDeviceUid();
	return onSnapshot(
		collection(db, `rooms/${roomId}/presence`),
		(snap) => {
			const items: PresenceDoc[] = [];
			for (const d of snap.docs) {
				const data = d.data() as {
					uid: string;
					username: string;
					status: PresenceStatus;
					elapsedMs: number;
					updatedAt?: { toMillis?: () => number };
				};
				items.push({
					uid: data.uid,
					username: data.username,
					status: data.status,
					elapsedMs: data.elapsedMs,
					updatedAt: data.updatedAt?.toMillis?.() ?? Date.now()
				});
			}
			// updatedAt desc — en yeni hareket üstte
			items.sort((a, b) => b.updatedAt - a.updatedAt);
			cb(items);
		},
		(err) => {
			console.error('[presence] subscribe error', err);
			cb([]);
		}
	);
}
