---
tags: [timer, plan, sprint-06, sprint-05-handoff, ops, tech-debt, obsidian-ready]
created: 2026-08-13
updated: 2026-08-13
session: S-0034
type: sprint-roadmap
---

# Sprint-06 Roadmap — Faz 3 (Ops) + Faz 4 (Tech Debt) + Faz 5 (Features)

> 📚 **Bağlam:** [[docs/superpowers/plans/2026-08-12-sprint-05-faz-2.md]] · [[daily/2026-08-12]] · [[daily/2026-08-13]] · [[Kpss-Love/LEADERBOARD-PRESENCE-RAPOR]]
> 🎯 **Sprint-05 Faz 2 (Phase 4) tamamlandı** — callable chain + settle queue + atomic transactions canlıda.
> 📦 **Referans mimari:** KPSS-Love raporu (875 satır, 2026-08-12) — 10/12 öneri uygulandı; 3 P (P1,P2,P3) + 2 doc-bazlı (splitInterval, championship) hâlâ dışarıda.

---

## 🎯 Sprint-05 Faz 2 handoff (commit özeti — 2026-08-12/13)

```
f0e1894 M6 telemetry cleanup
43b9acd M6 BACKLOG + cleanup
f68beed M5 polish (TimerStatus extend, null guards)
759fa3e M5 Set<Unsub> (Bug B unsub leak)
f0127a6 M4 sendReaction (Bug C race → tx)
af4108a M3 settle queue (offline FIFO + flush)
63e04b4 M2 typed fix (exists property)
2293367 M2 mergeStats MAX
6326879 M1 bug A finish-race
5206ab0 A3 regression test
7ce18a9 A2 callable telemetry
a93f92b A1 init guard
+ 5 plan-dışı M0-fix (c624a45, 60338af, 34fa2f2, M0-fix #2-ex, M0-fix #3 rules deploy)
+ Firebase Hosting env (mobile/.env)
+ Daily 2026-08-12.md vault note
```

**Doğrulama:** vitest 19/19 ✅ · svelte-check 0 errors ✅ · server tsc clean ✅ · 2 Cloud Function live (`onPresenceChange` + `sendReaction`, us-central1) · Firebase Hosting live.

---

## 📋 Sprint-06 Backlog (3 fazlı yol haritası)

### 🔴 Faz 3 — Operations (M3'ün uzantısı, ~5 saat, 1-2 sprint günü)

| #  | Kalem | Çaba | Bağımlılık | Kaynak |
|----|------|------|------------|--------|
| **P1** | **Scheduled cleanup function** — `lastHeartbeatAt > 24h → status: idle` Cloud Function (scheduled trigger every 6h). Doc birikimini önler, maliyet azalır. | 2 saat | Cloud Function deneyim ✅ | KPSS-Love §3.3 (cross-ref) |
| **P2** | **60s heartbeat** — `pushToRemote` her 60s'de status='running'de. Plan'da vardı M2'de yok, Sprint-05'e sığmadı. **M2-complete commit** olarak. | 30dk | $effect cleanup | KPSS-Love §1.4 |
| **P3** | **`tick yapma hesapla` refactor** — mutative `elapsedMs += now - lastTickAt` → pure `$derived(accumulatedMs + (now - startedAt))`. Tab background'a geçince elapsedMs doğru çalışsın. | 1 saat | test infrastructure | KPSS-Love §2.1 (prensip) |
| **P4** | **DECISIONS.md update** — D-063 (VITE_FIREBASE_* env), D-064 (M0-fix series + 5 kök neden). | 30dk | Patron review | — |
| **P5** | **daily/2026-08-13.md** yaz — bugünün vault note'u (Faz 2 kapanışı + 5 kök neden lessons learned). | 15dk | — | — |

### 🟠 Faz 4 — Architecture / Features (~6 saat, 3-4 sprint günü)

| # | Kalem | Çaba | Bağımlılık |
|---|------|------|------------|
| **F1** | **#3 owner button fix** — `/+page.svelte` "Odayı sil" butonu tüm üyelerde görünüyor, `isOwner` guard eksik. | 30dk | yok (D-060 setup) |
| **F2** | **D-018 home stats fix** — `+page.svelte` hardcoded "0dk" → reactive `readStats()` + `subscribeStatsForUser()` ile live update. | 1 saat | readStats() reusable |
| **F3** | **D-049 server-side owner check + delete rules tightening** — `allow delete: if true` → custom Cloud Function `onDeleteRoom(roomId)` ile ownerUid karşılaştırma. | 2 saat | Cloud Function tx experience |
| **F4** | **#1 modal tutarsızlık** — Seans bitiş modal'ında "139sn / Bugün 0dk / Bu hafta 0dk" çelişkisi. Birim standardizasyonu + reactive weekly sum. | 1 saat | F2 hazır |
| **F5** | **#2 PWA persistence + Service Worker** — `vite-plugin-pwa` + `static/sw.js`, `lastHeartbeatAt` fetch ve background sync. | 4-6 saat | Service Worker test altyapısı |
| **F6** | **Last-seen tarih/saat leaderboard'da** _(2026-08-13 patron, D-070)_ — `presence/{uid}` doc'unda `updatedAt` zaten yazılıyor. `/leaderboard/+page.svelte` her kullanıcı satırına küçük "son görülme: 3dk önce / 14:32 / dün 21:15" rozeti ekle. Relative time → 24h sonra absolute date fallback. Online olmayan kullanıcılar da görünür kalır. **Status label `finished-late` ile çakışmamalı** (`statusLabel()` 805 satır, refactor gerekebilir). | 1.5 saat | F2 ile aynı readStats/reactive pattern |
| **F7** | **Leaderboard yavaş + çirkin yükleniyor** _(2026-08-13 patron, D-071 + D-074)_ — `/leaderboard/+page.svelte` başka sayfadan navigate edilince flicker'lı, geç geliyor. **C option (D-074):** persistedState (IndexedDB cache) + skeleton + paralel subscribe. (a) `leaderboard:{roomId}` IndexedDB store → ilk render cache'ten; (b) `LeaderboardSkeleton.svelte` placeholder rows; (c) `Promise.all([subscribeLeaderboard, subscribeRoomPresence])` waterfall kırma; (d) oda değişince cache invalidation. | 2-3 saat | F1/F2 ile birlikte sprint'e paket |
| **F8** | **Session durdurunca stats boş geliyor** _(2026-08-13 patron, D-072)_ — Seans durdurulduğunda "kaç dk / bu hafta / toplam / seansta" değerleri boş. F2 + F4'ün scope genişletmesi: `readStats()` `handleStop()` sonrası anında reactive olmalı (şu an readStats subscription stop sonrası refresh etmiyor olabilir). Vitest regression: stop→stats görünür. | 1-2 saat | F2 + F4 merge |

### 🟡 Faz 5 — Tech Debt / Scale-up (~3-4 saat, 1 sprint günü)

| # | Kalem | Çaba | Bağımlılık |
|---|------|------|------------|
| T1 | **Structured logging** — console.warn → `firebase-functions/logger`. Structured JSON, error türü + context. | 1 saat | M2+M3+M4'te manuel console.log'lar var |
| T2 | **E2E test infrastructure** — Playwright + `npx playwright test` for critical user flows. | 2 saat | vitest + emulator |
| T3 | **CI/CD pipeline** — `.github/workflows/ci.yml` (svelte-check + vitest + build), `deploy.yml` (Firebase Hosting + Functions on main). | 1 saat | Firebase CLI workflow secret |
| T4 | **Node 22 upgrade** — `engines.node = "22"`, `firebase.json` runtime upgrade, breaking change test. | 1 saat | Node 22 local kurulum |
| **T5** | **No-badge policy enforcement** _(2026-08-13 patron, D-069)_ — Patron badge/rozet sistemi istemiyor. Grep `badge`/`rozet`/`medal`/`achievement`/`trophy` (case-insensitive) → varsa temizle; "finished" status badge'i UI text'i olarak kalabilir (championship değil). DECISIONS.md'ye D-069 yaz: "Gamification rozet/medal sistemi prod roadmap'inde YOK. Sadece status label (running/paused/finished) sergilenir." | 30dk | grep + DECISIONS.md |

### 🟢 Faz 6 — Sprint-07+ park edilmiş

**Sprint-07 Faz 1 backlog (2026-08-13 trade-off onayı):**
- **M3 durable queue** _(D-076)_ — IndexedDB-backed settle queue, Sessions `syncPendingSessions` pattern'i. 2-3 saat.
- **D-015 cross-user hardening** _(D-075)_ — `auth.uid === $uid` rules sıkılaştırma + Cloud Function enforcement. F3 kısmi çözüm sağlıyor. 3-4 saat.
- **Heatmap feature** _(D-073)_ — `cal-heatmap` library, `users/{uid}/sessions/{sessionId}` data source. **Data viz only** — `streak`/`combo`/`level` kelimesi YOK (D-069 uyumu). 4-6 saat.

**Diğer park:**
- ~~Şampiyonluk rozet (KPSS-Love §8.6)~~ — **2026-08-13 patron kararı: ÇIKARILDI. Badge/rozet sistemi istenmiyor (D-069, T5 ile scan+remove).**
- ~~Championship + multi-period leaderboard~~ — KPSS-Love §8.6 referans; **D-069 ile değerlendirilemez** (gamification scope'u).
- Supabase re-migration (Sprint-04'te denendi, reverted) — sadece distributed transactions veya row-level auth gereken feature'larda tekrar değerlendir
- Salı 00:00 hafta sınırı (KPSS'e özgü)
- F5 PWA foundation (büyük iş, Sprint-07 sonu?)

---

## 📊 Öncelik + bağımlılık grafiği

```
[Patron gözden geçirmesi gereken]
  ├─ P5 daily/2026-08-13.md        (15dk) ⬅ HEMEN
  └─ P4 DECISIONS.md update        (30dk) ⬅ HEMEN

[Faz 3 - Ops]
  ├─ P2 60s heartbeat              (30dk) 🔴 önce — M2-complete
  └─ P1 scheduled cleanup         (2 saat) 🔴 sonra — P2 ile bağımsız

[Faz 4 - Features]
  ├─ F1 owner button fix           (30dk) 🟠 hemen — izole
  ├─ F2 home stats                (1 saat)  🟠 P5'ten sonra — readStats reuse
  ├─ F4 modal units               (1 saat)  🟠 F2 sonrası
  ├─ F6 last-seen leaderboard     (1.5 saat) 🟠 F2 sonrası — aynı readStats pattern
  ├─ F7 leaderboard perf+UX       (1-2 saat) 🟠 F1/F2 ile birlikte — flicker/load fix
  ├─ F8 session stats boş         (1-2 saat) 🟠 F2+F4 merge — handleStop sonrası reactive
  └─ F3 owner delete server-side  (2 saat) 🟡 izole

[Teknik borç]
  ├─ T1 structured logging        (1 saat) 🟡 M3+M4 cleanup
  ├─ T2 E2E (Playwright)          (2 saat) 🟢 sprint-06 sonu
  ├─ T3 CI/CD                     (1 saat) 🟢 T2 sonrası
  └─ T4 Node 22 upgrade           (1 saat) 🟡 Node 22 kurulum
  └─ T5 no-badge policy (D-069)   (30dk)  🟡 hemen — patron kararı 2026-08-13

[Park]
  ├─ F5 PWA (büyük iş — Sprint-07)
  └─ D-015 hardening (Sprint-08+) — ~~Şampiyonluk rozet D-069 ile ÇIKARILDI~~
```

---

## 🚦 Sprint-06 Faz planı (sıralı)

### Sprint 6.1 (1-2 gün) — Operations + memory
1. P5 daily/2026-08-13.md
2. P4 DECISIONS.md update
3. P2 60s heartbeat (timer.svelte.ts + vitest regression)
4. P1 scheduled cleanup (Cloud Function + Firestore emulator test)

### Sprint 6.2 (2-3 gün) — UX fixes
1. F1 owner button fix (quick-win)
2. F2 home stats reactive (readStats + $state)
3. F4 modal unit consistency (seans/daily/weekly)
4. P3 tick-yapma refactor (`$derived`, test)

### Sprint 6.3 (1-2 gün) — Server-side enforcement + observability
1. F3 D-049 owner delete (Cloud Function `onDeleteRoom`)
2. T1 structured logging (migration)
3. (Opsiyonel) F5 PWA foundation — service worker minimal scaffold

### Sprint 6.4 (backlog) — Tech debt
1. T4 Node 22 upgrade + T3 CI/CD foundation
2. T2 E2E (Playwright) critical user flow coverage
3. Sprint retrospective + DECISIONS

---

## 🧪 Test stratejisi

- **Unit (vitest):** Her P/D/F için TDD cycle (RED → GREEN → REFACTOR). Coverage target: %80. Mevcut 19/19, hedef 30+/30+.
- **Server (Firestore emulator):** `firebase emulators:start --only firestore,functions` ile Cloud Functions integration test. Plan'da yoktu, T2 ile birlikte Sprint 6.4'te.
- **E2E (Playwright):** T2'de. Critical user flow'lar:
  - Oda oluştur → /leaderboard'a git → "Enes" görün
  - "Başla" → 30 saniye → status 'running' Firestore'da
  - "Durdur" → 'finished' badge görün (M1 verify)
  - Pulses dot, weekly timer, leaderboard sort
- **Manual smoke (patron):** Her sprint-sonu patron browser'da test eder.

---

## ⚠️ Bilinen bağımlılıklar + kısıtlar

### ✅ Mevcut (Phase 4 deliverable)
- VITE_FIREBASE_* env (.env) ✅
- Firebase Hosting deploy pipeline (manuel `firebase deploy`) ✅
- Cloud Functions `onPresenceChange`, `sendReaction` live ✅
- Firestore rules prod-up-to-date ✅
- M0-fix series tüm production'da ✅

### ⚠️ Sprint-06 başlamadan çöz
- `firebase emulators:start` kurulumu (T2 için)
- Node 22 local install (T4 için — veya Sprint 6.1'de)

### ❌ Bilinen eksik — Sprint-06'da farkında ol
- 60s heartbeat yok (P2 ile çözülür)
- Scheduled cleanup yok (P1 ile çözülür)
- AUTH owner delete rules açık (F3 ile çözülür)
- `tick yapma hesapla` prensibi uygulanmadı (P3 ile çözülür)
- D-015 cross-user corruption riski (Faz 6 park)

---

## 📁 Çıktı dosya konumları

| Dosya | Açıklama |
|-------|----------|
| `daily/2026-08-13.md` | YENİ — sprint-05 Faz 2 kapanışı + M0 lessons learned |
| `DECISIONS.md` | UPDATE — D-063 (env), D-064 (M0-fix serisi) |
| `BACKLOG.md` | UPDATE — Faz 6 (Sprint-06) tarih bölümü |
| `timer.svelte.ts` | MODIFY — 60s heartbeat + tick refactor |
| `+page.svelte` | MODIFY — reactive readStats + isOwner guard |
| `functions/src/cleanupPresence.ts` | YENİ — scheduled cleanup |
| `functions/src/onDeleteRoom.ts` | YENİ — owner check for delete |
| `tests/utils/` | NEW TESTS — heartbeat, tick-refactor, cleanup |
| `.github/workflows/` | YENİ — CI + CD pipelines |

---

## 🎯 Sprint-06 daily note template (her gün için)

`daily/2026-08-13.md` (yazılacak):

```
# Daily 2026-08-13 — Sprint-05 Faz 2 wrap-up
- 16 commit (Faz 2 + M0-fix), 4 gizli kök neden tespit edildi
- 5 bug parked #4-#6 çözüldü
- 19/19 vitest + svelte-check clean + server tsc clean
- 2 Cloud Function live
- BACKLOG güncellendi
- Sprint-06 planı yazıldı ([[2026-08-13-sprint-06-roadmap]])
- Lessons: callable invocation smoke test ilk adım olmalı
```

---

## ⚡ Hemen atılacak adımlar (Patron yarın fresh)

1. **Yeni session aç** → bu roadmap'i yükle → `superpowers:brainstorming` + `superpowers:writing-plans` ile Faz 3 detaylandır
2. **Plan DO IT** aldıktan sonra Faz 3 atomik commit'leri (`bash + git + vitest` per step)
3. Her Faz sonunda: daily note, DECISIONS update, manual smoke test patron

---

**Hazırlayan:** S-0034 (Claude Code, 2026-08-13 sprint-05 kapanışı)
**Süre tahmini:** Sprint 6.1 (1-2 gün), 6.2 (2-3 gün), 6.3 (1-2 gün) → toplam ~5-7 iş günü
**Not:** Sprint-05 başarısız fix'leri (4 kök neden tespit edilmeden) raporun tam uygulanmamasındandı. Bu plan, raporun **raporun %100'ünü** Sprint-06'da uygulamayı hedefler.

---

# 🚀 Sprint-05 → Sprint-06 handoff başarılı!

> Son commit: `f0e1894`. Cloud Functions + Hosting canlı. Patron yeni session'da `superpowers:brainstorming` ile Sprint-06 Faz 3 brainstorm'i → `superpowers:writing-plans` ile plan → DO IT → atomik implementation. Yarın!
