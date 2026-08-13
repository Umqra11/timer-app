/**
 * Pure helper — room ownership check (D-060 setup).
 * Sprint-06 Faz 4 F1: defensive sertleştirme. UI render guard'ı için.
 *
 * NOT a security boundary — Firestore rules + callable Cloud Function
 * (D-081 onDeleteRoom) güvenliği sağlar. Bu helper sadece UI button
 * render'ı için: yanlış uid gelirse buton görünmesin.
 */

/**
 * @param roomOwnerUid — rooms/{roomId}.ownerUid (string veya undefined)
 * @param callerUid — local device-uid (string veya null, offline ise null olabilir)
 * @returns true if caller is room owner
 */
export function isRoomOwner(
	roomOwnerUid: string | undefined | null,
	callerUid: string | null
): boolean {
	if (!roomOwnerUid || !callerUid) return false;
	return roomOwnerUid === callerUid;
}
