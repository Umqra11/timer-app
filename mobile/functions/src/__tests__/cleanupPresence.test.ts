import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLEANUP_SRC = resolve(__dirname, '../cleanupPresence.ts');

describe('cleanupPresence scheduled function — Sprint-06 Faz 3 P1', () => {
	it('declares 24h stale threshold (24 * 60 * 60 * 1000)', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const thresholdMatch = src.match(/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
		expect(
			thresholdMatch,
			'24h stale threshold constant not found (24 * 60 * 60 * 1000)'
		).toBeTruthy();
	});

	it('queries collectionGroup presence (rooms/{roomId}/presence/{uid})', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const cgMatch = src.match(/collectionGroup\(\s*['"]presence['"]\s*\)/);
		expect(
			cgMatch,
			'must use collectionGroup("presence") — presence docs live under rooms/{roomId}/presence/{uid}'
		).toBeTruthy();
	});

	it('filters by updatedAt < cutoff (stale)', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const updatedAtMatch = src.match(
		 /\.where\(\s*['"]updatedAt['"]\s*,\s*['"]<['"]\s*,/
		);
		expect(
			updatedAtMatch,
			'must filter on .where("updatedAt", "<", cutoff)'
		).toBeTruthy();
	});

	it('filters by status in [running, paused] (active states)', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const statusMatch = src.match(
		 /\.where\(\s*['"]status['"]\s*,\s*['"]in['"]\s*,\s*\[\s*['"]running['"]\s*,\s*['"]paused['"]\s*\]/
		);
		expect(
			statusMatch,
			'must filter on .where("status", "in", ["running", "paused"])'
		).toBeTruthy();
	});

	it('batch-updates status to "idle"', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const batchIdle = src.match(
			/batch\.update[\s\S]*?\{[\s\S]*?status[\s\S]*?idle/
		);
		expect(
			batchIdle,
			'must batch.update(... { status: "idle", ... }) — stale presence → idle'
		).toBeTruthy();
	});

	it('schedules every 6 hours UTC', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const scheduleMatch = src.match(
			/schedule\s*:\s*['"]every\s+6\s+hours['"]/
		);
		expect(
			scheduleMatch,
			'must declare schedule: "every 6 hours"'
		).toBeTruthy();
		const tzMatch = src.match(/timeZone\s*:\s*['"]UTC['"]/);
		expect(
			tzMatch,
			'must declare timeZone: "UTC" (deterministic global schedule)'
		).toBeTruthy();
	});

	it('uses batch processing with size limit (Firestore 500 batch limit)', () => {
		const src = readFileSync(CLEANUP_SRC, 'utf-8');
		const limitMatch = src.match(/\.limit\(\s*BATCH_SIZE\s*\)/);
		expect(
			limitMatch,
			'must use .limit(BATCH_SIZE) for batch pagination (Firestore 500 write limit)'
		).toBeTruthy();
		const batchSizeConst = src.match(/BATCH_SIZE\s*=\s*500/);
		expect(
			batchSizeConst,
			'must declare BATCH_SIZE = 500 (Firestore batch limit)'
		).toBeTruthy();
	});

	it('is exported from index.ts', () => {
		const indexSrc = readFileSync(
			resolve(__dirname, '../index.ts'),
			'utf-8'
		);
		const exportMatch = indexSrc.match(
			/export\s*\{[^}]*\bcleanupPresence\b[^}]*\}/
		);
		expect(
			exportMatch,
			'index.ts must export cleanupPresence (deploy bundle)'
		).toBeTruthy();
	});
});
