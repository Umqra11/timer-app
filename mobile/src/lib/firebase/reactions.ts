/**
 * Reactions — D-052, D-053, D-054
 *
 * M4 sonrası: client `sendReaction` artık server-side callable `sendReaction`
 * çağırır. Rate-limit artık atomic tx (cloud function `runTransaction`)
 * tarafından enforce edilir — cross-tab / cross-device race'lerde bile bypass
 * edilemez. Bkz. functions/src/sendReaction.ts.
 *
 * Şema:
 *   rooms/{roomId}/reactions/{reactionId}
 *     - targetUid, senderUid, senderUsername, text (max 60)
 *     - createdAt (serverTimestamp), expireAt (now + 4 saat, TTL policy siler)
 */

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDb, httpsCallable, getFns } from './client';
import { getDeviceUid } from './uid';

const REACTIONS = 'reactions';

/** Server-side limitlerle senkronize — sabitler functions/src/sendReaction.ts. */
export const REACTION_MAX_LEN = 60;
export const RATE_PER_MINUTE = 5;
export const RATE_PER_HOUR = 30;
export const REACTION_TTL_MS = 4 * 60 * 60 * 1000;

export type ReactionDoc = {
	id: string;
	targetUid: string;
	senderUid: string;
	senderUsername: string;
	text: string;
	createdAt: number;
	expireAt: number;
};

export type ReactionResult =
	| { ok: true; reactionId: string }
	| {
			ok: false;
			reason:
				| 'empty'
				| 'too-long'
				| 'rate-limit'
				| 'no-target'
				| 'self-target'
				| 'unavailable';
	  };

/**
 * Tepki gönder — M4. Server-side callable atomic tx ile rate-limit + insert.
 * Client-side rate limit kaldırıldı (önceki read-modify-write race'i vardı).
 */
export async function sendReaction(
	roomId: string,
	targetUid: string,
	text: string,
	senderUsername: string
): Promise<ReactionResult> {
	if (!targetUid) return { ok: false, reason: 'no-target' };

	const trimmed = text.trim();
	if (trimmed.length === 0) return { ok: false, reason: 'empty' };
	if (trimmed.length > REACTION_MAX_LEN) return { ok: false, reason: 'too-long' };

	const senderUid = getDeviceUid();
	if (targetUid === senderUid) return { ok: false, reason: 'self-target' };

	try {
		const fn = httpsCallable(getFns(), 'sendReaction');
		const result = await fn({
			roomId,
			targetUid,
			text: trimmed,
			senderUid,
			senderUsername
		});
		const data = result.data as { ok: boolean; reactionId?: string; reason?: string };
		if (data.ok && data.reactionId) return { ok: true, reactionId: data.reactionId };
		return { ok: false, reason: (data.reason as ReactionResult extends { ok: false } ? ReactionResult['reason'] : never) ?? 'unavailable' };
	} catch (err) {
		console.error('[reactions] callable failed', err);
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
			items.sort((a, b) => b.createdAt - a.createdAt);
			cb(items);
		},
		(err) => {
			console.error('[reactions] subscribe error', err);
			cb([]);
		}
	);
}
