/**
 * Timer Store — MVP Kronometre
 * State machine: idle → running → paused → running → ... → idle
 * - Başlat: sayaç 0'dan ilerler
 * - Duraklat: sayaç durur, devam ettirilebilir
 * - Sıfırla (D-021 swipe): sayaç 0'a döner, idle
 *
 * Svelte 5 runes mode.
 * Şimdilik sadece tek oturum, local-only. Firestore entegrasyonu Sprint-02'de.
 */

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
		}, TICK_MS);
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
		},
		/** Duraklat (running'den) */
		pause() {
			if (status !== 'running') return;
			clearTick();
			status = 'paused';
		},
		/** Devam ettir (paused'tan) */
		resume() {
			if (status !== 'paused') return;
			status = 'running';
			startTick();
		},
		/** Toggle: idle/paused ise start, running ise pause */
		toggle() {
			if (status === 'running') this.pause();
			else this.start();
		},
		/** Sıfırla (swipe sonrası) */
		reset() {
			clearTick();
			elapsedMs = 0;
			status = 'idle';
			lastTickAt = null;
		}
	};
}

export const timer = createTimerStore();
