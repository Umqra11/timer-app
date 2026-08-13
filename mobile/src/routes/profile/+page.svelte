<!--
  Profil sayfası — D-018 istatistikleri + oturum kapatma.
  Firebase'den streak, bugün ve toplam süre okunur; offline'da boş gösterilir.
-->
<script lang="ts">
	import { username } from '$lib/stores/username.svelte';
	import { goto } from '$app/navigation';
	import { isFirebaseEnabled } from '$lib/firebase/client';
	import { subscribeStats } from '$lib/firebase/stats';
	import { subscribeUserDailySeconds } from '$lib/firebase/sessions';
	import { formatHumanDuration } from '$lib/utils/format';
	import { getDeviceUid } from '$lib/firebase/uid';
	import { onMount, onDestroy } from 'svelte';

	let streak = $state(0);
	let todaySeconds = $state(0);
	let totalSeconds = $state(0);
	let lastDayWorked = $state<string | null>(null);
	let unsubscribers: Array<() => void> = [];

	onMount(() => {
		if (!isFirebaseEnabled()) return;
		const uid = getDeviceUid();
		// D-072 reactive stats — Sprint-06 Faz 4 F2+F4+F8 merge.
		// weekSeconds (deprecated) artık subscribeUserDailySeconds ile bugün filtresi.
		unsubscribers.push(
			subscribeStats((s) => {
				streak = s.streak;
				totalSeconds = s.totalSeconds;
				lastDayWorked = s.lastDayWorked;
			})
		);
		unsubscribers.push(subscribeUserDailySeconds(uid, (s) => (todaySeconds = s)));
	});

	onDestroy(() => {
		for (const u of unsubscribers) u();
		unsubscribers = [];
	});

	function handleLogout() {
		username.reset();
		goto('/onboarding', { replaceState: true });
	}

	const todayText = $derived(formatHumanDuration(todaySeconds));
	const totalText = $derived(formatHumanDuration(totalSeconds));
	const streakActive = $derived(
		lastDayWorked !== null &&
			new Intl.DateTimeFormat('en-CA', {
				timeZone: 'Europe/Istanbul',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).format(new Date()) === lastDayWorked
	);
</script>

<div class="space-y-6 pt-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Profil</h1>
		<p class="text-sm text-fg-muted">Hesap ayarları ve istatistiklerin</p>
	</header>

	<!-- Kullanıcı kartı -->
	<div class="rounded-3xl border border-border bg-surface p-6">
		<div class="flex items-center gap-4">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent"
			>
				{username.current?.[0]?.toUpperCase() ?? '?'}
			</div>
			<div>
				<p class="text-lg font-semibold">{username.current}</p>
				<p class="text-xs text-fg-subtle">
					{isFirebaseEnabled() ? 'Senkronize (Firestore)' : 'Çevrimdışı mod'}
				</p>
			</div>
		</div>
	</div>

	<!-- İstatistikler — D-018 -->
	{#if isFirebaseEnabled()}
		<section class="space-y-3">
			<h2 class="px-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
				Bu hafta
			</h2>
			<div class="grid grid-cols-3 gap-3">
				<!-- Streak -->
				<div class="rounded-2xl border border-border bg-surface p-4 text-center">
					<div class="text-2xl font-semibold tabular-nums">
						{streak}
					</div>
					<div class="mt-1 text-[11px] text-fg-muted">gün üst üste</div>
					{#if !streakActive && streak > 0}
						<div class="mt-1 text-[10px] text-amber-400">bugün henüz yok</div>
					{/if}
				</div>
				<!-- Bugün -->
				<div class="rounded-2xl border border-border bg-surface p-4 text-center">
					<div class="text-2xl font-semibold tabular-nums">
						{todayText}
					</div>
					<div class="mt-1 text-[11px] text-fg-muted">bugün</div>
				</div>
				<!-- Toplam -->
				<div class="rounded-2xl border border-border bg-surface p-4 text-center">
					<div class="text-2xl font-semibold tabular-nums">
						{totalText}
					</div>
					<div class="mt-1 text-[11px] text-fg-muted">toplam</div>
				</div>
			</div>
		</section>
	{:else}
		<div class="rounded-3xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted">
			<p>📊 İstatistikler için Firebase bağlantısı gerekli. .env.local'e VITE_FIREBASE_* ekle.</p>
		</div>
	{/if}

	<button
		onclick={handleLogout}
		class="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
	>
		Çıkış yap
	</button>
</div>
