/**
 * Timer Store — MVP Kronometre
 * State machine: idle → running → paused → running → ... → idle
 * - Başlat: sayaç 0'dan ilerler
 * - Duraklat: sayaç durur, devam ettirilebilir
 * - Sıfırla: sayaç 0'a döner, idle
 *
 * Svelte 5 runes mode.
 * D-019: BroadcastChannel ile aynı tarayıcıdaki sekmeler arası state senkronizasyonu.
 * Bir sekme başlatınca/incelek hareket edince diğer sekmeler de gerisini alır.
 *
 * Sharding kuralı:
 *   - 100ms tick tek sekmeye sahip (en eski senderId = "sahip" kabul edilebilir değil —
 *     pratikte tick'i sadece çalışan sekme atar; duraklatan idempotent gelir)
 *   - Gelen tick, sahip sekmeyse yut; değilse elapsedMs'i snapshot olarak al.
 *     Bu sayede iki sekme paralel çalışmaz — en son hareket eden kazanır.
 */

import { timerBroadcast } from '$lib/utils/broadcast.svelte';

export type TimerStatus = 'idle' | 'running' | 'paused';

const TICK_MS = 100; // 100ms hassasiyet (görsel akıcılık)

function createTimerStore() {
	let status = $state<TimerStatus>('idle');
	let elapsedMs = $state(0); // toplam biriken süre
	let lastTickAt = $state<number | null>(null); // performance.now() snapshot
	let intervalId: ReturnType<typeof setInterval> | null = null;

	// reaktif türetilmiş değerler
	const displaySeconds = $derived(Math.floor(elapsedMs / 1000));

	function clearTick() {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
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
		// Gelen state'e tam uyum: tick'i durdur, değerleri al.
		// running gelirse interval'ı yeniden başlat — sanki başka sekme bu sekmeyi "canlandırıyor".
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
		/** Başlat (idle veya paused'tan) */
		start() {
			if (status === 'running') return;
			status = 'running';
			startTick();
			timerBroadcast.send({ type: 'tick', elapsedMs, status });
		},
		/** Duraklat (running'den) */
		pause() {
			if (status !== 'running') return;
			clearTick();
			// tick sırasında update'lenmemiş olabilir; final elapsedMs'i tamamla
			if (lastTickAt !== null) {
				elapsedMs += performance.now() - lastTickAt;
				lastTickAt = null;
			}
			status = 'paused';
			timerBroadcast.send({ type: 'tick', elapsedMs, status });
		},
		/** Devam ettir (paused'tan) */
		resume() {
			if (status !== 'paused') return;
			status = 'running';
			startTick();
			timerBroadcast.send({ type: 'tick', elapsedMs, status });
		},
		/** Toggle: idle/paused ise start, running ise pause */
		toggle() {
			if (status === 'running') this.pause();
			else this.start();
		},
		/** Sıfırla */
		reset() {
			clearTick();
			elapsedMs = 0;
			status = 'idle';
			lastTickAt = null;
			timerBroadcast.send({ type: 'tick', elapsedMs, status });
		},
		/** Remote'dan gelen state'i yerel kanonuna al — D-019. */
		applyRemote,
		/** BroadcastChannel'a abone ol — $effect içinden çağrılır. */
		bindRemote() {
			return timerBroadcast.subscribe((msg) => {
				if (msg.type !== 'tick') return;
				this.applyRemote({ elapsedMs: msg.elapsedMs, status: msg.status });
			});
		}
	};
}

export const timer = createTimerStore();
