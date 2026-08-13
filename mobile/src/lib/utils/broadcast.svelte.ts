/**
 * BroadcastChannel yardımcısı — D-019
 *
 * Aynı tarayıcıdaki sekmeler (aynı kullanıcı oturumu) arası state senkronu.
 * BroadcastChannel API modern tarayıcılarda mevcut (Chrome 54+, Safari 15.4+, FF 38+).
 *
 * SSR sırasında erişilmez (typeof window !== 'undefined' guard).
 *
 * Channel isimleri:
 *   'timer:state' — sayaç durumu değişiklikleri (idle/running/paused + elapsedMs)
 *
 * Mesaj formatı:
 *   { type: 'tick', elapsedMs, status, senderId, timestamp }
 *
 * `senderId` her client için bir sessionStorage'lı UID'dir — kendi mesajını yoksay.
 */

const SESSION_KEY = 'timer_session_id';
const CHANNEL_NAME = 'timer:state';
const SSR_FALLBACK = 'ssr';

const SESSION_ID: string =
	typeof window === 'undefined' || typeof sessionStorage === 'undefined'
		? SSR_FALLBACK
		: sessionStorage.getItem(SESSION_KEY) ??
			(() => {
				const fresh = crypto.randomUUID();
				sessionStorage.setItem(SESSION_KEY, fresh);
				return fresh;
			})();

export const sessionId = SESSION_ID;

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type TimerBroadcastMessage = {
	type: 'tick';
	elapsedMs: number;
	status: TimerStatus;
	senderId: string;
	timestamp: number;
};

export type TimerBroadcastListener = (msg: TimerBroadcastMessage) => void;

/**
 * Singleton-kanal + dinleyici kümesi. Bileşenler subscribe/unsubscribe eder.
 * Bileşen kendi mesajını `senderId === sessionId` kontrolü ile yoksaymalı.
 */
class BroadcastManager {
	private channel: BroadcastChannel | null = null;
	private listeners = new Set<TimerBroadcastListener>();

	private ensure(): BroadcastChannel | null {
		if (typeof window === 'undefined') return null;
		if (this.channel) return this.channel;
		if (typeof BroadcastChannel === 'undefined') return null;
		this.channel = new BroadcastChannel(CHANNEL_NAME);
		this.channel.addEventListener('message', (event) => {
			const data = event.data as TimerBroadcastMessage;
			if (!data || typeof data !== 'object') return;
			if (data.senderId === sessionId) return; // kendi mesajımız — yoksay
			this.listeners.forEach((l) => l(data));
		});
		return this.channel;
	}

	send(msg: Omit<TimerBroadcastMessage, 'senderId' | 'timestamp'>) {
		const ch = this.ensure();
		if (!ch) return;
		const payload: TimerBroadcastMessage = {
			...msg,
			senderId: sessionId,
			timestamp: Date.now()
		};
		ch.postMessage(payload);
	}

	subscribe(listener: TimerBroadcastListener): () => void {
		this.ensure();
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
}

export const timerBroadcast = new BroadcastManager();
