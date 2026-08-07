<!--
  Oda Detay Sayfası — Sprint-03 Faz 2 (leaderboard + presence)
  - Oda bilgisi (ad, davet kodu, üye sayısı)
  - Geri butonu
  - Leaderboard (D-047): her üye için username, anlık durum, toplam çalışma süresi
    - Sıralama: totalSeconds desc
    - Stale handling (D-050, D-051): 2 dk+ eski running → "stale"; 5 dk+ eski finished → "son görülme"
  - "Odayı sil" butonu (sadece owner'a görünür, D-049)
  - Onay modalı

  Faz 3'te mesaj/reactions baloncukları eklenecek.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { rooms } from '$lib/stores/rooms.svelte';
	import { username } from '$lib/stores/username.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { isFirebaseEnabled } from '$lib/firebase/client';
	import * as fb from '$lib/firebase/rooms';
	import { playClick } from '$lib/utils/click';

	const roomId = $derived(page.params['id'] ?? '');

	let room = $state<fb.RoomMeta | null>(null);
	let loading = $state(true);
	let notFound = $state(false);

	let confirmOpen = $state(false);
	let deleting = $state(false);
	let copyFeedback = $state<string | null>(null);

	let members = $state<fb.LeaderboardEntry[]>([]);

	let unsubscribeRoom: (() => void) | null = null;
	let unsubscribeMembers: (() => void) | null = null;

	// Faz 1'deki MVP owner check: butonu herkes görür, server-side kontrol yapar
	// (rules şimdilik delete: if true — Sprint-04'te Cloud Function ile sıkılaştırılacak)
	const showDeleteButton = $derived(true);

	// Timer'ı bu odaya bağla — setRoomContext ile (D-019 Firestore + BroadcastChannel hibrit)
	onMount(() => {
		if (!isFirebaseEnabled()) {
			loading = false;
			notFound = true;
			return;
		}
		// Odayı canlı dinle
		unsubscribeRoom = fb.subscribeRoom(roomId, (r) => {
			if (r === null) {
				notFound = true;
			} else {
				room = r;
				notFound = false;
			}
			loading = false;
		});
		// lastOpenedAt güncelle (D-014 hero için)
		void fb.touchRoom(roomId);
		// Members + presence (D-047)
		unsubscribeMembers = fb.subscribeRoomMembers(roomId, (entries) => {
			members = entries;
		});
		// Timer'ı bu odaya bağla — kendi presence'ımızı yazmaya başla
		const uname = username.current;
		if (uname) {
			timer.setRoomContext({ roomId, username: uname });
		}
	});

// $effect: username reactive olarak mount sonrası dolabilir. setRoomContext'i
// uname değiştiğinde tekrar çağır (mount'ta uname null ise bile çalışsın).
$effect(() => {
	const uname = username.current;
	if (uname && roomId) {
		timer.setRoomContext({ roomId, username: uname });
	}
});

	onDestroy(() => {
		if (unsubscribeRoom) unsubscribeRoom();
		if (unsubscribeMembers) unsubscribeMembers();
	});

	function goBack() {
		playClick();
		void goto('/rooms');
	}

	function openConfirm() {
		confirmOpen = true;
	}
	function closeConfirm() {
		confirmOpen = false;
	}

	async function handleDelete() {
		if (!room) return;
		playClick();
		deleting = true;
		const res = await rooms.delete(room.id);
		deleting = false;
		if (res.ok) {
			confirmOpen = false;
			void goto('/rooms');
		} else if (res.reason === 'forbidden') {
			alert('Bu odayı sadece sahibi silebilir.');
			confirmOpen = false;
		} else if (res.reason === 'not-found') {
			alert('Oda zaten silinmiş.');
			confirmOpen = false;
			void goto('/rooms');
		} else {
			alert('Silinemedi: ' + res.reason);
		}
	}

	async function copyCode() {
		const current = room;
		if (!current) return;
		playClick();
		try {
			await navigator.clipboard.writeText(current.inviteCode);
			copyFeedback = current.inviteCode;
			setTimeout(() => {
				if (copyFeedback === current.inviteCode) copyFeedback = null;
			}, 1500);
		} catch {
			alert('Kopyalanamadı — kodu elle seçip kopyalayabilirsin.');
		}
	}

	/** D-047 + D-050 + D-051 — üye satırı durum metni. */
	function statusLabel(entry: fb.LeaderboardEntry): string {
		switch (entry.effective) {
			case 'running':
				return 'çalışıyor';
			case 'paused':
				return 'molada';
			case 'finished':
				return 'bitirdi';
			case 'stale':
				return 'şu an değil';
			case 'finished-late':
				// D-051 — "X dk önce bitti" formatı
				const mins = Math.floor((Date.now() - entry.lastSeen) / 60000);
				if (mins < 60) return `${mins} dk önce bitti`;
				const hours = Math.floor(mins / 60);
				return `${hours} sa önce bitti`;
			case 'idle':
			default:
				return '';
		}
	}

	/** "X dk önce" formatı — mesaj balonları için de kullanılabilir. */
	export function ago(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'şimdi';
		if (mins < 60) return `${mins} dk önce`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} sa önce`;
		const days = Math.floor(hours / 24);
		return `${days} gün önce`;
	}

	function totalText(seconds: number): string {
		if (seconds < 60) return `${seconds}sn`;
		const mins = Math.floor(seconds / 60);
		if (mins < 60) return `${mins} dk`;
		const hours = Math.floor(mins / 60);
		const remMins = mins % 60;
		if (remMins === 0) return `${hours} sa`;
		return `${hours} sa ${remMins} dk`;
	}
</script>

<div class="space-y-6 pt-2">
	<!-- Üst bar: geri butonu -->
	<div class="flex items-center">
		<button
			onclick={goBack}
			class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-fg-muted active:bg-surface-2"
			aria-label="Odalar'a dön"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M15 18l-6-6 6-6" />
			</svg>
			Odalar
		</button>
	</div>

	{#if loading}
		<div class="flex min-h-[40dvh] items-center justify-center text-fg-subtle">Yükleniyor…</div>
	{:else if notFound}
		<div class="space-y-3 pt-8 text-center">
			<p class="text-lg text-fg-muted">Oda bulunamadı.</p>
			<button
				onclick={goBack}
				class="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-bg active:bg-accent-hover"
			>
				Odalar'a dön
			</button>
		</div>
	{:else if room}
		<!-- Oda başlığı -->
		<header class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">{room.name}</h1>
			<p class="text-sm text-fg-muted">
				{room.memberCount} kişi bu odada
			</p>
		</header>

		<!-- Davet kodu kartı -->
		<div class="rounded-2xl border border-border bg-surface p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-fg-subtle">Davet kodu</p>
			<div class="mt-2 flex items-center justify-between rounded-xl bg-bg/60 px-4 py-3">
				<div class="font-mono text-xl tracking-[0.2em] text-fg">{room.inviteCode}</div>
				<button
					type="button"
					onclick={copyCode}
					class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg active:bg-accent-hover"
				>
					{copyFeedback === room.inviteCode ? 'Kopyalandı' : 'Kopyala'}
				</button>
			</div>
		</div>

		<!-- Leaderboard — D-047 + D-050 + D-051 -->
		<section class="space-y-3">
			<h2 class="px-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
				Liderlik tablosu
			</h2>
			{#if members.length === 0}
				<div class="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted">
					<p>Henüz kimse yok. Davet kodunu arkadaşlarınla paylaş.</p>
				</div>
			{:else}
				<div class="space-y-1.5">
					{#each members as m (m.uid)}
						{@const label = statusLabel(m)}
						<div
							class="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
						>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									{#if m.effective === 'running'}
										<span class="inline-block h-2 w-2 rounded-full bg-running" aria-hidden="true"></span>
									{:else if m.effective === 'paused'}
										<span class="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true"></span>
									{/if}
									<span class="truncate font-medium text-fg">{m.username}</span>
								</div>
								{#if label}
									<div class="mt-0.5 text-xs text-fg-muted">{label}</div>
								{/if}
							</div>
							<div class="text-right">
								<div class="font-mono text-sm tabular-nums text-fg">
									{totalText(m.totalSeconds)}
								</div>
								<div class="text-[10px] uppercase tracking-wider text-fg-subtle">toplam</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Sahiplik bilgisi (UI'da gösterilmez, sadece yetki için) -->
		{#if showDeleteButton}
			<div class="pt-4">
				<button
					type="button"
					onclick={openConfirm}
					class="w-full rounded-2xl border border-red-900/40 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/40"
				>
					Odayı sil
				</button>
				<p class="mt-2 text-center text-[11px] text-fg-subtle">
					Sadece odayı kuran kişi silebilir.
				</p>
			</div>
		{/if}
	{/if}
</div>

<!-- Silme onay modalı — D-049 -->
{#if confirmOpen && room}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeConfirm();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeConfirm();
		}}
		tabindex="-1"
	>
		<div
			class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl"
		>
			<h2 id="delete-title" class="text-lg font-semibold">Odayı sil</h2>
			<p class="mt-2 text-sm text-fg-muted">
				<strong class="text-fg">{room.name}</strong> odasını silmek istediğine emin misin?
				Tüm üyelerden çıkarılacak. Bu işlem geri alınamaz.
			</p>
			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={closeConfirm}
					disabled={deleting}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleDelete}
					disabled={deleting}
					class="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white active:bg-red-700 disabled:opacity-40"
				>
					{deleting ? 'Siliniyor…' : 'Evet, sil'}
				</button>
			</div>
		</div>
	</div>
{/if}
