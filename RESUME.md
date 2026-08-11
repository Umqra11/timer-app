---
tags: [timer, resume, session-handoff, obsidian-ready]
created: 2026-08-04
updated: 2026-08-11 (S-0033 — Sprint-05 Faz 1.5 Leaderboard UX polish tamamlandı: 6 yeni karar (D-063..D-068), localStorage cache + yanıp sönen nokta + minimalist invite + self-reaction guard + sessions subcollection + weekly live timer. Sıradaki: Sprint-05 Faz 2 — home stats fix + firestore rules tightening + TTL policy deploy (patron).)
type: session-resume
---

# 🏁 Timer Projesi — Session Özeti / Devam Planı

> **Bu dosya yeni bir session'da işe başlarken İLK okunacak dosyadır.**
> Tüm kararları, durumu, sıradaki adımları tek bakışta özetler.

> 📚 **Detay:** [[STATUS]] · [[DECISIONS]] · [[HUB]] · [[00-Home]] · [[IDEAS]]

---

## 📍 Şu An Neredeyiz

**Aşama:** Sprint-05 Faz 1 (single-room refactor, S-0032) + Faz 1.5 (leaderboard UX polish, S-0033) tamamlandı, **Sprint-05 Faz 2 planlama aşamasında — home stats fix + rules tightening + TTL deploy (patron)**
**Tarih:** 2026-08-11 (S-0033)
**Patron:** Enes
**Canlı:** https://timerviber.web.app (otomatik deploy, `Umqra11/timer-app` GitHub repo, ~28 commit — son push `1aa1413` Sprint-05 Faz 1.5 sonunda)

> ⚠️ **BACKLOG AKTİF (2026-08-11)** → `[[IDEAS#🔍 Backlog — 2026-08-11 (Gözden Geçirilecek)|IDEAS.md › Backlog]]` bölümünde işlenmemiş noktalar var. Önce onları gözden geçir.

### ✅ Sprint-03 — Tamamlanan (S-0024..S-0028)

**Faz 1 — Oda temel (D-045, D-046, D-048, D-049)** ✅
1. `routes/rooms/[id]/+page.svelte` — oda detay sayfası (geri, davet kodu kopyala, Odayı sil + onay modalı)
2. D-048: `memberCount` denormalize sayaç — `createRoom` initial 1, `joinRoomByCode` transaction atomik +1
3. D-049: `deleteRoom()` server-side owner check, MVP'de `allow delete: if true` (custom function olmadan uid karşılaştırması yapılamadı, Sprint-04'te Cloud Function)
4. `firestore.rules` — rooms create/update/delete strict kurallar, **presence match eklendi** (önce unutulmuştu!)
5. **Canlı doğrulama** — Oda oluştur → "1 kişi" → ikinci kullanıcı katıl → "2 kişi" → odayı sil → Firestore 404 ✅

**Faz 2 — Leaderboard (D-047, D-050, D-051)** 🟢 (v6 fix sonrası çalışıyor)
6. `rooms.ts`: `subscribeRoomMembers` — N+1 query: her presence için `users/{uid}.totalSeconds` okur, client-side sıralama (totalSeconds desc)
7. D-050: `setRoomContext` + `visibilitychange` + `beforeunload` listener (D-050)
8. D-051: `effective` status çözümlemesi — `running` + 2dk eski → 'stale'; `finished` + 5dk eski → 'finished-late' (D-051)
9. Leaderboard UI — username, durum pill (yeşil/sarı nokta), "X dk önce bitti", toplam süre
10. **KRİTİK FIX (v6)**: `setRoomContext` artık onRemote callback olmadan da `writePresence()` çağırıyor. Önceki kod `if (!onRemote) return;` ile erken dönüyordu — bu yüzden presence hiç yazılmıyordu. Şimdi: `if (!ctx || !isFirebaseEnabled()) return;` + `if (onRemote) { subscribe }` + HER ZAMAN `writePresence`
11. **Canlıda kanıtlandı** — v6 fix sonrası leaderboard'da `kullanici2` görünüyor, toplam süre, durum pill — hepsi çalışıyor

**Faz 3 — Mesaj/Reactions (D-052, D-053, D-054, D-055)** ✅ (Sprint-04 Aşama 1-4'te SDK debug tamamlandı)
12. `src/lib/firebase/reactions.ts` (6.7 KB) — `sendReaction()` (D-052 atomic), `subscribeReactions()` (D-054)
13. D-053: Rate limit — dakikada 5, saatte 30, sliding window. Client-side, server-side Sprint-04'te Cloud Function ile.
14. D-052: `expireAt` field — Firestore TTL policy için (4 saat sonra otomatik silinme)
15. D-055: Sadece kişiye özel tepki (broadcast YOK — karar)
16. `+page.svelte`: Tepki yazma modalı (textarea + sayaç + hata), leaderboard satırlarında baloncuklar ("X dk önce"), kendine tepki yazma butonu
17. `firestore.rules`: `rooms/{roomId}/reactions/{reactionId}` match (read:true, create: text 1-60 + zorunlu alanlar, update/delete:false — ephemeral)
18. **KRİTİK FIX (v8)**: `runTransaction` içinde async `getDoc` çalışmıyor (tx.get sadece aynı transaction doc'larını okuyabilir, rate limit doc farklı collection'da). Düzeltme: İki adımlı sıralı işlem (readRateLimit → check → writeRateLimit → setDoc)
19. **Sprint-04 KRİTİK FIX (v9)**: (a) `users/{uid}/rateLimit/{doc}` subcollection rule eklendi (eksikti, permission-denied), (b) "Tepki yaz (kendine)" `username.current` yerine `getDeviceUid()` kullanıyor (targetUid uuid olmalı)
20. **Canlıda kanıtlandı** — SDK ile yazılan tepki browser'da baloncuk olarak görünüyor, cross-user round-trip çalışıyor (`kullanici2x` → `debugger1`).

---

## ✅ Sprint-04 — Tamamlananlar (S-0029)

### Aşama 1-4: Debug + Asıl Fix ✅

**Kök neden (iki bağımsız bug):**

1. **Firestore rule eksik** — `/users/{uid}/rateLimit/{doc}` subcollection için rule tanımlı değildi. `writeRateLimit()` `setDoc` permission-denied alıyordu, tüm `sendReaction` try/catch'e düşüyordu. Düzeltme: `/rateLimit/{doc}` match eklendi.
2. **Yanlış targetUid** — `+page.svelte` "Tepki yaz (kendine)" butonu `username.current` (örn. "debugger1") ile modal açıyordu. Subscribe filter `r.targetUid === m.uid` (uuid) ile eşleşmediği için baloncuk görünmüyordu (sadece REST ile yazılanlar görünüyordu). Düzeltme: `getDeviceUid()`.

**Canlıda kanıtlandı:** `kullanici2x` → `debugger1` tepki yazdı, baloncuk `debugger1`'in altında göründü, diğer kullanıcılar da gördü.

### ⏳ Sprint-04 devam — Manuel patron işlemi

1. **Firestore TTL policy** — Console → Firestore → Indexes & TTL → `expireAt` field, 14400 saniye (4 saat)
2. **Server-side rate limit** — Cloud Function (atomic `runTransaction`)
3. **Server-side owner check (D-049 sıkılaştırma)** — Custom function
4. **Oda silme recursive delete** — Cloud Function
5. **Stats rolling week sum (D-018)**
6. **Username reclamation policy (D-015)**
7. **Console error monitoring**

---

## ✅ Sprint-04 — Debugging Pass (S-0030, 2026-08-09)

Mavis (bu oturum) Sprint-03 commit history + canlı kodu sistematik olarak taradı,
6 potansiyel sorun/iyileştirme tespit etti ve kök neden analiziyle tek tek ele aldı.

### v10: setRoomContext duplicate fix (commit `b69bd93` — pushed)

**Kök neden:** `+page.svelte`'te hem `onMount` hem `$effect` içinde aynı
`timer.setRoomContext(...)` çağrısı vardı. Commit `61daa83`'te `$effect`
"post-mount username hydration" için eklenmiş ama `onMount` versiyonu unutulmuş.

**Etki:** Her oda sayfası mount'unda 2× `writePresence` (gereksiz Firestore yazımı)
+ listener add/remove döngüsü. `$effect` zaten reactive tracking yapıyor
(mount'ta 1× + dependency değişiminde tekrar) → `onMount` versiyonu tamamen gereksiz.

**Fix:** `onMount` içindeki 4 satır silindi. v6 fix'inin (commit `4ad33ef`)
yanında kalan bir verimsizlikti.

### v11: Debugging pass — 5 iyileştirme/dokümantasyon

1. **`presence.ts:48`** — `console.log('[presence] no db')` kaldırıldı (sessiz return).
   Production'da debug log, offline modda spam. `client.ts:44` zaten uyarı veriyor.
2. **`firestore.rules:38-55`** — `/users/{uid}/rateLimit/{doc}` structure validation
   eklendi (4 alan + tipler + ≥0). Malformed/negatif yazımlar reddedilir.
   Cross-user yazım koruması mümkün değil (auth yok — D-015), Cloud Function ile.
3. **`reactions.ts:128-133`** — `expireAt` client/server clock trade-off dokümante.
   4 saatlik pencere için ±1 sn NTP skew tolere edilebilir; gerçek server-time
   için Cloud Function onWrite gerekli.
4. **`+page.svelte:184-189`** — `reactionsFor` perf trade-off dokümante.
   MVP'de OK; scale-up'ta `where('targetUid', 'in', memberUids)` kullanılabilir.
5. **`reactions.ts:104-118`** — Rate limit race condition comment netleştirildi.
   Aynı uid'den iki eşzamanlı istek aynı sayacı +1 yapabilir. Atomic tx için
   server-side `runTransaction` (async `getDoc` sorunu server'da yok) — Sprint-04 #6.

**Verification:** Her adımda `npm run check` (0 hata 0 uyarı), `npm run build` (temiz).

---

## ✅ Sprint-05 Faz 1 — Single-room refactor (S-0032, 2026-08-11)

D-059/D-060/D-061/D-062 ile Liderlik sekmesinin "tek oda, tek giriş noktası" modeline geçişi:

- **D-059** — Multi-room üyeliği engellendi: `rooms.svelte.ts` `myRoomsCache.length >= 1` pre-check; `firestore.rules` `joinedRooms` delete:true. Cross-user atomic check MVP'de yok (D-015 — auth-free); race window kabul edilen trade-off (Sprint-05 Faz 3 Cloud Function ile kapanır).
- **D-060** — `/leaderboard` = tek-oda görünümü. Boş state: "Oda kur" / "Davet koduyla katıl". D-047 per-room leaderboard mantığı doğrudan yeniden kullanıldı; subtitle "Bu hafta en çok çalışanlar" → "Odadaki sıralama".
- **D-061** — `routes/rooms/+page.svelte` + `routes/rooms/[id]/+page.svelte` tamamen silindi. Hiçbir redirect yok. `Nav.svelte` "Odalar" → "Liderlik" güncellendi + trophy icon typo fix (I6 — branch-introduced bug).
- **D-062** — `leaveRoom(roomId)` (üye) + `deleteRoom(roomId)` (sahip, D-049 mevcut). `users/{uid}/joinedRooms/{roomId} delete:true`. **✅ Deploy edildi (2026-08-11)** Firebase Console üzerinden — canlıda "Odadan ayrıl" / "Odayı sil" çalışıyor.

**Final-fix-run (opus):** 4 Critical + 7 Important — `myRoomsCache wire-up`, `not-found state + joinedRooms cleanup on owner delete`, `try/catch + error reasons` (C3), `touchRoom loop + stale state + timer context reset` (C4), `discriminated union return types` (I1+I2), `in-flight guard` (I5), `trophy SVG typo` (I6 — branch-introduced), `D-062 deploy not`, `subscribeMyRooms error callback` (M5).

**Sprint-05 Faz 1 = 21 commit**, hepsi main'e push, canlıda cross-user "ayrıl/sil" round-trip çalışıyor.

---

## ✅ Sprint-05 Faz 1.5 — Leaderboard UX polish (S-0033, 2026-08-11)

6 hızlı UX iyileştirmesi — patron canlı test feedback sonrası:

- **D-063** — localStorage cache for myRooms → odaya otomatik dön (empty state flash yok). `timer_my_rooms_v1` versioned key + JSON.parse try/catch. Offline-friendly.
- **D-064** — Yanıp sönen nokta (CSS keyframes `pulse-running` opacity 1 → 0.35 → 1, 1.5 s ease infinite). 6 px yeşil nokta + `aria-label="şu an çalışıyor"` a11y. Sadece running gösterilir, paused sadece yazıda.
- **D-065** — Davet kodu minimalist tek satır (dış kart kaldırıldı, 36×36 icon button). Tek satır `<code>` + copy button.
- **D-066** — Self-reaction tamamen kaldırıldı (UI + backend guard `'self-target'`). Guard `readRateLimit`'ten ÖNCE çalışır — rate-limit kötü niyetli client tarafından doldurulamaz.
- **D-067** — Sessions subcollection (`users/{uid}/sessions/{sid}`) + rolling week stats. Her `timer.finish()`'te bir doc: `uid, dayKey, startedAt, endedAt, elapsedMs`. `subscribeUserWeeklySeconds` son 7 gün sum.
- **D-068** — Haftalık canlı süre leaderboard'da tick eder (`liveSeconds` pure function + 1 s interval). `formatHMS(weeklySeconds + liveSeconds(entry, Date.now()))`. Pure function Vitest ile test edildi.

**7 commit Faz 1.5 boyunca** (6465b5a..1aa1413): localStorage cache, pulse-running keyframes, minimalist invite, self-reaction guard (1 fix round), sessions subcollection (1 fix round — Timestamp cutoff alignment), weekly live timer (1 fix round — clock-skew safety).

**Notlar:**
- `prefers-reduced-motion` desteği Faz 2 polish'inde eklenecek (Task 2 step'inde opsiyonel bırakıldı).
- `SessionDoc.endedAt: number` type vs runtime Timestamp — type-hygiene follow-up, Sprint-05 Faz 2 backlog'unda.
- **Pre-existing `room is possibly null` svelte-check error `leaderboard/+page.svelte:455`** — Task 5 review'ında görüldü, Task 6 da bu satıra dokundu ama fix'lemedi (kapsam dışı). Sprint-05 Faz 2'de `null` guard veya non-null assertion ile çözülecek.
- Sessions `firestore.rules` deploy patron işlemi (Sprint-05 Faz 2'ye planlı). Deploy edilmediyse client-side write MVP auth-free olduğu için yine başarılı olur; smoke test ile doğrulandı.

---

## 🛠️ Teknoloji Stack (D-009, D-015, D-020, D-044)

| Katman | Seçim |
|--------|-------|
| Frontend | SvelteKit (PWA) — `adapter-static` |
| Hosting | 🔥 Firebase Hosting (D-044) — `https://timerviber.web.app` |
| Backend + DB + Realtime | 🔥 Firestore (europe-west3, eur3) |
## 📊 Commit'ler (Sprint-03 + Sprint-04 + Sprint-05 Faz 1 + Faz 1.5)

```
(Sprint-05 Faz 1.5 — Leaderboard UX polish — S-0033)
1aa1413 feat(leaderboard): weekly live timer — rolling 7-day sum ticks for running users
3eadaf8 fix(stats): align session cutoff and simplify timer start
0fe1f64 feat(stats): sessions subcollection + rolling week stats
6b37662 fix(leaderboard): remove self-reaction UI + backend guard
c22bb26 refactor(leaderboard): minimalist invite code — single row with icon button
a614c74 feat(leaderboard): pulsing dot indicator for running users
6465b5a feat(leaderboard): localStorage cache for myRooms — auto-load on re-entry
(Sprint-05 Faz 1 — Single-room refactor — S-0032)
52031ab docs(vault): Sprint-05 Faz 1 daily note (S-0032)
3d7dd60 docs(decisions): D-062 deploy onayı — 2026-08-11
9b91f4d fix(rooms): subscribeMyRooms error callback — empty state'i ayır
bb1cbdc docs(decisions): D-062 not — rules deploy adımı eklendi
4f166f0 fix(icons): trophy SVG typo — remove spurious minus
81303d4 fix(leaderboard): in-flight guard for delete/leave action
6ddabf3 refactor(store): discriminated union return types — I1 + I2
5e233d6 fix(leaderboard): touchRoom loop — ID-based derived + once-per-room guard
8ddea93 fix(rooms): try/catch + error reasons in Firestore mutations
c3aa15e feat(leaderboard): not-found state + cleanup joinedRooms on owner delete
0432a26 fix(rooms): wire myRoomsCache — D-059 pre-check aktif (C1)
(Sprint-04 Debugging Pass — S-0030)
b69bd93 fix(rooms): remove duplicate setRoomContext call in onMount (v10)  ← pushed
(Sprint-04 Aşama 1-4)
023d575 fix(sprint-04): SDK reactions permission-denied — rateLimit rule + getDeviceUid
866f882 docs(vault): Sprint-03 Faz 1+2+3 tamamlandı + Sprint-04 plan
14d49ce fix(reactions): sequential rate limit (runTransaction uyumsuz)
2c26c90 feat(sprint-03): reactions sistemi (D-052/053/054)
4ad33ef fix(sprint-03): make setRoomContext.onRemote truly optional  ← KRİTİK FIX (presence)
61daa83 fix(sprint-03): TickHandle type + $effect for room context
57e534b feat(sprint-03): oda detay sayfası, memberCount, owner delete, leaderboard
e62938a feat(sprint-02): Firebase integration, Firestore stores, stats, click sound
48f3098 chore(vercel): drop Vercel adapter, switch to adapter-static (D-044)
```

**Toplam:** ~28 commit Sprint-03'ten bugüne. Son commit Faz 1.5 sonunda (`1aa1413`).

---

## 🎯 Ürün Özeti (Yeni Session İçin)

**Timer** = Telefon öncelikli web uygulaması, Türkiye pazarı, ücretsiz, kişisel/arkadaş grubu.

**MVP Ekranları (3):**
1. **Kronometre** (✅ Sprint-01+02) — 2 buton (D-038: Başlat / [Duraklat+Durdur]), selamlama, sayaç, istatistik pill, seansı bitirme modalı (D-036), tık sesi (D-017)
2. **Odalar** (✅ Sprint-02+03) — ⭐ Hero stil (D-013), 👋 son katıldığın oda hero (D-014), davet kodu, oda detay sayfası (leaderboard + reactions), odayı sil (D-049)
3. **Profil** (✅ Sprint-02) — kullanıcı kartı, istatistik kartları (streak + bugün + toplam, D-018), çıkış yap

**Tasarım:** Pure Black Dark Mode, Inter font (ultralight 200 — D-027), Turkuaz/Teal vurgu, modern minimalist.

---

## 📋 Sprint-05 Plan (Yeni Session İçin)

### ✅ Tamamlandı

- [x] Aşama 1: Debug (SDK `sendReaction` permission-denied) — kök neden bulundu (rateLimit rule + yanlış targetUid), fix deploy edildi
- [x] Aşama 4: Verification — canlı smoke cross-user round-trip çalışıyor
- [x] **Debugging Pass (S-0030)** — 6 bulgu #1-#6 ele alındı, v10 + v11 tamamlandı
- [x] **Sprint-05 Faz 1 — Single-room refactor (S-0032)** — D-059/060/061/062, 21 commit, final-fix-run 4 Critical + 7 Important çözüldü, D-062 rule deploy patron işlemi tamam
- [x] **Sprint-05 Faz 1.5 — Leaderboard UX polish (S-0033)** — D-063..D-068, 6 UX iyileştirmesi, 7 commit, pre-existing svelte-check error (`room is possibly null`) Faz 2'ye bırakıldı

### ⏳ Kalan (Manuel patron işlemi + Sprint-05 Faz 2)

- [ ] **TTL policy enable (patron işlemi)** — Firebase Console → Firestore → Indexes & TTL → `expireAt` field, 14400 saniye (D-052 ephemeral reactions)
- [ ] **Sessions rule deploy (patron işlemi)** — D-067 ile eklenen `users/{uid}/sessions/{sid}` match rule deploy edilmeli (MVP auth-free — write client-side yine başarılı olur, deploy sıkılaştırma)
- [ ] **Home stats fix (D-018)** — `+page.svelte` hardcoded `0dk` → reactive `readStats()`. Küçük kapsam, tek dosya.
- [ ] **Firestore delete rules tightening (D-049)** — `allow delete: if true` → ownerUid custom check. D-015 nedeniyle kısıtlı (cross-user atomic check yapılamaz rules'ta, Cloud Function gerekir).
- [ ] **`prefers-reduced-motion` desteği (D-064 polish)** — Task 2'de opsiyonel bırakıldı.
- [ ] **`SessionDoc.endedAt` type-hygiene (D-067 follow-up)** — runtime Timestamp vs tip `number` mismatch — narrow.
- [ ] **Pre-existing svelte-check fix** — `leaderboard/+page.svelte:455` `room is possibly null` — null guard veya non-null assertion.
- [ ] Cloud Function: `users/{uid}/rateLimit/reactions` server-side atomic check (`runTransaction` — server-side async `getDoc` OK)
- [ ] Cloud Function: oda silme recursive (presence + reactions + joinedRooms)
- [ ] Cloud Function: oda sahibi custom check (uid karşılaştırması — D-049 sıkılaştırma)
- [ ] Username reclamation policy (D-015)
- [ ] Console error monitoring

---

## 💡 Yeni Session İçin Hızlı Hatırlatma

**Patron ilk mesajda:** "Timer kaldığımız yerden devam" veya Sprint-05 Faz 2'ye atla

**Müdür (sen, Mavis) yapacağın:**
1. `RESUME.md` oku (bu dosya)
2. `STATUS.md` kontrol et
3. `DECISIONS.md` gözden geçir (68 karar — D-001'den D-068'e; D-063-068 Sprint-05 Faz 1.5)
4. **`IDEAS.md` › 🔍 Backlog bölümünü kontrol et** — patronun eklediği işlenmemiş bug/iyileştirme noktaları olabilir
5. Canlı test: https://timerviber.web.app/ → **Liderlik** sekmesi (D-061 ile /rooms route silindi — direkt /leaderboard üzerinden odaya erişim)
6. Patronsal kalan: TTL policy + sessions rule deploy (Firebase Console manuel işlem)

**Önemli notlar:**
- v6 fix (`setRoomContext.onRemote` opsiyonel) Sprint-02'den kalma KRİTİK bug fix — presence yazımı çözer
- v8 fix (`runTransaction` → sequential get+set) Sprint-03 Faz 3'te bulundu — async getDoc uyumsuz
- **v9 fix** (Sprint-04 Aşama 1-4): (a) `/users/{uid}/rateLimit` subcollection rule eklendi, (b) `+page.svelte` `getDeviceUid()` kullanıyor — iki bağımsız bug, ikisi de fix'lendi
- **D-061** ile `/rooms/*` routes tamamen silindi — canlı test için artık **/leaderboard** sekmesi tek giriş noktası
- CDN cache: Her deploy sonrası 30 saniye bekle, `?v=N` query string ile bypass

---

**Son güncelleme:** 2026-08-11 (S-0033 — Sprint-05 Faz 1.5 Leaderboard UX polish tamamlandı, 6 yeni karar (D-063..D-068) + Faz 1 single-room refactor (D-059..D-062) docs eklendi, toplam 68 karar. Sıradaki: Sprint-05 Faz 2 — home stats fix + firestore rules tightening + TTL deploy.)
**Patron:** Enes
**Müdür:** Mavis
**Sıradaki sprint:** Sprint-05 Faz 2 — Polish + Home stats
