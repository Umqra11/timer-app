<!--
  Oda Detay Sayfası — Sprint-03 Faz 2 + Faz 3
  - Oda bilgisi (ad, davet kodu, üye sayısı)
  - Geri butonu
  - Leaderboard (D-047, D-050, D-051) + tepki baloncukları (D-052, D-054)
  - "Tepki yaz" (kendine veya seçili üyeye, D-052, D-053 rate limit)
  - "Odayı sil" butonu (D-049)
  - Onay modalı
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { rooms } from '$lib/stores/rooms.svelte';
	import { username } from '$lib/stores/username.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { isFirebaseEnabled } from '$lib/firebase/client';
	import { getDeviceUid } from '$lib/firebase/uid';
	import * as fb from '$lib/firebase/rooms';
	import * as reactions from '$lib/firebase/reactions';
	import { playClick } from '$lib/utils/click';

	const roomId = $derived(page.params['id'] ?? '');

	let room = $state<fb.RoomMeta | null>(null);
	let loading = $state(true);
	let notFound = $state(false);

	let confirmOpen = $state(false);
	let deleting = $state(false);
	let copyFeedback = $state<string | null>(null);

	let members = $state<fb.LeaderboardEntry[]>([]);
	let allReactions = $state<reactions.ReactionDoc[]>([]);

	// Faz 3 — tepki input
	let reactionText = $state('');
	let reactionTargetUid = $state<string | null>(null);
	let reactionSending = $state(false);
	let reactionError = $state<string | null>(null);
	let reactionModalOpen = $state(false);

	let unsubscribeRoom: (() => void) | null = null;
	let unsubscribeMembers: (() => void) | null = null;
	let unsubscribeReactions: (() => void) | null = null;

	const showDeleteButton = $derived(true);

	onMount(() => {
		if (!isFirebaseEnabled()) {
			loading = false;
			notFound = true;
			return;
		}
		unsubscribeRoom = fb.subscribeRoom(roomId, (r) => {
			if (r === null) {
				notFound = true;
			} else {
				room = r;
				notFound = false;
			}
			loading = false;
		});
		void fb.touchRoom(roomId);
		unsubscribeMembers = fb.subscribeRoomMembers(roomId, (entries) => {
			members = entries;
		});
		// Tepkileri dinle (tüm oda için)
		unsubscribeReactions = reactions.subscribeReactions(roomId, (rs) => {
			allReactions = rs;
		});
		// Timer bağlaması $effect'te (reactive tracking — mount + username/roomId değişimi).
	});

	$effect(() => {
		const uname = username.current;
		if (uname && roomId) {
			timer.setRoomContext({ roomId, username: uname });
		}
	});

	onDestroy(() => {
		if (unsubscribeRoom) unsubscribeRoom();
		if (unsubscribeMembers) unsubscribeMembers();
		if (unsubscribeReactions) unsubscribeReactions();
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
			case 'finished-late': {
				const mins = Math.floor((Date.now() - entry.lastSeen) / 60000);
				if (mins < 60) return `${mins} dk önce bitti`;
				const hours = Math.floor(mins / 60);
				return `${hours} sa önce bitti`;
			}
			case 'idle':
			default:
				return '';
		}
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

	// "X dk önce" formatı
	function ago(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'şimdi';
		if (mins < 60) return `${mins} dk önce`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} sa önce`;
		const days = Math.floor(hours / 24);
		return `${days} gün önce`;
	}

	// D-054 — bir kişiye ait tepkileri al
	function reactionsFor(uid: string): reactions.ReactionDoc[] {
		return allReactions.filter((r) => r.targetUid === uid);
	}

	// D-052, D-053 — tepki yazma akışı
	function openReactionModal(targetUid: string) {
		reactionTargetUid = targetUid;
		reactionText = '';
		reactionError = null;
		reactionModalOpen = true;
	}
	function closeReactionModal() {
		reactionModalOpen = false;
		reactionTargetUid = null;
		reactionText = '';
		reactionError = null;
	}

	async function handleSendReaction() {
		if (!room || !reactionTargetUid) return;
		const uname = username.current ?? 'anonim';
		const text = reactionText.trim();
		if (text.length === 0) {
			reactionError = 'Tepki boş olamaz';
			return;
		}
		if (text.length > reactions.REACTION_MAX_LEN) {
			reactionError = `En fazla ${reactions.REACTION_MAX_LEN} karakter`;
			return;
		}
		playClick();
		reactionSending = true;
		reactionError = null;
		const res = await reactions.sendReaction(room.id, reactionTargetUid, text, uname);
		reactionSending = false;
		if (res.ok) {
			closeReactionModal();
		} else if (res.reason === 'rate-limit') {
			reactionError = 'Çok sık tepki gönderiyorsun. Biraz yavaşla.';
		} else {
			reactionError = 'Gönderilemedi: ' + res.reason;
		}
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

		<!-- Kendine tepki yaz — D-052 (leaderboard'dan bağımsız, presence debug'a takılmaz) -->
		<button
			type="button"
			onclick={() => openReactionModal(getDeviceUid())}
			disabled={!username.current}
		>
			💬 Tepki yaz (kendine)
		</button>

		<!-- Leaderboard + Tepki baloncukları (D-047, D-052, D-054) -->
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
						{@const userReactions = reactionsFor(m.uid)}
						<div class="rounded-xl border border-border bg-surface">
							<div class="flex items-center justify-between px-4 py-3">
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
								<div class="flex items-center gap-3">
									<div class="text-right">
										<div class="font-mono text-sm tabular-nums text-fg">
											{totalText(m.totalSeconds)}
										</div>
										<div class="text-[10px] uppercase tracking-wider text-fg-subtle">toplam</div>
									</div>
									<button
										type="button"
										onclick={() => openReactionModal(m.uid)}
										class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent active:bg-accent"
										aria-label="{m.username} kullanıcısına tepki yaz"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
											<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
										</svg>
									</button>
								</div>
							</div>
							<!-- D-054 — tepki baloncukları -->
							{#if userReactions.length > 0}
								<div class="border-t border-border px-3 py-2 space-y-1.5">
									{#each userReactions as r (r.id)}
										<div class="flex items-start gap-2 rounded-lg bg-bg/40 px-3 py-1.5">
											<span class="text-[11px] font-medium text-fg-muted shrink-0">{r.senderUsername}</span>
											<span class="text-sm text-fg flex-1">{r.text}</span>
											<span class="text-[10px] text-fg-subtle shrink-0">{ago(r.createdAt)}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Sahiplik bilgisi -->
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

<!-- Tepki yazma modalı — D-052, D-053 -->
{#if reactionModalOpen && reactionTargetUid}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="reaction-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeReactionModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeReactionModal();
		}}
		tabindex="-1"
	>
		<div
			class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl"
		>
			<h2 id="reaction-title" class="text-lg font-semibold">Tepki yaz</h2>
			<p class="mt-1 text-xs text-fg-subtle">
				Maks {reactions.REACTION_MAX_LEN} karakter · 4 saat sonra kaybolur
			</p>
			<textarea
				bind:value={reactionText}
				maxlength={reactions.REACTION_MAX_LEN}
				rows="3"
				placeholder="Mesajını yaz..."
				class="mt-4 w-full resize-none rounded-2xl border border-border bg-bg px-4 py-3 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
			></textarea>
			<div class="mt-1 text-right text-[11px] text-fg-subtle">
				{reactionText.length}/{reactions.REACTION_MAX_LEN}
			</div>
			{#if reactionError}
				<p class="mt-2 text-sm text-red-400">{reactionError}</p>
			{/if}
			<div class="mt-4 flex gap-3">
				<button
					type="button"
					onclick={closeReactionModal}
					disabled={reactionSending}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleSendReaction}
					disabled={reactionSending || reactionText.trim().length === 0}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40"
				>
					{reactionSending ? 'Gönderiliyor…' : 'Gönder'}
				</button>
			</div>
		</div>
	</div>
{/if}
