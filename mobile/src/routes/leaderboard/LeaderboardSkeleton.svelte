<!--
  LeaderboardSkeleton — Sprint-06 Faz 4 F7 (D-074).
  İlk paint'te placeholder rows. Firestore subscribe başlayınca parent fade out.
  Tailwind `animate-pulse` built-in — accessibility (reduced-motion) için
  `prefers-reduced-motion` ile kapatılabilir ileride.
-->
<script lang="ts">
	const { rowCount = 6 }: { rowCount?: number } = $props();
</script>

<div class="space-y-2" aria-busy="true" aria-live="polite" aria-label="Sıralama yükleniyor">
	{#each Array(rowCount) as _, i (i)}
		<div
			class="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
			data-testid="leaderboard-skeleton-row"
		>
			<div class="h-9 w-9 animate-pulse rounded-full bg-fg-subtle/20"></div>
			<div class="flex-1 space-y-1.5">
				<div class="h-3 w-3/5 animate-pulse rounded bg-fg-subtle/20"></div>
				<div class="h-2 w-2/5 animate-pulse rounded bg-fg-subtle/20"></div>
			</div>
			<div class="h-4 w-12 animate-pulse rounded bg-fg-subtle/20"></div>
		</div>
	{/each}
</div>
