/**
 * Settle Queue — Offline yazım kuyruğu (M3).
 *
 * `pushToRemote()` server-side callable başarısız olduğunda (network,
 * rules, unavailable) yazımı localStorage-backed FIFO kuyruğuna ekler.
 * `installSettleFlush` ile online + visibilitychange listener'ları kurulur;
 * online olunca veya sekme görünür olunca kuyruk sırayla boşaltılır.
 *
 * Neden: Cloud Function rate-limit (5/dk) veya Firestore `unavailable`
 * durumunda kayıp süre/presence olmaması için. M3 ile beraber D-019
 * invariant korunur — kapanış offline iken de kuyruktaki son 'finished'
 * reconnect'te yazılır.
 */

const KEY = 'kronometre.pendingWrites';
const MAX_PENDING = 50;

export type PresenceStatusLite = 'idle' | 'running' | 'paused' | 'finished';

export type PendingWrite = {
	id: string;
	ts: number;
	roomId: string;
	status: PresenceStatusLite;
	elapsedMs: number;
	uid: string;
};

function readQueue(): PendingWrite[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed as PendingWrite[];
	} catch {
		return [];
	}
}

function writeQueue(q: PendingWrite[]): void {
	if (typeof window === 'undefined') return;
	try {
		// FIFO evicts oldest — en yeni kuyrukta tutulur. 50 cap.
		const trimmed = q.length > MAX_PENDING ? q.slice(q.length - MAX_PENDING) : q;
		localStorage.setItem(KEY, JSON.stringify(trimmed));
	} catch (e) {
		console.error('[settle-queue] failed to persist', e);
	}
}

export function enqueuePending(write: Omit<PendingWrite, 'id' | 'ts'>): void {
	const q = readQueue();
	q.push({
		...write,
		id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `pw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		ts: Date.now()
	});
	writeQueue(q);
}

export function peekPending(): readonly PendingWrite[] {
	return readQueue();
}

export function dequeuePending(id: string): void {
	const q = readQueue().filter((w) => w.id !== id);
	writeQueue(q);
}

export function clearPending(): void {
	writeQueue([]);
}

let installed = false;

/**
 * Listener'ları kur + online/visibility tetiklendiğinde `writer` ile kuyruğu
 * sırayla boşalt. Writer başarılı olursa entry'i kuyruktan çıkarır, değilse
 * bir sonraki online olayına kadar bekletir.
 *
 * İdempotent: birden fazla çağrı yalnızca bir listener seti kurar (cross-tab
 * race window'u için kabul edilebilir).
 */
export async function installSettleFlush(
	writer: (w: PendingWrite) => Promise<boolean>
): Promise<() => void> {
	if (typeof window === 'undefined') return () => {};
	if (installed) return () => {};
	installed = true;

	async function flush() {
		const q = readQueue();
		if (q.length === 0) return;
		for (const write of q) {
			try {
				const ok = await writer(write);
				if (ok) dequeuePending(write.id);
			} catch (e) {
				console.warn('[settle-queue] writer threw, will retry', e);
			}
		}
	}

	const onOnline = () => {
		void flush();
	};
	const onVisibility = () => {
		if (document.visibilityState === 'visible') void flush();
	};

	window.addEventListener('online', onOnline);
	document.addEventListener('visibilitychange', onVisibility);

	// İlk kurulumda da bir kere flush et — sayfa yenilenmesinden kalan varsa yaz.
	void flush();

	return () => {
		installed = false;
		window.removeEventListener('online', onOnline);
		document.removeEventListener('visibilitychange', onVisibility);
	};
}
