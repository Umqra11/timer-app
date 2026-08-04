/**
 * Username Store — D-015, D-016, D-024
 * localStorage'da username saklar. İlk ziyarette onboarding tetikler.
 * Svelte 5 runes mode.
 */

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
	// $state — Svelte 5 reactive state
	let value = $state<string | null>(loadUsername());

	return {
		get current() {
			return value;
		},
		get isSet() {
			return value !== null && value.length > 0;
		},
		set(newValue: string) {
			const trimmed = newValue.trim();
			if (trimmed.length === 0) return false;
			saveUsername(trimmed);
			value = trimmed;
			return true;
		},
		reset() {
			clearUsername();
			value = null;
		}
	};
}

export const username = createUsernameStore();
