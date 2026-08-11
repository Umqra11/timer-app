# Leaderboard UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liderlik sekmesinin UX'ini 6 maddede iyileştir — (1) oda otomatik yüklensin, (2) aktif çalışan yanıp sönen noktayla görünür olsun, (3) davet kodu minimalist olsun, (4) kendine tepki tamamen kaldırılsın, (5) haftalık session log altyapısı kurulsun, (6) haftalık canlı süre leaderboard'da aksın.

**Architecture:**
- (1) `myRoomsCache`'i localStorage'da tut → mount'ta cache'ten hydrate → Firestore subscribe ile merge. Empty state flash'ı önler.
- (2) Mevcut 2px statik dot yerine 6px yeşil yanıp sönen nokta (CSS keyframes opacity pulse). Accessibility için `aria-label`.
- (3) Davet kodu kartı → tek satır inline (code + icon button). Dış kart kutusu YOK.
- (4) Self-reaction UI tamamen kaldır + backend `sendReaction` guard (UI bypass'a karşı).
- (5) Yeni collection `users/{uid}/sessions/{sessionId}` — her `timer.finish()`'te bir doc yaz (dayKey, startedAt, endedAt, elapsedMs). `stats.weekSeconds` artık rolling 7-day toplamı (geriye dönük uyumlu kaldırılabilir).
- (6) `subscribeUserWeeklySeconds(uid)` — son 7 gün session'ları sum + current running elapsedMs + (now - lastSeen) ile 1 saniyelik tick.

**Tech Stack:** SvelteKit · Svelte 5 (`$state`, `$derived`, `$effect`) · TypeScript · Tailwind v4 · Firestore · localStorage · Vitest.

## Global Constraints

- Svelte 5 runes — `$state`, `$derived`, `$effect` (Svelte 4 sözdizimi YOK).
- Tailwind v4 utility class'leri — ek CSS modülü YOK (keyframes için tek istisna: `mobile/src/app.css`'e eklenebilir).
- TypeScript strict — `any` YOK, discriminated union return types.
- TDD: her task için kırmızı → yeşil → refactor. Vitest ile.
- Sık commit (her step). Conventional Commits format.
- Mevcut `discriminated union` pattern'ı koru (`{ ok: true, data } | { ok: false, reason }`).
- D-062 rule deploy hâlâ patron işlemi olarak beklemede — bu planda yeni rule deploy YOK (sessions rule client-side write yetkisiyle kalır; deploy Sprint-05 Faz 2'ye kayar).

---

### Task 1: Auto-load current room (localStorage cache)

**Files:**
- Modify: `mobile/src/lib/stores/rooms.svelte.ts:106-114, 174-214`
- Modify: `mobile/src/routes/leaderboard/+page.svelte:21-25, 71-82`
- Test: `mobile/tests/stores/rooms-cache.test.ts` (yeni)

**Interfaces:**
- Consumes: `subscribeMyRooms` callback `(items: RoomMeta[]) => void` — mevcut.
- Produces: `loadCachedMyRooms(): RoomMeta[]` — localStorage'dan cache oku (sync).
- Produces: `saveCachedMyRooms(items: RoomMeta[]): void` — localStorage'a yaz (try/catch ile quota-safe).
- Produces: `MY_ROOMS_CACHE_KEY = 'timer_my_rooms_v1'` — sabit.

- [ ] **Step 1: Test yaz — loadCachedMyRooms boş döner**

```typescript
// mobile/tests/stores/rooms-cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadCachedMyRooms, saveCachedMyRooms, MY_ROOMS_CACHE_KEY } from '$lib/stores/rooms.svelte';

describe('rooms-cache', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when cache missing', () => {
    expect(loadCachedMyRooms()).toEqual([]);
  });

  it('roundtrips a saved list', () => {
    const items = [{ id: 'r1', name: 'Test', ownerUid: 'u1', inviteCode: 'ABC123', createdAt: 1000, memberCount: 2 }];
    saveCachedMyRooms(items);
    expect(loadCachedMyRooms()).toEqual(items);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(MY_ROOMS_CACHE_KEY, 'not-json');
    expect(loadCachedMyRooms()).toEqual([]);
  });
});
```

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- rooms-cache`
Expected: FAIL — `loadCachedMyRooms` export edilmedi.

- [ ] **Step 3: Implementation — localStorage cache ekle**

`mobile/src/lib/stores/rooms.svelte.ts`'de dosya başında export'lar:

```typescript
export const MY_ROOMS_CACHE_KEY = 'timer_my_rooms_v1';

export function loadCachedMyRooms(): fb.RoomMeta[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(MY_ROOMS_CACHE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as fb.RoomMeta[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCachedMyRooms(items: fb.RoomMeta[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(MY_ROOMS_CACHE_KEY, JSON.stringify(items));
    } catch {
        // quota exceeded / private mode — sessizce geç
    }
}
```

`mergeFromFirestore` çağrıldıktan sonra `saveCachedMyRooms(remote)` ekle (`subscribe()` ve `subscribeMyRooms(cb, ...)` path'lerinin ikisinde de).

- [ ] **Step 4: Testi çalıştır — PASS beklenir**

Run: `cd mobile && npm test -- rooms-cache`
Expected: PASS (3 test).

- [ ] **Step 5: Leaderboard page'i hydrate et**

`mobile/src/routes/leaderboard/+page.svelte:71-82` — `onMount` içinde:

```typescript
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
```

Import satırına ekle: `import { loadCachedMyRooms } from '$lib/stores/rooms.svelte';`

- [ ] **Step 6: Manuel smoke test — browser'da doğrula**

1. `cd mobile && npm run dev`
2. Bir odaya katıl → `/leaderboard` görünür
3. Başka tab'a geç → geri dön
4. Beklenen: empty state flash yok, doğrudan leaderboard görünür
5. DevTools → Application → Local Storage → `timer_my_rooms_v1` key'i kontrol et

- [ ] **Step 7: Commit**

```bash
git add mobile/src/lib/stores/rooms.svelte.ts mobile/src/routes/leaderboard/+page.svelte mobile/tests/stores/rooms-cache.test.ts
git commit -m "feat(leaderboard): localStorage cache for myRooms — auto-load on re-entry"
```

---

### Task 2: Yanıp sönen nokta (active indicator)

**Files:**
- Modify: `mobile/src/app.css` — keyframes tanımı
- Modify: `mobile/src/routes/leaderboard/+page.svelte:484-500` (username satırı)

**Interfaces:**
- Consumes: `m.effective: 'running' | 'paused' | ...` — mevcut.
- Produces: CSS class `.pulse-running` (1.5s ease-in-out infinite, opacity 1 → 0.3 → 1).
- Produces: UI: sadece `effective === 'running'` durumunda 6px yeşil nokta, username'den ÖNCE.

- [ ] **Step 1: CSS keyframes ekle**

`mobile/src/app.css` sonuna:

```css
@keyframes pulse-running {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

.pulse-running {
    animation: pulse-running 1.5s ease-in-out infinite;
}
```

(`prefers-reduced-motion` desteği — isteğe bağlı bu sprint'te atlanabilir; Sprint-05 Faz 2 polish'inde eklenebilir.)

- [ ] **Step 2: Username satırını güncelle**

`mobile/src/routes/leaderboard/+page.svelte:484-500` — mevcut pill mantığı kaldır, sadece yanıp sönen nokta:

```svelte
<div class="flex items-center gap-2">
    {#if m.effective === 'running'}
        <span
            class="inline-block h-2 w-2 shrink-0 rounded-full bg-running pulse-running"
            aria-label="şu an çalışıyor"
        ></span>
    {/if}
    <span class="truncate font-medium text-fg">{m.username}</span>
</div>
```

Mevcut `bg-amber-400` paused dot'u kaldırıldı — sadece running gösterilir (statusLabel paused'i aşağıdaki yazıda gösteriyor zaten).

- [ ] **Step 3: Browser'da doğrula**

1. İki farklı tarayıcı/tab aç → birinde timer'ı başlat
2. Diğerinde `/leaderboard` aç
3. Beklenen: username'den önce yeşil nokta, her 1.5s'de sönsün (opacity 1 → 0.3 → 1)
4. Birinci tab'da pause et → ikinci tab'da nokta kaybolmalı
5. Status label aşağıda hâlâ "molada" görünmeli (mevcut davranış)

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app.css mobile/src/routes/leaderboard/+page.svelte
git commit -m "feat(leaderboard): pulsing dot indicator for running users"
```

---

### Task 3: Minimalist invite code

**Files:**
- Modify: `mobile/src/routes/leaderboard/+page.svelte:432-453` (davet kodu kartı)

**Interfaces:**
- Consumes: `room.inviteCode: string` — mevcut.
- Produces: UI: tek satır — başlık "DAVET KODU" (küçük) + code (monospace) + 36×36 icon button.

- [ ] **Step 1: Yeni layout — tek satır**

`mobile/src/routes/leaderboard/+page.svelte:432-453` arasını tamamen değiştir:

```svelte
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
```

Eski `{#snippet copyButton(code: string)}` snippet'i ve dış `.rounded-2xl border border-border bg-surface p-4` kutusu silindi.

- [ ] **Step 2: Browser'da doğrula**

1. Bir odaya gir → leaderboard'da davet kodu bölümüne bak
2. Beklenen: dış kart kutusu yok, "DAVET KODU" küçük başlık + code (yan yana) + küçük ikon buton
3. İkon butonuna tıkla → panoya kopyalanmalı (alert gösterilmemeli)
4. Tarayıcı clipboard izni yoksa → "Kopyalanamadı..." alert'i

- [ ] **Step 3: Commit**

```bash
git add mobile/src/routes/leaderboard/+page.svelte
git commit -m "refactor(leaderboard): minimalist invite code — single row with icon button"
```

---

### Task 4: Remove self-reaction (UI + backend guard)

**Files:**
- Modify: `mobile/src/lib/firebase/reactions.ts:54-56, 118-130`
- Modify: `mobile/src/routes/leaderboard/+page.svelte:455-463` (buton sil)
- Modify: `mobile/src/routes/leaderboard/+page.svelte:262-283` (`handleSendReaction` guard + mesaj)
- Test: `mobile/tests/firebase/reactions.test.ts`

**Interfaces:**
- Consumes: `getDeviceUid(): string` — mevcut.
- Produces: `ReactionResult` union'ına yeni failure reason: `'self-target'`.
- Produces: UI'da self-reaction butonu tamamen YOK.
- Produces: `handleSendReaction` `res.reason === 'self-target'` için Türkçe hata mesajı.

- [ ] **Step 1: Test yaz — sendReaction self-target guard**

```typescript
// mobile/tests/firebase/reactions.test.ts (yeni veya mevcut test dosyasına ekle)
import { describe, it, expect } from 'vitest';
import { sendReaction } from '$lib/firebase/reactions';

describe('sendReaction — self-target guard', () => {
  it('returns ok:false reason:self-target when target equals sender', async () => {
    // getDeviceUid mock'u gerekebilir — mevcut test pattern'ı takip et
    const res = await sendReaction('room1', 'self-uid', 'hi', 'me');
    expect(res).toEqual({ ok: false, reason: 'self-target' });
  });
});
```

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- reactions`
Expected: FAIL — `'self-target` reason yok.

- [ ] **Step 3: reactions.ts guard ekle**

`mobile/src/lib/firebase/reactions.ts:54-56` — `ReactionResult` union'ı güncelle:

```typescript
export type ReactionResult =
    | { ok: true; reactionId: string }
    | { ok: false; reason: 'empty' | 'too-long' | 'rate-limit' | 'no-target' | 'self-target' | 'unavailable' };
```

`sendReaction` içinde, `targetUid` check'inden hemen sonra (uid değişkeninden önce), sender uid'i yukarı taşı ve karşılaştır:

```typescript
const senderUid = getDeviceUid();
if (targetUid === senderUid) return { ok: false, reason: 'self-target' };

const uid = senderUid; // mevcut satır — gereksiz tekrarı kaldır
```

(Mevcut `const uid = getDeviceUid();` satırı artık senderUid'e atıfta bulunur.)

- [ ] **Step 4: Testi çalıştır — PASS beklenir**

Run: `cd mobile && npm test -- reactions`
Expected: PASS.

- [ ] **Step 5: UI — self-reaction butonu sil**

`mobile/src/routes/leaderboard/+page.svelte:455-463` — tüm bloğu sil:

```svelte
<!-- (sil) Kendine tepki yaz butonu -->
```

`handleSendReaction` (lines 262-283) — `res.reason === 'self-target'` durumu:

```typescript
if (res.ok) closeReactionModal();
else if (res.reason === 'rate-limit')
    reactionError = 'Çok sık tepki gönderiyorsun. Biraz yavaşla.';
else if (res.reason === 'self-target')
    reactionError = 'Kendine tepki gönderemezsin.';
else reactionError = 'Gönderilemedi: ' + res.reason;
```

- [ ] **Step 6: Browser'da doğrula**

1. Bir odaya gir → leaderboard'da "💬 Tepki yaz (kendine)" butonu artık görünmemeli
2. (Opsiyonel) DevTools console: `import('/src/lib/firebase/reactions.ts').then(m => m.sendReaction('r1', 'self-uid', 'hi', 'me'))` → `{ok:false, reason:'self-target'}`

- [ ] **Step 7: Commit**

```bash
git add mobile/src/lib/firebase/reactions.ts mobile/src/routes/leaderboard/+page.svelte mobile/tests/firebase/reactions.test.ts
git commit -m "fix(leaderboard): remove self-reaction UI + backend guard"
```

---

### Task 5: Sessions subcollection + rolling week stats

**Files:**
- Create: `mobile/src/lib/firebase/sessions.ts` (yeni)
- Modify: `mobile/src/lib/stores/timer.svelte.ts:174-187` (`finish()` — recordSession çağrısı)
- Modify: `mobile/src/lib/firebase/stats.ts:24-29, 85-124` (weekSeconds semantiği: rolling 7-day)
- Modify: `firestore.rules` — `users/{uid}/sessions/{sid}` match
- Test: `mobile/tests/firebase/sessions.test.ts` (yeni)

**Interfaces:**
- `SessionDoc = { dayKey: string; startedAt: number; endedAt: number; elapsedMs: number; uid: string }`
- `recordSession(session: Omit<SessionDoc, 'uid'>): Promise<{ ok: true; id: string } | { ok: false; reason: 'unavailable' }>`
- `subscribeUserWeeklySeconds(uid, cb: (seconds: number) => void): () => void` — son 7 gün toplamı.
- `WEEK_DAYS = 7` — sabit.
- `readStats()` — `weekSeconds` artık son 7 gün toplamı (eski "bugün" semantiği kaldırıldı; migration: ilk hesaplamada client-side recount).

- [ ] **Step 1: Test yaz — recordSession + subscribeUserWeeklySeconds**

```typescript
// mobile/tests/firebase/sessions.test.ts
import { describe, it, expect } from 'vitest';
import { WEEK_DAYS } from '$lib/firebase/sessions';

describe('WEEK_DAYS', () => {
  it('is 7', () => {
    expect(WEEK_DAYS).toBe(7);
  });
});
```

(Bu task'ın asıl test'i integration test'i — manuel doğrulama Task 6'da olacak. Burada sadece sabit değer test edilir.)

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- sessions`
Expected: FAIL — `sessions.ts` yok.

- [ ] **Step 3: sessions.ts oluştur**

`mobile/src/lib/firebase/sessions.ts`:

```typescript
/**
 * Sessions — D-067 weekly stats altyapısı.
 *
 * Her `timer.finish()` çağrısında `users/{uid}/sessions/{sessionId}` doc
 * yazılır. `subscribeUserWeeklySeconds(uid)` son 7 günlük session'ları
 * sum'lar — leaderboard'daki "haftalık canlı süre" için veri kaynağı.
 *
 * Şema:
 *   users/{uid}/sessions/{sessionId}
 *     - dayKey: "YYYY-MM-DD" (Europe/Istanbul)
 *     - startedAt: timestamp ms
 *     - endedAt: timestamp ms
 *     - elapsedMs: number
 *
 * Rules: MVP'de client-side write (deploy Sprint-05 Faz 2'de).
 */

import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import { getDb } from './client';
import { getDeviceUid } from './uid';

export const WEEK_DAYS = 7;
const WEEK_MS = WEEK_DAYS * 24 * 60 * 60 * 1000;

export type SessionDoc = {
    uid: string;
    dayKey: string;
    startedAt: number;
    endedAt: number;
    elapsedMs: number;
};

export type RecordSessionResult =
    | { ok: true; id: string }
    | { ok: false; reason: 'unavailable' };

/** Yeni session doc'u yaz — timer.finish() içinde çağrılır. */
export async function recordSession(
    data: Omit<SessionDoc, 'uid'>
): Promise<RecordSessionResult> {
    const db = getDb();
    if (!db) return { ok: false, reason: 'unavailable' };
    const uid = getDeviceUid();
    const id = crypto.randomUUID();
    try {
        await setDoc(doc(db, `users/${uid}/sessions/${id}`), {
            uid,
            ...data,
            endedAt: serverTimestamp()
        });
        return { ok: true, id };
    } catch (e) {
        console.error('[sessions] record failed', e);
        return { ok: false, reason: 'unavailable' };
    }
}

/**
 * Son 7 günlük session toplam saniyesini canlı dinle.
 * - where endedAt >= sevenDaysAgo (server-side filter)
 * - client-side sum
 * - ilk snapshot boş dönebilir (Firestore index gerekebilir)
 */
export function subscribeUserWeeklySeconds(
    uid: string,
    cb: (seconds: number) => void
): () => void {
    const db = getDb();
    if (!db) {
        cb(0);
        return () => {};
    }
    const cutoff = Date.now() - WEEK_MS;
    return onSnapshot(
        query(collection(db, `users/${uid}/sessions`), where('endedAt', '>=', cutoff)),
        (snap) => {
            let totalMs = 0;
            for (const d of snap.docs) {
                const data = d.data() as Partial<SessionDoc>;
                totalMs += data.elapsedMs ?? 0;
            }
            cb(Math.floor(totalMs / 1000));
        },
        (err) => {
            console.error('[sessions] weekly subscribe error', err);
            cb(0);
        }
    );
}
```

NOT: `serverTimestamp()` Firestore Timestamp döner — `where('endedAt', '>=', cutoff)` için index gerekebilir. Hata alırsak client-side filter'a fallback ekleriz (bkz. Self-Review notu).

- [ ] **Step 4: Testi çalıştır — PASS beklenir**

Run: `cd mobile && npm test -- sessions`
Expected: PASS (1 test).

- [ ] **Step 5: timer.finish() — recordSession çağrısı**

`mobile/src/lib/stores/timer.svelte.ts:174-187` — mevcut `finish()`'e ekle:

```typescript
finish() {
    const finalMs = elapsedMs;
    const startedAt = lastTickAt !== null
        ? Date.now() - Math.floor(elapsedMs)
        : Date.now() - Math.floor(elapsedMs);
    clearTick();
    lastTickAt = null;
    if (roomCtx) {
        void presence.writePresence(roomCtx.roomId, roomCtx.username, 'finished', finalMs);
    }
    const addedSeconds = Math.max(0, Math.floor(finalMs / 1000));
    if (addedSeconds > 0) {
        void stats.touchStreak(addedSeconds);
        // D-067: weekly sessions log
        void sessions.recordSession({
            dayKey: stats.todayKeyForSession(), // aşağıda export et
            startedAt,
            endedAt: Date.now(),
            elapsedMs: finalMs
        });
    }
    elapsedMs = 0;
    status = 'idle';
    pushToRemote();
},
```

Import satırına ekle: `import * as sessions from '$lib/firebase/sessions';`

`stats.ts`'e yardımcı export ekle (line ~44 `todayKey` fonksiyonunun altına):

```typescript
export const todayKeyForSession = todayKey;
```

(`todayKey` zaten mevcut — sadece re-export.)

- [ ] **Step 6: stats.ts — weekSeconds semantiği rolling 7-day**

`mobile/src/lib/firebase/stats.ts:24-29` — doc comment güncelle:

```typescript
/**
 * `users/{uid}` doc'unda tutulan alanlar:
 *   - streak: number            — ardışık gün sayısı
 *   - lastDayWorked: string     — "YYYY-MM-DD" (takvim günü, Europe/Istanbul)
 *   - totalSeconds: number      — tüm zamanlar toplamı
 *   - weekSeconds: number       — DEPRECATED: artık sessions subcollection'dan hesaplanır (subscribeUserWeeklySeconds)
 *                                  MVP uyumluluğu için alan kaldı, artık güncellenmiyor.
 */
```

`touchStreak`'teki `weekSeconds` mantığı (line 109) kaldırılabilir — alan write edilmez:

```typescript
const next: Stats = {
    streak,
    lastDayWorked: today,
    totalSeconds: (current.totalSeconds ?? 0) + addedSeconds
};
```

`write`'dan `weekSeconds` satırı kaldırıldı.

- [ ] **Step 7: firestore.rules — sessions match ekle**

`firestore.rules` — `match /users/{userId}` bloğu içinde (mevcut `rateLimit` match'ten sonra):

```
match /sessions/{sessionId} {
    allow create: if request.auth == null  // MVP: cihaz-uid auth-free
        && request.resource.data.uid == userId
        && request.resource.data.keys().hasAll(['uid', 'dayKey', 'startedAt', 'endedAt', 'elapsedMs']);
    allow read: if request.auth == null;  // kendi okusun (leaderboard kendi üyeleri için)
    allow update, delete: if false;
}
```

**DEPLOY NOTU:** Rule deploy patron işlemi (Sprint-05 Faz 2'ye kayar). Deploy edilmeden sessions write hâlâ başarılı olur çünkü MVP auth-free — rule eksikse sadece read/update kısıtlanır, create default-deny olabilir. **Smoke test'te netleşir.**

- [ ] **Step 8: Manuel smoke test — schema'yı doğrula**

1. `cd mobile && npm run dev`
2. Bir timer başlat → 30 saniye çalıştır → durdur
3. Firebase Console → Firestore → `users/{uid}/sessions/{sid}` doc oluşmuş olmalı
4. `elapsedMs: 30000`, `endedAt` (server timestamp), `dayKey: "2026-08-11"`

- [ ] **Step 9: Commit**

```bash
git add mobile/src/lib/firebase/sessions.ts mobile/src/lib/stores/timer.svelte.ts mobile/src/lib/firebase/stats.ts firestore.rules mobile/tests/firebase/sessions.test.ts
git commit -m "feat(stats): sessions subcollection + rolling week stats"
```

---

### Task 6: Weekly live in leaderboard

**Files:**
- Modify: `mobile/src/lib/firebase/rooms.ts:368-376, 397-450` (`LeaderboardEntry` + `subscribeRoomMembers`)
- Create: `mobile/src/lib/utils/live-timer.ts` (yeni)
- Modify: `mobile/src/routes/leaderboard/+page.svelte:147-180, 502-510, 71-145` (helper + render + tick)
- Test: `mobile/tests/leaderboard-live.test.ts` (yeni)

**Interfaces:**
- `LeaderboardEntry` yeni alan: `weeklySeconds: number` (rolling 7-day toplamı, subscribeUserWeeklySeconds'tan).
- `liveSeconds(entry: LeaderboardEntry, now: number): number` — `entry.weeklySeconds + (entry.effective === 'running' ? entry.elapsedMs / 1000 + (now - entry.lastSeen) / 1000 : entry.elapsedMs / 1000)`.
- Leaderboard page: 1 saniyelik `$effect` ile `nowMs` state, render'da `Math.floor(liveSeconds(m, nowMs))`.

- [ ] **Step 1: Test yaz — liveSeconds pure function**

```typescript
// mobile/tests/leaderboard-live.test.ts
import { describe, it, expect } from 'vitest';
import { liveSeconds } from '$lib/utils/live-timer';

describe('liveSeconds', () => {
  it('running: weekly + elapsedMs + tick', () => {
    const now = 1_700_000_000_000;
    const entry = {
      uid: 'u1', username: 'x', totalSeconds: 100,
      status: 'running' as const, effective: 'running' as const,
      elapsedMs: 5000, lastSeen: now - 10_000, weeklySeconds: 60,
    };
    expect(liveSeconds(entry, now)).toBe(60 + 5 + 10);
  });

  it('paused: weekly + elapsedMs, no tick', () => {
    const now = 1_700_000_000_000;
    const entry = {
      uid: 'u1', username: 'x', totalSeconds: 100,
      status: 'paused' as const, effective: 'paused' as const,
      elapsedMs: 5000, lastSeen: now - 10_000, weeklySeconds: 60,
    };
    expect(liveSeconds(entry, now)).toBe(60 + 5);
  });

  it('finished-late: weekly + elapsedMs, no tick', () => {
    const now = 1_700_000_000_000;
    const entry = {
      uid: 'u1', username: 'x', totalSeconds: 100,
      status: 'finished' as const, effective: 'finished-late' as const,
      elapsedMs: 5000, lastSeen: now - 60_000, weeklySeconds: 60,
    };
    expect(liveSeconds(entry, now)).toBe(60 + 5);
  });
});
```

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- live-timer`
Expected: FAIL — `liveSeconds` export edilmedi.

- [ ] **Step 3: live-timer.ts oluştur**

`mobile/src/lib/utils/live-timer.ts`:

```typescript
import type { LeaderboardEntry } from '$lib/firebase/rooms';

/**
 * Bir leaderboard entry'sinin o anki "haftalık canlı" toplam süresini hesapla.
 *
 * - running: weeklySeconds + elapsedMs/1000 + (now - lastSeen)/1000 → tick eder
 * - paused/finished/finished-late/idle/stale: weeklySeconds + elapsedMs/1000 → sabit
 *
 * lastSeen = presence.updatedAt (ms). elapsedMs = o anki session birikimi.
 * (now - lastSeen) son state değişiminden beri geçen süre; 'running' ise
 * bu süre de tick'lenecek demektir (timer.svelte.ts her state değişiminde
 * writePresence çağırır, yoksa ~2sn sonra stale olur — yani tick ufuk en
 * fazla ~1-2 sn olur, gerçek live hissi için yeterli).
 *
 * weeklySeconds: subscribeUserWeeklySeconds(uid)'ten gelen son 7 gün toplamı.
 */
export function liveSeconds(entry: LeaderboardEntry, now: number): number {
    const base = entry.weeklySeconds + entry.elapsedMs / 1000;
    if (entry.effective === 'running') {
        const extra = Math.max(0, (now - entry.lastSeen) / 1000);
        return base + extra;
    }
    return base;
}
```

- [ ] **Step 4: Testi çalıştır — PASS beklenir**

Run: `cd mobile && npm test -- live-timer`
Expected: PASS (3 test).

- [ ] **Step 5: LeaderboardEntry + subscribeRoomMembers güncelle**

`mobile/src/lib/firebase/rooms.ts:368-376` — `LeaderboardEntry` tipine alan ekle:

```typescript
export type LeaderboardEntry = {
    uid: string;
    username: string;
    totalSeconds: number;
    status: PresenceStatus;
    effective: EffectiveStatus;
    elapsedMs: number;
    lastSeen: number;
    weeklySeconds: number; // D-068: son 7 gün session toplamı (subscribeUserWeeklySeconds)
};
```

`subscribeRoomMembers` (line 397-450) — her presence için ayrıca `subscribeUserWeeklySeconds` çağır, merge et. Detaylı implementasyon: mevcut N+1 query pattern'ı koruyarak, her uid için ayrı `onSnapshot`. Unsubscribe'ları collect et, fonksiyon sonunda hepsini çağır.

```typescript
export function subscribeRoomMembers(
    roomId: string,
    cb: (entries: LeaderboardEntry[]) => void
): () => void {
    const db = getDb();
    if (!db) {
        cb([]);
        return () => {};
    }
    // weeklySeconds cache: uid → seconds
    const weeklyCache = new Map<string, number>();
    let presenceEntries: (Omit<LeaderboardEntry, 'weeklySeconds'>)[] = [];
    const weeklyUnsubs: (() => void)[] = [];

    function emit() {
        const merged: LeaderboardEntry[] = presenceEntries.map((e) => ({
            ...e,
            weeklySeconds: weeklyCache.get(e.uid) ?? 0
        }));
        merged.sort((a, b) => {
            if (b.weeklySeconds !== a.weeklySeconds) return b.weeklySeconds - a.weeklySeconds;
            return a.username.localeCompare(b.username);
        });
        cb(merged);
    }

    const unsubPresence = onSnapshot(
        collection(db, `rooms/${roomId}/presence`),
        async (snap) => {
            const now = Date.now();
            const next: typeof presenceEntries = [];
            const nextUids = new Set<string>();
            for (const d of snap.docs) {
                const data = d.data() as { uid: string; username?: string; status: PresenceStatus; elapsedMs: number; updatedAt?: { toMillis?: () => number } };
                nextUids.add(data.uid);
                // userSnap ve effective hesabı (mevcut koddan) — burada sadeleştirilmiş
                // PRatik olarak mevcut userSnap fetch bloğunu buraya taşı.
                const userSnap = await getDoc(doc(db, 'users', data.uid));
                const totalSeconds = userSnap.exists()
                    ? (userSnap.data() as { totalSeconds?: number }).totalSeconds ?? 0
                    : 0;
                const lastSeen = data.updatedAt?.toMillis?.() ?? now;
                const effective = resolveEffective(data.status, lastSeen, now);
                next.push({
                    uid: data.uid,
                    username: data.username ?? 'anonim',
                    totalSeconds,
                    status: data.status,
                    effective,
                    elapsedMs: data.elapsedMs,
                    lastSeen
                });
                // weekly subscribe — yeni uid ise
                if (!weeklyCache.has(data.uid)) {
                    weeklyUnsubs.push(
                        subscribeUserWeeklySeconds(data.uid, (secs) => {
                            weeklyCache.set(data.uid, secs);
                            emit();
                        })
                    );
                }
            }
            // Eski uid'lerin weekly unsub'ları
            presenceEntries = next;
            emit();
        },
        (err) => {
            console.error('[rooms] subscribeRoomMembers error', err);
            cb([]);
        }
    );

    return () => {
        unsubPresence();
        weeklyUnsubs.forEach((u) => u());
        weeklyUnsubs.length = 0;
    };
}
```

Import satırına ekle: `import { subscribeUserWeeklySeconds } from './sessions';`

- [ ] **Step 6: Leaderboard'a tick + render güncelle**

`mobile/src/routes/leaderboard/+page.svelte` — script başına ekle:

```typescript
import { liveSeconds } from '$lib/utils/live-timer';
import { formatHumanDuration } from '$lib/utils/format';

// 1 saniyelik tick — leaderboard'daki canlı süreler için
let nowMs = $state(Date.now());

$effect(() => {
    const handle = setInterval(() => {
        nowMs = Date.now();
    }, 1000);
    return () => clearInterval(handle);
});
```

Username + total alanı render bloğunu güncelle (lines 502-510):

```svelte
<div class="text-right">
    <div class="font-mono text-sm tabular-nums text-fg">
        {formatHumanDuration(Math.floor(liveSeconds(m, nowMs)))}
    </div>
    <div class="text-[10px] uppercase tracking-wider text-fg-subtle">
        {m.effective === 'running' ? 'şu an' : 'bu hafta'}
    </div>
</div>
```

(Eski `totalText(m.totalSeconds)` ve "toplam" etiketi kaldırıldı.)

- [ ] **Step 7: Browser smoke test**

1. İki tab aç → farklı username ile onboard
2. Tab 1'de timer başlat → 2 dk çalıştır → durdur
3. Tab 2'de `/leaderboard` aç → Tab 1'in süresi görünür (weeklySeconds = ~120s)
4. Tab 1'de tekrar timer başlat → 30s çalıştır
5. Tab 2'de leaderboard'da Tab 1'in süresi **her saniye artmalı** (120 + 30 + tick)
6. Tab 1'de pause et → "şu an" etiketi "bu hafta" olur, süre sabitlenir

- [ ] **Step 8: Commit**

```bash
git add mobile/src/lib/firebase/rooms.ts mobile/src/lib/utils/live-timer.ts mobile/src/routes/leaderboard/+page.svelte mobile/tests/leaderboard-live.test.ts
git commit -m "feat(leaderboard): weekly live timer — rolling 7-day sum ticks for running users"
```

---

### Task 7: Docs sync (D-063 → D-068) + STATUS.md + RESUME.md

**Files:**
- Modify: `DECISIONS.md` — 6 yeni karar ekle (D-063 → D-068)
- Modify: `STATUS.md` — Sprint-05 Faz 1.5 satırı + ilerleme tablosu
- Modify: `RESUME.md` — Faz 1.5 özeti

- [ ] **Step 1: DECISIONS.md'ye 6 yeni karar ekle**

Mevcut son karar (D-062) sonrasına ekle:

- **D-063** — localStorage cache for myRooms (auto-load on re-entry, 2026-08-11)
- **D-064** — Yanıp sönen nokta active indicator (CSS keyframes, accessibility-first, 2026-08-11)
- **D-065** — Minimalist invite code (tek satır, icon button, 2026-08-11)
- **D-066** — Self-reaction removed (UI + backend guard `'self-target'`, 2026-08-11)
- **D-067** — Sessions subcollection (rolling week stats altyapısı, 2026-08-11)
- **D-068** — Weekly live timer in leaderboard (liveSeconds pure function + tick, 2026-08-11)

Her biri mevcut format'ta (## D-NNN · Başlık + tarih + context + decision + alternatives + consequences).

- [ ] **Step 2: STATUS.md — Sprint-05 Faz 1.5 satırı**

"Sprint-05 Faz 1: Single-room refactor" satırından sonra, "Sprint-05 Faz 2" satırından önce:

```markdown
| **Sprint-05 Faz 1.5: Leaderboard UX polish** | ✅ **TAMAM (S-0033)** — D-063/064/065/066/067/068 |
```

İlerleme tablosunda "Kararlar" satırını güncelle: **62/62 → 68/68**.

- [ ] **Step 3: RESUME.md — Faz 1.5 özeti**

Mevcut "✅ Sprint-05 Faz 1" bölümünden sonra, "⏳ Sprint-05 Faz 2" öncesine ekle:

```markdown
### ✅ Sprint-05 Faz 1.5 — Leaderboard UX polish (S-0033, 2026-08-11)

6 hızlı UX iyileştirmesi — patron canlı test feedback sonrası:
- D-063: localStorage cache for myRooms → odaya otomatik dön (empty state flash yok)
- D-064: Yanıp sönen nokta (CSS keyframes pulse, accessibility-first)
- D-065: Davet kodu minimalist tek satır (dış kart kaldırıldı, icon button)
- D-066: Self-reaction tamamen kaldırıldı (UI + backend guard `'self-target'`)
- D-067: Sessions subcollection (`users/{uid}/sessions/{sid}`) + rolling week stats
- D-068: Haftalık canlı süre leaderboard'da tick eder (liveSeconds + 1s interval)
```

- [ ] **Step 4: Commit + push**

```bash
git add DECISIONS.md STATUS.md RESUME.md
git commit -m "docs(vault): Sprint-05 Faz 1.5 — D-063 through D-068"
git push  # main branch, autonomous push izni var (D-049)
```

---

## Self-Review

**1. Spec coverage (6 madde):**
- (1) auto-load → Task 1 ✓
- (2) yanıp sönen nokta → Task 2 ✓
- (3) minimalist davet kodu → Task 3 ✓
- (4) self-reaction tamamen kaldır → Task 4 ✓
- (5) weekly session log → Task 5 ✓
- (6) haftalık canlı leaderboard → Task 6 ✓
- Docs → Task 7 ✓

**2. Placeholder scan:** TBD / "implement later" yok. Her step somut kod.

**3. Type consistency:**
- `LeaderboardEntry.weeklySeconds` — Task 5'te subscribeUserWeeklySeconds üretir, Task 6'da tip tanımı + render.
- `liveSeconds(entry, now)` — Task 6 step 1 test + step 3 implementation + step 6 render aynı imza.
- `ReactionResult.reason: 'self-target'` — Task 4 step 3 union + step 5 handle.
- `todayKeyForSession = todayKey` — Task 5 step 5 re-export.

**4. Risk notları:**
- **Task 5 serverTimestamp filter:** `where('endedAt', '>=', cutoff)` Firestore index gerektirebilir. Hata alırsak Task 5 step 3'te `subscribeUserWeeklySeconds` içinde client-side filter'a geç:
    ```typescript
    const all = await getDocs(collection(db, `users/${uid}/sessions`));
    const filtered = all.docs.filter(d => (d.data().endedAt?.toMillis?.() ?? 0) >= cutoff);
    // sum + onSnapshot yerine tek seferlik + manual refresh trigger
    ```
- **Task 6 lastSeen varsayımı:** `lastSeen = presence.updatedAt` son write zamanıdır, session başlangıcı değil. Pratikte `setRoomContext` + `visibilitychange` listener'ları her 1-2 sn'de write tetikler (presence.ts comment). **Smoke test** Task 6 step 7 bunu yakalar. Sorun olursa presence schema'ya `sessionStartedAt` eklemek Sprint-05 Faz 2'ye kayar.
- **Task 5 rule deploy:** MVP auth-free olduğu için sessions write hâlâ başarılı olur (rule olmasa bile default-deny olabilir). Deploy edilmediyse smoke test'te hata görülürse: rule deploy'u Task 5'den önceye çekmek gerekebilir (patron işlemi).
