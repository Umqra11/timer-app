import { describe, it, expect } from 'vitest';
import { WEEK_DAYS } from '$lib/firebase/sessions';

describe('WEEK_DAYS', () => {
	it('is 7', () => {
		expect(WEEK_DAYS).toBe(7);
	});
});
