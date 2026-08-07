/**
 * Timer Store — MVP Kronometre
 * State machine: idle → running → paused → running → ... → idle
 *
 * Svelte 5 runes mode.
 *
 * D-019 — Çoklu sekme/cihaz davranışı:
 *   - Aynı tarayıcıdaki sekmeler → BroadcastChannel (anında, anlık tick dahil).
 *   - Farklı cihazlar → Firestore onSnapshot (state değişimlerinde snapshot).
 *   - 100ms tick Firestore'a yazılmaz (maliyetli); yalnız state transition'larda.
 *
 * D-018 — Streak/totals `users/{uid}` doc'unda birikir, `finish()`'te
 * touchStreak çağrılır.
 */

import { isFirebaseEnabled } from '$lib/firebase/client';
import * as presence from '$lib/firebase/presence';
import * as stats from '$lib/firebase/stats';
import { timerBroadcast } from '$lib/utils/broadcast.svelte';

export type TimerStatus = 'idle' | 'running' | 'paused';

const TICK_MS = 100;

type RoomContext = { roomId: string; username: string } | null;
// setInterval/clearInterval pair'inin dönüş/parametre tipleri browser'da number,
// @types/node ortamlarında NodeJS.Timeout olur. clearInterval her iki tipi de
// kabul eder; burada named type olarak adlandırıyoruz.
export type IntervalHandle = Parameters<typeof clearInterval>[0];

function createTimerStore() {
	let status = $state<TimerStatus>('idle');
	let elapsedMs = $state(0);
	let lastTickAt = $state<number | null>(null);
	let intervalId: IntervalHandle | null = null;
	let roomCtx: RoomContext = null;
	let unsubscribePresence: (() => void) | null = null;

	const displaySeconds = $derived(Math.floor(elapsedMs / 1000));

	function clearTick() {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function pushToRemote() {
		timerBroadcast.send({ type: 'tick', elapsedMs, status });
		if (roomCtx) {
			const presenceStatus: presence.PresenceStatus =
				status === 'running' ? 'running' : status === 'paused' ? 'paused' : 'idle';
			void presence.writePresence(roomCtx.roomId, roomCtx.username, presenceStatus, elapsedMs);
		}
	}

	function startTick() {
		clearTick();
		lastTickAt = performance.now();
		intervalId = setInterval(() => {
			if (lastTickAt === null) return;
			const now = performance.now();
			elapsedMs += now - lastTickAt;
			lastTickAt = now;
			timerBroadcast.send({ type: 'tick', elapsedMs, status });
		}, TICK_MS);
	}

	function applyRemote(state: { elapsedMs: number; status: TimerStatus }) {
		clearTick();
		elapsedMs = state.elapsedMs;
		status = state.status;
		if (status === 'running') {
			startTick();
		} else {
			lastTickAt = null;
		}
	}

	return {
		get status() {
			return status;
		},
		get elapsedMs() {
			return elapsedMs;
		},
		get displaySeconds() {
			return displaySeconds;
		},
		get isRunning() {
			return status === 'running';
		},
		get isPaused() {
			return status === 'paused';
		},
		get isIdle() {
			return status === 'idle';
		},
		/**
		 * Hangi odaya presence yazacağımızı belirle. Dinlemeyi de başlatır:
		 * odadaki diğer kullanıcıların state'leri callback'e düşer.
		 */
		setRoomContext(ctx: RoomContext, onRemote?: (p: presence.PresenceDoc[]) => void) {
			roomCtx = ctx;
			if (unsubscribePresence) {
				unsubscribePresence();
				unsubscribePresence = null;
			}
			if (!ctx || !isFirebaseEnabled() || !onRemote) return;
			unsubscribePresence = presence.subscribeRoomPresence(ctx.roomId, onRemote);
		},
		dispose() {
			if (unsubscribePresence) {
				unsubscribePresence();
				unsubscribePresence = null;
			}
			roomCtx = null;
		},
		start() {
			if (status === 'running') return;
			status = 'running';
			startTick();
			pushToRemote();
		},
		pause() {
			if (status !== 'running') return;
			clearTick();
			if (lastTickAt !== null) {
				elapsedMs += performance.now() - lastTickAt;
				lastTickAt = null;
			}
			status = 'paused';
			pushToRemote();
		},
		resume() {
			if (status !== 'paused') return;
			status = 'running';
			startTick();
			pushToRemote();
		},
		toggle() {
			if (status === 'running') this.pause();
			else this.start();
		},
		/**
		 * "Bu seansı bitirdim" — 'finished' snapshot'ı yaz, stats'ı güncelle, idle'a çevir.
		 * handleStop +page.svelte'te bunu çağırır, ardından kutlama modalı gösterilir.
		 */
		finish() {
			const finalMs = elapsedMs;
			clearTick();
			lastTickAt = null;
			if (roomCtx) {
				void presence.writePresence(roomCtx.roomId, roomCtx.username, 'finished', finalMs);
			}
			const addedSeconds = Math.max(0, Math.floor(finalMs / 1000));
			if (addedSeconds > 0) {
				void stats.touchStreak(addedSeconds);
			}
			elapsedMs = 0;
			status = 'idle';
			pushToRemote();
		},
		reset() {
			clearTick();
			elapsedMs = 0;
			status = 'idle';
			lastTickAt = null;
			pushToRemote();
		},
		/**
		 * Remote state (BroadcastChannel) — D-019 aynı sekmeler.
		 * `applyRemote` public API'de tutuluyor: bindRemote içinde `this.applyRemote`
		 * referansı için gerekli.
		 */
		applyRemote,
		bindRemote() {
			return timerBroadcast.subscribe((msg) => {
				if (msg.type !== 'tick') return;
				this.applyRemote({ elapsedMs: msg.elapsedMs, status: msg.status });
			});
		}
	};
}

export const timer = createTimerStore();
