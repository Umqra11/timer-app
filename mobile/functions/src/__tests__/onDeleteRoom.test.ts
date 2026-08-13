/**
 * Tests for onDeleteRoom Cloud Function — Sprint-06 Faz 4 F3 (D-049).
 * Unit tests for pure `assertCanDelete` helper (HttpsError logic).
 * Integration test (firestore emulator) Sprint-07+'da.
 */
import { describe, it, expect } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { assertCanDelete } from '../onDeleteRoom';

describe('assertCanDelete — D-049 owner check', () => {
	it('throws permission-denied when ownerUid does not match caller', () => {
		expect(() => assertCanDelete({ ownerUid: 'alice' }, 'bob')).toThrow(HttpsError);
		try {
			assertCanDelete({ ownerUid: 'alice' }, 'bob');
		} catch (err) {
			expect((err as HttpsError).code).toBe('permission-denied');
		}
	});

	it('does NOT throw when ownerUid matches caller', () => {
		expect(() => assertCanDelete({ ownerUid: 'alice' }, 'alice')).not.toThrow();
	});

	it('throws permission-denied when roomData.ownerUid is missing', () => {
		expect(() => assertCanDelete({}, 'alice')).toThrow(HttpsError);
	});

	it('throws permission-denied when caller is empty string', () => {
		expect(() => assertCanDelete({ ownerUid: 'alice' }, '')).toThrow(HttpsError);
	});
});
