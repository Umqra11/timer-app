import type { LeaderboardEntry } from '$lib/firebase/rooms';

/**
 * Bir leaderboard entry'sinin o anki "haftalık canlı" toplam süresini hesapla.
 *
 * - running: weeklySeconds + elapsedMs/1000 + (now - lastSeen)/1000 → tick eder
 * - paused/finished/finished-late/idle/stale: weeklySeconds + elapsedMs/1000 → sabit
 *
 * lastSeen = presence.updatedAt (ms). elapsedMs = o anki session birikimi.
 * (now - lastSeen) son state değişiminden beri geçen süre; 'running' ise
 * bu süre de tick'lenecek demektir (timer.svelte.ts her state değişiminde
 * writePresence çağırır, yoksa ~2sn sonra stale olur — yani tick ufuk en
 * fazla ~1-2 sn olur, gerçek live hissi için yeterli).
 *
 * weeklySeconds: subscribeUserWeeklySeconds(uid)'ten gelen son 7 gün toplamı.
 */
export function liveSeconds(entry: LeaderboardEntry, now: number): number {
	const base = entry.weeklySeconds + entry.elapsedMs / 1000;
	if (entry.effective === 'running') {
		const extra = Math.max(0, (now - entry.lastSeen) / 1000);
		return base + extra;
	}
	return base;
}
