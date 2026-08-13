/**
 * Server-side owner-only room delete — Sprint-06 Faz 4 F3 (D-049).
 *
 * Callable Cloud Function. Sahiplik kontrolü server-side yapılır, admin SDK
 * ile `rooms/{roomId}` doc'u + `presence/{uid}` + `reactions/{reactionId}`
 * subcollection'ları temizlenir. Client `firestore.rules` `delete: if false`
 * olduğu için artık doğrudan `deleteDoc` çağıramaz.
 *
 * Neden callable (onDocumentDeleted trigger değil):
 * - Sahiplik kontrolü delete'ten ÖNCE yapılmalı (trigger zaten silinmiş doc'u görür)
 * - Custom logic: subcollection cleanup + joinedRooms orphan (D-062 kısayolu)
 * - Mevcut `presence.ts` callable pattern'i ile uyumlu
 *
 * joinedRooms cross-user cleanup: D-062 "orphan zararsız" kısayolu — Sprint-07'de
 * tam `collectionGroup('joinedRooms')` purge değerlendirilebilir.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const BATCH_SIZE = 400; // Firestore batch limit (500'ten güvenli marjla)

/**
 * Pure helper — unit test edilebilir (HttpsError logic).
 * Server-side'da admin SDK zaten rules'ı bypass eder; bu fonksiyon ikinci
 * savunma katmanı — yanlışlıkla açık bir deploy'da bile sahiplik check'i yapılır.
 */
export function assertCanDelete(
	roomData: FirebaseFirestore.DocumentData | undefined,
	callerUid: string
): void {
	const ownerUid = roomData?.ownerUid;
	if (!ownerUid || !callerUid || ownerUid !== callerUid) {
		throw new HttpsError('permission-denied', 'only owner can delete');
	}
}

/**
 * Subcollection'ı batched pagination ile siler. Firestore batch limit'i
 * (500) aşmamak için 400'lük chunk'larla ilerler, `startAfter` ile cursor takip eder.
 */
async function deleteCollection(
	collRef: FirebaseFirestore.CollectionReference
): Promise<number> {
	let total = 0;
	let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
	do {
		const q = lastDoc
			? collRef.limit(BATCH_SIZE).startAfter(lastDoc)
			: collRef.limit(BATCH_SIZE);
		const snap = await q.get();
		if (snap.empty) break;
		const batch = db.batch();
		for (const d of snap.docs) {
			batch.delete(d.ref);
			total++;
		}
		await batch.commit();
		lastDoc = snap.docs[snap.docs.length - 1];
	} while (lastDoc);
	return total;
}

export const onDeleteRoom = onCall(
	{ region: 'us-central1' },
	async (request) => {
		const { roomId, uid } = request.data as { roomId: string; uid: string };
		if (!roomId) throw new HttpsError('invalid-argument', 'roomId required');
		if (!uid) throw new HttpsError('unauthenticated', 'uid required');

		const roomRef = db.doc(`rooms/${roomId}`);
		const roomSnap = await roomRef.get();
		if (!roomSnap.exists) throw new HttpsError('not-found', 'room not found');

		assertCanDelete(roomSnap.data(), uid);

		// Subcollection cleanup — admin SDK rules'ı bypass eder.
		const presenceDeleted = await deleteCollection(
			db.collection(`rooms/${roomId}/presence`)
		);
		const reactionsDeleted = await deleteCollection(
			db.collection(`rooms/${roomId}/reactions`)
		);

		await roomRef.delete();
		console.info(
			`[onDeleteRoom] room=${roomId} owner=${uid} presence=${presenceDeleted} reactions=${reactionsDeleted}`
		);
		return { ok: true as const };
	}
);
