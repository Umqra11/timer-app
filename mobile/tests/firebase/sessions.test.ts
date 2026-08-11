import { describe, it, expect, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';

const firestoreMocks = vi.hoisted(() => ({
	collection: vi.fn(),
	onSnapshot: vi.fn(),
	query: vi.fn(),
	where: vi.fn()
}));

vi.mock('firebase/firestore', async (importOriginal) => {
	const actual = await importOriginal<typeof import('firebase/firestore')>();
	return {
		...actual,
		collection: firestoreMocks.collection,
		onSnapshot: firestoreMocks.onSnapshot,
		query: firestoreMocks.query,
		where: firestoreMocks.where
	};
});

vi.mock('$lib/firebase/client', () => ({
	getDb: (): Firestore => ({}) as Firestore
}));

import { Timestamp } from 'firebase/firestore';
import { WEEK_DAYS, subscribeUserWeeklySeconds } from '$lib/firebase/sessions';

describe('WEEK_DAYS', () => {
	it('is 7', () => {
		expect(WEEK_DAYS).toBe(7);
	});
});

describe('subscribeUserWeeklySeconds', () => {
	it('uses a Firestore Timestamp for the rolling cutoff', () => {
		subscribeUserWeeklySeconds('user-1', () => {});

		expect(firestoreMocks.where).toHaveBeenCalledWith(
			'endedAt',
			'>=',
			expect.any(Timestamp)
		);
	});
});
