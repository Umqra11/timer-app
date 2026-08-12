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

import { isFirebaseEnabled, httpsCallable, getFns } from '$lib/firebase/client';
import * as presence from '$lib/firebase/presence';
import * as sessions from '$lib/firebase/sessions';
import * as stats from '$lib/firebase/stats';
import { getDeviceUid } from '$lib/firebase/uid';
import { timerBroadcast } from '$lib/utils/broadcast.svelte';

export type TimerStatus = 'idle' | 'running' | 'paused';

const TICK_MS = 100;

export type RoomContext = { roomId: string; username: string } | null;

function createTimerStore() {
	let status: TimerStatus = $state('idle');
	let elapsedMs = $state(0);
	let lastTickAt: number | null = $state(null);
	// setInterval browser'da number, @types/node'da Timeout döndürür. Union ile
	// her iki ortamda typecheck temiz, runtime'da clearInterval her iki tipi de kabul eder.
	type TickHandle = number | ReturnType<typeof setInterval>;
	let intervalId: TickHandle | null = null;
	let roomCtx: RoomContext = null;
	let unsubscribePresence: (() => void) | null = null;
	let detachLifecycle: (() => void) | null = null;

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
			const uid = getDeviceUid();
			console.info('[presence] invoke', { roomId: roomCtx.roomId, status: ps, elapsedMs });
		const fn = httpsCallable(getFns(), 'onPresenceChange');
			void fn({ roomId: roomCtx.roomId, status: ps, elapsedMs, uid }).catch((err: unknown) => {
				console.error('[presence] callable failed', err);
			});
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
		 * Hangi odaya presence yazacağımızı belirle.
		 * - onRemote callback verilmişse odanın presence'ını dinler
		 * - her durumda hemen kendi presence'ımızı 'idle' olarak yazar (D-050)
		 * - visibilitychange + beforeunload listener ekler (D-050)
		 *
		 * HATA: Önceki sürümde `if (!onRemote) return;` vardı — bu yüzden
		 * `setRoomContext` callback verilmeden çağrıldığında presence
		 * yazılmıyordu. Şimdi callback opsiyonel.
		 */
		setRoomContext(ctx: RoomContext, onRemote?: (p: presence.PresenceDoc[]) => void) {
			roomCtx = ctx;

			// Önceki subscription'ı temizle
			if (unsubscribePresence) {
				unsubscribePresence();
				unsubscribePresence = null;
			}
			if (detachLifecycle) {
				detachLifecycle();
				detachLifecycle = null;
			}

			if (!ctx || !isFirebaseEnabled()) return;

			// Subscribe (callback verilmişse)
			if (onRemote) {
				unsubscribePresence = presence.subscribeRoomPresence(ctx.roomId, onRemote);
			}

			// Kendi presence'ımızı yaz — leaderboard'da görünelim
			void presence.writePresence(ctx.roomId, ctx.username, 'idle', 0);

			// D-050 — page lifecycle listener'ları
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
			detachLifecycle = () => {
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
			const startedAt = Date.now() - Math.floor(elapsedMs);
			clearTick();
			lastTickAt = null;
			if (roomCtx) {
				void presence.writePresence(roomCtx.roomId, roomCtx.username, 'finished', finalMs);
			}
			const addedSeconds = Math.max(0, Math.floor(finalMs / 1000));
			if (addedSeconds > 0) {
				void stats.touchStreak(addedSeconds);
				// D-067: weekly sessions log
				void sessions.recordSession({
					dayKey: stats.todayKeyForSession(),
					startedAt,
					endedAt: Date.now(),
					elapsedMs: finalMs
				});
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
