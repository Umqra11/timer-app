/**
 * Scheduled cleanup — Sprint-06 Faz 3 P1.
 *
 * `rooms/{roomId}/presence/{uid}` doc'larında `updatedAt > 24h` olan ve
 * hâlâ `running` veya `paused` durumda olan presence'ları `idle` yapar.
 *
 * Neden: client timer.svelte.ts artık 60s heartbeat ile push yapıyor (P2),
 * ama sekme kapandığında veya offline'a geçildiğinde push durur. 24 saat
 * boyunca push gelmediyse kullanıcı artık aktif değil → presence listesi
 * temizlenmeli. Yoksa leaderboard'da "running" olarak görünen offline
 * kullanıcılar yanıltıcı olur.
 *
 * Schedule: every 6 hours UTC. False positive risk: 24h threshold + 6h
 * schedule → 24-30h pencere, gerçek aktif kullanıcının yanlışlıkla idle
 * yapılması için 6h buffer var.
 *
 * Cost: collectionGroup query ~4 scan/gün. MVP doc count için negligible.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 saat
const BATCH_SIZE = 500; // Firestore batch limit

export const cleanupPresence = onSchedule(
  {
    schedule: 'every 6 hours',
    timeZone: 'UTC',
    region: 'us-central1'
  },
  async (_event) => {
    const cutoff = Date.now() - STALE_THRESHOLD_MS;
    const staleQuery = db
      .collectionGroup('presence')
      .where('updatedAt', '<', new Date(cutoff))
      .where('status', 'in', ['running', 'paused']);

    let totalCleaned = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    do {
      const q = lastDoc
        ? staleQuery.startAfter(lastDoc).limit(BATCH_SIZE)
        : staleQuery.limit(BATCH_SIZE);
      const snap = await q.get();
      if (snap.empty) break;

      const batch = db.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, {
          status: 'idle',
          updatedAt: FieldValue.serverTimestamp()
        });
        totalCleaned++;
      }
      await batch.commit();
      lastDoc = snap.docs[snap.docs.length - 1];
      logger.info('cleanupPresence.batch', { batchSize: snap.size, totalCleaned });
    } while (lastDoc);

    logger.info('cleanupPresence.done', { totalCleaned });
  }
);
