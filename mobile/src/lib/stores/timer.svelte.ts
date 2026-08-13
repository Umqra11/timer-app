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
import { enqueuePending, installSettleFlush } from '$lib/utils/settle-queue';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

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
	// P2 — 60s presence heartbeat (status='running' iken aktif). P1 cleanup 24h sonra
	// stale presence'ı 'idle' yapar; bu heartbeat "last seen" verisini taze tutar.
	let presenceHeartbeatId: TickHandle | null = null;
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

	function clearPresenceHeartbeat() {
		if (presenceHeartbeatId !== null) {
			clearInterval(presenceHeartbeatId);
			presenceHeartbeatId = null;
		}
	}

	function startPresenceHeartbeat() {
		clearPresenceHeartbeat();
		presenceHeartbeatId = setInterval(() => {
			void pushToRemote();
		}, 60_000);
	}

	// M3 + M2 + M0-fix #1 — async, try/catch, settled queue + 'finished' mapping.
	async function pushToRemote(): Promise<void> {
		timerBroadcast.send({ type: 'tick', elapsedMs, status });
		if (!roomCtx) return;
		const ps: presence.PresenceStatus =
				status === 'running'
					? 'running'
				: status === 'paused'
					? 'paused'
				: status === 'finished'
					? 'finished'
				: 'idle';
		const uid = getDeviceUid();
		// M6 cleanup: A2 debug telemetry comment-out (production gürültüsü)
		// console.info('[presence] invoke', { roomId: roomCtx.roomId, status: ps, elapsedMs });
		const fns = getFns();
		if (!fns) return; // offline / no firebase — presence write no-op
		const fn = httpsCallable(fns, 'onPresenceChange');
		try {
			await fn({ roomId: roomCtx.roomId, status: ps, elapsedMs, uid });
		} catch (err: unknown) {
			// M3: offline / unavailable — kuyruğa yaz, online olunca installSettleFlush
			// listener'ı otomatik olarak boşaltır.
			enqueuePending({
				roomId: roomCtx.roomId,
				status: ps,
				elapsedMs,
				uid
			});
			console.warn('[presence] callable failed, queued for retry', err);
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
		 * - visibilitychange + beforeunload listener ekler (D-050)
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

			// M3: settle queue flush listener — idempotent. Online + visibilitychange
			// tetiklendiğinde kuyruktaki pending write'ları callable ile tekrar dener.
			// başarılı olanlar kuyruktan çıkar, başarısızlar bir sonraki online'a kalır.
			void installSettleFlush(async (w) => {
				const fns = getFns();
				if (!fns) return false; // offline — bir sonraki online olayına sakla
				const fn = httpsCallable(fns, 'onPresenceChange');
				try {
					await fn({ roomId: w.roomId, status: w.status, elapsedMs: w.elapsedMs, uid: w.uid });
					return true;
				} catch {
					return false;
				}
			});

			// D-050 — page lifecycle listener'ları
			if (typeof window === 'undefined') return;
			const onVisibility = () => {
				if (document.visibilityState === 'hidden' && roomCtx) {
					pushToRemote();
				}
			};
			const onBeforeUnload = () => {
				if (roomCtx) {
					pushToRemote();
				}
			};
			document.addEventListener('visibilitychange', onVisibility);
			window.addEventListener('beforeunload', onBeforeUnload);
			detachLifecycle = () => {
				document.removeEventListener('visibilitychange', onVisibility);
				window.removeEventListener('beforeunload', onBeforeUnload);
				// P2: heartbeat'i de unmount'ta temizle (presence artık yazılmasın)
				clearPresenceHeartbeat();
			};
		},
		start() {
			if (status === 'running') return;
			status = 'running';
			startTick();
			void pushToRemote();
			startPresenceHeartbeat();
		},
		pause() {
			if (status !== 'running') return;
			clearTick();
			clearPresenceHeartbeat();
			if (lastTickAt !== null) {
				elapsedMs += performance.now() - lastTickAt;
				lastTickAt = null;
			}
			status = 'paused';
			void pushToRemote();
		},
		resume() {
			if (status !== 'paused') return;
			status = 'running';
			startTick();
			void pushToRemote();
			startPresenceHeartbeat();
		},
		toggle() {
			if (status === 'running') this.pause();
			else this.start();
		},
		finish() {
			const finalMs = elapsedMs;
			const startedAt = Date.now() - Math.floor(elapsedMs);
			clearTick();
			clearPresenceHeartbeat();
			lastTickAt = null;

			// M1 fix — Bug A: finish-race. Önceki davranış: client-side
			// writePresence('finished') + hemen sonra elapsedMs=0, status='idle', pushToRemote().
			// Race — server-side 'finished' merge'i 'idle' ile eziliyor, FINISHED_TIMEOUT_MS (5dk)
			// hiç engage olmaz, leaderboard 'finished' badge göstermez. Yeni davranış:
			// server-side 'finished' yaz, 250ms throttle sonra 'idle'. Throttle sırasında
			// local UI BroadcastChannel ile 'finished' badge'i gösterir.

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

			if (roomCtx) {
				// 1) status='finished' set + pushToRemote (server-side 'finished' merge)
				status = 'finished';
				void pushToRemote();
				// 2) 250ms sonra elapsedMs=0, status='idle', pushToRemote (server-side 'idle')
				setTimeout(() => {
					elapsedMs = 0;
					status = 'idle';
					void pushToRemote();
				}, 250);
			} else {
				// Offline / no room — eski davranış (sadece local reset, throttle gereksiz)
				elapsedMs = 0;
				status = 'idle';
			}
		},
		reset() {
			clearTick();
			clearPresenceHeartbeat();
			elapsedMs = 0;
			status = 'idle';
			lastTickAt = null;
			void pushToRemote();
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
