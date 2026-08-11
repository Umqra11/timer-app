/**
 * Rooms — Firestore katmanı.
 *
 * Şema:
 *   rooms/{roomId}
 *     - name: string
 *     - ownerUid: string
 *     - inviteCode: string (6 char base32 — I,O,0,1 çıkarıldı, karışıklık önleme)
 *     - createdAt: timestamp
 *     - memberCount: number    (D-048 — denormalize sayaç, atomik increment)
 *
 *   users/{uid}/joinedRooms/{roomId}
 *     - joinedAt: timestamp
 *     - lastOpenedAt: timestamp
 *
 *   rooms/{roomId}/presence/{uid}     — D-019 cross-device timer senkronu
 *   rooms/{roomId}/reactions/{rid}    — D-052 kısa tepkiler (Sprint-03 Faz 3)
 *
 * Üye listesi `users/{uid}/joinedRooms` üzerinden türetilir; `memberCount`
 * sayaç doc'u O(1) read sağlar.
 */

import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	query,
	runTransaction,
	serverTimestamp,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';
import { subscribeUserWeeklySeconds } from './sessions';

const ROOMS = 'rooms';
const JOINED = 'joinedRooms';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_LEN = 6;

function generateInviteCode(): string {
	let out = '';
	const buf = new Uint32Array(INVITE_LEN);
	crypto.getRandomValues(buf);
	for (let i = 0; i < INVITE_LEN; i++) {
		out += ALPHABET[buf[i] % ALPHABET.length];
	}
	return out;
}

export type RoomMeta = {
	id: string;
	name: string;
	ownerUid: string;
	inviteCode: string;
	createdAt: number;
	memberCount: number;
	joinedAt?: number;
};

/** I1 + I2: discriminated union return types — TS narrowing sesli. */
export type CreateRoomResult =
	| { ok: true; room: RoomMeta }
	| { ok: false; reason: 'already-in-room' | 'invalid' | 'unavailable' | 'error' };

export type JoinRoomResult =
	| { ok: true; room: RoomMeta }
	| { ok: false; reason: 'already-in-room' | 'invalid' | 'not-found' | 'unavailable' | 'error' };

/** Oda oluştur, otomatik üye ol, last-opened'ı şimdiye çek. */
export async function createRoom(name: string): Promise<CreateRoomResult> {
	const trimmed = name.trim();
	if (trimmed.length < 1 || trimmed.length > 40) return { ok: false, reason: 'invalid' };
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	const uid = getDeviceUid();
	const id = crypto.randomUUID();
	const inviteCode = generateInviteCode();
	const createdAt = Date.now();

	try {
		await runTransaction(db, async (tx) => {
			tx.set(doc(db, `${ROOMS}/${id}`), {
				name: trimmed,
				ownerUid: uid,
				inviteCode,
				memberCount: 1,
				createdAt: serverTimestamp()
			});
			tx.set(doc(db, `users/${uid}/${JOINED}/${id}`), {
				joinedAt: serverTimestamp(),
				lastOpenedAt: serverTimestamp()
			});
		});
	} catch (err) {
		console.error('[rooms] createRoom failed', err);
		return { ok: false, reason: 'error' };
	}

	return {
		ok: true,
		room: {
			id,
			name: trimmed,
			ownerUid: uid,
			inviteCode,
			createdAt,
			memberCount: 1
		}
	};
}

/** Davet koduna göre oda bul, katıl. */
export async function joinRoomByCode(inviteCode: string): Promise<JoinRoomResult> {
	const code = inviteCode.trim().toUpperCase();
	if (code.length !== INVITE_LEN) return { ok: false, reason: 'invalid' };
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	const uid = getDeviceUid();

	let q;
	let snap;
	try {
		q = query(collection(db, ROOMS), where('inviteCode', '==', code));
		snap = await getDocs(q);
	} catch (err) {
		console.error('[rooms] joinRoomByCode query failed', err);
		return { ok: false, reason: 'error' };
	}
	if (snap.empty) return { ok: false, reason: 'not-found' };
	const roomDoc = snap.docs[0];
	const data = roomDoc.data() as {
		name: string;
		ownerUid: string;
		inviteCode: string;
		memberCount?: number;
	};
	const roomId = roomDoc.id;

	try {
		await runTransaction(db, async (tx) => {
			const ref = doc(db, `${ROOMS}/${roomId}`);
			const fresh = await tx.get(ref);
			if (!fresh.exists()) throw new Error('room-vanished');
			tx.set(doc(db, `users/${uid}/${JOINED}/${roomId}`), {
				joinedAt: serverTimestamp(),
				lastOpenedAt: serverTimestamp()
			});
			tx.update(ref, { memberCount: (fresh.data()['memberCount'] ?? 0) + 1 });
		});
	} catch (err) {
		console.error('[rooms] joinRoomByCode tx failed', err);
		return { ok: false, reason: 'error' };
	}

	return {
		ok: true,
		room: {
			id: roomId,
			name: data.name,
			ownerUid: data.ownerUid,
			inviteCode: data.inviteCode,
			createdAt: Date.now(),
			memberCount: (data.memberCount ?? 0) + 1
		}
	};
}

export function subscribeMyRooms(
	cb: (rooms: RoomMeta[]) => void,
	onError?: (err: Error) => void
): () => void {
	const db = getDb();
	if (!db) {
		cb([]);
		return () => {};
	}
	const uid = getDeviceUid();
	const q = query(
		collection(db, `users/${uid}/${JOINED}`),
		where('lastOpenedAt', '!=', null)
	);
	return onSnapshot(
		q,
		async (snap) => {
			const items: RoomMeta[] = [];
			for (const d of snap.docs) {
				const roomRef = doc(db, `${ROOMS}/${d.id}`);
				const roomSnap = await getDoc(roomRef);
				if (!roomSnap.exists()) continue;
				const data = roomSnap.data() as {
					name: string;
					ownerUid: string;
					inviteCode: string;
					memberCount?: number;
				};
				const meta = d.data() as { joinedAt?: { toMillis?: () => number }; lastOpenedAt?: { toMillis?: () => number } };
				items.push({
					id: d.id,
					name: data.name,
					ownerUid: data.ownerUid,
					inviteCode: data.inviteCode,
					createdAt: Date.now(),
					memberCount: data.memberCount ?? 0,
					joinedAt: meta.joinedAt?.toMillis?.() ?? Date.now()
				});
			}
			items.sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
			cb(items);
		},
		(err) => {
			console.error('[rooms] subscribe error', err);
			// M5 fix: error callback opsiyonel — UI küçük hata kartı
			// gösterebilir (önceden sessizce empty state'e düşüyordu).
			if (onError) onError(err);
			else cb([]);
		}
	);
}

export async function getRoom(roomId: string): Promise<RoomMeta | null> {
	const db = getDb();
	if (!db) return null;
	const snap = await getDoc(doc(db, `${ROOMS}/${roomId}`));
	if (!snap.exists()) return null;
	const data = snap.data() as { name: string; ownerUid: string; inviteCode: string; memberCount?: number };
	return {
		id: roomId,
		name: data.name,
		ownerUid: data.ownerUid,
		inviteCode: data.inviteCode,
		createdAt: Date.now(),
		memberCount: data.memberCount ?? 0
	};
}

export function subscribeRoom(
	roomId: string,
	cb: (room: RoomMeta | null) => void
): () => void {
	const db = getDb();
	if (!db) {
		cb(null);
		return () => {};
	}
	return onSnapshot(
		doc(db, `${ROOMS}/${roomId}`),
		(snap) => {
			if (!snap.exists()) {
				cb(null);
				return;
			}
			const data = snap.data() as { name: string; ownerUid: string; inviteCode: string; memberCount?: number };
			cb({
				id: roomId,
				name: data.name,
				ownerUid: data.ownerUid,
				inviteCode: data.inviteCode,
				createdAt: Date.now(),
				memberCount: data.memberCount ?? 0
			});
		},
		(err) => {
			console.error('[rooms] subscribeRoom error', err);
			cb(null);
		}
	);
}

export async function touchRoom(roomId: string): Promise<void> {
	const db = getDb();
	if (!db) return;
	const uid = getDeviceUid();
	await setDoc(
		doc(db, `users/${uid}/${JOINED}/${roomId}`),
		{ lastOpenedAt: serverTimestamp() },
		{ merge: true }
	);
}

export async function getLastOpenedRoomId(): Promise<string | null> {
	const db = getDb();
	if (!db) return null;
	const uid = getDeviceUid();
	const q = query(collection(db, `users/${uid}/${JOINED}`));
	const snap = await getDocs(q);
	if (snap.empty) return null;
	let bestId: string | null = null;
	let bestTs = 0;
	for (const d of snap.docs) {
		const data = d.data() as { lastOpenedAt?: { toMillis?: () => number } };
		const ts = data.lastOpenedAt?.toMillis?.() ?? 0;
		if (ts >= bestTs) {
			bestTs = ts;
			bestId = d.id;
		}
	}
	return bestId;
}

export async function deleteRoom(roomId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	const uid = getDeviceUid();

	try {
		const roomRef = doc(db, `${ROOMS}/${roomId}`);
		const snap = await getDoc(roomRef);
		if (!snap.exists()) return { ok: false, reason: 'not-found' };
		const data = snap.data() as { ownerUid: string };
		if (data.ownerUid !== uid) return { ok: false, reason: 'forbidden' };

		// joinedRooms/{roomId} doc'unu da temizle — D-062: rules delete: true.
		// Yoksa sahip kendi joinedRooms doc'unda orphan kalır, /leaderboard
		// myRooms listesinde oda görünür durumda kalır (C2 fix).
		await deleteDoc(roomRef);
		await deleteDoc(doc(db, `users/${uid}/${JOINED}/${roomId}`));
		return { ok: true };
	} catch (err) {
		console.error('[rooms] deleteRoom failed', err);
		return { ok: false, reason: 'error' };
	}
}

/**
 * Üye olan kullanıcı odadan ayrılır — joinedRooms/{roomId} doc'unu siler.
 * rooms/{roomId} doc'una dokunmaz (sahip değilse zaten silemez; sahipse deleteRoom ayrı yol).
 *
 * D-062: üye ayrılabilir, sahip silebilir.
 */
export async function leaveRoom(roomId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	const uid = getDeviceUid();
	try {
		await deleteDoc(doc(db, `users/${uid}/joinedRooms/${roomId}`));
		return { ok: true };
	} catch (err) {
		console.error('[rooms] leaveRoom failed', err);
		return { ok: false, reason: 'error' };
	}
}

/* ---------------------------------------------------------------------------
 * Leaderboard — D-047, D-050, D-051
 * ------------------------------------------------------------------------- */

/** Stale timeout (D-050) — bu kadar eski 'running' kayıtları 'stale' sayılır. */
export const STALE_TIMEOUT_MS = 2 * 60 * 1000; // 2 dk
/** "Bitirdi" timeout (D-051) — 5 dk sonra 'finished' 'boş' gibi gösterilir. */
export const FINISHED_TIMEOUT_MS = 5 * 60 * 1000; // 5 dk

import type { PresenceStatus } from './presence';

export type EffectiveStatus =
	| 'running'
	| 'paused'
	| 'finished'
	| 'stale'
	| 'finished-late'
	| 'idle';

export type LeaderboardEntry = {
	uid: string;
	username: string;
	totalSeconds: number;
	status: PresenceStatus;
	effective: EffectiveStatus;
	elapsedMs: number;
	lastSeen: number;
	weeklySeconds: number; // D-068: son 7 gün session toplamı (subscribeUserWeeklySeconds)
};

/** Client tarafında staleness çözümlemesi (D-050 + D-051). */
function resolveEffective(
	status: PresenceStatus,
	lastSeen: number,
	now: number
): EffectiveStatus {
	const age = now - lastSeen;
	if (status === 'finished' && age > FINISHED_TIMEOUT_MS) return 'finished-late';
	if (status === 'running' && age > STALE_TIMEOUT_MS) return 'stale';
	return status;
}

/**
 * Odanın leaderboard'unu canlı dinle — D-047.
 * - Her presence için `presence.username` (denormalize) + `users/{uid}.totalSeconds` okur
 * - N+1 query ama üye sayısı küçük (kabul edilebilir)
 * - effective status (D-050/D-051) client-side hesaplanır
 * - Sıralama: totalSeconds desc, sonra username asc
 */
export function subscribeRoomMembers(
	roomId: string,
	cb: (entries: LeaderboardEntry[]) => void
): () => void {
	const db = getDb();
	if (!db) {
		cb([]);
		return () => {};
	}
	// weeklySeconds cache: uid → seconds
	const weeklyCache = new Map<string, number>();
	let presenceEntries: (Omit<LeaderboardEntry, 'weeklySeconds'>)[] = [];
	const weeklyUnsubs: (() => void)[] = [];

	function emit() {
		const merged: LeaderboardEntry[] = presenceEntries.map((e) => ({
			...e,
			weeklySeconds: weeklyCache.get(e.uid) ?? 0
		}));
		merged.sort((a, b) => {
			if (b.weeklySeconds !== a.weeklySeconds) return b.weeklySeconds - a.weeklySeconds;
			return a.username.localeCompare(b.username);
		});
		cb(merged);
	}

	const unsubPresence = onSnapshot(
		collection(db, `rooms/${roomId}/presence`),
		async (snap) => {
			const now = Date.now();
			const next: typeof presenceEntries = [];
			for (const d of snap.docs) {
				const data = d.data() as {
					uid: string;
					username?: string;
					status: PresenceStatus;
					elapsedMs: number;
					updatedAt?: { toMillis?: () => number };
				};
				const lastSeen = data.updatedAt?.toMillis?.() ?? now;
				// presence.username denormalize (writePresence'de yazılıyor).
				// Eski kayıtlar için fallback.
				const username = data.username?.trim() || `kullanıcı#${data.uid.slice(0, 4)}`;
				// totalSeconds: users/{uid}.totalSeconds (D-018)
				const userSnap = await getDoc(doc(db, `users/${data.uid}`));
				const totalSeconds = userSnap.exists()
					? (userSnap.data() as { totalSeconds?: number }).totalSeconds ?? 0
					: 0;
				next.push({
					uid: data.uid,
					username,
					totalSeconds,
					status: data.status,
					effective: resolveEffective(data.status, lastSeen, now),
					elapsedMs: data.elapsedMs,
					lastSeen
				});
				// weekly subscribe — yeni uid ise
				if (!weeklyCache.has(data.uid)) {
					weeklyUnsubs.push(
						subscribeUserWeeklySeconds(data.uid, (secs) => {
							weeklyCache.set(data.uid, secs);
							emit();
						})
					);
				}
			}
			presenceEntries = next;
			emit();
		},
		(err) => {
			console.error('[rooms] subscribeRoomMembers error', err);
			cb([]);
		}
	);

	return () => {
		unsubPresence();
		weeklyUnsubs.forEach((u) => u());
		weeklyUnsubs.length = 0;
	};
}
