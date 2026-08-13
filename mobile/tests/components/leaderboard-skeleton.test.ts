import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SKELETON_SRC = resolve(
	process.cwd(),
	'src/routes/leaderboard/LeaderboardSkeleton.svelte'
);

describe('LeaderboardSkeleton — Sprint-06 Faz 4 F7 (D-074)', () => {
	it('file exists', () => {
		const src = readFileSync(SKELETON_SRC, 'utf-8');
		expect(src.length, 'LeaderboardSkeleton.svelte must exist and have content').toBeGreaterThan(0);
	});

	it('uses animate-pulse utility for placeholder bars', () => {
		const src = readFileSync(SKELETON_SRC, 'utf-8');
		expect(
			src.includes('animate-pulse'),
			'LeaderboardSkeleton must use Tailwind animate-pulse for placeholder rows'
		).toBe(true);
	});

	it('renders a configurable row count via $props', () => {
		const src = readFileSync(SKELETON_SRC, 'utf-8');
		expect(
			src.includes('$props') && src.includes('rowCount'),
			'LeaderboardSkeleton must accept rowCount via $props'
		).toBe(true);
	});

	it('includes aria-busy / aria-live for accessibility', () => {
		const src = readFileSync(SKELETON_SRC, 'utf-8');
		expect(
			src.includes('aria-busy="true"') && src.includes('aria-live'),
			'LeaderboardSkeleton must include aria-busy and aria-live for screen readers'
		).toBe(true);
	});
});
