---
tags: [timer, resume, session-handoff, obsidian-ready]
created: 2026-08-04
updated: 2026-08-09 (S-0030 — Sprint-04 Debugging Pass tamamlandı: v10 setRoomContext duplicate fix (commit b69bd93, pushed) + v11 (rule structure validation, console.log cleanup, expireAt/perf/race doc comments). Sprint-04 kalan: TTL policy enable (patron) + Cloud Functions (server-side rate limit, owner check, recursive delete).)
type: session-resume
---

# 🏁 Timer Projesi — Session Özeti / Devam Planı

> **Bu dosya yeni bir session'da işe başlarken İLK okunacak dosyadır.**
> Tüm kararları, durumu, sıradaki adımları tek bakışta özetler.

> 📚 **Detay:** [[STATUS]] · [[DECISIONS]] · [[HUB]] · [[00-Home]] · [[IDEAS]]

---

## 📍 Şu An Neredeyiz

**Aşama:** Sprint-04 Debugging Pass tamamlandı (v10 + v11), **TTL policy + Cloud Functions � Patron işlemi**
**Tarih:** 2026-08-09 (S-0030)
**Patron:** Enes
**Canlı:** https://timerviber.web.app (otomatik deploy, `Umqra11/timer-app` GitHub repo, 10 commit — v10 b69bd93 dahil)

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

## 🛠️ Teknoloji Stack (D-009, D-015, D-020, D-044)

| Katman | Seçim |
|--------|-------|
| Frontend | SvelteKit (PWA) — `adapter-static` |
| Hosting | 🔥 Firebase Hosting (D-044) — `https://timerviber.web.app` |
| Backend + DB + Realtime | 🔥 Firestore (europe-west3, eur3) |
## 📊 Commit'ler (Sprint-03 + Sprint-04)

```
(Sprint-04 Debugging Pass — S-0030)
b69bd93 fix(rooms): remove duplicate setRoomContext call in onMount (v10)  ← pushed
(Sprint-04 v11: rule + console + docs — yerel, push bekliyor)
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

---

## 🎯 Ürün Özeti (Yeni Session İçin)

**Timer** = Telefon öncelikli web uygulaması, Türkiye pazarı, ücretsiz, kişisel/arkadaş grubu.

**MVP Ekranları (3):**
1. **Kronometre** (✅ Sprint-01+02) — 2 buton (D-038: Başlat / [Duraklat+Durdur]), selamlama, sayaç, istatistik pill, seansı bitirme modalı (D-036), tık sesi (D-017)
2. **Odalar** (✅ Sprint-02+03) — ⭐ Hero stil (D-013), 👋 son katıldığın oda hero (D-014), davet kodu, oda detay sayfası (leaderboard + reactions), odayı sil (D-049)
3. **Profil** (✅ Sprint-02) — kullanıcı kartı, istatistik kartları (streak + bugün + toplam, D-018), çıkış yap

**Tasarım:** Pure Black Dark Mode, Inter font (ultralight 200 — D-027), Turkuaz/Teal vurgu, modern minimalist.

---

## 📋 Sprint-04 Plan (Yeni Session İçin)

### ✅ Tamamlandı

- [x] Aşama 1: Debug (SDK `sendReaction` permission-denied) — kök neden bulundu (rateLimit rule + yanlış targetUid), fix deploy edildi
- [x] Aşama 4: Verification — canlı smoke cross-user round-trip çalışıyor
- [x] **Debugging Pass (S-0030)** — 6 bulgu #1-#6 ele alındı, v10 + v11 tamamlandı

### ⏳ Kalan (Manuel patron işlemi + Sprint-05 adayı)

- [ ] **TTL policy enable (patron işlemi)** — Firebase Console → Firestore → Indexes & TTL → `expireAt` field, 14400 saniye
- [ ] Cloud Function: `users/{uid}/rateLimit/reactions` server-side atomic check (`runTransaction` — server-side async `getDoc` OK)
- [ ] Cloud Function: oda silme recursive (presence + reactions + joinedRooms)
- [ ] Cloud Function: oda sahibi custom check (uid karşılaştırması — D-049 sıkılaştırma)
- [ ] Stats rolling week sum (D-018)
- [ ] Username reclamation policy (D-015)
- [ ] Console error monitoring

---

## 💡 Yeni Session İçin Hızlı Hatırlatma

**Patron ilk mesajda:** "Timer kaldığımız yerden devam" veya Sprint-04'e atla

**Müdür (sen, Mavis) yapacağın:**
1. `RESUME.md` oku (bu dosya)
2. `STATUS.md` kontrol et
3. `DECISIONS.md` gözden geçir (55 karar — D-001'den D-055'e)
4. Canlı test: https://timerviber.web.app/rooms/0d0aafd0-abbe-4264-a47c-d7ae557d3d1e
5. Patronun TTL policy enable işlemini bekle, sonra kalan listeye devam et

**Önemli notlar:**
- v6 fix (`setRoomContext.onRemote` opsiyonel) Sprint-02'den kalma KRİTİK bug fix — presence yazımı çözer
- v8 fix (`runTransaction` → sequential get+set) Sprint-03 Faz 3'te bulundu — async getDoc uyumsuz
- **v9 fix** (Sprint-04 Aşama 1-4): (a) `/users/{uid}/rateLimit` subcollection rule eklendi, (b) `+page.svelte` `getDeviceUid()` kullanıyor — iki bağımsız bug, ikisi de fix'lendi
- CDN cache: Her deploy sonrası 30 saniye bekle, `?v=N` query string ile bypass

---

**Son güncelleme:** 2026-08-07 (S-0029 — Sprint-04 Aşama 1-4 tamamlandı, Aşama 5 ⏳ TTL policy patron işlemi. 8 commit, 55 karar, canlıda SDK + cross-user tepki çalışıyor.)
**Patron:** Enes
**Müdür:** Mavis
**Sıradaki sprint:** Sprint-04 — Debug + Polish
