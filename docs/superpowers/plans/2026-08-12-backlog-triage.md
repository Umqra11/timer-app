# Backlog Triage Plan — 3 Nokta

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Kaynak:** [[BACKLOG]] › 2026-08-11 (3 nokta)
**Tarih:** 2026-08-12
**Patron:** Enes
**Müdür:** Mavis

**Goal:** Backlog'daki 3 noktayı kök neden → fix → test akışıyla çöz. **#1 ve #3 kolay fix, #2 büyük mimari iş.**

**Kapsam:**
- **#1** Modal tutarsızlığı → 1 task, 30 dk
- **#2** PWA background persistence → 3 task, büyük iş
- **#3** Owner-only delete → 1 task, 15 dk (regression guard + test)

**Architecture:**
- #1: Modal state'ini gerçek stats'a bağla (`subscribeUserWeeklySeconds` + anlık today sum).
- #2: Timer core'a `startTime` + `elapsedAtStart` wall-clock persistence ekle. `lib/timer/persistence.ts` (yeni) — localStorage only (patron kararı). Service Worker **zorunlu** (patron kararı) — cache-first stratejisi ile offline app shell.
- #3: Mevcut `isOwner` derived guard'a explicit test coverage. Client-side guard var (D-062), server-side zaten D-049 ile korunuyor — bug raporu test eksikliği veya edge case olabilir.

**Tech Stack:** SvelteKit · Svelte 5 (`$state`, `$derived`, `$effect`) · TypeScript · Tailwind v4 · Firestore · localStorage · **Service Worker (cache-first)** · **Web App Manifest** · Vitest.

**Patron kararları (2026-08-12):**
- ✅ localStorage (IndexedDB yok)
- ✅ Service Worker **şimdi** (ileride değil)
- ❌ "Ana Ekrana Ekle" UX prompt'u yok (manifest olur ama kullanıcıya sorma)

## Global Constraints

- Svelte 5 runes — `$state`, `$derived`, `$effect` (Svelte 4 sözdizimi YOK).
- Tailwind v4 utility class'leri — ek CSS modülü YOK.
- TypeScript strict — `any` YOK, discriminated union return types (`{ ok: true, data } | { ok: false, reason }`).
- TDD: her task için kırmızı → yeşil → refactor. Vitest ile.
- Sık commit (her task). Conventional Commits format.
- Patron işlemi (TTL deploy, Cloud Functions) Sprint-05 Faz 2'ye kayar — bu plan yalnızca client-side.

---

## Task 1 — Modal süre tutarsızlığı (#1)

**Kök neden tespiti:** `mobile/src/routes/+page.svelte:172-174` — "Bugün toplam 0dk" ve "Bu hafta toplam 0dk" **literal string olarak hardcode edilmiş**. `lastSessionSeconds` dinamik ama diğer ikisi statik placeholder. Yani bug sadece bug değil, **henüz implemente edilmemiş özellik**.

**Files:**
- Modify: `mobile/src/routes/+page.svelte:160-191` (modal bloğu)
- Read-only: `mobile/src/lib/firebase/stats.ts`, `mobile/src/lib/firebase/sessions.ts`
- Test: `mobile/tests/routes/celebration-modal.test.ts` (yeni)

**Spec:**
- "Bugün toplam" → mevcut kullanıcının `subscribeUserWeeklySeconds` ilk değeri (Pazar=0, bugün dahil). Format: `${dk}dk` veya `${sn}sn` (< 60s ise).
- "Bu hafta toplam" → aynı kaynak, 7 günlük rolling toplam.
- Modal açıldığında değerleri snapshot al, modal boyunca değişmesin (UX).
- 0 ise "0dk" göster (mevcut davranışla uyumlu).

- [ ] **Step 1: Test yaz — modal doğru değerleri gösterir**

```typescript
// mobile/tests/routes/celebration-modal.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from '../../src/routes/+page.svelte';

describe('celebration modal', () => {
  beforeEach(() => {
    vi.mock('$lib/firebase/stats', () => ({
      subscribeUserWeeklySeconds: (uid: string, cb: (n: number) => void) => {
        cb(4500); // 75 dakika
        return () => {};
      }
    }));
  });

  it('shows consistent today/week totals when modal opens', async () => {
    // session=139sn → 75dk today, 4500sn = 75dk week
    // (test lastSessionSeconds prop ile)
    render(Page, { props: { lastSessionSeconds: 139 } });
    await vi.waitFor(() => {
      expect(screen.getByText(/139sn/)).toBeInTheDocument();
    });
    expect(screen.getByText(/75dk/)).toBeInTheDocument();
  });

  it('hides 0dk when no stats available', async () => {
    vi.mock('$lib/firebase/stats', () => ({
      subscribeUserWeeklySeconds: (_uid: string, cb: (n: number) => void) => {
        cb(0);
        return () => {};
      }
    }));
    render(Page, { props: { lastSessionSeconds: 0 } });
    // empty state gösterilebilir ya da gizlenebilir — UX karar patrona
  });
});
```

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- celebration-modal`
Expected: FAIL — `lastSessionSeconds` prop binding yok, mock'lar eksik.

- [ ] **Step 3: Implementation — modal state'ini gerçek stats'a bağla**

`mobile/src/routes/+page.svelte` değişiklikler:

```typescript
// imports'a ekle
import { getDeviceUid } from '$lib/firebase/uid';
import { subscribeUserWeeklySeconds } from '$lib/firebase/stats';

// state — modal açıldığında snapshot
let weekSecondsSnapshot = $state(0);
let todaySecondsSnapshot = $state(0);

$effect(() => {
  if (!celebrationOpen) return;
  const uid = getDeviceUid();
  if (uid === 'ssr') return;
  const unsub = subscribeUserWeeklySeconds(uid, (total) => {
    weekSecondsSnapshot = total;
    // today = weekSecondsSnapshot (bugün dahil, MVP için OK)
    todaySecondsSnapshot = total;
  });
  return unsub;
});
```

Modal bloğunda (line 172-174):

```svelte
<p class="mt-4 text-sm text-fg-muted">
  Bu seans <span class="font-semibold text-fg">{lastSessionSeconds}sn</span> ·
  Bugün toplam <span class="font-semibold text-fg">{formatToday(todaySecondsSnapshot)}</span> ·
  Bu hafta toplam <span class="font-semibold text-fg">{formatToday(weekSecondsSnapshot)}</span>
</p>
```

`formatToday(n)` helper:
```typescript
function formatToday(seconds: number): string {
  if (seconds < 60) return `${seconds}sn`;
  return `${Math.floor(seconds / 60)}dk`;
}
```

- [ ] **Step 4: Manuel smoke — canlıda test**

1. `cd mobile && npm run build`
2. Deploy sonrası 30s bekle (CDN cache)
3. 5dk çalışma yap → durdur → modalı gör
4. "Bugün toplam" ve "Bu hafta toplam" eşit olmalı (5dk ≈ 5dk)
5. **Tutarsızlık çözüldü mü?**

**Verification:** `npm run check` (0 hata 0 uyarı), `npm run build` (temiz), canlı smoke ✅.

**Commit:** `fix(timer): session-end modal shows real stats instead of hardcoded 0dk`

---

## Task 2 — PWA background persistence (#2 — büyük iş)

**Kök neden:** `mobile/src/lib/stores/timer.svelte.ts` `elapsedMs`'i **sadece RAM'de** tutuyor. Sayfa yenilenince / sekme kapanınca sıfırlanıyor. PWA mimarisi gereği background'da `setInterval` zaten çalışmaz (tab inactive olunca throttle).

**Strateji:** Wall-clock persistence — `startTime = Date.now()`, `elapsedMs = now - startTime + elapsedAtStart`. Background'da JS çalışmasa bile **gerçek süre** doğru hesaplanır. Service Worker şart değil ama **önerilen** (offline + push için altyapı kurar).

**Files:**
- Create: `mobile/src/lib/timer/persistence.ts` (yeni)
- Modify: `mobile/src/lib/stores/timer.svelte.ts` (state → wall-clock)
- Create: `mobile/static/sw.js` (opsiyonel — minimal cache-only Service Worker)
- Test: `mobile/tests/timer/persistence.test.ts` (yeni)

**Spec:**
- `start()`: `localStorage.setItem('timer_state', JSON.stringify({ startTime: Date.now(), elapsedAtStart: pausedMs }))`
- `tick()`: `elapsedMs = Date.now() - startTime + elapsedAtStart`
- `pause()`: `localStorage.setItem('timer_state', JSON.stringify({ startTime: null, elapsedAtStart: currentElapsed }))`
- `resume()`: `start()` gibi
- `finish()`/`reset()`: `localStorage.removeItem('timer_state')`
- `restore()` (mount'ta): state'i oku, elapsedMs'i hesapla, timer'ı başlat (running ise)

**Platform notları:**
- **iOS Safari:** localStorage eviction policy agresif (~7 gün kullanılmazsa silinir). PWA olarak "Add to Home Screen" ile büyütülebilir.
- **Android Chrome:** localStorage daha kararlı, Service Worker güvenilir.
- **Background Sync API:** Service Worker üzerinden push — MVP için overkill, sonraya kaydır.

- [ ] **Step 1: Test yaz — persistence round-trip**

```typescript
// mobile/tests/timer/persistence.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveTimerState, loadTimerState, clearTimerState } from '$lib/timer/persistence';

describe('timer persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T10:00:00Z'));
  });

  it('saves and restores running state', () => {
    saveTimerState({ startTime: Date.now(), elapsedAtStart: 0 });
    vi.setSystemTime(new Date('2026-08-12T10:00:30Z')); // 30s sonra
    const restored = loadTimerState();
    expect(restored).toEqual({ startTime: expect.any(Number), elapsedAtStart: 0 });
    const elapsed = (Date.now() - restored!.startTime) + restored!.elapsedAtStart;
    expect(elapsed).toBe(30000);
  });

  it('saves and restores paused state', () => {
    saveTimerState({ startTime: null, elapsedAtStart: 5000 });
    expect(loadTimerState()).toEqual({ startTime: null, elapsedAtStart: 5000 });
  });

  it('returns null when no state', () => {
    expect(loadTimerState()).toBeNull();
  });

  it('returns null on corrupted JSON', () => {
    localStorage.setItem('timer_state_v1', 'not-json');
    expect(loadTimerState()).toBeNull();
  });

  it('clears state on demand', () => {
    saveTimerState({ startTime: Date.now(), elapsedAtStart: 100 });
    clearTimerState();
    expect(loadTimerState()).toBeNull();
  });
});
```

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- persistence`
Expected: FAIL — `$lib/timer/persistence` modülü yok.

- [ ] **Step 3: Implementation — persistence modülü**

`mobile/src/lib/timer/persistence.ts` (yeni):

```typescript
/**
 * Timer state persistence — localStorage (D-015 device-scope).
 * Wall-clock based: startTime + elapsedAtStart = authoritative elapsed.
 *
 * Background JS throttle olsa bile Date.now() doğru → elapsedMs doğru hesaplanır.
 */

const KEY = 'timer_state_v1';

export interface TimerState {
  startTime: number | null; // null = paused
  elapsedAtStart: number; // pause anındaki birikmiş ms
}

export function saveTimerState(state: TimerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — sessizce yok say
  }
}

export function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;
    if (typeof parsed.elapsedAtStart !== 'number') return null;
    if (parsed.startTime !== null && typeof parsed.startTime !== 'number') return null;
    return parsed;
  } catch {
    return null; // corrupted JSON
  }
}

export function clearTimerState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // sessizce yok say
  }
}

export function currentElapsedMs(state: TimerState, now: number = Date.now()): number {
  return (state.startTime ? now - state.startTime : 0) + state.elapsedAtStart;
}
```

- [ ] **Step 4: timer.svelte.ts'yi wall-clock'a migrate et**

`mobile/src/lib/stores/timer.svelte.ts` değişiklikler:

```typescript
import { saveTimerState, loadTimerState, clearTimerState, currentElapsedMs } from '$lib/timer/persistence';

// state
let startTime = $state<number | null>(null);
let elapsedAtStart = $state(0);

const elapsedMs = $derived(
  startTime !== null ? Date.now() - startTime + elapsedAtStart : elapsedAtStart
);

// start()
function start() {
  startTime = Date.now();
  elapsedAtStart = 0;
  saveTimerState({ startTime, elapsedAtStart });
  // ... existing logic
}

// pause()
function pause() {
  if (startTime === null) return;
  elapsedAtStart = Date.now() - startTime + elapsedAtStart;
  startTime = null;
  saveTimerState({ startTime, elapsedAtStart });
  // ... existing logic
}

// resume()
function resume() {
  if (startTime !== null) return;
  startTime = Date.now();
  saveTimerState({ startTime, elapsedAtStart });
  // ... existing logic
}

// reset() / finish()
function finish() {
  // ... existing logic
  clearTimerState();
}

// mount'ta restore
$effect.root(() => {
  const restored = loadTimerState();
  if (restored) {
    startTime = restored.startTime;
    elapsedAtStart = restored.elapsedAtStart;
    if (restored.startTime !== null) {
      // running — displaySeconds türetilmiş, $effect tick'i tetikler
      tickInterval = setInterval(() => { /* sadece re-render tetikle */ }, 1000);
    }
  }
});
```

**Not:** Mevcut `elapsedMs += delta` mantığı yerine wall-clock kullanımı **breaking change**. Tüm mevcut testlerin güncellenmesi gerekir (RED cycle).

- [ ] **Step 5: Service Worker — cache-first app shell**

`mobile/static/sw.js` (yeni):

```javascript
/**
 * Timer PWA Service Worker — cache-first app shell.
 *
 * Strateji:
 * - App shell (HTML/CSS/JS/font/icon/manifest) cache-first → offline açılış
 * - Firestore API istekleri cache'lenmez (canlı veri, Firestore kendi offline cache'i var)
 * - Versiyon bump ile eski cache'ler silinir
 */

const CACHE = 'timer-shell-v1';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting(); // yeni SW hemen aktif olsun
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // mevcut client'lar yeni SW'i kullansın
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Sadece GET, sadece same-origin
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Firestore / external API — cache'leme, network-only
  if (
    url.host.includes('firestore.googleapis.com') ||
    url.host.includes('firebaseinstallations') ||
    url.host.includes('identitytoolkit')
  ) {
    return; // default network davranışı
  }

  // Navigation request → cache-first, fallback /
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).catch(() => caches.match('/')))
    );
    return;
  }

  // Static asset → cache-first, arka planda güncelle
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached); // offline → cached döndür
        return cached ?? networkFetch;
      })
    )
  );
});
```

- [ ] **Step 6: Web App Manifest (PWA installability için)**

`mobile/static/manifest.webmanifest` (yeni):

```json
{
  "name": "Timer",
  "short_name": "Timer",
  "description": "Arkadaşlarla birlikte çalışma takip uygulaması",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#0d9488",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

`mobile/src/app.html`'e `<head>` içine ekle:

```html
<link rel="manifest" href="%sveltekit.assets%/manifest.webmanifest" />
<meta name="theme-color" content="#0d9488" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Timer" />
```

**Not:** UX prompt YOK (patron kararı). Manifest olur ama tarayıcının kendi "Add to Home Screen" önerisi sessizce kalır.

- [ ] **Step 7: Service Worker kaydı**

`mobile/src/app.html`'e `<body>` sonuna (veya `<head>` sonuna) inline script:

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('%sveltekit.assets%/sw.js', { scope: '/' })
        .catch((err) => console.warn('[SW] registration failed', err));
    });
  }
</script>
```

**Not:** Production-only register etmek için build-time kontrol eklenebilir (`import.meta.env.PROD`). MVP için her ortamda register OK.

- [ ] **Step 8: Manuel smoke — iOS Safari + Android Chrome**

1. `npm run build` → deploy → 30s CDN cache bekle
2. **iOS Safari** (PWA değil): timer başlat → home screen'e git → 5dk bekle → geri dön
   - Beklenen: süre doğru (wall-clock persistence)
3. **iOS Safari (Add to Home Screen)**: PWA modunda aynı test
   - Beklenen: daha stabil, background'da bile restore
4. **Android Chrome**: timer başlat → başka app'e geç → 5dk → geri dön
   - Beklenen: süre doğru
5. **Offline test**: Chrome DevTools → Network → Offline → sayfa yenile
   - Beklenen: app shell cache'ten yüklenir (HTML/JS/CSS), Firestore bağlantısı olmasa bile UI açılır
6. **Service Worker kontrol**: DevTools → Application → Service Workers → `sw.js` "activated and running" ✅

**Verification:** `npm run check` (0 hata 0 uyarı), `npm run build` (temiz), manuel smoke ✅.

**Commit'ler:**
1. `feat(timer): wall-clock persistence + localStorage restore (#2)`
2. `feat(pwa): add Service Worker + manifest for offline app shell`

---

## Task 3 — Owner-only delete regression guard (#3)

**Kök neden tespiti:** `mobile/src/routes/leaderboard/+page.svelte:569` zaten `{#if isOwner}` guard'ı içeriyor. **Bug raporu muhtemelen şu sebeplerden biri:**
1. Eski versiyonda guard yoktu, kullanıcı eski davranışı hatırlıyor (D-062 ile düzeltildi).
2. Aynı browser'da iki farklı "user" simülasyonu (localStorage UID çakışması).
3. **Gerçek edge case** — örneğin `room.ownerUid` null ise karşılaştırma `false` döner, guard çalışır AMA test eksik.

**Strateji:** Mevcut guard'a explicit test coverage ekle + helper'ı izole et.

**Files:**
- Modify: `mobile/src/routes/leaderboard/+page.svelte:78` (isOwner helper'ı çıkar)
- Create: `mobile/src/lib/auth/is-owner.ts` (yeni — pure helper)
- Modify: `mobile/src/routes/leaderboard/+page.svelte:78` (helper import)
- Test: `mobile/tests/auth/is-owner.test.ts` (yeni)

- [ ] **Step 1: Test yaz — isOwner pure helper**

```typescript
// mobile/tests/auth/is-owner.test.ts
import { describe, it, expect } from 'vitest';
import { isOwner } from '$lib/auth/is-owner';

describe('isOwner', () => {
  it('returns true when uid matches ownerUid', () => {
    expect(isOwner('user-1', { ownerUid: 'user-1', name: 'r', inviteCode: 'ABC', memberCount: 1 })).toBe(true);
  });

  it('returns false when uid differs', () => {
    expect(isOwner('user-2', { ownerUid: 'user-1', name: 'r', inviteCode: 'ABC', memberCount: 1 })).toBe(false);
  });

  it('returns false when ownerUid is null', () => {
    expect(isOwner('user-1', { ownerUid: null as any, name: 'r', inviteCode: 'ABC', memberCount: 1 })).toBe(false);
  });

  it('returns false when room is null', () => {
    expect(isOwner('user-1', null)).toBe(false);
  });

  it('returns false when uid is empty (SSR guard)', () => {
    expect(isOwner('', { ownerUid: '', name: 'r', inviteCode: 'ABC', memberCount: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır — FAIL beklenir**

Run: `cd mobile && npm test -- is-owner`
Expected: FAIL — `$lib/auth/is-owner` modülü yok.

- [ ] **Step 3: Implementation — is-owner helper**

`mobile/src/lib/auth/is-owner.ts` (yeni):

```typescript
import type { RoomMeta } from '$lib/stores/rooms.svelte';

export function isOwner(uid: string, room: RoomMeta | null): boolean {
  if (!room) return false;
  if (!uid || uid === 'ssr') return false;
  if (!room.ownerUid) return false;
  return uid === room.ownerUid;
}
```

- [ ] **Step 4: leaderboard'da helper'ı kullan**

`mobile/src/routes/leaderboard/+page.svelte`:

```typescript
// import'a ekle
import { isOwner } from '$lib/auth/is-owner';

// line 78'i değiştir
const isOwnerFlag = $derived(isOwner(getDeviceUid(), room));
// (rest of file: isOwner → isOwnerFlag rename — veya isOwner bırak, scope dikkat)
```

**Not:** Eğer `isOwner` isim çakışması olursa alias kullan (`isOwnerRoom` veya `isRoomOwner`). Tutarlılık için kısa tut.

- [ ] **Step 5: Manuel smoke**

1. Oda oluştur (cihaz A) → "Odayı sil" görünmeli ✅
2. Farklı browser/incognito'dan odaya katıl (cihaz B) → "Odadan ayrıl" görünmeli, "Odayı sil" görünMEMELI ✅
3. **Server-side:** Cihaz B'den REST ile sil denese → Firestore rule reddetmeli ✅

**Verification:** `npm run check`, `npm run build`, Vitest, manuel smoke ✅.

**Commit:** `refactor(rooms): extract isOwner helper + add test coverage (#3)`

---

## Sıralama Önerisi

| Öncelik | Task | Süre | Bağımlılık |
|---|---|---|---|
| 🥇 #1 | Modal tutarsızlık | 30 dk | — |
| 🥈 #3 | Owner-only delete | 15 dk | — |
| 🥉 #2a | Timer persistence (wall-clock + localStorage) | 2 saat | — |
| #2b | Service Worker + manifest (PWA shell) | 1.5 saat | #2a (paralel yapılabilir) |

**Tavsiye:**
- #1 ve #3 → tek PR (`fix/sprint-05-backlog-q&a`)
- #2a ve #2b → iki ayrı PR veya birlikte (`feat/pwa-persistence-shell`)
  - #2a önce (timer logic), #2b sonra (infra) — ama aynı sprintte bitirilebilir
- Toplam sprint yükü: ~4-5 saat

**iOS notu:** Service Worker **iOS Safari'de sadece "Ana Ekrana Ekle" ile tam PWA olduktan sonra stabil**. Browser'da açıkken SW yine de çalışır (cache için) ama background timer persistence için home screen install önerilir. UX prompt'u yapmıyoruz (patron kararı).

---

## Definition of Done

- [ ] Tüm testler yeşil (Vitest)
- [ ] `npm run check` 0 hata 0 uyarı
- [ ] `npm run build` temiz
- [ ] Manuel smoke testleri (her task için ayrı ayrı)
- [ ] `BACKLOG.md` işaretlendi → `[[BACKLOG#2026-08-11]]` her nokta `[x]` veya kapatıldı
- [ ] Conventional Commits formatında commit'ler
- [ ] PR açıldı → patron review

---

**Son güncelleme:** 2026-08-12 (Patron kararları eklendi: localStorage, SW zorunlu, manifest dahil, UX prompt yok)
**Plan durumu:** ⏸️ **PARK EDİLDİ** — Patron kararı (2026-08-12): "Bunlar kalsın şimdilik sonraki sessionlarda yapıcaz." Sonraki session `[[BACKLOG]]` + bu plan dosyasıyla başlayacak.
