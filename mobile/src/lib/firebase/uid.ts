/**
 * Device-scoped UID — kimlik doğrulama yok (D-015).
 *
 * Her cihaz/tarayıcı için localStorage'da bir UUID tutulur. Bu, Firestore'da
 * presence/user doc'ları için "kim" sorusuna cevap verir. Kullanıcı adı
 * değişirse eski uid'nin presence'ı orphan kalır — kabul edilebilir, MVP.
 *
 * SSR sırasında 'ssr' döner (init'e gerek yok).
 */

const UID_KEY = 'timer_uid';

let cached: string | null = null;

export function getDeviceUid(): string {
	if (typeof window === 'undefined') return 'ssr';
	if (cached) return cached;
	let v: string | null = null;
	try {
		v = localStorage.getItem(UID_KEY);
	} catch {
		// localStorage kapalı (gizli mod vs.) — yine de session'da yaşasın
	}
	if (!v) {
		v =
			typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
				? crypto.randomUUID()
				: 'uid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
		try {
			localStorage.setItem(UID_KEY, v);
		} catch {
			// yok say
		}
	}
	cached = v;
	return v;
}
