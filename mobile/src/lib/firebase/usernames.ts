/**
 * Username unique claim — D-016
 *
 * usernameler `usernames/{username}` doc'ları olarak claim edilir.
 * Tek bir Firestore transaction içinde: doc yoksa oluştur, varsa reddet.
 * Böylece iki cihaz aynı anda aynı ismi almaya çalışsa bile yalnız biri
 * kazanır (atomic check-then-create).
 *
 * Başarılı claim sonrası kullanıcı profili de `users/{uid}`'e yazılır.
 */

import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';

export type ClaimResult =
	| { ok: true; uid: string }
	| { ok: false; reason: 'taken' | 'invalid' | 'unavailable' };

/** Sunucu tarafı format kontrolü — client-side ile aynı kurallar. */
export function validateUsername(value: string): string | null {
	const trimmed = value.trim();
	if (trimmed.length < 2) return 'En az 2 karakter olmalı';
	if (trimmed.length > 20) return 'En fazla 20 karakter olabilir';
	if (!/^[a-zA-Z0-9_ğüşöçıİĞÜŞÖÇ]+$/.test(trimmed))
		return 'Sadece harf, rakam ve alt çizgi kullanabilirsin';
	return null;
}

const USERNAME_DOC = (u: string) => `usernames/${u.toLowerCase()}`;
const USER_DOC = (uid: string) => `users/${uid}`;

/** Kullanıcı adını atomik olarak claim et. */
export async function claimUsername(raw: string): Promise<ClaimResult> {
	const validation = validateUsername(raw);
	if (validation) return { ok: false, reason: 'invalid' };

	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };

	const uid = getDeviceUid();
	const username = raw.trim();
	const handle = USERNAME_DOC(username);
	const userHandle = USER_DOC(uid);

	try {
		await runTransaction(db, async (tx) => {
			const existing = await tx.get(doc(db, handle));
			if (existing.exists()) {
				throw new Error('taken');
			}
			tx.set(doc(db, handle), {
				uid,
				claimedAt: serverTimestamp()
			});
			tx.set(
				doc(db, userHandle),
				{
					username,
					createdAt: serverTimestamp(),
					lastActiveAt: serverTimestamp()
				},
				{ merge: true }
			);
		});
		return { ok: true, uid };
	} catch (err) {
		if (err instanceof Error && err.message === 'taken') {
			return { ok: false, reason: 'taken' };
		}
		console.error('[usernames] claim failed', err);
		return { ok: false, reason: 'unavailable' };
	}
}

/** Username → uid (presence/rooms lookup'ları için). */
export async function resolveUsername(raw: string): Promise<string | null> {
	const db = getDb();
	if (!db) return null;
	const snap = await getDoc(doc(db, USERNAME_DOC(raw.trim())));
	if (!snap.exists()) return null;
	const data = snap.data() as { uid?: string };
	return data.uid ?? null;
}

/** Kullanıcının son aktifliğini güncelle (presence için yardımcı). */
export async function touchUser(uid: string): Promise<void> {
	const db = getDb();
	if (!db) return;
	await setDoc(
		doc(db, USER_DOC(uid)),
		{ lastActiveAt: serverTimestamp() },
		{ merge: true }
	);
}
