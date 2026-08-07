/**
 * Hafif "tık" sesi — D-017.
 *
 * Web Audio API ile sentetik: kısa 50ms envelope'lı 1kHz sinüs.
 * Asset gerektirmez, PWA'ya katkı sıfır byte. AudioContext kullanıcı
 * etkileşiminden sonra init edilir (tarayıcı autoplay politikası).
 */

let ctx: AudioContext | null = null;
let enabled = true;

function ensureCtx(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (ctx) return ctx;
	try {
		const Ctor: typeof AudioContext | undefined =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		ctx = new Ctor();
	} catch {
		ctx = null;
	}
	return ctx;
}

/** Tık sesi çal. Hata olursa yut. */
export function playClick(): void {
	if (!enabled) return;
	const ac = ensureCtx();
	if (!ac) return;
	// iOS suspend durumu — resume et
	if (ac.state === 'suspended') {
		void ac.resume();
	}
	const osc = ac.createOscillator();
	const gain = ac.createGain();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(1000, ac.currentTime);
	osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.05);
	gain.gain.setValueAtTime(0.0001, ac.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.005);
	gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05);
	osc.connect(gain);
	gain.connect(ac.destination);
	osc.start();
	osc.stop(ac.currentTime + 0.06);
}

/** Kullanıcı ayarı — tık sesi açık/kapalı. */
export function setClickEnabled(value: boolean): void {
	enabled = value;
}
