/**
 * Username Store — D-015, D-016, D-024
 *
 * Kayıt stratejisi:
 *   1. localStorage'da username varsa, init orada başla.
 *   2. Onboarding submit'te `claimUsername` Firestore transaction'ı çağrılır —
 *      atomik olarak usernameler/{u} doc'u oluşturulur, çakışma varsa reddedilir.
 *   3. Başarılı claim sonrası localStorage'a yazılır.
 *
 * Firebase config yoksa local-only mod: claim denemesi yapılmaz, sadece
 * localStorage kullanılır (offline geliştirme).
 *
 * Svelte 5 runes mode.
 */

import { isFirebaseEnabled } from '$lib/firebase/client';
import * as fb from '$lib/firebase/usernames';

export type ClaimOutcome = 'ok' | 'taken' | 'invalid' | 'unavailable';

const STORAGE_KEY = 'timer_username';

function loadUsername(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(STORAGE_KEY);
}

function saveUsername(value: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, value);
}

function clearUsername() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

function createUsernameStore() {
	let value = $state<string | null>(loadUsername());

	return {
		get current() {
			return value;
		},
		get isSet() {
			return value !== null && value.length > 0;
		},
		/**
		 * Username'i Firestore'da atomik olarak claim et.
		 * - 'ok'         : claim başarılı, localStorage'a yazıldı
		 * - 'taken'      : başka biri bu ismi çoktan almış (D-016)
		 * - 'invalid'    : format hatalı
		 * - 'unavailable': Firebase kapalı veya network hatası
		 */
		async claim(raw: string): Promise<ClaimOutcome> {
			if (fb.validateUsername(raw)) return 'invalid';
			if (isFirebaseEnabled()) {
				const res = await fb.claimUsername(raw);
				if (res.ok) {
					saveUsername(raw.trim());
					value = raw.trim();
					return 'ok';
				}
				return res.reason;
			}
			// offline: local-only
			saveUsername(raw.trim());
			value = raw.trim();
			return 'ok';
		},
		reset() {
			clearUsername();
			value = null;
		}
	};
}

export const username = createUsernameStore();
