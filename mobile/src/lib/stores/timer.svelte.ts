/**
 * Timer Store — MVP Kronometre
 * State machine: idle → running → paused → running → ... → idle
 *
 * Svelte 5 runes mode.
 *
 * D-019 — Çoklu sekme/cihaz senkronu (BroadcastChannel + Firestore).
 * D-018 — Streak/totals, finish()'te touchStreak.
 * D-050 — visibilitychange + beforeunload listener.
 */

import { isFirebaseEnabled } from '$lib/firebase/client';
import * as presence from '$lib/firebase/presence';
import * as stats from '$lib/firebase/stats';
import { timerBroadcast } from '$lib/utils/broadcast.svelte';

export type TimerStatus = 'idle' | 'running' | 'paused';

const TICK_MS = 100;

export type RoomContext = { roomId: string; username: string } | null;

function createTimerStore() {
	let status: TimerStatus = $state('idle');
	let elapsedMs = $state(0);
	let lastTickAt: number | null = $state(null);
	// setInterval tipi browser'da number, @types/node'da Timeout.
	// clearInterval her iki tipi de kabul eder. Union ile her iki ortamda çalışır.
	type TickHandle = number | ReturnType<typeof setInterval>;
	let intervalId: TickHandle | null = null;
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
			const ps: presence.PresenceStatus =
				status === 'running' ? 'running' : status === 'paused' ? 'paused' : 'idle';
			void presence.writePresence(roomCtx.roomId, roomCtx.username, ps, elapsedMs);
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
		 * Hangi odaya presence yazacağımızı belirle. Dinlemeyi de başlatır.
		 * D-050: visibilitychange + beforeunload listener ekler.
		 * Sayfaya girildiğinde hemen 'idle' presence yazılır.
		 */
		setRoomContext(ctx: RoomContext, onRemote?: (p: presence.PresenceDoc[]) => void) {
			roomCtx = ctx;
			if (unsubscribePresence) {
				unsubscribePresence();
				unsubscribePresence = null;
			}
			if (!ctx || !isFirebaseEnabled() || !onRemote) return;
			unsubscribePresence = presence.subscribeRoomPresence(ctx.roomId, onRemote);
			void presence.writePresence(ctx.roomId, ctx.username, 'idle', 0);
			if (typeof window === 'undefined') return;
			const onVisibility = () => {
				if (document.visibilityState === 'hidden' && roomCtx) {
					void presence.writePresence(roomCtx.roomId, roomCtx.username, 'idle', 0);
				}
			};
			const onBeforeUnload = () => {
				if (roomCtx) {
					void presence.writePresence(roomCtx.roomId, roomCtx.username, 'idle', 0);
				}
			};
			document.addEventListener('visibilitychange', onVisibility);
			window.addEventListener('beforeunload', onBeforeUnload);
			(unsubscribePresence as unknown as { _cleanup: () => void })._cleanup = () => {
				document.removeEventListener('visibilitychange', onVisibility);
				window.removeEventListener('beforeunload', onBeforeUnload);
			};
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
