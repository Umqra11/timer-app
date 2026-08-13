<!--
  Liderlik sayfası — Sprint-05 (D-060)
  - Oda yoksa: empty state + "Oda kur" / "Davet koduyla katıl"
  - Oda varsa: tam leaderboard görünümü (username + totalSeconds + presence + reactions)
  - Sahip ise "Odayı sil", üye ise "Odadan ayrıl" (D-062)
  - Multi-room bloklu (D-059): create/join pre-check 'already-in-room' döner
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { rooms, loadCachedMyRooms } from '$lib/stores/rooms.svelte';
	import { username } from '$lib/stores/username.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { isFirebaseEnabled } from '$lib/firebase/client';
	import { getDeviceUid } from '$lib/firebase/uid';
	import * as fb from '$lib/firebase/rooms';
	import * as reactions from '$lib/firebase/reactions';
	import { playClick } from '$lib/utils/click';
	import { formatHumanDuration } from '$lib/utils/format';
	import { liveSeconds } from '$lib/utils/live-timer';

	// 1 saniyelik tick — leaderboard'daki canlı süreler için
	let nowMs = $state(Date.now());

	$effect(() => {
		const handle = setInterval(() => {
			nowMs = Date.now();
		}, 1000);
		return () => clearInterval(handle);
	});

	// === Oda keşfi ===
	let myRooms = $state<fb.RoomMeta[]>([]);
	let checkingRooms = $state(true);

	// === Aktif oda (varsa) ===
	const myRoom = $derived(myRooms.length > 0 ? myRooms[0] : null);

	let room = $state<fb.RoomMeta | null>(null);
	let members = $state<fb.LeaderboardEntry[]>([]);
	let allReactions = $state<reactions.ReactionDoc[]>([]);

	let unsubscribeMyRooms: (() => void) | null = null;
	// M5 fix — Bug B weeklyUnsubs leak. Tek Set<Unsub> ile tüm subscribe
	// return'ları toplanır; effect teardown + onDestroy forEach unsub.
	// rooms.ts:subscribeRoomMembers içindeki inner uid leak'i ayrı takip
	// edilebilir (M5 kapsamı dışı — farklı modül).
	const unsubscribers = new Set<() => void>();
	// C4 fix: touchRoom loop guard. Effect ilk kez bu oda için fire aldığında
	// id'yi kaydet, sonraki snapshot'larda değişmediği sürece tekrar
	// touchRoom çağırma.
	let lastTouchedId: string | null = null;

	// === Create modal ===
	let createOpen = $state(false);
	let createName = $state('');
	let createError = $state<string | null>(null);
	let creating = $state(false);

	// === Join modal ===
	let joinOpen = $state(false);
	let joinCode = $state('');
	let joinError = $state<string | null>(null);
	let joining = $state(false);

	// === Tepki modal ===
	let reactionModalOpen = $state(false);
	let reactionTargetUid = $state<string | null>(null);
	let reactionText = $state('');
	let reactionError = $state<string | null>(null);
	let reactionSending = $state(false);

	// === Delete / Leave modal ===
	let actionModalOpen = $state(false); // 'delete' veya 'leave'
	// I5 fix: in-flight guard — confirm butonuna çift tıklayınca iki paralel
	// deleteRoom/leaveRoom call soradan bug'a yol açıyordu. Diğer 3 modal
	// (create/join/reaction) zaten sending flag'i tutuyor; action modal
	// port sırasında kaybetmişti.
	let actionSending = $state(false);

	const isOwner = $derived(
		room !== null && getDeviceUid() === room.ownerUid
	);

	onMount(() => {
		// 1. Cache'ten anında hydrate — empty state flash'ını önler
		const cached = loadCachedMyRooms();
		if (cached.length > 0) {
			myRooms = cached;
			checkingRooms = false;
		}
		if (!isFirebaseEnabled()) {
			checkingRooms = false;
			return;
		}
		// 2. Firestore'dan fresh snapshot — cache'i günceller
		unsubscribeMyRooms = rooms.subscribeMyRooms((rs) => {
			myRooms = rs;
			checkingRooms = false;
		});
	});

	$effect(() => {
		const rid = myRoom?.id;
		if (!rid || !isFirebaseEnabled()) return;
		const uname = username.current;

		// C4 fix: ID-based derived + once-per-room guard. Önceki kod effect
		// içinde fb.touchRoom(rid) çağırıyordu; subscribeMyRooms her snapshot'ta
		// fresh RoomMeta objesi üretiyor → myRoom referansı değişiyor → effect
		// re-run → yeni touchRoom write → yeni snapshot → sonsuz döngü.
		// Çözüm: lastTouchedId string tutarak sadece oda değişince touch yap.
		if (lastTouchedId !== rid) {
			lastTouchedId = rid;
			void fb.touchRoom(rid);
		}

		// I4 fix: stale state cleanup — oda değiştiğinde eski room/members/
		// reactions'ı sıfırla, böylece yeni snapshot öncesi yanlış veri
		// (A'nın inviteCode'u B'nin altında) göstermeyelim.
		room = null;
		members = [];
		allReactions = [];

		unsubscribers.add(fb.subscribeRoom(rid, (r) => {
			room = r;
		}));
		unsubscribers.add(fb.subscribeRoomMembers(rid, (entries) => {
			members = entries;
		}));
		unsubscribers.add(reactions.subscribeReactions(rid, (rs) => {
			allReactions = rs;
		}));

		if (uname) {
			timer.setRoomContext({ roomId: rid, username: uname });
		}

		return () => {
			// I3 fix: timer context reset — lifecycle listener'lar + presence
			// subscription temizlensin. setRoomContext(null) her teardown'da
			// güvenli: effect re-run'da yeni context set edilir, unmount'ta
			// null kalır (istenen davranış).
			timer.setRoomContext(null);
			// M5: Set<Unsub> drain — re-run'da yeni subscription'lar tekrar eklenir.
			for (const unsub of unsubscribers) {
				try {
					unsub();
				} catch (e) {
					console.warn('[leaderboard] unsub threw', e);
				}
			}
			unsubscribers.clear();
		};
	});

	onDestroy(() => {
		// I3 fix: sayfa kapanırken timer context'i temizle (presence write
		// eski odaya sızmasın). Aynı oda içindeyken setRoomContext(null)
		// çağırmıyoruz — lastTouchedId sayfa aktif kaldığı sürece state'i
		// temsil eder; onDestroy her zaman 'sayfa kapanıyor' demektir.
		timer.setRoomContext(null);
		if (unsubscribeMyRooms) unsubscribeMyRooms();
		for (const unsub of unsubscribers) {
			try {
				unsub();
			} catch (e) {
				console.warn('[leaderboard] unsub threw', e);
			}
		}
		unsubscribers.clear();
	});

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
			default:
				return '';
		}
	}

	function ago(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'şimdi';
		if (mins < 60) return `${mins} dk önce`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} sa önce`;
		return `${Math.floor(hours / 24)} gün önce`;
	}

	function reactionsFor(uid: string): reactions.ReactionDoc[] {
		return allReactions.filter((r) => r.targetUid === uid);
	}

	function openCreate() {
		playClick();
		createName = '';
		createError = null;
		createOpen = true;
	}
	function closeCreate() {
		createOpen = false;
	}
	async function handleCreate() {
		const name = createName.trim();
		if (name.length < 1 || name.length > 40) {
			createError = 'Oda adı 1-40 karakter olmalı';
			return;
		}
		playClick();
		creating = true;
		const res = await rooms.create(name);
		creating = false;
		if (res.ok) {
			// success — subscribeMyRooms otomatik günceller
			createOpen = false;
		} else if (res.reason === 'already-in-room') {
			createError = `Zaten "${myRooms[0]?.name ?? 'bir odada'}" üyesin. Önce ayrılmalısın.`;
		} else if (res.reason === 'invalid') {
			createError = 'Oda adı 1-40 karakter olmalı';
		} else {
			createError = 'Oda kurulamadı. Tekrar dene.';
		}
	}

	function openJoin() {
		playClick();
		joinCode = '';
		joinError = null;
		joinOpen = true;
	}
	function closeJoin() {
		joinOpen = false;
	}
	async function handleJoin() {
		const code = joinCode.trim().toUpperCase();
		if (code.length !== 6) {
			joinError = 'Davet kodu 6 karakter olmalı';
			return;
		}
		playClick();
		joining = true;
		const res = await rooms.joinByCode(code);
		joining = false;
		if (res.ok) {
			// success
			joinOpen = false;
		} else if (res.reason === 'already-in-room') {
			joinError = `Zaten "${myRooms[0]?.name ?? 'bir odada'}" üyesin. Önce ayrılmalısın.`;
		} else if (res.reason === 'not-found') {
			joinError = 'Bu kodla bir oda bulunamadı';
		} else if (res.reason === 'invalid') {
			joinError = 'Davet kodu 6 karakter olmalı';
		} else {
			joinError = 'Katılınamadı. Tekrar dene.';
		}
	}

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
		if (!myRoom || !reactionTargetUid) return;
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
		const res = await reactions.sendReaction(myRoom.id, reactionTargetUid, text, uname);
		reactionSending = false;
		if (res.ok) closeReactionModal();
		else if (res.reason === 'rate-limit')
			reactionError = 'Çok sık tepki gönderiyorsun. Biraz yavaşla.';
		else if (res.reason === 'self-target')
			reactionError = 'Kendine tepki gönderemezsin.';
		else reactionError = 'Gönderilemedi: ' + res.reason;
	}

	function openActionModal() {
		playClick();
		actionModalOpen = true;
	}
	function closeActionModal() {
		if (actionSending) return; // ux: in-flight sırasında kapatmayı engelle
		actionModalOpen = false;
	}
	async function handleAction() {
		if (!myRoom) return;
		playClick();
		actionSending = true;
		try {
			if (isOwner) {
				const res = await rooms.delete(myRoom.id);
				actionModalOpen = false;
				if (!res.ok) {
					if (res.reason === 'forbidden') alert('Bu odayı sadece sahibi silebilir.');
					else if (res.reason === 'not-found') alert('Oda zaten silinmiş.');
					else alert('Oda silinemedi. Tekrar dene.');
				}
				// başarı: subscribeMyRooms otomatik günceller
			} else {
				const res = await fb.leaveRoom(myRoom.id);
				actionModalOpen = false;
				if (!res.ok) alert('Ayrılınamadı. Tekrar dene.');
			}
		} finally {
			actionSending = false;
		}
	}
</script>

<div class="space-y-6 pt-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Liderlik</h1>
		<p class="text-sm text-fg-muted">Odadaki sıralama</p>
	</header>

	{#if !isFirebaseEnabled()}
		<div
			class="rounded-3xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted"
		>
			<p>📊 Liderlik için Firebase bağlantısı gerekli. .env.local'e VITE_FIREBASE_* ekle.</p>
		</div>
	{:else if checkingRooms}
		<div class="flex min-h-[40dvh] items-center justify-center text-fg-subtle">Yükleniyor…</div>
	{:else if !myRoom}
		<!-- Empty state — oda yok -->
		<div class="space-y-6 pt-6 text-center">
			<div
				class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-accent"
				>
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
					<path d="M4 22h16" />
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
					<path
						d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
					/>
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
				</svg>
			</div>
			<p class="text-lg font-semibold">Henüz bir odaya üye değilsin</p>
			<p class="text-sm text-fg-muted">
				Arkadaşlarınla birlikte çalışmak için bir oda kur veya katıl.
			</p>

			<div class="space-y-3 pt-2">
				<button
					onclick={openCreate}
					class="block w-full rounded-full bg-accent px-6 py-4 text-base font-semibold text-black active:bg-accent-hover"
				>
					Oda kur
				</button>
				<button
					onclick={openJoin}
					class="block w-full rounded-full border border-border bg-surface px-6 py-4 text-base font-semibold text-fg active:bg-surface-2"
				>
					Davet koduyla katıl
				</button>
			</div>
		</div>
	{:else if !room}
		<!-- Not-found state — joinedRooms'da var ama room doc silinmiş (C2).
		     Normal akışta deleteRoom joinedRooms doc'unu da siler (D-062), bu
		     görünüm sadece stale snapshot / orphan edge-case için güvenlik ağı. -->
		<div class="space-y-6 pt-6 text-center">
			<div
				class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-fg-subtle"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 8v4" />
					<path d="M12 16h.01" />
				</svg>
			</div>
			<p class="text-lg font-semibold">Bu oda artık mevcut değil</p>
			<p class="text-sm text-fg-muted">
				{myRoom?.name ?? 'Oda'} silinmiş olabilir. Yeni bir odaya katıl veya kendi odanı kur.
			</p>
			<div class="space-y-3 pt-2">
				<button
					onclick={openJoin}
					class="block w-full rounded-full bg-accent px-6 py-4 text-base font-semibold text-black active:bg-accent-hover"
				>
					Farklı bir odaya katıl
				</button>
				<button
					onclick={openCreate}
					class="block w-full rounded-full border border-border bg-surface px-6 py-4 text-base font-semibold text-fg active:bg-surface-2"
				>
					Yeni oda kur
				</button>
			</div>
		</div>
	{:else if room}
		<!-- Oda başlığı -->
		<header class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">{room.name}</h1>
			<p class="text-sm text-fg-muted">{room.memberCount} kişi bu odada</p>
		</header>

		<!-- Davet kodu — minimalist tek satır -->
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0 flex-1 truncate">
				<div class="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">Davet kodu</div>
				<div class="font-mono text-base tracking-[0.15em] text-fg">{room.inviteCode}</div>
			</div>
			<button
				type="button"
				onclick={async () => {
					try {
						if (!room) return; // null guard (svelte-check strict)
						await navigator.clipboard.writeText(room.inviteCode);
					} catch {
						alert('Kopyalanamadı — kodu elle seçip kopyalayabilirsin.');
					}
				}}
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent active:bg-accent"
				aria-label="Davet kodunu kopyala"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
					<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
				</svg>
			</button>
		</div>

		<!-- Leaderboard -->
		<section class="space-y-3">
			<h2 class="px-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
				Liderlik tablosu
			</h2>
			{#if members.length === 0}
				<div
					class="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted"
				>
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
											<span
												class="inline-block h-2 w-2 shrink-0 rounded-full bg-running pulse-running"
												aria-label="şu an çalışıyor"
											></span>
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
											{formatHumanDuration(Math.floor(liveSeconds(m, nowMs)))}
										</div>
										<div class="text-[10px] uppercase tracking-wider text-fg-subtle">
											{m.effective === 'running' ? 'şu an' : 'bu hafta'}
										</div>
									</div>
									<button
										type="button"
										onclick={() => openReactionModal(m.uid)}
										class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent active:bg-accent"
										aria-label="{m.username} kullanıcısına tepki yaz"
									>
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
												d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
											/>
										</svg>
									</button>
								</div>
							</div>
							{#if userReactions.length > 0}
								<div class="space-y-1.5 border-t border-border px-3 py-2">
									{#each userReactions as r (r.id)}
										<div class="flex items-start gap-2 rounded-lg bg-bg/40 px-3 py-1.5">
											<span class="shrink-0 text-[11px] font-medium text-fg-muted"
												>{r.senderUsername}</span
											>
											<span class="flex-1 text-sm text-fg">{r.text}</span>
											<span class="shrink-0 text-[10px] text-fg-subtle">{ago(r.createdAt)}</span
											>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Action (sahip: sil, üye: ayrıl) -->
		<div class="pt-4">
			{#if isOwner}
				<button
					type="button"
					onclick={openActionModal}
					class="w-full rounded-2xl border border-red-900/40 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-300 active:bg-red-950/40"
				>
					Odayı sil
				</button>
				<p class="mt-2 text-center text-[11px] text-fg-subtle">Sadece sen silebilirsin.</p>
			{:else}
				<button
					type="button"
					onclick={openActionModal}
					class="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-muted active:bg-surface-2"
				>
					Odadan ayrıl
				</button>
			{/if}
		</div>
	{/if}
</div>

{#if createOpen}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeCreate();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeCreate();
		}}
		tabindex="-1"
	>
		<div
			class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl"
		>
			<h2 id="create-title" class="text-lg font-semibold">Oda kur</h2>
			<input
				bind:value={createName}
				maxlength="40"
				placeholder="Oda adı"
				class="mt-4 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
			/>
			{#if createError}<p class="mt-2 text-sm text-red-400">{createError}</p>{/if}
			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={closeCreate}
					disabled={creating}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleCreate}
					disabled={creating || createName.trim().length === 0}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40"
				>
					{creating ? 'Kuruluyor…' : 'Kur'}
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
		onclick={(e) => {
			if (e.target === e.currentTarget) closeJoin();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeJoin();
		}}
		tabindex="-1"
	>
		<div
			class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl"
		>
			<h2 id="join-title" class="text-lg font-semibold">Davet koduyla katıl</h2>
			<input
				bind:value={joinCode}
				maxlength="6"
				placeholder="6 karakter"
				class="mt-4 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-center font-mono text-2xl tracking-[0.2em] text-fg uppercase placeholder:text-fg-subtle focus:border-accent focus:outline-none"
			/>
			{#if joinError}<p class="mt-2 text-sm text-red-400">{joinError}</p>{/if}
			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={closeJoin}
					disabled={joining}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleJoin}
					disabled={joining || joinCode.trim().length !== 6}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40"
				>
					{joining ? 'Katılınıyor…' : 'Katıl'}
				</button>
			</div>
		</div>
	</div>
{/if}

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
			{#if reactionError}<p class="mt-2 text-sm text-red-400">{reactionError}</p>{/if}
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

{#if actionModalOpen && room}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="action-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeActionModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeActionModal();
		}}
		tabindex="-1"
	>
		<div
			class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl"
		>
			<h2 id="action-title" class="text-lg font-semibold">
				{isOwner ? 'Odayı sil' : 'Odadan ayrıl'}
			</h2>
			<p class="mt-2 text-sm text-fg-muted">
				{#if isOwner}
					<strong class="text-fg">{room.name}</strong> odasını silmek istediğine emin misin?
					Tüm üyelerden çıkarılacak. Bu işlem geri alınamaz.
				{:else}
					<strong class="text-fg">{room.name}</strong> odasından ayrılmak istediğine emin
					misin? İstediğin zaman yeni bir odaya katılabilirsin.
				{/if}
			</p>
			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={closeActionModal}
					disabled={actionSending}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40"
				>
					Vazgeç
				</button>
				<button
					type="button"
					onclick={handleAction}
					disabled={actionSending}
					class={isOwner
						? 'flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white active:bg-red-700 disabled:opacity-40'
						: 'flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40'}
				>
					{#if actionSending}
						{isOwner ? 'Siliniyor…' : 'Ayrılıyor…'}
					{:else}
						{isOwner ? 'Evet, sil' : 'Evet, ayrıl'}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
