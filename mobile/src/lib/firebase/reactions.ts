/**
 * Reactions — D-052, D-053, D-054
 *
 * Kısa tepkiler (reactions) sistemi. Kullanıcılar birinin satırına tıklayıp
 * kısa mesaj yazabilir, 4 saat sonra otomatik silinir (Firestore TTL policy).
 *
 * Şema:
 *   rooms/{roomId}/reactions/{reactionId}
 *     - targetUid: string      — kime gönderildi (D-055: sadece kişiye)
 *     - senderUid: string      — kim gönderdi
 *     - senderUsername: string — denormalize
 *     - text: string           — max 60 karakter (D-052)
 *     - createdAt: timestamp
 *     - expireAt: timestamp    — createdAt + 4 saat (TTL policy buraya bakıyor)
 *
 * Rate limit (D-053): dakikada 5, saatte 30. Server-side kontrol
 * `users/{uid}/rateLimit/reactions` counter doc'ta. MVP'de basit sayaç —
 * yeni kullanıcılar sınırsız, gerçek server enforcement Sprint-04'te.
 */

import {
	collection,
	doc,
	getDoc,
	onSnapshot,
	query,
	runTransaction,
	serverTimestamp,
	setDoc,
	where
} from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';

const REACTIONS = 'reactions';
const RATE_LIMIT = 'rateLimit';

/** Rate limit sabitleri (D-053). */
export const RATE_PER_MINUTE = 5;
export const RATE_PER_HOUR = 30;
export const REACTION_MAX_LEN = 60;
export const REACTION_TTL_MS = 4 * 60 * 60 * 1000; // 4 saat

export type ReactionDoc = {
	id: string;
	targetUid: string;
	senderUid: string;
	senderUsername: string;
	text: string;
	createdAt: number; // unix ms
	expireAt: number; // unix ms (Firestore TTL)
};

export type ReactionResult =
	| { ok: true; reactionId: string }
	| { ok: false; reason: 'empty' | 'too-long' | 'rate-limit' | 'no-target' | 'unavailable' };

/** Rate limit counter doc snapshot'ı. */
type RateLimitState = {
	minuteCount: number;
	minuteResetAt: number;
	hourCount: number;
	hourResetAt: number;
};

const emptyRateState = (): RateLimitState => {
	const now = Date.now();
	return {
		minuteCount: 0,
		minuteResetAt: now + 60_000,
		hourCount: 0,
		hourResetAt: now + 60 * 60_000
	};
};

/** Rate limit state'ini oku (yoksa boş başlat). */
async function readRateLimit(uid: string): Promise<RateLimitState> {
	const db = getDb();
	if (!db) return emptyRateState();
	const ref = doc(db, `users/${uid}/${RATE_LIMIT}/reactions`);
	const snap = await getDoc(ref);
	if (!snap.exists()) return emptyRateState();
	const data = snap.data() as Partial<RateLimitState>;
	return {
		minuteCount: data.minuteCount ?? 0,
		minuteResetAt: data.minuteResetAt ?? Date.now() + 60_000,
		hourCount: data.hourCount ?? 0,
		hourResetAt: data.hourResetAt ?? Date.now() + 60 * 60_000
	};
}

/** Rate limit state'ini yaz. */
async function writeRateLimit(uid: string, state: RateLimitState): Promise<void> {
	const db = getDb();
	if (!db) return;
	await setDoc(doc(db, `users/${uid}/${RATE_LIMIT}/reactions`), {
		minuteCount: state.minuteCount,
		minuteResetAt: state.minuteResetAt,
		hourCount: state.hourCount,
		hourResetAt: state.hourResetAt
	});
}

/**
 * Tepki gönder — D-052, D-053.
 * Atomik: rate limit check + write transaction içinde yapılır (yarış koşulu
 * önlenir). Yeni kullanıcılar (rateLimit doc yok) sınırsız başlar — Sprint-04'te
 * Cloud Function ile sıkılaştırılacak.
 */
export async function sendReaction(
	roomId: string,
	targetUid: string,
	text: string,
	senderUsername: string
): Promise<ReactionResult> {
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	if (!targetUid) return { ok: false, reason: 'no-target' };

	const trimmed = text.trim();
	if (trimmed.length === 0) return { ok: false, reason: 'empty' };
	if (trimmed.length > REACTION_MAX_LEN) return { ok: false, reason: 'too-long' };

	const uid = getDeviceUid();
	const reactionId = crypto.randomUUID();
	const now = Date.now();
	const expireAt = now + REACTION_TTL_MS;

	try {
		await runTransaction(db, async (tx) => {
			// Rate limit kontrol
			const rl = await readRateLimit(uid);
			const refreshed: RateLimitState = { ...rl };

			// Window expired ise reset
			const nowMs = Date.now();
			if (nowMs >= rl.minuteResetAt) {
				refreshed.minuteCount = 0;
				refreshed.minuteResetAt = nowMs + 60_000;
			}
			if (nowMs >= rl.hourResetAt) {
				refreshed.hourCount = 0;
				refreshed.hourResetAt = nowMs + 60 * 60_000;
			}

			// Limit check
			if (refreshed.minuteCount >= RATE_PER_MINUTE) {
				throw new Error('rate-limit-minute');
			}
			if (refreshed.hourCount >= RATE_PER_HOUR) {
				throw new Error('rate-limit-hour');
			}

			refreshed.minuteCount += 1;
			refreshed.hourCount += 1;

			// Reaction doc oluştur
			tx.set(doc(db, `rooms/${roomId}/${REACTIONS}/${reactionId}`), {
				targetUid,
				senderUid: uid,
				senderUsername,
				text: trimmed,
				createdAt: serverTimestamp(),
				expireAt: new Date(expireAt)
			});
			// Rate counter güncelle
			tx.set(doc(db, `users/${uid}/${RATE_LIMIT}/reactions`), {
				minuteCount: refreshed.minuteCount,
				minuteResetAt: refreshed.minuteResetAt,
				hourCount: refreshed.hourCount,
				hourResetAt: refreshed.hourResetAt
			});
		});
		return { ok: true, reactionId };
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === 'rate-limit-minute' || err.message === 'rate-limit-hour') {
				return { ok: false, reason: 'rate-limit' };
			}
		}
		console.error('[reactions] send failed', err);
		return { ok: false, reason: 'unavailable' };
	}
}

/** Odadaki tüm tepkileri canlı dinle — sadece targetUid verilirse o kişiye ait olanları. */
export function subscribeReactions(
	roomId: string,
	cb: (reactions: ReactionDoc[]) => void,
	targetUid?: string
): () => void {
	const db = getDb();
	if (!db) {
		cb([]);
		return () => {};
	}

	// TTL'li doc'lar Firestore'da expireAt < now olunca otomatik silinir,
	// biz de yine de client-side filter uyguluyoruz (eski snapshot'lar için).
	const ref =
		targetUid !== undefined
			? query(collection(db, `rooms/${roomId}/${REACTIONS}`), where('targetUid', '==', targetUid))
			: collection(db, `rooms/${roomId}/${REACTIONS}`);

	return onSnapshot(
		ref,
		(snap) => {
			const items: ReactionDoc[] = [];
			const now = Date.now();
			for (const d of snap.docs) {
				const data = d.data() as {
					targetUid: string;
					senderUid: string;
					senderUsername: string;
					text: string;
					createdAt?: { toMillis?: () => number };
					expireAt?: { toMillis?: () => number } | number;
				};
				// expireAt client-side filter (TTL henüz süpürmemiş olabilir)
				const expMs =
					typeof data.expireAt === 'number'
						? data.expireAt
						: data.expireAt?.toMillis?.() ?? now;
				if (expMs < now) continue;

				items.push({
					id: d.id,
					targetUid: data.targetUid,
					senderUid: data.senderUid,
					senderUsername: data.senderUsername,
					text: data.text,
					createdAt: data.createdAt?.toMillis?.() ?? now,
					expireAt: expMs
				});
			}
			// Yeniler üstte
			items.sort((a, b) => b.createdAt - a.createdAt);
			cb(items);
		},
		(err) => {
			console.error('[reactions] subscribe error', err);
			cb([]);
		}
	);
}
