import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const RATE_PER_MINUTE = 5;
const RATE_PER_HOUR = 30;

async function assertRateLimit(uid: string): Promise<void> {
  const rateRef = db.doc(`users/${uid}/rateLimit/presence`);
  const rate = await rateRef.get();
  const now = Date.now();
  const data = rate.data() ?? {
    minuteCount: 0,
    minuteResetAt: now + 60_000,
    hourCount: 0,
    hourResetAt: now + 3_600_000
  };
  const minuteReset = now >= (data.minuteResetAt ?? 0) ? now + 60_000 : data.minuteResetAt;
  const hourReset = now >= (data.hourResetAt ?? 0) ? now + 3_600_000 : data.hourResetAt;
  const minuteCount = now >= (data.minuteResetAt ?? 0) ? 0 : (data.minuteCount ?? 0);
  const hourCount = now >= (data.hourResetAt ?? 0) ? 0 : (data.hourCount ?? 0);
  if (minuteCount >= RATE_PER_MINUTE || hourCount >= RATE_PER_HOUR) {
    throw new HttpsError('resource-exhausted', 'rate limit');
  }
  await rateRef.set({
    minuteCount: minuteCount + 1,
    minuteResetAt: minuteReset,
    hourCount: hourCount + 1,
    hourResetAt: hourReset
  });
}

export const onPresenceChange = onCall(async (request) => {
  const { roomId, status, elapsedMs } = request.data as {
    roomId: string;
    status: 'running' | 'paused' | 'finished' | 'idle';
    elapsedMs: number;
  };
  // MVP auth-free: use request.data.uid (device-uid passed from client)
  console.info('[presence] invoke', { roomId, status: status as string, elapsedMs });
  const uid = (request.data as { uid?: string }).uid;
  if (!uid) throw new HttpsError('unauthenticated', 'uid required');
  if (!roomId) throw new HttpsError('invalid-argument', 'roomId required');
  if (!status) throw new HttpsError('invalid-argument', 'status required');

  await assertRateLimit(uid);

  // M2 fix — mergeStats MAX monotonic. Client elapsedMs snapshot'ları
  // nadiren geriye gidebilir (cross-device, multi-tab race, stale cache).
  // Server-side Math.max ile aggregate her zaman monoton ilerler. D-019 invariant.
  const presenceRef = db.doc(`rooms/${roomId}/presence/${uid}`);
  const prevSnap = await presenceRef.get();
  const prevElapsedMs = prevSnap.exists
    ? Number((prevSnap.data() as { elapsedMs?: number } | undefined)?.elapsedMs ?? 0)
    : 0;
  const safeElapsedMs = Math.max(prevElapsedMs, elapsedMs);

  await presenceRef.set({
    uid,
    status,
    elapsedMs: safeElapsedMs,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ok: true as const };
});
