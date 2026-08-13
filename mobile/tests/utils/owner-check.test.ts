import { describe, it, expect } from 'vitest';
import { isRoomOwner } from '$lib/utils/owner-check';

describe('isRoomOwner — D-060 helper', () => {
	it('returns true when ownerUid === callerUid', () => {
		expect(isRoomOwner('alice', 'alice')).toBe(true);
	});

	it('returns false when ownerUid !== callerUid', () => {
		expect(isRoomOwner('alice', 'bob')).toBe(false);
	});

	it('returns false when ownerUid is undefined', () => {
		expect(isRoomOwner(undefined, 'alice')).toBe(false);
	});

	it('returns false when ownerUid is empty string', () => {
		expect(isRoomOwner('', 'alice')).toBe(false);
	});

	it('returns false when callerUid is null (offline / anon)', () => {
		expect(isRoomOwner('alice', null)).toBe(false);
	});

	it('returns false when both are missing (legacy room data)', () => {
		expect(isRoomOwner(undefined, null)).toBe(false);
		expect(isRoomOwner(null as unknown as string | undefined, null)).toBe(false);
	});
});
