import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Transaction } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const REACTION_MAX_LEN = 60;
const RATE_PER_MINUTE = 5;
const RATE_PER_HOUR = 30;
const REACTION_TTL_MS = 4 * 60 * 60 * 1000;

type ReactionOk = { ok: true; reactionId: string };
type ReactionErr = {
	ok: false;
	reason: 'empty' | 'too-long' | 'self-target' | 'rate-limit' | 'no-target' | 'unavailable';
};
type ReactionResult = ReactionOk | ReactionErr;

/**
 * M4 — Bug C reaction race fix. Client `sendReaction` artık read-modify-write
 * değil; bu server-side `runTransaction` ile rate-limit + reaction doc'u tek
 * atomic tx'te yazar. Çift-click veya cross-tab iki eşzamanlı istek artık
 * rate-limit'i bypass edemez.
 *
 * Limit: 5/dk, 30/saat (D-053). expireAt = now + 4 saat (TTL policy siler).
 */
export const sendReaction = onCall(async (request): Promise<ReactionResult> => {
	const { roomId, targetUid, text, senderUsername } = request.data as {
		roomId: string;
		targetUid: string;
		text: string;
		senderUid: string;
		senderUsername: string;
	};

	// MVP auth-free: client device-uid'i auth.uid olarak değil, payload'da geçer.
	const senderUid = (request.data as { senderUid?: string }).senderUid;
	if (!roomId || !targetUid || !senderUid) {
		throw new HttpsError('invalid-argument', 'roomId/targetUid/senderUid required');
	}

	const trimmed = (text ?? '').toString().trim();
	if (trimmed.length === 0) return { ok: false, reason: 'empty' };
	if (trimmed.length > REACTION_MAX_LEN) return { ok: false, reason: 'too-long' };
	if (targetUid === senderUid) return { ok: false, reason: 'self-target' };

	const reactionId = crypto.randomUUID();
	const now = Date.now();

	try {
		const result = await db.runTransaction(async (tx: Transaction): Promise<ReactionResult> => {
			const rlRef = db.doc(`users/${senderUid}/rateLimit/reactions`);
			const rlSnap = await tx.get(rlRef);
			const data = rlSnap.exists
				? (rlSnap.data() as {
						minuteCount?: number;
						minuteResetAt?: number;
						hourCount?: number;
						hourResetAt?: number;
				  })
				: {};

			const minuteExpired = now >= (data.minuteResetAt ?? 0);
			const hourExpired = now >= (data.hourResetAt ?? 0);
			const minuteCount = minuteExpired ? 0 : (data.minuteCount ?? 0);
			const hourCount = hourExpired ? 0 : (data.hourCount ?? 0);

			if (minuteCount >= RATE_PER_MINUTE) return { ok: false, reason: 'rate-limit' };
			if (hourCount >= RATE_PER_HOUR) return { ok: false, reason: 'rate-limit' };

			const minuteResetAt = minuteExpired ? now + 60_000 : data.minuteResetAt ?? now + 60_000;
			const hourResetAt = hourExpired ? now + 3_600_000 : data.hourResetAt ?? now + 3_600_000;

			tx.set(rlRef, {
				minuteCount: minuteCount + 1,
				minuteResetAt,
				hourCount: hourCount + 1,
				hourResetAt
			});

			const reactionRef = db.doc(`rooms/${roomId}/reactions/${reactionId}`);
			tx.set(reactionRef, {
				targetUid,
				senderUid,
				senderUsername,
				text: trimmed,
				createdAt: FieldValue.serverTimestamp(),
				expireAt: new Date(now + REACTION_TTL_MS)
			});

			return { ok: true as const, reactionId };
		});

		return result;
	} catch (err) {
		console.error('[sendReaction] tx failed', err);
		return { ok: false, reason: 'unavailable' };
	}
});
