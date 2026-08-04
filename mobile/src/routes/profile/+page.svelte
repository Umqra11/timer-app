<!--
  Profil sayfası — placeholder (Sprint-03'te doldurulacak)
  D-018: streak + haftalık özet
-->
<script lang="ts">
	import { username } from '$lib/stores/username.svelte';
	import { goto } from '$app/navigation';

	function handleLogout() {
		username.reset();
		goto('/onboarding', { replaceState: true });
	}
</script>

<div class="space-y-6 pt-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Profil</h1>
		<p class="text-sm text-fg-muted">Hesap ayarları ve istatistiklerin</p>
	</header>

	<div class="rounded-3xl border border-border bg-surface p-6">
		<div class="flex items-center gap-4">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent"
			>
				{username.current?.[0]?.toUpperCase() ?? '?'}
			</div>
			<div>
				<p class="text-lg font-semibold">{username.current}</p>
				<p class="text-xs text-fg-subtle">Senkronize değil (Sprint-02'de)</p>
			</div>
		</div>
	</div>

	<div class="rounded-3xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted">
		<p>📊 Haftalık özet ve seri (streak) bilgileri buraya gelecek — Sprint-03.</p>
	</div>

	<button
		onclick={handleLogout}
		class="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
	>
		Çıkış yap
	</button>
</div>
