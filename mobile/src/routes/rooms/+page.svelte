<!--
  Odalar sayfası (D-013 hero + D-014 last-joined hero)
  - En üstte "hero" oda: geniş kart, davet kodu, hızlı katıl
  - Altında liste: diğer odalar (kompakt)
  - "Oda Oluştur" CTA → modal → isim al
  - "Katıl" CTA → modal → davet kodu al
  - Her oda kartı buton olarak tıklanabilir (hero yapar); içerideki Kopyala
    butonu için e.stopPropagation kullanıyoruz — dış kart bir <div role="button">.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { rooms } from '$lib/stores/rooms.svelte';
	let createOpen = $state(false);
	let joinOpen = $state(false);
	let newName = $state('');
	let joinCode = $state('');
	let copyFeedback = $state<string | null>(null);

	// Firestore dinlemesini mount'ta başlat (offline'da no-op).
	$effect(() => {
		rooms.subscribe();
		return () => rooms.dispose();
	});

	function openCreate() {
		newName = '';
		createOpen = true;
	}
	function openJoin() {
		joinCode = '';
		joinOpen = true;
	}
	function closeModals() {
		createOpen = false;
		joinOpen = false;
	}
	async function handleCreate() {
		const created = await rooms.create(newName);
		if (created) closeModals();
	}
	async function handleJoin() {
		const joined = await rooms.joinByCode(joinCode);
		closeModals();
		if (!joined) {
			alert('Bu davet koduna sahip bir oda bulunamadı.');
		}
	}
	async function openRoom(roomId: string) {
		// makeHero önce son katıldığın yapıyor (touchRoom), sonra detaya git
		await rooms.makeHero(roomId);
		void goto(`/rooms/${roomId}`);
	}
	async function copyCode(e: MouseEvent, code: string) {
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(code);
			copyFeedback = code;
			setTimeout(() => {
				if (copyFeedback === code) copyFeedback = null;
			}, 1500);
		} catch {
			alert('Kopyalanamadı — kodu elle seçip kopyalayabilirsin.');
		}
	}

	function joinedAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'şimdi';
		if (mins < 60) return `${mins} dk önce`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} sa önce`;
		const days = Math.floor(hours / 24);
		return `${days} gün önce`;
	}

	function activateOnEnterOrSpace(e: KeyboardEvent, fn: () => void) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	}
</script>

<div class="space-y-6 pt-2">
	<header class="flex items-end justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Odalar</h1>
			<p class="mt-1 text-sm text-fg-muted">Birlikte çalış, hatırla</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={openJoin}
				class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted active:bg-surface-2"
				aria-label="Davet koduyla katıl"
			>
				Katıl
			</button>
			<button
				onclick={openCreate}
				class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg active:bg-accent-hover"
				aria-label="Yeni oda oluştur"
			>
				+ Oda
			</button>
		</div>
	</header>

	{#if rooms.hero}
		{@const r = rooms.hero}
		<div
			role="button"
			tabindex="0"
			onclick={() => openRoom(r.id)}
			onkeydown={(e) => activateOnEnterOrSpace(e, () => openRoom(r.id))}
			class="block w-full rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-2 p-6 text-left transition active:scale-[0.99]"
		>
			<div class="flex items-center gap-2 text-xs font-medium text-accent">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path
						d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
					/>
				</svg>
				Son katıldığın
			</div>
			<div class="mt-3 text-2xl font-semibold tracking-tight">{r.name}</div>
			<div class="mt-1 text-sm text-fg-muted">
				{r.members} kişi bu odada · {joinedAgo(r.joinAt ?? r.createdAt)}
			</div>

			<div class="mt-5 flex items-center justify-between rounded-2xl bg-bg/60 px-4 py-3">
				<div class="font-mono text-base tracking-[0.2em] text-fg">{r.inviteCode}</div>
				<button
					type="button"
					onclick={(e) => copyCode(e, r.inviteCode)}
					class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg active:bg-accent-hover"
					aria-label="Davet kodunu kopyala"
				>
					{copyFeedback === r.inviteCode ? 'Kopyalandı' : 'Kopyala'}
				</button>
			</div>
		</div>
	{/if}

	{#if rooms.others.length > 0}
		<section class="space-y-2">
			<h2 class="px-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
				Diğer odalar
			</h2>
			<div class="space-y-2">
				{#each rooms.others as r (r.id)}
					<div
						role="button"
						tabindex="0"
					onclick={() => openRoom(r.id)}
					onkeydown={(e) => activateOnEnterOrSpace(e, () => openRoom(r.id))}
						class="block w-full cursor-pointer rounded-2xl border border-border bg-surface p-4 text-left transition active:bg-surface-2"
					>
						<div class="flex items-center justify-between">
							<div class="font-medium text-fg">{r.name}</div>
							<div class="font-mono text-xs tracking-wider text-fg-subtle">
								{r.inviteCode}
							</div>
						</div>
						<div class="mt-1 text-xs text-fg-muted">
							{r.members} kişi · son hareket {joinedAgo(r.joinAt ?? r.createdAt)}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

{#if createOpen}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-title"
		onclick={(e) => { if (e.target === e.currentTarget) closeModals(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeModals(); }}
		tabindex="-1"
	>
		<div class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl">
			<h2 id="create-title" class="text-lg font-semibold">Yeni oda</h2>
			<p class="mt-1 text-sm text-fg-muted">Arkadaşlarınla paylaşacağın bir isim seç.</p>
			<input
				bind:value={newName}
				placeholder="ör. Sınav Haftası"
				maxlength="40"
				class="mt-5 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
				autocomplete="off"
			/>
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={closeModals}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleCreate}
					disabled={newName.trim().length === 0}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40"
				>
					Oluştur
				</button>
			</div>
		</div>
	</div>
{/if}

{#if joinOpen}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="join-title"
		onclick={(e) => { if (e.target === e.currentTarget) closeModals(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeModals(); }}
		tabindex="-1"
	>
		<div class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl">
			<h2 id="join-title" class="text-lg font-semibold">Davet kodu</h2>
			<p class="mt-1 text-sm text-fg-muted">6 karakterli kodu gir.</p>
			<input
				bind:value={joinCode}
				placeholder="ör. AKDM42"
				maxlength="6"
				class="mt-5 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none uppercase"
				autocomplete="off"
			/>
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={closeModals}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleJoin}
					disabled={joinCode.trim().length < 6}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40"
				>
					Katıl
				</button>
			</div>
		</div>
	</div>
{/if}
