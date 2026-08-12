/**
 * Firebase client — singleton init.
 *
 * Çevre değişkenleri VITE_FIREBASE_* önekli olarak .env.local'den gelir
 * (Vite yalnızca VITE_ önekli olanları istemciye expose eder).
 *
 * Init lazy: import anında değil, ilk kullanımda (browser + config mevcutsa).
 * SSR sırasında window yok; bu yüzden init guard'lı.
 */

import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

type FirebaseHandles = { app: FirebaseApp; db: Firestore; fns: Functions };

let cached: FirebaseHandles | null = null;
let initTried = false;

function readConfig() {
	const env = import.meta.env;
	const apiKey = env.VITE_FIREBASE_API_KEY;
	const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
	const projectId = env.VITE_FIREBASE_PROJECT_ID;
	const appId = env.VITE_FIREBASE_APP_ID;
	if (!apiKey || !authDomain || !projectId || !appId) return null;
	return {
		apiKey,
		authDomain,
		projectId,
		storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
		appId
	};
}

/** Returns the Firestore instance, or null if config is missing (local dev). */
export function getDb(): Firestore | null {
	if (typeof window === 'undefined') return null;
	if (cached) return cached.db;
	if (initTried) return null;
	initTried = true;
	const config = readConfig();
	if (!config) {
		console.warn('[firebase] VITE_FIREBASE_* env values missing — running in offline mode.');
		return null;
	}
	const app = initializeApp(config);
	cached = { app, db: getFirestore(app), fns: getFunctions(app) };
	return cached.db;
}

/** True if Firebase config is present and db was initialised. */
export function isFirebaseEnabled(): boolean {
	return getDb() !== null;
}

export { getApp, httpsCallable };
