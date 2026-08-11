import { describe, it, expect, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';

// Mock firebase client — test env VITE_FIREBASE_* env yok, getDb() null döner.
// Self-target guard, getDb null-check'ten SONRA çalıştığı için guard'a
// ulaşabilmek adına truthy stub sağlıyoruz.
vi.mock('$lib/firebase/client', () => ({
	getDb: (): Firestore | null => ({}) as Firestore,
	isFirebaseEnabled: () => true
}));

// Mock device uid — targetUid ile eşleşmesi için.
vi.mock('$lib/firebase/uid', () => ({
	getDeviceUid: () => 'self-uid'
}));

import { sendReaction } from '$lib/firebase/reactions';

describe('sendReaction — self-target guard', () => {
	it('returns ok:false reason:self-target when target equals sender', async () => {
		// getDeviceUid mock'u gerekebilir — mevcut test pattern'ı takip et
		const res = await sendReaction('room1', 'self-uid', 'hi', 'me');
		expect(res).toEqual({ ok: false, reason: 'self-target' });
	});
});
