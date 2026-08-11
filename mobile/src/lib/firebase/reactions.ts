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
/** D-052 — TTL 4 saat (Firestore TTL policy ile expireAt alanı okunur) */
export const REACTION_TTL_MS = 4 * 60 * 60 * 1000;

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
	| { ok: false; reason: 'empty' | 'too-long' | 'rate-limit' | 'no-target' | 'self-target' | 'unavailable' };

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
 *
 * İki adımlı: önce rate limit check (okuma), sonra tepki yaz (yazma). Yeni
 * kullanıcılar (rateLimit doc yok) sınırsız başlar.
 *
 * BİLİNEN RACE: Aynı uid'den iki eşzamanlı istek aynı sayacı okuyup +1
 * yazabilir. Cross-device için gerçek çözüm server-side atomic — Cloud
 * Function `runTransaction` ile (server-side tx.get async değil, sorunsuz).
 * Sprint-04 #6 olarak planlandı; MVP için tolere edilebilir.
 *
 * NOT: Client-side `runTransaction` async `getDoc` ile uyumsuz (tx.get sadece
 * aynı transaction doc'larını okur, rate limit doc farklı collection'da).
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

	const senderUid = getDeviceUid();
	if (targetUid === senderUid) return { ok: false, reason: 'self-target' };

	const uid = senderUid;
	const reactionId = crypto.randomUUID();
	// expireAt — client-side hesaplanmış "now + 4 saat".
	// NOT: Firestore TTL server clock kullanır, client clock ile ~1 sn sapma
	// olabilir (NTP sync). 4 saatlik pencere için tolere edilebilir; doc'lar
	// yaklaşık doğru zamanda silinir. Gerçek server-time expireAt için
	// Cloud Function onWrite trigger gerekli — Sprint-04 #6.
	const expireAt = Date.now() + REACTION_TTL_MS;

	try {
		// 1) Rate limit kontrol
		const rl = await readRateLimit(uid);
		const nowMs = Date.now();
		const refreshed: RateLimitState = {
			minuteCount: nowMs >= rl.minuteResetAt ? 0 : rl.minuteCount,
			minuteResetAt: nowMs >= rl.minuteResetAt ? nowMs + 60_000 : rl.minuteResetAt,
			hourCount: nowMs >= rl.hourResetAt ? 0 : rl.hourCount,
			hourResetAt: nowMs >= rl.hourResetAt ? nowMs + 60 * 60_000 : rl.hourResetAt
		};
		if (refreshed.minuteCount >= RATE_PER_MINUTE) {
			return { ok: false, reason: 'rate-limit' };
		}
		if (refreshed.hourCount >= RATE_PER_HOUR) {
			return { ok: false, reason: 'rate-limit' };
		}
		refreshed.minuteCount += 1;
		refreshed.hourCount += 1;
		await writeRateLimit(uid, refreshed);

		// 2) Tepki doc'u yaz — TTL için expireAt field'ı
		await setDoc(doc(db, `rooms/${roomId}/${REACTIONS}/${reactionId}`), {
			targetUid,
			senderUid: uid,
			senderUsername,
			text: trimmed,
			createdAt: serverTimestamp(),
			expireAt: new Date(expireAt)
		});
		return { ok: true, reactionId };
	} catch (err) {
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
