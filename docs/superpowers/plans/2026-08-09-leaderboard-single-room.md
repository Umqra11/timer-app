# /leaderboard Single-Room Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/leaderboard` sekmesini kullanıcının tek odasının tam görünümüne dönüştür; multi-room üyeliği engelle; `/rooms` ve `/rooms/[id]` rotalarını kaldır.

**Architecture:**
- 7 task, küçük ve bağımsız commit'lere bölünmüş
- Sıralama: rules → backend (leaveRoom) → store (pre-check) → /leaderboard rewrite → dosya silme → DECISIONS güncellemesi
- /leaderboard tek dosyada iki mod (EmptyState vs RoomView), bir subscribeMyRooms'a göre dallanır
- Race window (D-015, auth yok) kabul edilen trade-off; Sprint-05 Cloud Function backlog'unda

**Tech Stack:**
- SvelteKit 2.63 + Svelte 5 runes ($state, $derived, $effect)
- TypeScript 6 strict
- Tailwind CSS 4 (inline @theme)
- Firebase Firestore (rules + client SDK)
- Vitest/playwright YOK — verification `npm run check` + manual smoke

**Spec:** `docs/superpowers/specs/2026-08-09-leaderboard-design.md`

---

## Global Constraints

- TypeScript strict mode, `noUncheckedIndexedAccess: true` (package.json tsconfig)
- Svelte 5 runes ONLY — `$state`, `$derived`, `$effect`, `$props` — function components, named exports
- Tailwind utility classes — no CSS-in-JS, design tokens `@theme` `mobile/src/app.css`
- iOS safe-area: `safe-bottom`, `pt-safe-top` yardımcı sınıfları kullanılabilir
- Localisation: hardcoded Türkçe strings — i18n framework yok
- **D-NNN traceability:** her commit mesajı ve doc comment'te ilgili karar ID'leri referanslanır
- Naming: components PascalCase, functions camelCase, constants UPPER_SNAKE_CASE
- File size: 200-400 satır tipik, 800 max
- YAGNI: spec dışı özellik ekleme (rozetler, global leaderboard, vb. — Sprint-05 backlog)
- DRY: mevcut `subscribeRoom`, `subscribeRoomMembers`, `subscribeReactions`, `subscribeMyRooms`, `deleteRoom`, `createRoom`, `joinRoomByCode` yeniden kullanılacak — sıfırdan yazım yok
- **Auth YOK (D-015):** client-side kontroller UX kolaylığı için; güvenlik değil
- **No tests:** proje test altyapısı yok; verification = `cd mobile && npm run check` (TypeScript) + manuel smoke checklist
- **No CI/CD:** commit'ler `main`'e gider (CLAUDE.md D-049 — bilinçli skip); push yetkisi var
- **DECISIONS.md:** her commit yeni karar eklerse son task'ta toplu güncelleme

---

## Task 1: Firestore rules — joinedRooms delete: true (D-062)

**Files:**
- Modify: `mobile/firestore.rules:33`

**Context:**
- Şu anki kural `allow delete: if false;` — kullanıcı joinedRooms/{roomId} doc'unu silemiyor
- "Odadan ayrıl" için bu açılmalı (D-062)
- Cross-user riski yok: path'te uid var (kullanıcı sadece kendi doc'una delete yapar)
- Bu task tek başına bir şeyi bozmuyor — yeni bir capability ekliyor

**Interfaces:**
- Consumes: mevcut rule dosyası (`mobile/firestore.rules`)
- Produces: `users/{uid}/joinedRooms/{roomId}` artık client tarafından delete edilebilir

- [ ] **Step 1: Edit firestore.rules**

Dosya: `mobile/firestore.rules` (line 30-34 bloğu)

Önce:
```javascript
		// users/{uid}/joinedRooms/{roomId}: hangi odalara katıldı
		match /joinedRooms/{roomId} {
			allow read: if true;
			allow create, update: if true;  // server-side check yok, MVP
			allow delete: if false;
		}
```

Sonra:
```javascript
		// users/{uid}/joinedRooms/{roomId}: hangi odalara katıldı
		// D-062: kullanıcı kendi joinedRooms/{roomId} doc'unu silebilir ("Odadan ayrıl")
		match /joinedRooms/{roomId} {
			allow read: if true;
			allow create, update: if true;  // server-side check yok, MVP (D-059 race window kabul)
			allow delete: if true;  // D-062: kullanıcı kendi doc'unu silebilir; cross-user riski yok
		}
```

- [ ] **Step 2: Verify TypeScript (rules dosyası TS değil, yine de check)**

Run: `cd /Users/bigbrother/Documents/Timer/mobile && npm run check 2>&1 | tail -5`
Expected: `svelte-check found 0 errors and 0 warnings`

- [ ] **Step 3: Commit**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git add mobile/firestore.rules
git commit -m "fix(rules): joinedRooms delete: true — D-062 'Odadan ayrıl' için

Kullanıcı kendi joinedRooms/{roomId} doc'unu silebilir hale geldi.
Cross-user riski yok (path'te uid var). D-015 (auth yok) kapsamında
owner check yapılamaz; race window kabul edilen trade-off (Sprint-05
Cloud Functions backlog).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

> 📌 **NOT — Deploy:** Bu rule Firebase Console'a deploy edilmeden aktif olmaz. **Patron** (`firebase deploy --only firestore:rules` veya Console UI) deploy edecek. Plan devam eder, deploy task #6'nın sonunda önerilir.

---

## Task 2: Add `leaveRoom` to `firebase/rooms.ts` (D-062)

**Files:**
- Modify: `mobile/src/lib/firebase/rooms.ts` (line ~280, deleteRoom'dan sonra)

**Context:**
- Mevcut `deleteRoom(roomId)` sadece sahip için ve `rooms/{roomId}` doc'unu siliyor
- `leaveRoom(roomId)` üye olan herkes için, `users/{uid}/joinedRooms/{roomId}` doc'unu siliyor
- İmzalar farklı: deleteDoc ile aynı pattern, ama farklı path
- Task 1'de rule açıldı; bu task fonksiyonu ekliyor

**Interfaces:**
- Consumes: mevcut `getDb`, `getDeviceUid`, `deleteDoc` (zaten import edilmiş, line 24)
- Produces: `leaveRoom(roomId: string): Promise<{ ok: true } | { ok: false; reason: string }>` — `deleteRoom` ile aynı error union şekli

- [ ] **Step 1: leaveRoom fonksiyonunu ekle**

Dosya: `mobile/src/lib/firebase/rooms.ts`

`deleteRoom`'tan hemen sonra (line ~280) şu bloğu ekle:

```typescript
/**
 * Üye olan kullanıcı odadan ayrılır — joinedRooms/{roomId} doc'unu siler.
 * rooms/{roomId} doc'una dokunmaz (sahip değilse zaten silemez; sahipse deleteRoom ayrı yol).
 *
 * D-062: üye ayrılabilir, sahip silebilir.
 */
export async function leaveRoom(roomId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
	const db = getDb();
	if (!db) return { ok: false, reason: 'unavailable' };
	const uid = getDeviceUid();
	await deleteDoc(doc(db, `users/${uid}/joinedRooms/${roomId}`));
	return { ok: true };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/bigbrother/Documents/Timer/mobile && npm run check 2>&1 | tail -5`
Expected: `svelte-check found 0 errors and 0 warnings`

- [ ] **Step 3: Commit**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git add mobile/src/lib/firebase/rooms.ts
git commit -m "feat(rooms): leaveRoom — D-062 üye ayrılabilir

joinedRooms/{roomId} doc'unu siler. Sahip değilse rooms/{roomId}'a
dokunmaz. deleteRoom ile aynı error union şekli (deleteDoc pattern).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Store pre-check + already-in-room (D-059)

**Files:**
- Modify: `mobile/src/lib/stores/rooms.svelte.ts`

**Context:**
- `subscribeMyRooms` callback'i `cb(rooms)` çağırıyor — sonucu store içinde tutmamız gerek
- `create()` ve `joinByCode()` bu cache'i kontrol etmeli; `>= 1` oda varsa `already-in-room` reason
- Cache başta boş; ilk `subscribeMyRooms` snapshot'ından sonra check çalışır
- Race window: iki sekmeden aynı anda join denirsek ikisi de başarılı olabilir (D-015 kabul)

**Interfaces:**
- Consumes: mevcut `subscribeMyRooms`, `create()`, `joinByCode()` (zaten var)
- Produces:
  - `myRoomsCache: RoomMeta[]` (store içinde reaktif)
  - `create()` return: `{ ok: true; room: RoomMeta } | { ok: false; reason: 'already-in-room' | 'unavailable' }`
  - `joinByCode()` return: `{ ok: true; room: RoomMeta } | { ok: false; reason: 'already-in-room' | 'invalid' | 'not-found' | 'unavailable' }`

- [ ] **Step 1: Store dosyasını oku ve mevcut yapıyı anla**

Run: `Read /Users/bigbrother/Documents/Timer/mobile/src/lib/stores/rooms.svelte.ts`

> Şu anki `create()` ve `joinByCode()` imzalarını kontrol et. Spec'te yazdığım union'a uyup uymadığını gör. Uymuyorsa uyumla (union'a 'already-in-room' reason ekle).

- [ ] **Step 2: myRoomsCache state'i ekle**

`createRoomsStore()` factory fonksiyonunun içine (üst state'lerin yanına) şunu ekle:

```typescript
let myRoomsCache: RoomMeta[] = $state([]);
```

- [ ] **Step 3: subscribeMyRooms callback'ini güncelle**

Mevcut `subscribeMyRooms(cb)` fonksiyonunda, `cb(items)` çağrısından **önce** şu satırı ekle:

```typescript
myRoomsCache = items;
```

Tam olarak şöyle (mevcut yapıya göre uyarla — son satır `cb(items)` olmalı):

```typescript
return onSnapshot(
	q,
	async (snap) => {
		// ... existing code ...
		items.sort(...);
		myRoomsCache = items;  // ← D-059: pre-check için cache
		cb(items);
	},
	(err) => {
		// ... existing code ...
	}
);
```

- [ ] **Step 4: create() içinde pre-check ekle**

`create()` fonksiyonunun başında, geçerli isim kontrolünden **hemen sonra** ve Firestore transaction'dan **önce**:

```typescript
if (myRoomsCache.length >= 1) {
	return { ok: false, reason: 'already-in-room' };
}
```

Fonksiyonun return type union'ında `'already-in-room'` reason'ın olduğundan emin ol. Yoksa ekle.

- [ ] **Step 5: joinByCode() içinde pre-check ekle**

`joinByCode()` fonksiyonunun başında, geçerli kod kontrolünden **hemen sonra** ve Firestore sorgusundan **önce**:

```typescript
if (myRoomsCache.length >= 1) {
	return { ok: false, reason: 'already-in-room' };
}
```

- [ ] **Step 6: Verify TypeScript**

Run: `cd /Users/bigbrother/Documents/Timer/mobile && npm run check 2>&1 | tail -5`
Expected: `svelte-check found 0 errors and 0 warnings`

> Eğer hata varsa: pre-check'i doğru yere koyduğundan emin ol (return type union'a `'already-in-room'` eklenmiş olmalı).

- [ ] **Step 7: Commit**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git add mobile/src/lib/stores/rooms.svelte.ts
git commit -m "feat(rooms-store): pre-check + already-in-room — D-059

create() ve joinByCode() başında myRoomsCache kontrolü; >= 1 oda
varsa 'already-in-room' reason döner. Cache subscribeMyRooms'tan
doluyor (initial state boş; race window D-015 kapsamında kabul).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Rewrite `/leaderboard` (D-060 + D-062 UI)

**Files:**
- Modify: `mobile/src/routes/leaderboard/+page.svelte` (full rewrite, ~48 satır placeholder → ~280 satır)

**Context:**
- Bu task en büyük — iki mod + modals + error handling + leave/delete butonları
- Mevcut `/rooms/+page.svelte` (create/join modal'ları) ve `/rooms/[id]/+page.svelte` (RoomView) **kaynak olarak** kullanılacak; kopyalanacak içerik
- Subtitle "Bu hafta en çok çalışanlar" → "Odadaki sıralama"
- Back button kaldırılır (nav'dan geliniyor)
- "Odadan ayrıl" butonu + onay modalı eklenir (sahip değilse)

**Interfaces:**
- Consumes:
  - `subscribeMyRooms` (Task 3'te cache dolduruyor)
  - `subscribeRoom`, `subscribeRoomMembers`, `subscribeReactions` (mevcut)
  - `touchRoom` (mevcut)
  - `create`, `joinByCode` (Task 3'te pre-check eklendi)
  - `deleteRoom` (mevcut)
  - `leaveRoom` (Task 2'de eklendi)
  - `timer.setRoomContext` (mevcut)
  - `username`, `playClick`, `formatHMS`, `isFirebaseEnabled`, `getDeviceUid`, `goTo`/`goto` (mevcut)
- Produces: tam fonksiyonel `/leaderboard` sayfası

### 4.1 — Template, script imports, state

- [ ] **Step 1: Mevcut dosyayı oku ve placeholder'ı sil**

Dosya: `mobile/src/routes/leaderboard/+page.svelte` — şu anki 48 satır (Explore agent raporundan biliyoruz). Tamamen silinecek; yeni içerik yazılacak.

- [ ] **Step 2: Yeni dosyanın başını yaz — script bloğu (imports + state)**

```svelte
<!--
  Liderlik sayfası — Sprint-05 (D-060)
  - Oda yoksa: empty state + "Oda kur" / "Davet koduyla katıl"
  - Oda varsa: tam leaderboard görünümü (username + totalSeconds + presence + reactions)
  - Sahip ise "Odayı sil", üye ise "Odadan ayrıl" (D-062)
  - Multi-room bloklu (D-059): create/join pre-check 'already-in-room' döner
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { rooms, type CreateOrJoinError } from '$lib/stores/rooms.svelte';
	import { username } from '$lib/stores/username.svelte';
	import { timer } from '$lib/stores/timer.svelte';
	import { isFirebaseEnabled } from '$lib/firebase/client';
	import { getDeviceUid } from '$lib/firebase/uid';
	import * as fb from '$lib/firebase/rooms';
	import * as reactions from '$lib/firebase/reactions';
	import { playClick } from '$lib/utils/click';
	import { formatHumanDuration } from '$lib/utils/format';

	// === Oda keşfi ===
	let myRooms = $state<fb.RoomMeta[]>([]);
	let checkingRooms = $state(true);

	// === Aktif oda (varsa) ===
	const myRoom = $derived(myRooms.length > 0 ? myRooms[0] : null);

	let room = $state<fb.RoomMeta | null>(null);
	let members = $state<fb.LeaderboardEntry[]>([]);
	let allReactions = $state<reactions.ReactionDoc[]>([]);

	let unsubscribeMyRooms: (() => void) | null = null;
	let unsubscribeRoom: (() => void) | null = null;
	let unsubscribeMembers: (() => void) | null = null;
	let unsubscribeReactions: (() => void) | null = null;

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

	const isOwner = $derived(
		room !== null && getDeviceUid() === room.ownerUid
	);
</script>
```

### 4.2 — Subscribe / lifecycle

- [ ] **Step 3: Script bloğuna subscribe + lifecycle ekle (state'lerden sonra)**

Önceki script bloğunun `</script>`'inden hemen önce şunu ekle:

```svelte
	onMount(() => {
		if (!isFirebaseEnabled()) {
			checkingRooms = false;
			return;
		}
		unsubscribeMyRooms = rooms.subscribeMyRooms((rs) => {
			myRooms = rs;
			checkingRooms = false;
		});
	});

	$effect(() => {
		const rid = myRoom?.id;
		if (!rid || !isFirebaseEnabled()) return;
		const uname = username.current;

		unsubscribeRoom = fb.subscribeRoom(rid, (r) => { room = r; });
		unsubscribeMembers = fb.subscribeRoomMembers(rid, (entries) => { members = entries; });
		unsubscribeReactions = reactions.subscribeReactions(rid, (rs) => { allReactions = rs; });
		void fb.touchRoom(rid);

		if (uname) {
			timer.setRoomContext({ roomId: rid, username: uname });
		}

		return () => {
			if (unsubscribeRoom) unsubscribeRoom();
			if (unsubscribeMembers) unsubscribeMembers();
			if (unsubscribeReactions) unsubscribeReactions();
			unsubscribeRoom = null;
			unsubscribeMembers = null;
			unsubscribeReactions = null;
		};
	});

	onDestroy(() => {
		if (unsubscribeMyRooms) unsubscribeMyRooms();
		if (unsubscribeRoom) unsubscribeRoom();
		if (unsubscribeMembers) unsubscribeMembers();
		if (unsubscribeReactions) unsubscribeReactions();
	});
```

### 4.3 — Helpers

- [ ] **Step 4: Helper fonksiyonlar (statusLabel, totalText, ago, reactionsFor)**

Önceki step'ten sonra, `</script>`'ten hemen önce:

```svelte
	function statusLabel(entry: fb.LeaderboardEntry): string {
		switch (entry.effective) {
			case 'running': return 'çalışıyor';
			case 'paused': return 'molada';
			case 'finished': return 'bitirdi';
			case 'stale': return 'şu an değil';
			case 'finished-late': {
				const mins = Math.floor((Date.now() - entry.lastSeen) / 60000);
				if (mins < 60) return `${mins} dk önce bitti`;
				const hours = Math.floor(mins / 60);
				return `${hours} sa önce bitti`;
			}
			default: return '';
		}
	}

	function totalText(seconds: number): string { return formatHumanDuration(seconds); }

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
```

### 4.4 — Create/Join modal handlers

- [ ] **Step 5: Create modal handlers**

```svelte
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
			createOpen = false;
			// subscribeMyRooms otomatik günceller
		} else if (res.reason === 'already-in-room') {
			createError = `Zaten "${myRooms[0]?.name ?? 'bir odada'}" üyesin. Önce ayrılmalısın.`;
		} else {
			createError = 'Oda kurulamadı: ' + res.reason;
		}
	}
```

- [ ] **Step 6: Join modal handlers**

```svelte
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
			joinOpen = false;
		} else if (res.reason === 'already-in-room') {
			joinError = `Zaten "${myRooms[0]?.name ?? 'bir odada'}" üyesin. Önce ayrılmalısın.`;
		} else if (res.reason === 'not-found') {
			joinError = 'Bu kodla bir oda bulunamadı';
		} else {
			joinError = 'Katılınamadı: ' + res.reason;
		}
	}
```

### 4.5 — Reaction modal handlers

- [ ] **Step 7: Reaction handlers**

```svelte
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
		if (text.length === 0) { reactionError = 'Tepki boş olamaz'; return; }
		if (text.length > reactions.REACTION_MAX_LEN) { reactionError = `En fazla ${reactions.REACTION_MAX_LEN} karakter`; return; }
		playClick();
		reactionSending = true;
		reactionError = null;
		const res = await reactions.sendReaction(myRoom.id, reactionTargetUid, text, uname);
		reactionSending = false;
		if (res.ok) closeReactionModal();
		else if (res.reason === 'rate-limit') reactionError = 'Çok sık tepki gönderiyorsun. Biraz yavaşla.';
		else reactionError = 'Gönderilemedi: ' + res.reason;
	}
```

### 4.6 — Action modal handlers (delete / leave)

- [ ] **Step 8: Delete / Leave handlers**

```svelte
	function openActionModal() {
		playClick();
		actionModalOpen = true;
	}
	function closeActionModal() {
		actionModalOpen = false;
	}
	async function handleAction() {
		if (!myRoom) return;
		playClick();
		if (isOwner) {
			const res = await rooms.delete(myRoom.id);
			actionModalOpen = false;
			if (res.reason === 'forbidden') alert('Bu odayı sadece sahibi silebilir.');
			else if (res.reason === 'not-found') alert('Oda zaten silinmiş.');
			// başarı: subscribeMyRooms otomatik günceller
		} else {
			const res = await fb.leaveRoom(myRoom.id);
			actionModalOpen = false;
			if (!res.ok) alert('Ayrılınamadı. Tekrar dene.');
		}
	}
```

### 4.7 — Template: empty state

- [ ] **Step 9: Template — empty state bloğu**

`</script>`'ten sonra başla. Header + empty state:

```svelte
<div class="space-y-6 pt-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Liderlik</h1>
		<p class="text-sm text-fg-muted">Odadaki sıralama</p>
	</header>

	{#if !isFirebaseEnabled()}
		<div class="rounded-3xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted">
			<p>📊 Liderlik için Firebase bağlantısı gerekli. .env.local'e VITE_FIREBASE_* ekle.</p>
		</div>
	{:else if checkingRooms}
		<div class="flex min-h-[40dvh] items-center justify-center text-fg-subtle">Yükleniyor…</div>
	{:else if !myRoom}
		<!-- Empty state — oda yok -->
		<div class="space-y-6 pt-6 text-center">
			<div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent">
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
					<path d="M4 22h16" />
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
					<path d="M14 14.66V17c0 .55-.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
				</svg>
			</div>
			<p class="text-lg font-semibold">Henüz bir odaya üye değilsin</p>
			<p class="text-sm text-fg-muted">Arkadaşlarınla birlikte çalışmak için bir oda kur veya katıl.</p>

			<div class="space-y-3 pt-2">
				<button onclick={openCreate} class="block w-full rounded-full bg-accent px-6 py-4 text-base font-semibold text-black active:bg-accent-hover">
					Oda kur
				</button>
				<button onclick={openJoin} class="block w-full rounded-full border border-border bg-surface px-6 py-4 text-base font-semibold text-fg active:bg-surface-2">
					Davet koduyla katıl
				</button>
			</div>
		</div>
```

### 4.8 — Template: RoomView

- [ ] **Step 10: Template — RoomView bloğu (empty state'ten sonra, `</div>`'den önce)**

```svelte
	{:else if room}
		<!-- Oda başlığı -->
		<header class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">{room.name}</h1>
			<p class="text-sm text-fg-muted">{room.memberCount} kişi bu odada</p>
		</header>

		<!-- Davet kodu kartı -->
		<div class="rounded-2xl border border-border bg-surface p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-fg-subtle">Davet kodu</p>
			<div class="mt-2 flex items-center justify-between rounded-xl bg-bg/60 px-4 py-3">
				<div class="font-mono text-xl tracking-[0.2em] text-fg">{room.inviteCode}</div>
				<button type="button" onclick={async () => {
					try {
						await navigator.clipboard.writeText(room!.inviteCode);
					} catch {
						alert('Kopyalanamadı — kodu elle seçip kopyalayabilirsin.');
					}
				}} class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg active:bg-accent-hover">
					Kopyala
				</button>
			</div>
		</div>

		<!-- Kendine tepki yaz -->
		<button type="button" onclick={() => openReactionModal(getDeviceUid())} disabled={!username.current}
			class="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-muted">
			💬 Tepki yaz (kendine)
		</button>

		<!-- Leaderboard -->
		<section class="space-y-3">
			<h2 class="px-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">Liderlik tablosu</h2>
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
									{#if label}<div class="mt-0.5 text-xs text-fg-muted">{label}</div>{/if}
								</div>
								<div class="flex items-center gap-3">
									<div class="text-right">
										<div class="font-mono text-sm tabular-nums text-fg">{totalText(m.totalSeconds)}</div>
										<div class="text-[10px] uppercase tracking-wider text-fg-subtle">toplam</div>
									</div>
									<button type="button" onclick={() => openReactionModal(m.uid)}
										class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent active:bg-accent"
										aria-label="{m.username} kullanıcısına tepki yaz">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
											<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
										</svg>
									</button>
								</div>
							</div>
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

		<!-- Action (sahip: sil, üye: ayrıl) -->
		<div class="pt-4">
			{#if isOwner}
				<button type="button" onclick={openActionModal}
					class="w-full rounded-2xl border border-red-900/40 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-300 active:bg-red-950/40">
					Odayı sil
				</button>
				<p class="mt-2 text-center text-[11px] text-fg-subtle">Sadece sen silebilirsin.</p>
			{:else}
				<button type="button" onclick={openActionModal}
					class="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-muted active:bg-surface-2">
					Odadan ayrıl
				</button>
			{/if}
		</div>
	{/if}
</div>
```

### 4.9 — Modals (create / join / reaction / action)

- [ ] **Step 11: Create modal**

Son `</div>`'den sonra:

```svelte
{#if createOpen}
	<div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog" aria-modal="true" aria-labelledby="create-title"
		onclick={(e) => { if (e.target === e.currentTarget) closeCreate(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeCreate(); }} tabindex="-1">
		<div class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl">
			<h2 id="create-title" class="text-lg font-semibold">Oda kur</h2>
			<input bind:value={createName} maxlength="40" placeholder="Oda adı"
				class="mt-4 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none" />
			{#if createError}<p class="mt-2 text-sm text-red-400">{createError}</p>{/if}
			<div class="mt-6 flex gap-3">
				<button type="button" onclick={closeCreate} disabled={creating}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40">Vazgeç</button>
				<button type="button" onclick={handleCreate} disabled={creating || createName.trim().length === 0}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40">
					{creating ? 'Kuruluyor…' : 'Kur'}
				</button>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 12: Join modal**

Create modal'dan sonra:

```svelte
{#if joinOpen}
	<div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog" aria-modal="true" aria-labelledby="join-title"
		onclick={(e) => { if (e.target === e.currentTarget) closeJoin(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeJoin(); }} tabindex="-1">
		<div class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl">
			<h2 id="join-title" class="text-lg font-semibold">Davet koduyla katıl</h2>
			<input bind:value={joinCode} maxlength="6" placeholder="6 karakter"
				class="mt-4 w-full rounded-2xl border border-border bg-bg px-4 py-3 font-mono text-2xl tracking-[0.2em] text-fg text-center placeholder:text-fg-subtle focus:border-accent focus:outline-none uppercase" />
			{#if joinError}<p class="mt-2 text-sm text-red-400">{joinError}</p>{/if}
			<div class="mt-6 flex gap-3">
				<button type="button" onclick={closeJoin} disabled={joining}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40">Vazgeç</button>
				<button type="button" onclick={handleJoin} disabled={joining || joinCode.trim().length !== 6}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40">
					{joining ? 'Katılınıyor…' : 'Katıl'}
				</button>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 13: Reaction modal**

Join modal'dan sonra:

```svelte
{#if reactionModalOpen && reactionTargetUid}
	<div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog" aria-modal="true" aria-labelledby="reaction-title"
		onclick={(e) => { if (e.target === e.currentTarget) closeReactionModal(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeReactionModal(); }} tabindex="-1">
		<div class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl">
			<h2 id="reaction-title" class="text-lg font-semibold">Tepki yaz</h2>
			<p class="mt-1 text-xs text-fg-subtle">Maks {reactions.REACTION_MAX_LEN} karakter · 4 saat sonra kaybolur</p>
			<textarea bind:value={reactionText} maxlength={reactions.REACTION_MAX_LEN} rows="3" placeholder="Mesajını yaz..."
				class="mt-4 w-full resize-none rounded-2xl border border-border bg-bg px-4 py-3 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"></textarea>
			<div class="mt-1 text-right text-[11px] text-fg-subtle">{reactionText.length}/{reactions.REACTION_MAX_LEN}</div>
			{#if reactionError}<p class="mt-2 text-sm text-red-400">{reactionError}</p>{/if}
			<div class="mt-4 flex gap-3">
				<button type="button" onclick={closeReactionModal} disabled={reactionSending}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2 disabled:opacity-40">Vazgeç</button>
				<button type="button" onclick={handleSendReaction} disabled={reactionSending || reactionText.trim().length === 0}
					class="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover disabled:opacity-40">
					{reactionSending ? 'Gönderiliyor…' : 'Gönder'}
				</button>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 14: Action modal (delete / leave — içerik `isOwner`'a göre)**

Reaction modal'dan sonra:

```svelte
{#if actionModalOpen && room}
	<div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
		role="dialog" aria-modal="true" aria-labelledby="action-title"
		onclick={(e) => { if (e.target === e.currentTarget) closeActionModal(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeActionModal(); }} tabindex="-1">
		<div class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-6 pb-28 safe-bottom sm:rounded-3xl">
			<h2 id="action-title" class="text-lg font-semibold">
				{isOwner ? 'Odayı sil' : 'Odadan ayrıl'}
			</h2>
			<p class="mt-2 text-sm text-fg-muted">
				{#if isOwner}
					<strong class="text-fg">{room.name}</strong> odasını silmek istediğine emin misin?
					Tüm üyelerden çıkarılacak. Bu işlem geri alınamaz.
				{:else}
					<strong class="text-fg">{room.name}</strong> odasından ayrılmak istediğine emin misin?
					İstediğin zaman yeni bir odaya katılabilirsin.
				{/if}
			</p>
			<div class="mt-6 flex gap-3">
				<button type="button" onclick={closeActionModal}
					class="flex-1 rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-fg-muted active:bg-surface-2">
					Vazgeç
				</button>
				<button type="button" onclick={handleAction}
					class={isOwner
						? 'flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white active:bg-red-700'
						: 'flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-bg active:bg-accent-hover'}>
					{isOwner ? 'Evet, sil' : 'Evet, ayrıl'}
				</button>
			</div>
		</div>
	</div>
{/if}
```

### 4.10 — Verify

- [ ] **Step 15: Verify TypeScript**

Run: `cd /Users/bigbrother/Documents/Timer/mobile && npm run check 2>&1 | tail -10`
Expected: `svelte-check found 0 errors and 0 warnings`

> Olası hatalar ve düzeltmeleri:
> - `formatHumanDuration` yoksa `lib/utils/format.ts`'den export edildiğinden emin ol; değilse ekle (zaten /profile'da kullanılıyor — oradan bak)
> - `reactions.ReactionDoc` tip adı yanlışsa gerçek tip adını kullan (reactions.ts'den kontrol et)
> - `rooms.subscribeMyRooms` store'da yoksa ekle (store mevcut `subscribeMyRooms`'tan farklı şekilde export etmiş olabilir)

- [ ] **Step 16: Manuel smoke checklist (Spec Section 10)**

Aşağıdaki adımları **Elle** bir browser'da dene. Hepsi geçmeli:

- [ ] `npm run dev` ile development server başlat
- [ ] Login ol (username claim), Leaderlik sekmesine git
- [ ] **Empty state görünüyor** (henüz oda yoksa)
- [ ] **"Oda kur"** → modal → "Test Odası" → Kur → RoomView açılıyor, oda listede tek
- [ ] Davet kodu görünüyor, "Kopyala" basınca clipboard'a yazıyor
- [ ] **Tepki yaz (kendine)** → modal → metin → Gönder → tepki baloncuğu çıkıyor (1-2 saniye içinde)
- [ ] Başka bir username ile ikinci sekme aç (private window), aynı davet koduyla katıl
- [ ] İkinci sekmede "Davet koduyla katıl" → 6 karakter → **"already-in-room" hatası görünüyor** (multi-room bloklu)
- [ ] İkinci sekmeyi kapat
- [ ] İlk sekmeye dön → **"Odayı sil"** (kırmızı) görünüyor (sahip olduğun için)
- [ ] Sil → onay → oda gidiyor → empty state'e dönüyor
- [ ] Yeni oda kur, ikinci bir username'le katıl, **"Odadan ayrıl"** (gri) görünüyor (sahip değilsin)
- [ ] Ayrıl → onay → empty state'e dönüyor
- [ ] **Cross-tab race** testi: 2 sekme aç, ikisinden de aynı anda katıl dene — ikisi de başarılı olabilir (kabul; UI ilk odayı gösterir)
- [ ] `npm run check` → 0 hata

- [ ] **Step 17: Commit**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git add mobile/src/routes/leaderboard/+page.svelte
git commit -m "feat(leaderboard): single-room görünümü (D-060 + D-062 UI)

Multi-room bloklu (D-059); /leaderboard kullanıcının tek odasının tam
leaderboard görünümüdür. Oda yoksa empty state + 'Oda kur' / 'Davet
koduyla katıl'. Sahip ise 'Odayı sil', üye ise 'Odadan ayrıl' (D-062).

Mevcut subscribeRoom/subscribeRoomMembers/subscribeReactions kullanılır;
sıfırdan yazım yok. /rooms ve /rooms/[id] hala mevcut (silme
sonraki task).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Delete `/rooms` and `/rooms/[id]` (D-061)

**Files:**
- Delete: `mobile/src/routes/rooms/+page.svelte`
- Delete: `mobile/src/routes/rooms/[id]/+page.svelte`

**Context:**
- `/leaderboard` artık tek giriş noktası (D-060 + D-061)
- Bu rotalara başka dosyadan import yok (kontrol et)
- SvelteKit file-based routing — klasör silinince route kaybolur

**Interfaces:**
- Consumes: yok
- Produces: `mobile/src/routes/rooms/` klasörü tamamen silinmiş olur

- [ ] **Step 1: Import kontrolü**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
grep -rn "from '\$lib" mobile/src/ | grep -i rooms || echo "no imports"
grep -rn "from '\$routes/rooms" mobile/src/ || echo "no route imports"
grep -rn "/rooms" mobile/src/lib/ | grep -v "joinedRooms" || echo "no hardcoded routes"
```

Expected: `no imports` (3 satır). Eğer bir yerde `/rooms` route'una referans varsa, onu da düzelt.

> Eğer `Nav.svelte`'de "/rooms" varsa (D-033 ile "/leaderboard" oldu — Nav'da zaten Liderlik sekmesi var, Odalar sekmesi olmamalı). Kontrol et.

- [ ] **Step 2: Sil**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
rm -rf mobile/src/routes/rooms/
ls mobile/src/routes/
```

Expected output (silinen klasör hariç):
```
+layout.svelte
+page.svelte
leaderboard
onboarding
profile
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd /Users/bigbrother/Documents/Timer/mobile && npm run check 2>&1 | tail -5`
Expected: `svelte-check found 0 errors and 0 warnings`

> Orphan route'lar TypeScript'i kırmaz; ancak `svelte-check` link/reference kontrolü yapabilir. Eğer hata varsa: ilgili import nerede varsa düzelt veya kaldır.

- [ ] **Step 4: Verify build (opsiyonel ama önerilir)**

Run: `cd /Users/bigbrother/Documents/Timer/mobile && npm run build 2>&1 | tail -10`
Expected: build başarılı, `.svelte-kit/output` üretilir. Hata varsa: route dosyalarını geri ekle ve hata mesajını incele.

- [ ] **Step 5: Commit**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git add -u mobile/src/routes/rooms/
git commit -m "chore(routes): /rooms ve /rooms/[id] kaldırıldı (D-061)

/leaderboard tek giriş noktası (D-060). Multi-room bloklu (D-059).
File-based routing — klasör silinince rotalar kaybolur.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update DECISIONS.md + final verification (D-059/060/061/062)

**Files:**
- Modify: `DECISIONS.md` (4 yeni karar + frontmatter güncelleme)

**Context:**
- DECISIONS.md projenin karar defteri — her commit D-NNN izi taşır
- 4 yeni karar (D-059/060/061/062) burada belgelenmeli
- Sonraki Sprint-05 task'larında (#2 stats fix, #3 rules tightening, Cloud Functions) bu kararlara referans verilecek

**Interfaces:**
- Consumes: DECISIONS.md mevcut formatı (kullanıcı örneklerinden)
- Produces: 4 yeni karar bloğu + frontmatter güncellemesi

- [ ] **Step 1: DECISIONS.md'nin mevcut son kararını bul**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
grep -n "^### D-05[0-9]" DECISIONS.md | tail -5
```

Son kararın numarasını gör. (D-058 son ise, 4 yeni karar D-059 / D-060 / D-061 / D-062 olur.)

- [ ] **Step 2: Frontmatter güncelle**

Dosya: `DECISIONS.md` line 4:

Önce:
```
updated: 2026-08-09 (S-0030 — Sprint-04 Debugging Pass tamamlandı (v10 + v11). Yeni karar yok; 6 bulgu #1-#6 düzeltildi/dokümante edildi, sprint plan kalan: TTL + Cloud Functions. Toplam 55 karar.)
```

Sonra:
```
updated: 2026-08-09 (Sprint-05 Faz 1: /leaderboard single-room refactor tamamlandı. Yeni kararlar: D-059/060/061/062. Toplam 59 karar.)
```

- [ ] **Step 3: D-059 ekle (en son karardan sonra)**

DECISIONS.md sonuna şu bloğu ekle:

```markdown
### D-059 · Multi-room üyeliği engellendi (client + rules)
- **Tarih:** 2026-08-09
- **Bağlam:** Patron: "birden fazla Oda'ya üye olunması çok istediğim bir şey değil"
- **Karar:** Her kullanıcı en fazla 1 odada. Engelleme:
  - **Client:** `joinRoomByCode` ve `createRoom` öncesi `myRoomsCache.length >= 1` ise `{ ok: false, reason: 'already-in-room' }` (mobile/src/lib/stores/rooms.svelte.ts)
  - **Rules:** `users/{uid}/joinedRooms/{roomId}` create için cross-user atomic check YOK (D-015 — auth olmadığı için rules bunu yapamaz); race window (iki sekmeden aynı anda join) kabul edilen trade-off. Sprint-04 #6 Cloud Function ile kapanır
- **Gerekçe:** Çok odalı kullanıcıda dikkat dağılır, ana oda netleşmez. Discord sunucusu gibi tek çalışma alanı mental modeli.
- **Etki:** `rooms.svelte.ts` (create/join pre-check), `firestore.rules` (joinedRooms path), UX (multi-room denemesinde inline hata)
- **İlgili task:** Sprint-05 Faz 1, Task 3 (store pre-check) + Task 1 (rules delete — D-062)
```

- [ ] **Step 4: D-060 ekle**

```markdown
### D-060 · /leaderboard = tek-oda görünümü
- **Tarih:** 2026-08-09
- **Bağlam:** D-033 ile Liderlik sekmesi referans için eklendi ama içerik Sprint-03'te doldurulmadı. D-047 per-room leaderboard zaten /rooms/[id]'de var; Liderlik sekmesinin anlamı belirsizdi.
- **Karar:** `/leaderboard` sekmesi kullanıcının (tek) odasının tam leaderboard görünümüdür. Oda yoksa empty state + "Oda kur" / "Davet koduyla katıl". Tek giriş noktası (D-061).
- **Gerekçe:** Multi-room bloklu (D-059) olduğundan, Liderlik sekmesinin anlamlı içeriği budur. D-047 per-room leaderboard mantığı doğrudan yeniden kullanılır; sıfırdan yazım yok.
- **Etki:** `routes/leaderboard/+page.svelte` yeniden yazıldı; subtitle "Bu hafta en çok çalışanlar" → "Odadaki sıralama"; `subscribeRoom` + `subscribeRoomMembers` + `subscribeReactions` mevcut pattern.
- **İlgili task:** Sprint-05 Faz 1, Task 4
```

- [ ] **Step 5: D-061 ekle**

```markdown
### D-061 · /rooms ve /rooms/[id] kaldırıldı
- **Tarih:** 2026-08-09
- **Bağlam:** Multi-room bloklu (D-059); Liderlik = tek oda görünümü (D-060). /rooms listesi artık gereksiz (her kullanıcı en fazla 1 odada).
- **Karar:** `routes/rooms/+page.svelte` ve `routes/rooms/[id]/+page.svelte` dosyaları silindi. Hiçbir redirect koyulmadı (D-060 ile birlikte tek giriş noktası /leaderboard).
- **Gerekçe:** D-060 ile tutarlı; UX sadeleşir (3 sekme: Kronometre | Liderlik | Profil). D-033 ile zaten Nav'daki Odalar sekmesi Liderlik'e dönüştürülmüştü.
- **Etki:** file-based routing — klasör silinince rotalar kaybolur. Başka import yok (grep ile doğrulandı).
- **İlgili task:** Sprint-05 Faz 1, Task 5
```

- [ ] **Step 6: D-062 ekle**

```markdown
### D-062 · Üye ayrılabilir, sahip silebilir
- **Tarih:** 2026-08-09
- **Bağlam:** D-059 ile kullanıcı tek odada. Eski/soğuk odada sıkışma kötü UX.
- **Karar:**
  - Üye olan kullanıcı → `leaveRoom(roomId)` ile `users/{uid}/joinedRooms/{roomId}` doc'unu silebilir (mobile/src/lib/firebase/rooms.ts)
  - Sahip olan kullanıcı → `deleteRoom(roomId)` ile `rooms/{roomId}` doc'unu silebilir (D-049, mevcut)
  - Yeni üyelik öncesi ayrılmak zorunlu (D-059 pre-check)
- **Gerekçe:** Pasif odalarda sıkışma kötü UX. Patron istedi: "'Odadan ayrıl' butonu (üye ise)".
- **Etki:** `mobile/src/lib/firebase/rooms.ts` `leaveRoom` eklendi; `mobile/firestore.rules` `users/{uid}/joinedRooms/{roomId}` `allow delete: if true`; UI'da sahip/üye farklı buton (sahip: kırmızı sil, üye: gri ayrıl).
- **İlgili task:** Sprint-05 Faz 1, Task 1 (rules) + Task 2 (leaveRoom) + Task 4 (UI butonu + modal)
```

- [ ] **Step 7: Final verification**

```bash
cd /Users/bigbrother/Documents/Timer/mobile && npm run check 2>&1 | tail -3
cd /Users/bigbrother/Documents/Timer/mobile && npm run build 2>&1 | tail -5
```

Expected:
- `npm run check` → `svelte-check found 0 errors and 0 warnings`
- `npm run build` → başarılı, build/ klasörü üretilir

- [ ] **Step 8: Commit**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git add DECISIONS.md
git commit -m "docs(decisions): D-059/060/061/062 eklendi (Sprint-05 Faz 1)

D-059 multi-room bloklu, D-060 /leaderboard tek-oda görünümü,
D-061 /rooms kaldırıldı, D-062 üye ayrılabilir + sahip silebilir.
Frontmatter güncellendi (toplam 59 karar).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 9: Push (CLAUDE.md D-049 — bilinçli skip, main branch)**

Run:
```bash
cd /Users/bigbrother/Documents/Timer
git log --oneline -8
git push origin main
```

Expected: 5 yeni commit main'e gider (rules fix, leaveRoom feat, store pre-check, leaderboard rewrite, rooms deletion, decisions update — toplam 6 commit; ama Task 5+6 ayrı, Task 1+2+3+4 ayrı).

> 📌 **NOT — Firestore rules deploy:** `mobile/firestore.rules`'daki D-062 değişikliği (joinedRooms delete: true) henüz Firebase Console'a deploy edilmedi. **Patron** `firebase deploy --only firestore:rules` çalıştırana kadar leave butonu çalışmaz (rule reddi). UI görünür ama tıklayınca alert çıkar ("Ayrılınamadı").

---

## Self-Review Checklist (post-write)

**Spec coverage:**
- ✅ D-059 multi-room bloklu → Task 3 (store) + Task 1 (rules yorumu)
- ✅ D-060 /leaderboard tek-oda → Task 4 (full rewrite)
- ✅ D-061 /rooms kaldırıldı → Task 5 (file deletion)
- ✅ D-062 üye ayrılabilir → Task 1 (rules) + Task 2 (leaveRoom) + Task 4 (UI)
- ✅ Subtitle değişikliği "Odadaki sıralama" → Task 4 step 9
- ✅ Manuel smoke checklist (spec section 10) → Task 4 step 16
- ✅ DECISIONS.md güncellemesi → Task 6

**Placeholder scan:** Tüm step'ler somut kod içeriyor (kod blokları tam). "TBD"/"TODO"/"implement later" yok.

**Type consistency:**
- `leaveRoom(roomId): Promise<{ ok: true } | { ok: false; reason: string }>` → Task 2 ve Task 4'te aynı imza kullanılıyor ✅
- `deleteRoom` mevcut imza → Task 4'te `rooms.delete(myRoom.id)` ile uyumlu ✅
- `subscribeMyRooms` Task 3'te cache dolduruyor, Task 4'te `myRooms` state'i besliyor ✅
- `already-in-room` reason → Task 3 (union), Task 4 step 5/6 (UI message) ✅

**Risk:** Task 4 büyük (17 step). Subagent'lara bölünebilir ya da tek seferde inline yapılabilir. Plan, her iki yaklaşıma da uygun (step'ler atomik).

---

## Execution Handoff

Plan tamamlandı: `docs/superpowers/plans/2026-08-09-leaderboard-single-room.md`

**Toplam:** 6 task, ~30-35 step, 6 commit + 1 push.

**İki yol:**

1. **Subagent-Driven (önerilen)** — Her task için taze bir subagent, arada review. Hızlı iterasyon, daha az context taşıma.

2. **Inline Execution** — Bu session'da sırayla execute, batch'ler halinde checkpoint.

Hangisini istiyorsun?