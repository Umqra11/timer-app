/**
 * Stats — D-018 (streak + haftalık özet).
 *
 * `users/{uid}` doc'unda tutulan alanlar:
 *   - streak: number            — ardışık gün sayısı
 *   - lastDayWorked: string     — "YYYY-MM-DD" (takvim günü, Europe/Istanbul)
 *   - totalSeconds: number      — tüm zamanlar toplamı
 *   - weekSeconds: number       — DEPRECATED: artık sessions subcollection'dan hesaplanır (subscribeUserWeeklySeconds)
 *                                  MVP uyumluluğu için alan kaldı, artık güncellenmiyor.
 *
 * Streak mantığı (günde bir kez `touchStreak(addedSeconds)` çağrılır):
 *   - lastDayWorked yoksa: streak=1, lastDayWorked=today
 *   - lastDayWorked == today: streak değişmez, totalSeconds += added
 *   - lastDayWorked == yesterday: streak += 1, lastDayWorked = today
 *   - lastDayWorked < yesterday: streak = 1, lastDayWorked = today
 *
 * Zaman dilimi: Europe/Istanbul (Türkiye pazarı, D-002). Intl.DateTimeFormat ile
 * client tarafında "YYYY-MM-DD" üretilir — sunucu tarafında timezone yok.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';

export type Stats = {
	streak: number;
	lastDayWorked: string | null; // "YYYY-MM-DD"
	totalSeconds: number;
	weekSeconds: number; // deprecated; rolling 7-day total comes from sessions subcollection
};

const TZ = 'Europe/Istanbul';

function dayKey(date: Date): string {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	// en-CA → "YYYY-MM-DD"
	return fmt.format(date);
}

function todayKey(): string {
	return dayKey(new Date());
}

export const todayKeyForSession = todayKey;

function yesterdayKey(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return dayKey(d);
}

type StatsRaw = {
	streak?: number;
	lastDayWorked?: string;
	totalSeconds?: number;
	weekSeconds?: number;
};

function emptyStats(): Stats {
	return { streak: 0, lastDayWorked: null, totalSeconds: 0, weekSeconds: 0 };
}

/** Mevcut stats'ı oku (yoksa default döner). */
export async function readStats(): Promise<Stats> {
	const db = getDb();
	if (!db) return emptyStats();
	const uid = getDeviceUid();
	const snap = await getDoc(doc(db, 'users', uid));
	if (!snap.exists()) return emptyStats();
	const data = snap.data() as StatsRaw;
	return {
		streak: data.streak ?? 0,
		lastDayWorked: data.lastDayWorked ?? null,
		totalSeconds: data.totalSeconds ?? 0,
		weekSeconds: data.weekSeconds ?? 0
	};
}

/**
 * Bir seans tamamlandığında stats'ı güncelle.
 * `addedSeconds` — bu seansta biriken süre (saniye, yuvarlanmış).
 */
export async function touchStreak(addedSeconds: number): Promise<Stats> {
	const db = getDb();
	if (!db) return emptyStats();
	const uid = getDeviceUid();
	const today = todayKey();
	const yesterday = yesterdayKey();

	const snap = await getDoc(doc(db, 'users', uid));
	const current: StatsRaw = snap.exists() ? (snap.data() as StatsRaw) : {};

	const last = current.lastDayWorked ?? null;
	let streak: number;
	if (last === today) {
		streak = current.streak ?? 0;
	} else if (last === yesterday) {
		streak = (current.streak ?? 0) + 1;
	} else {
		streak = 1;
	}

	const next: Stats = {
		streak,
		lastDayWorked: today,
		totalSeconds: (current.totalSeconds ?? 0) + addedSeconds,
		weekSeconds: current.weekSeconds ?? 0
	};

	await setDoc(
		doc(db, 'users', uid),
		{
			streak: next.streak,
			lastDayWorked: next.lastDayWorked,
			totalSeconds: next.totalSeconds,
			lastActiveAt: serverTimestamp()
		},
		{ merge: true }
	);
	return next;
}
