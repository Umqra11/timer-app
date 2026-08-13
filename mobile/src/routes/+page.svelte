<!--
  Kronometre ekranı — MVP ana sayfa (S-0020 referans revizyonu sonrası)
  D-038: İki buton (Duraklat + Durdur / Devam Et + Sıfırla)
  D-040: Durum metni: "🟢 Çalışıyorsun"
  D-041: Sayaç her zaman beyaz
  D-042: Selamlama semibold
  D-043: Swipe kaldırıldı
-->
<script lang="ts">
	import { username } from '$lib/stores/username.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { formatHMS, formatHumanShort } from '$lib/utils/format';
	import { playClick } from '$lib/utils/click';
	import { onMount, onDestroy } from 'svelte';
	import { isFirebaseEnabled } from '$lib/firebase/client';
	import { rooms } from '$lib/stores/rooms.svelte';
	import { subscribeStats } from '$lib/firebase/stats';
	import { subscribeUserDailySeconds, subscribeUserWeeklySeconds } from '$lib/firebase/sessions';
	import { getDeviceUid } from '$lib/firebase/uid';

	// Fix 5: lastRoomId guard — Firestore snapshot re-fires create new `rooms.hero`
	// object refs, causing $effect to re-run and call setRoomContext which would
	// overwrite a 'running' state with 'idle'. Guard skips setRoomContext when
	// hero.id matches the room we already initialized for. Module-level so the
	// binding persists across $effect re-fires.
	let lastRoomId: string | null = null;

	// Sayaç her zaman beyaz (D-041)
	const display = $derived(formatHMS(timer.displaySeconds));
	const isRunning = $derived(timer.isRunning);
	const isPaused = $derived(timer.isPaused);
	const isIdle = $derived(timer.isIdle);

	// Durum metni (D-040)
	const statusText = $derived(
		isRunning ? 'Çalışıyorsun' : isPaused ? 'Duraklatıldın' : 'Hazır'
	);
	const showGreenDot = $derived(isRunning);

	// Kutlama modalı (D-036)
	let showCelebration = $state(false);
	let lastSessionSeconds = $state(0);

	// D-072 reactive stats — Sprint-06 Faz 4 F2+F4+F8 merge
	let todaySeconds = $state(0);
	let weekSeconds = $state(0);
	let totalSeconds = $state(0);
	let unsubscribers: Array<() => void> = [];

	function handlePause() {
		playClick();
		timer.pause();
	}

	function handleResume() {
		playClick();
		timer.resume();
	}

	function handleStart() {
		playClick();
		timer.start();
	}

	/** Durdur / Sıfırla — önce süreyi snapshot al, sonra finish() ile presence'a
	 * 'finished' yazdır + state'i idle'a çek, sonra kutlama modalını aç. */
	function handleStop() {
		playClick();
		if (timer.elapsedMs > 0) {
			lastSessionSeconds = timer.displaySeconds;
			timer.finish();
			showCelebration = true;
		} else {
			timer.reset();
		}
	}

	function handleCelebrationClose() {
		showCelebration = false;
	}

	onMount(() => {
		rooms.subscribe();
		// D-072: reactive stats — Firestore onSnapshot ile anında UI güncellemesi
		if (isFirebaseEnabled()) {
			const uid = getDeviceUid();
			unsubscribers.push(subscribeStats((s) => (totalSeconds = s.totalSeconds)));
			unsubscribers.push(subscribeUserDailySeconds(uid, (s) => (todaySeconds = s)));
			unsubscribers.push(subscribeUserWeeklySeconds(uid, (s) => (weekSeconds = s)));
		}
	});

	$effect(() => {
		const hero = rooms.hero;
		const uname = username.current;
		const fb = isFirebaseEnabled();
		if (!fb) return;
		if (hero && uname && hero.id !== lastRoomId) {
			lastRoomId = hero.id;
			timer.setRoomContext({ roomId: hero.id, username: uname });
		}
	});

	onDestroy(() => {
		timer.setRoomContext(null);
		rooms.dispose();
		// D-072: stats subscription cleanup
		for (const u of unsubscribers) u();
		unsubscribers = [];
	});
</script>

<div class="flex min-h-[80dvh] flex-col">
	<!-- Selamlama — D-032, D-042: tek satır ortada, semibold, gri -->
	<header class="pt-4 text-center">
		<p class="text-base font-semibold text-fg-muted">
			Merhaba, {username.current}
		</p>
	</header>

	<!-- Sayaç alanı — D-035: orta, büyük boş alan -->
	<div
		class="relative flex flex-1 flex-col items-center justify-center select-none"
	>
		<div class="text-center">
			<div
				class="tabular-nums text-[88px] font-extralight leading-none tracking-tight text-fg"
			>
				{display}
			</div>
			<p class="mt-3 flex items-center justify-center gap-2 text-sm text-fg-muted">
				{#if showGreenDot}
					<span
						class="inline-block h-2 w-2 rounded-full bg-running"
						aria-hidden="true"
					></span>
				{/if}
				{statusText}
			</p>
		</div>
	</div>

	<!-- Buton + istatistik + reset notu — alt orta -->
	<div class="pb-4">
		<!-- D-038: Buton(lar) -->
		{#if isIdle}
			<button
				onclick={handleStart}
				class="block w-full rounded-full bg-accent px-6 py-4 text-base font-semibold text-black transition-all hover:bg-accent-hover active:scale-95"
			>
				Başlat
			</button>
		{:else if isRunning}
			<div class="grid grid-cols-2 gap-3">
				<button
					onclick={handlePause}
					class="rounded-full border border-border bg-surface px-6 py-4 text-base font-semibold text-fg transition-all hover:bg-surface-2 active:scale-95"
				>
					Duraklat
				</button>
				<button
					onclick={handleStop}
					class="rounded-full px-6 py-4 text-base font-semibold text-[#fca5a5] transition-all active:scale-95"
					style="background: rgba(239, 68, 68, 0.12);"
				>
					Durdur
				</button>
			</div>
		{:else}
			<!-- paused -->
			<div class="grid grid-cols-2 gap-3">
				<button
					onclick={handleResume}
					class="rounded-full bg-accent px-6 py-4 text-base font-semibold text-black transition-all hover:bg-accent-hover active:scale-95"
				>
					Devam Et
				</button>
				<button
					onclick={handleStop}
					class="rounded-full px-6 py-4 text-base font-semibold text-[#fca5a5] transition-all active:scale-95"
					style="background: rgba(239, 68, 68, 0.12);"
				>
					Sıfırla
				</button>
			</div>
		{/if}

		<!-- İstatistik — D-034: tek pill -->
		<div class="mt-6 flex justify-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2 text-sm"
			>
				<span class="text-fg-muted">Bugün:</span>
				<span class="font-semibold tabular-nums">{formatHumanShort(todaySeconds)}</span>
				<span class="text-fg-subtle">·</span>
				<span class="text-fg-muted">Bu hafta:</span>
				<span class="font-semibold tabular-nums">{formatHumanShort(weekSeconds)}</span>
			</div>
		</div>

		<p class="mt-4 text-center text-xs text-fg-subtle">
			Salı 00:00'da sıfırlanır
		</p>
	</div>
</div>

<!-- Kutlama modalı — D-036 -->
{#if showCelebration}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-2xl"
		>
			<h2 class="text-2xl font-semibold tracking-tight">
				Seansı bitirdin <span aria-hidden="true">👏</span>
			</h2>
			<p class="mt-4 text-sm text-fg-muted">
				Bu seans <span class="font-semibold text-fg">{lastSessionSeconds}sn</span> ·
				Bugün toplam <span class="font-semibold text-fg">{formatHumanShort(todaySeconds)}</span> ·
				Bu hafta toplam <span class="font-semibold text-fg">{formatHumanShort(weekSeconds)}</span>
			</p>
			<p class="mt-3 text-sm text-fg-subtle">
				Bu hafta henüz rozet yok — ama her dakika sayılıyor!
			</p>
			<p class="mt-6 text-sm text-fg-muted">
				Sonraki rozet <span class="font-semibold text-fg">İlk Adım</span> için
				<span class="font-semibold text-accent">60dk</span> kaldı.
			</p>
			<button
				onclick={handleCelebrationClose}
				class="mt-6 w-full rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-black transition-colors hover:bg-accent-hover"
			>
				Kapat
			</button>
		</div>
	</div>
{/if}
