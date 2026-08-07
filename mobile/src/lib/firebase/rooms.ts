/**
 * Rooms — Firestore katmanı.
 *
 * Şema:
 *   rooms/{roomId}
 *     - name: string
 *     - ownerUid: string
 *     - inviteCode: string (6 char base36, üst küçük harf + rakam)
 *     - createdAt: timestamp
 *
 *   users/{uid}/joinedRooms/{roomId}
 *     - joinedAt: timestamp
 *     - lastOpenedAt: timestamp
 *
 * Üye listesi oda doc'unda tutulmuyor — `users/{uid}/joinedRooms` üzerinden
 * türetiliyor. Bu sayede "kaç kişi var" sorusu için count query yeterli,
 * üye listesi için reverse lookup (kim bu odaya katılmış) içinse kullanıcı
 * adına ihtiyaç olursa usernames koleksiyonundan join yapılır.
 *
 * Şimdilik MVP için basit tutuldu: odadaki "presence" (kim şu an online/çalışıyor)
 * ayrı bir subcollection'da — bkz. presence.ts.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	query,
	runTransaction,
	serverTimestamp,
	setDoc,
	where
} from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';

const ROOMS = 'rooms';
const JOINED = 'joinedRooms';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışıklık yapan karakterler çıkarıldı (I,O,0,1)
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
	createdAt: number; // unix ms (serverTimestamp client tarafında doldurulmaz; null ise fallback Date.now())
	memberCount: number;
	joinedAt?: number; // kullanıcının bu odaya katıldığı zaman
};

/** Oda oluştur, otomatik üye ol, last-opened'ı şimdiye çek. */
export async function createRoom(name: string): Promise<RoomMeta | null> {
	const trimmed = name.trim();
	if (trimmed.length < 1 || trimmed.length > 40) return null;
	const db = getDb();
	if (!db) return null;
	const uid = getDeviceUid();
	const id = crypto.randomUUID();
	const inviteCode = generateInviteCode();
	const createdAt = Date.now();

	await runTransaction(db, async (tx) => {
		tx.set(doc(db, `${ROOMS}/${id}`), {
			name: trimmed,
			ownerUid: uid,
			inviteCode,
			createdAt: serverTimestamp()
		});
		tx.set(doc(db, `users/${uid}/${JOINED}/${id}`), {
			joinedAt: serverTimestamp(),
			lastOpenedAt: serverTimestamp()
		});
	});

	return {
		id,
		name: trimmed,
		ownerUid: uid,
		inviteCode,
		createdAt,
		memberCount: 1
	};
}

/** Davet koduna göre oda bul, katıl. Bulunamazsa null. */
export async function joinRoomByCode(inviteCode: string): Promise<RoomMeta | null> {
	const code = inviteCode.trim().toUpperCase();
	if (code.length !== INVITE_LEN) return null;
	const db = getDb();
	if (!db) return null;
	const uid = getDeviceUid();

	const q = query(collection(db, ROOMS), where('inviteCode', '==', code));
	const snap = await getDocs(q);
	if (snap.empty) return null;
	const roomDoc = snap.docs[0];
	const data = roomDoc.data() as { name: string; ownerUid: string; inviteCode: string };
	const roomId = roomDoc.id;

	// Üye ol
	await setDoc(doc(db, `users/${uid}/${JOINED}/${roomId}`), {
		joinedAt: serverTimestamp(),
		lastOpenedAt: serverTimestamp()
	});

	return {
		id: roomId,
		name: data.name,
		ownerUid: data.ownerUid,
		inviteCode: data.inviteCode,
		createdAt: Date.now(),
		memberCount: 1 // gerçek count aşağıda sayılır
	};
}

/** Kullanıcının katıldığı odalar — last-opened desc. */
export function subscribeMyRooms(
	cb: (rooms: RoomMeta[]) => void
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
				};
				const meta = d.data() as { joinedAt?: { toMillis?: () => number }; lastOpenedAt?: { toMillis?: () => number } };
				items.push({
					id: d.id,
					name: data.name,
					ownerUid: data.ownerUid,
					inviteCode: data.inviteCode,
					createdAt: Date.now(),
					memberCount: 0,
					joinedAt: meta.joinedAt?.toMillis?.() ?? Date.now()
				});
			}
			// lastOpenedAt desc
			items.sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
			cb(items);
		},
		(err) => {
			console.error('[rooms] subscribe error', err);
			cb([]);
		}
	);
}

/** Tek bir odayı getir. */
export async function getRoom(roomId: string): Promise<RoomMeta | null> {
	const db = getDb();
	if (!db) return null;
	const snap = await getDoc(doc(db, `${ROOMS}/${roomId}`));
	if (!snap.exists()) return null;
	const data = snap.data() as { name: string; ownerUid: string; inviteCode: string };
	return {
		id: roomId,
		name: data.name,
		ownerUid: data.ownerUid,
		inviteCode: data.inviteCode,
		createdAt: Date.now(),
		memberCount: 0
	};
}

/** Odanın son açılma zamanını güncelle (D-014 hero için). */
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

/** Kullanıcının last-opened (D-014 hero) oda id'si. */
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
