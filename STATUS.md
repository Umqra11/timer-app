---
tags: [timer, status, project-status, obsidian-ready]
created: 2026-08-04
updated: 2026-08-07 (S-0028 — Sprint-03 Faz 1+2+3 tamamlandı, canlıda https://timerviber.web.app. Faz 4 debug + polish ⏳.)
type: status
---

# Timer — Proje Durumu

> **Son güncelleme:** 2026-08-07 (Sprint-03 Faz 1+2+3 kod tamamlandı ve canlıda. Faz 4 debug ⏳: SDK reactions write, TTL policy, server-side rate limit/owner check.)

> 📚 **Detay:** [[00-Home]] · [[HUB]] · [[IDEAS]] · [[DECISIONS]] · [[daily/README]] · [[README]] · [[RESUME]]

---

## 📍 Şu an neredeyiz

| Aşama | Durum |
|-------|-------|
| Konsept netleşti | ✅ Tamam (sosyal çalışma takip) |
| Klasör yapısı kuruldu | ✅ Tamam |
| Obsidian vault oluşturuldu | ✅ Tamam |
| Ürün kararları | ✅ Tamam (D-001 → D-008) |
| UX detay kararları | ✅ Tamam (D-021 → D-025) |
| Tasarım incelik kararları | ✅ Tamam (D-026 → D-031) |
| Referans ekran görüntüsü revizyonu | ✅ Tamam (D-032 → D-043) |
| Hosting kararı | ✅ Tamam (D-044 — Vercel çıkarıldı, Firebase Hosting) |
| Oda sistemi kararları | ✅ Tamam (D-045 → D-055) |
| Rakip analizi | ✅ Tamam (8 rakip, 5 fırsat) |
| MVP ürün özeti | ✅ Tamam (5 ekran, özellik seti) |
| Teknoloji stack | ✅ Tamam (D-009, D-020, D-044) |
| Tasarım sistemi | ✅ Tamam (Dark Mode, swipe, 3 sekme) |
| **Sprint-01: Altyapı** | ✅ **TAMAM** |
| **Sprint-02: Kod + Deploy** | ✅ **TAMAM** — usernames/rooms/presence/stats, BroadcastChannel + Firestore onSnapshot, tık sesi (D-017), istatistikler (D-018) |
| **Sprint-02: GitHub push** | ✅ **TAMAM** — `Umqra11/timer-app`, 2 commit |
| **Sprint-02: Canlı deploy** | ✅ **TAMAM** — `https://timerviber.web.app`, proje `timerviber` |
| **Sprint-03 Faz 1: Oda temel** | ✅ **TAMAM** — oda detay sayfası, D-048 memberCount, D-049 owner delete |
| **Sprint-03 Faz 2: Leaderboard** | 🟢 **ÇALIŞIYOR** — v6 setRoomContext fix sonrası presence yazımı tamam (kullanıcı leaderboard'da görünüyor) |
| **Sprint-03 Faz 3: Mesaj sistemi** | 🟡 **UI tamam, SDK debug gerek** — REST 200, SDK 404 (Sprint-04) |
| **Sprint-04: Debug + Polish** | ⏳ **Planlandı** — SDK reactions write, TTL policy, server-side rate limit/owner, recursive delete |

---

## 🎯 Hedef

- **Kısa vadeli:** MVP — basit mobil uygulama + backend
  - Oda oluşturma, arkadaş ekleme, zamanlayıcı, durum paylaşımı, mesaj tepkileri
- **Orta vadeli:** Gerçek zamanlı durum, rozetler, server-side enforcement
- **Vizyon:** Ders çalışan öğrenciler için sosyal motivasyon uygulaması

---

## 📋 Tamamlanan (Sprint-03)

### Faz 1: Oda temel (D-045, D-046, D-048, D-049) ✅
- `routes/rooms/[id]/+page.svelte` — oda detay sayfası (geri, davet kodu kopyala, Odayı sil + onay modalı)
- D-048: `memberCount` denormalize sayaç, `createRoom` initial 1, `joinRoomByCode` transaction atomik +1
- D-049: `deleteRoom()` server-side owner check (MVP'de `allow delete: if true` — Sprint-04'te Cloud Function)
- `firestore.rules` — rooms create/update/delete strict, presence match eklendi
- **Canlı doğrulama:** Oda oluştur → "1 kişi" → ikinci kullanıcı katıl → "2 kişi" → odayı sil → Firestore 404

### Faz 2: Leaderboard (D-047, D-050, D-051) 🟢
- `rooms.ts`: `subscribeRoomMembers` — N+1 query, her presence için `users/{uid}.totalSeconds` okur, totalSeconds desc sıralama
- D-050: `setRoomContext` + `visibilitychange` + `beforeunload` listener
- D-051: `effective` status çözümlemesi — 2dk stale, 5dk finished-late
- Leaderboard UI — username, durum pill, toplam süre
- **KRİTİK FIX (v6)**: `setRoomContext.onRemote` opsiyonel — presence yazımı çözer
- **Canlıda kanıtlandı:** `kullanici2` leaderboard'da görünüyor

### Faz 3: Mesaj/Reactions (D-052, D-053, D-054, D-055) 🟡
- `src/lib/firebase/reactions.ts` (6.7 KB) — `sendReaction()` (D-052 atomic), `subscribeReactions()` (D-054)
- D-053: Rate limit — dakikada 5, saatte 30, sliding window (client-side, Sprint-04 server)
- D-052: `expireAt` field — Firestore TTL policy için (4 saat)
- D-055: Sadece kişiye özel tepki (broadcast YOK)
- `+page.svelte`: Tepki yazma modalı (textarea + sayaç), leaderboard satırlarında baloncuklar
- `firestore.rules`: `rooms/{roomId}/reactions/{reactionId}` match
- **KRİTİK FIX (v8)**: `runTransaction` → sequential get+set (async getDoc uyumsuz)
- **Canlıda kanıtlandı:** REST API ile yazılan reaction browser'da baloncuk olarak görünüyor

### Faz 6: Verification (Sprint-03) ✅
- `npm run check` — 0 hata 0 uyarı (375 dosya)
- `npm run build` — `build/index.html` SPA fallback, `build/_app/` chunks
- 5 commit push'landı (`57e534b` → `14d49ce`)
- Canlıda screenshot: oda detay sayfası (leaderboard dolu, tepki baloncukları, Odayı sil butonu)

---

## 🚧 Açık Sorular (Sprint-04)

- **SDK `sendReaction` 404** — REST 200, SDK sessizce başarısız. Olası: `setDoc` field'ları farklı serialize, `request.resource.data.keys().hasAll([...])` rule check fail ediyor
- **Firestore TTL policy** — `expireAt` field için Console'dan veya `gcloud firestore fields ttls update expireAt --collection-group=reactions --enable-ttl --seconds=14400`
- **Server-side rate limit** — Cloud Function ile `users/{uid}/rateLimit/reactions` server-side check
- **Server-side owner check (D-049 sıkılaştırma)** — Custom function ile uid karşılaştırması
- **Oda silme recursive delete** — Cloud Function ile presence + reactions + joinedRooms temizliği
- **Stats rolling week sum (D-018)** — şu an sadece "bugün" gösteriliyor
- **Username reclamation policy (D-015)** — eski username'ler orphan kalıyor, 30 gün grace period

Detay: [[IDEAS]] · [[DECISIONS]]

---

## 📈 İlerleme Özeti

| Alan | Tamamlanan | Bekleyen |
|------|------------|----------|
| Konsept | 1/1 | 0 |
| Altyapı (vault/klasör) | 3/3 | 0 |
| Kararlar | **55/55** | 0 |
| Tasarım | 1/1 | 0 |
| Araştırma | 3/3 | 0 |
| Kod (Sprint-01) | 7/7 | 0 |
| Kod (Sprint-02) | 19/19 | 0 |
| Kod (Sprint-03 Faz 1) | 8/8 | 0 |
| Kod (Sprint-03 Faz 2) | 8/9 | 1 (SDK debug) |
| Kod (Sprint-03 Faz 3) | 7/8 | 1 (SDK debug) |
| Deploy | 1/1 | 0 |
| **Toplam** | **63/72** | **9/72** |

**Not:** Bekleyen 9 madde Sprint-04 debug + polish kapsamında.

---

**Son güncelleme:** 2026-08-07 (S-0028 — Sprint-03 Faz 1+2+3 tamamlandı, canlıda `https://timerviber.web.app`. 7 commit, 55 karar, Faz 4 debug ⏳.)
