---
tags: [timer, resume, session-handoff, obsidian-ready]
created: 2026-08-04
updated: 2026-08-07 (S-0028 — Sprint-03 Faz 1+2+3 tamamlandı, canlıda https://timerviber.web.app. Faz 1: oda detay, memberCount, owner delete ✅. Faz 2: leaderboard + presence (v6 fix sonrası çalışıyor — kullanıcı leaderboard'da görünüyor) ✅. Faz 3: reactions sistemi yazıldı ✅, SDK write debug gerek (Sprint-04). Toplam 55 karar, 5 commit, canlı URL aktif.)
type: session-resume
---

# 🏁 Timer Projesi — Session Özeti / Devam Planı

> **Bu dosya yeni bir session'da işe başlarken İLK okunacak dosyadır.**
> Tüm kararları, durumu, sıradaki adımları tek bakışta özetler.

> 📚 **Detay:** [[STATUS]] · [[DECISIONS]] · [[HUB]] · [[00-Home]] · [[IDEAS]]

---

## 📍 Şu An Neredeyiz

**Aşama:** Sprint-03 Faz 1 + 2 + 3 (kod) tamamlandı, **Sprint-04 (debug + polish) ⏳**
**Tarih:** 2026-08-07 (S-0028)
**Patron:** Enes
**Canlı:** https://timerviber.web.app (otomatik deploy, `Umqra11/timer-app` GitHub repo, 7 commit)

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

**Faz 3 — Mesaj/Reactions (D-052, D-053, D-054, D-055)** 🟡 (kod tamam, SDK debug gerek)
12. `src/lib/firebase/reactions.ts` (6.7 KB) — `sendReaction()` (D-052 atomic), `subscribeReactions()` (D-054)
13. D-053: Rate limit — dakikada 5, saatte 30, sliding window. Client-side, server-side Sprint-04'te Cloud Function ile.
14. D-052: `expireAt` field — Firestore TTL policy için (4 saat sonra otomatik silinme)
15. D-055: Sadece kişiye özel tepki (broadcast YOK — karar)
16. `+page.svelte`: Tepki yazma modalı (textarea + sayaç + hata), leaderboard satırlarında baloncuklar ("X dk önce"), kendine tepki yazma butonu
17. `firestore.rules`: `rooms/{roomId}/reactions/{reactionId}` match (read:true, create: text 1-60 + zorunlu alanlar, update/delete:false — ephemeral)
18. **KRİTİK FIX (v8)**: `runTransaction` içinde async `getDoc` çalışmıyor (tx.get sadece aynı transaction doc'larını okuyabilir, rate limit doc farklı collection'da). Düzeltme: İki adımlı sıralı işlem (readRateLimit → check → writeRateLimit → setDoc)
19. **Canlıda kanıtlandı** — REST API ile yazılan reaction browser'da görünüyor (`testus: test mesajı şimdi` baloncuğu). SDK `sendReaction` hâlâ 404 dönüyor (debug Sprint-04'e kaldı).

---

## 🔴 Sprint-04 — Bilinen Debug'lar (Yapılacak)

1. **SDK `sendReaction` 404** — REST 200, SDK sessizce başarısız. Olası: `setDoc` field'ları farklı serialize ediyor, `request.resource.data.keys().hasAll([...])` rule check fail ediyor. Debug: rule'da `hasAll` çıkar, MVP allow yap.
2. **Firestore TTL policy** — `expireAt` field için TTL policy Console'dan veya `gcloud firestore fields ttls update expireAt --collection-group=reactions --enable-ttl --seconds=14400`. (gcloud yok, Console'dan yapılacak.)
3. **Server-side rate limit** — Cloud Function ile `users/{uid}/rateLimit/reactions` server-side check
4. **Server-side owner check (D-049 sıkılaştırma)** — Custom function ile uid karşılaştırması
5. **Oda silme recursive delete** — Cloud Function ile presence + reactions + joinedRooms temizliği
6. **Stats rolling week sum (D-018)** — şu an sadece "bugün" gösteriliyor
7. **Username reclamation policy (D-015)** — eski username'ler orphan kalıyor, 30 gün grace period

---

## 🛠️ Teknoloji Stack (D-009, D-015, D-020, D-044)

| Katman | Seçim |
|--------|-------|
| Frontend | SvelteKit (PWA) — `adapter-static` |
| Hosting | 🔥 Firebase Hosting (D-044) — `https://timerviber.web.app` |
| Backend + DB + Realtime | 🔥 Firestore (europe-west3, eur3) |
| Auth | ❌ YOK (D-015) — username + localStorage uid |
| Sync | BroadcastChannel (aynı tarayıcı) + Firestore onSnapshot (farklı cihaz) |
| Styling | Tailwind CSS v4 |
| CI/CD | `firebase deploy --only hosting,firestore:rules` (manuel, her Sprint sonu) |
| Repo | `Umqra11/timer-app` GitHub |

**Maliyet:** MVP $0/ay (Spark: 10 GB hosting + 1 GB Firestore)

---

## 📊 Commit'ler (Sprint-03)

```
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

### Aşama 1: Debug (30-60 dk)
- [ ] SDK `sendReaction` neden 404 dönüyor? (rules field check, setDoc serialize, transaction scope)
- [ ] TTL policy: `expireAt` field için gcloud veya Console config

### Aşama 2: Server-side enforcement (1-2 saat)
- [ ] Cloud Function: `users/{uid}/rateLimit/reactions` server-side check
- [ ] Cloud Function: oda silme recursive (presence + reactions + joinedRooms)
- [ ] Cloud Function: oda sahibi custom check (uid karşılaştırması)

### Aşama 3: Polish (1 saat)
- [ ] Stats rolling week sum (D-018)
- [ ] Username reclamation policy (D-015)
- [ ] Console error monitoring

### Aşama 4: Verification (30 dk)
- [ ] check + build + deploy
- [ ] Canlı smoke: 2 kullanıcı aynı odada, leaderboard + reactions
- [ ] RESUME/STATUS final güncelleme

---

## 💡 Yeni Session İçin Hızlı Hatırlatma

**Patron ilk mesajda:** "Timer kaldığımız yerden devam" veya Sprint-04'e atla

**Müdür (sen, Mavis) yapacağın:**
1. `RESUME.md` oku (bu dosya)
2. `STATUS.md` kontrol et
3. `DECISIONS.md` gözden geçir (55 karar — D-001'den D-055'e)
4. Canlı test: https://timerviber.web.app/rooms/0d0aafd0-abbe-4264-a47c-d7ae557d3d1e
5. Sprint-04 debug listesinden başla

**Önemli notlar:**
- v6 fix (`setRoomContext.onRemote` opsiyonel) Sprint-02'den kalma KRİTİK bug fix — presence yazımı çözer
- v8 fix (`runTransaction` → sequential get+set) Sprint-03 Faz 3'te bulundu — async getDoc uyumsuz
- CDN cache: Her deploy sonrası 30 saniye bekle, `?v=N` query string ile bypass

---

**Son güncelleme:** 2026-08-07 (S-0028 — Sprint-03 Faz 1+2+3 tamamlandı, Faz 4 debug ⏳. 7 commit, 55 karar, canlı aktif.)
**Patron:** Enes
**Müdür:** Mavis
**Sıradaki sprint:** Sprint-04 — Debug + Polish
