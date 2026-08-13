/**
 * Sessions — D-067 weekly stats altyapısı.
 *
 * Her `timer.finish()` çağrısında `users/{uid}/sessions/{sessionId}` doc
 * yazılır. `subscribeUserWeeklySeconds(uid)` son 7 günlük session'ları
 * sum'lar — leaderboard'daki "haftalık canlı süre" için veri kaynağı.
 *
 * Şema:
 *   users/{uid}/sessions/{sessionId}
 *     - dayKey: "YYYY-MM-DD" (Europe/Istanbul)
 *     - startedAt: timestamp ms
 *     - endedAt: timestamp ms
 *     - elapsedMs: number
 *
 * Rules: MVP'de client-side write (deploy Sprint-05 Faz 2'de).
 */

import {
	Timestamp,
	collection,
	doc,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	where
} from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';
import { todayKeyForSession } from './stats';

export const WEEK_DAYS = 7;
const WEEK_MS = WEEK_DAYS * 24 * 60 * 60 * 1000;

export type SessionDoc = {
	uid: string;
	dayKey: string;
	startedAt: number;
	endedAt: number;
	elapsedMs: number;
};

export type RecordSessionResult =
	| { ok: true; id: string }
	| { ok: false; reason: 'unavailable' };

/** Yeni session doc'u yaz — timer.finish() içinde çağrılır. */
export async function recordSession(
	data: Omit<SessionDoc, 'uid'>
): Promise<RecordSessionResult> {
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	const uid = getDeviceUid();
	const id = crypto.randomUUID();
	try {
		await setDoc(doc(db, `users/${uid}/sessions/${id}`), {
			uid,
			...data,
			endedAt: serverTimestamp()
		});
		return { ok: true, id };
	} catch (e) {
		console.error('[sessions] record failed', e);
		return { ok: false, reason: 'unavailable' };
	}
}

/**
 * Son 7 günlük session toplam saniyesini canlı dinle.
 * - where endedAt >= sevenDaysAgo (server-side filter)
 * - client-side sum
 * - ilk snapshot boş dönebilir (Firestore index gerekebilir)
 */
export function subscribeUserWeeklySeconds(
	uid: string,
	cb: (seconds: number) => void
): () => void {
	const db = getDb();
	if (!db) {
		cb(0);
		return () => {};
	}
	const cutoff = Timestamp.fromMillis(Date.now() - WEEK_MS);
	return onSnapshot(
		query(collection(db, `users/${uid}/sessions`), where('endedAt', '>=', cutoff)),
		(snap) => {
			let totalMs = 0;
			for (const d of snap.docs) {
				const data = d.data() as Partial<SessionDoc>;
				totalMs += data.elapsedMs ?? 0;
			}
			cb(Math.floor(totalMs / 1000));
		},
		(err) => {
			console.error('[sessions] weekly subscribe error', err);
			cb(0);
		}
	);
}

/**
 * Reactive today's total — D-072 / Sprint-06 Faz 4 F4.
 * `users/{uid}/sessions` subcollection'dan `dayKey === today` olanları sum'lar.
 * Callback saniye cinsinden toplam elapsedMs döner.
 * Return: unsubscribe fn (clearTick pattern).
 * Offline / no firebase: callback bir kez `0` ile çağrılır, no-op cleanup.
 */
export function subscribeUserDailySeconds(
	uid: string,
	cb: (seconds: number) => void
): () => void {
	const db = getDb();
	if (!db) {
		cb(0);
		return () => {};
	}
	const today = todayKeyForSession();
	return onSnapshot(
		query(collection(db, `users/${uid}/sessions`), where('dayKey', '==', today)),
		(snap) => {
			let totalMs = 0;
			for (const d of snap.docs) {
				const data = d.data() as Partial<SessionDoc>;
				totalMs += data.elapsedMs ?? 0;
			}
			cb(Math.floor(totalMs / 1000));
		},
		(err) => {
			console.error('[sessions] daily subscribe error', err);
			cb(0);
		}
	);
}
