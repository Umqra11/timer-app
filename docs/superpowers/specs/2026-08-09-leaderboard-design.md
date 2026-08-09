---
title: /leaderboard Single-Room Refactor — Design Spec
date: 2026-08-09
status: draft
author: Claude (Mavis) · onay bekliyor: Enes (Patron)
sprint: Sprint-05 adayı
related-decisions: [D-006, D-013, D-018, D-033, D-034, D-037, D-044, D-047, D-049, D-050, D-051, D-052, D-053, D-054]
new-decisions: [D-059, D-060, D-061, D-062]
tags: [leaderboard, navigation, single-room, sprint-05]
---

# /leaderboard Single-Room Refactor — Design Spec

## 1. Arka Plan & Bağlam

Sprint-04 Debugging Pass tamamlandı (`008fd39`). Üç bilinen pürüz var:

1. **`/leaderboard` placeholder** — D-033 ile sekme eklendi ama içerik Sprint-03'te doldurulmayı bekliyor. Şu anki body: "Sprint-03'te bu haftanın ve tüm zamanların sıralaması burada görünecek."
2. **Home hardcoded 0dk** — D-018 stats verisi /profile'a bağlı, /+page.svelte bağlamıyor.
3. **`allow delete: if true` (rooms)** — D-049 owner check MVP'de client-side'a bırakıldı, rules açık.

Bu spec **yalnızca #1 (leaderboard)** için. #2 ve #3 ayrı spec/plan döngüsü.

### Neden şimdi?

- Patron D-018'de liderlik tablosunu bilinçli olarak MVP dışı bıraktı ("rozetler, seviyeler, liderlik tablosu, günlük görevler (sonra)")
- D-033 sonradan Liderlik sekmesini referans görsel için ekledi ama içerik boş kaldı
- D-047 ile `/rooms/[id]` zaten per-room leaderboard gösteriyor — nav'daki Liderlik sekmesinin anlamı netleşmedi

### Temel gerilim

`/rooms/[id]` zaten bir leaderboard gösteriyor (username, totalSeconds, presence). Nav'daki ayrı bir "Liderlik" sekmesinin **neyi farklı göstereceği** netleşmedi:

- A) Global haftalık top-N → dünyayla karşılaştır, ama Firestore collection scan pahalı + henüz kullanıcı yok
- B) "Odalarım" özeti → multi-room var sayıyor, Patron istemiyor
- C) Hibrid → iki yük birden, karmaşık UI

Patron kararı: **tek-oda modeli**. Her kullanıcı tam olarak 1 odada. `/leaderboard` = o odanın tam görünümü. `/rooms` listesi gereksiz.

---

## 2. Hedefler & Non-Goals

### Hedefler

- `/leaderboard` sekmesi işlevsel, anlamlı, içerik dolu olacak
- Multi-room üyeliği engellenecek (client + rules katmanında)
- Kullanıcı odasını değiştirebilir ("Odadan ayrıl" butonu)
- Sahip olunan oda silinebilir (D-049 zaten var)
- Mevcut per-room leaderboard veri katmanı (D-047) yeniden kullanılacak — sıfırdan yazım yok

### Non-Goals (bu spec kapsamında DEĞİL)

- Global cross-user leaderboard (D-018'in MVP-dışı bıraktığı)
- Rozetler / seviyeler (D-037 Sprint-03+)
- Yeni analytics / aggregate query (Firestore aggregation API'si Sprint-05+ adayı)
- Cloud Functions ile server-side rate-limit / recursive delete (Sprint-05 #6 backlog)
- Push notification, friend system, follow (uzak vade)

---

## 3. Kullanıcı Senaryoları

### Senaryo A — Yeni kullanıcı (oda yok)

1. Kullanıcı onboarding'den geçer, Kronometre'ye düşer
2. Alt nav'dan "Liderlik" sekmesine basar
3. Empty state görür: Trophy ikonu + "Henüz bir odaya üye değilsin" + iki buton ("Oda kur", "Davet koduyla katıl")
4. "Oda kur" → modal → isim gir → kurulur → aynı sayfada leaderboard görünür
5. Veya "Davet koduyla katıl" → modal → 6 karakter kod → katılır → aynı sayfada leaderboard görünür

### Senaryo B — Tek odalı kullanıcı (oda var)

1. Kullanıcı Liderlik sekmesine basar
2. Odasının tam görünümünü görür: başlık, davet kodu, leaderboard, tepki baloncukları, "Tepki yaz" butonu
3. Alt kısımda:
   - Sahibi ise → kırmızı "Odayı sil" butonu
   - Üye ise → gri "Odadan ayrıl" butonu
4. Reaksiyon baloncukları anlık güncellenir (Firestore onSnapshot)

### Senaryo C — Üye ayrılmak istiyor

1. "Odadan ayrıl" butonuna basar → onay modalı
2. Onaylayınca joinedRooms/{roomId} doc silinir, leaderboard empty state'e döner
3. Sahibi olmayan oda artık erişilemez (rule'lar gereği okunamaz, ama /leaderboard yine de kendi joinedRooms'unu dinlediği için kendisi için sorun yok)

### Senaryo D — Sahip odayı silmek istiyor

1. Kırmızı "Odayı sil" → onay modalı
2. Onaylayınca rooms/{roomId} doc silinir (recursive delete Cloud Function'a bırakılmış — subcollection'lar orphan kalır, Sprint-05 backlog)
3. joinedRooms doc'ları orphan kalır (rule: `allow delete: if false`) — bu davranış mevcut, sprint kapsamı dışı düzeltme

### Senaryo E — Multi-room denemesi (negatif)

1. Kullanıcı zaten bir odadayken "Davet koduyla katıl" modalını açıp kod girer
2. Client pre-check `joinedRooms.length >= 1` → inline hata: "Zaten bir odadasın: **Akademi Cafe**. Önce ayrılmalısın."
3. Firestore'a yazılmaz

---

## 4. Tasarım Kararları (yeni D-NNN'ler)

### D-059 · Multi-room engellendi (client + rules)

**Tarih:** 2026-08-09
**Bağlam:** Patron: "birden fazla Oda'ya üye olunması çok istediğim bir şey değil"
**Karar:** Her kullanıcı en fazla 1 odada. Engelleme:
- **Client:** `joinRoomByCode` ve `createRoom` öncesi `subscribeMyRooms` cache'inden kontrol; `>= 1` ise `{ ok: false, reason: 'already-in-room' }`
- **Rules:** `users/{uid}/joinedRooms/{roomId}` `create` için cross-user atomic check yapılamaz (D-015 — auth yok); race window'u kabul edilen trade-off (Sprint-05 Cloud Function ile kapanır)

**Gerekçe:** Çok odalı kullanıcı dikkat dağılır, "asıl" oda netleşmez. Discord sunucusu gibi tek ana çalışma alanı.
**Etki:** `rooms.svelte.ts`, `rooms.ts`, `firestore.rules` değişiklik.

### D-060 · `/leaderboard` = tek-oda görünümü

**Tarih:** 2026-08-09
**Karar:** `/leaderboard` sekmesi kullanıcının (tek) odasının tam leaderboard görünümüdür. Oda yoksa empty state + kur/katıl.
**Gerekçe:** Multi-room yokluğunda Liderlik sekmesinin anlamlı içeriği budur. D-047 per-room leaderboard mantığını doğrudan yeniden kullanır.
**Etki:** `/leaderboard` yeniden yazılır; `/rooms` ve `/rooms/[id]` kaldırılır.

### D-061 · `/rooms` ve `/rooms/[id]` kaldırıldı

**Tarih:** 2026-08-09
**Bağlam:** Multi-room bloklu; Liderlik = tek oda. /rooms listesi gereksiz.
**Karar:** `routes/rooms/+page.svelte` ve `routes/rooms/[id]/+page.svelte` dosyaları **silinir**. Hiçbir redirect koyulmaz (artık tek giriş noktası /leaderboard).
**Gerekçe:** D-060 ile tutarlı; kullanıcı deneyimi sadeleşir.
**Etki:** Nav'daki "Odalar" sekmesi zaten yok (D-033 ile "Liderlik" seçildi). Dosya silme.

### D-062 · Üye ayrılabilir, sahip silebilir

**Tarih:** 2026-08-09
**Bağlam:** D-059 ile kullanıcı tek odada. Eski oda pasif/soğuk ise sıkışır.
**Karar:**
- Üye olan kullanıcı → `leaveRoom(roomId)` ile joinedRooms/{roomId} doc'unu silebilir
- Sahip olan kullanıcı → `deleteRoom(roomId)` ile oda doc'unu silebilir (D-049, mevcut)
- Yeni üyelik öncesi ayrılmak zorunlu (D-059)

**Gerekçe:** Pasif odalarda sıkışma kötü UX. Patron istedi: "'Odadan ayrıl' butonu (üye ise)".
**Etki:** `rooms.ts` `leaveRoom` fonksiyonu eklenir; `firestore.rules` `users/{uid}/joinedRooms/{roomId}` `allow delete: if true` olur (mevcut `if false` kaldırılır).

---

## 5. Mimari

### 5.1 Route yapısı (son)

```
mobile/src/routes/
├── +layout.svelte         (değişmez — auth gate, Nav)
├── +page.svelte           (Kronometre, değişmez)
├── onboarding/+page.svelte (değişmez)
├── profile/+page.svelte   (değişmez)
├── leaderboard/+page.svelte  ← YENİ içerik (yeniden yazım)
└── rooms/                  ← SİLİNİR (artık yok)
    ├── +page.svelte
    └── [id]/+page.svelte
```

### 5.2 Bileşen yapısı

`/leaderboard` iki moda sahip:

- **`<LeaderboardEmpty />`** — oda yoksa; trophy ikonu + mesaj + iki CTA button + create/join modals
- **`<RoomView />`** — oda varsa; mevcut `/rooms/[id]/+page.svelte` içeriğinin çıkarılmış hali (back button YOK — nav'dan geliniyor, geri gitmek için Kronometre sekmesi)

`RoomView` ayrı bir component'e çıkarılır mı düşünülecek — karar spec'te bağlayıcı değil, implementasyon sırasında kararlaşır. **MVP için inline tutulması tercih edilir** (ek dosya karmaşıklığı eklemeden, /rooms/[id]'nin 380 satırı kaldırılmış hali).

### 5.3 Veri katmanı — yeniden kullanım

| Mevcut | Yeni kullanım |
|--------|--------------|
| `subscribeMyRooms(cb)` | İlk doc'un roomId'sini al |
| `subscribeRoom(roomId, cb)` | Oda metadata |
| `subscribeRoomMembers(roomId, cb)` | Per-room leaderboard |
| `subscribeReactions(roomId, cb)` | Tepkiler |
| `touchRoom(roomId)` | Mount'ta çağrılır (lastOpenedAt) |
| `deleteRoom(roomId)` | Sahip için (mevcut) |
| `joinRoomByCode(code)` | Pre-check eklenir |
| `createRoom(name)` | Pre-check eklenir |
| — | **`leaveRoom(roomId)` — YENİ** |
| `setRoomContext(...)` (timer store) | /leaderboard mount'ta çağrılır |

Yeni `leaveRoom`:

```typescript
// mobile/src/lib/firebase/rooms.ts
export async function leaveRoom(roomId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = getDb();
  if (!db) return { ok: false, reason: 'unavailable' };
  const uid = getDeviceUid();
  await deleteDoc(doc(db, `users/${uid}/joinedRooms/${roomId}`));
  // rooms/{roomId} doc'una dokunma (sahip değilse zaten silemez, sahipse deleteRoom ayrı yol)
  return { ok: true };
}
```

### 5.4 Store katmanı — `rooms.svelte.ts`

```typescript
// Yeni error reason
type CreateError = 'already-in-room' | 'invalid' | 'unavailable';
type JoinError = 'already-in-room' | 'invalid' | 'unavailable' | 'not-found';

// create() ve joinByCode() başında:
if (Object.keys(myRoomsCache).length >= 1) {
  return { ok: false, reason: 'already-in-room' };
}
```

`myRoomsCache` — `subscribeMyRooms`'dan gelen son sonuç. Yeni bir cache state eklenir.

### 5.5 Timer bağlamı

`/leaderboard` mount'ta `timer.setRoomContext({ roomId, username })` çağırır — `/rooms/[id]` ile aynı davranış. Kullanıcı Liderlik sekmesindeyken kronometre "çalışıyorsa" presence yazılır.

---

## 6. UI / UX

### 6.1 Empty state (`<LeaderboardEmpty />`)

Tasarım dili: mevcut `LeaderboardEmpty` placeholder'ından evrilir. Pure Black dark mode + teal accent. iOS safe-area.

```
┌─────────────────────────────────────┐
│ Liderlik                            │
│ Odadaki sıralama                    │
├─────────────────────────────────────┤
│        [🏆 büyük ikon]              │
│                                     │
│  Henüz bir odaya üye değilsin       │
│  Arkadaşlarınla birlikte çalışmak   │
│  için bir oda kur veya katıl.       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Oda kur                  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Davet koduyla katıl         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

- 2 buton: primary (`bg-accent`) + secondary (`border bg-surface`)
- Create modal: mevcut /rooms/+page.svelte'deki form
- Join modal: mevcut /rooms/+page.svelte'deki form

### 6.2 Oda varken (`<RoomView />`)

`/rooms/[id]/+page.svelte`'nin **back butonu olmadan** kopyası. İçerik başlık + davet kodu kartı + leaderboard + tepki baloncukları + "Tepki yaz" butonları + (sahipse) sil / (üyeyse) ayrıl.

Subtitle değişikliği: "Bu hafta en çok çalışanlar" → **"Odadaki sıralama"**

Ayrılma onay modalı silme modalından basitçe kopyalanır (metin değişir: "Ayrılmak istediğine emin misin? Oda seni görmeyecek. İstediğin zaman yeni odaya katılabilirsin.").

### 6.3 Hata mesajları

| Sebep | Mesaj |
|-------|-------|
| `already-in-room` (join/create) | "Zaten **{roomName}** odasındasın. Önce ayrılmalısın." |
| `forbidden` (delete) | "Bu odayı sadece sahibi silebilir." (mevcut) |
| `not-found` (delete) | "Oda zaten silinmiş." (mevcut) |
| Leave başarısız | "Ayrılınamadı. Tekrar dene." + retry |
| Race window (rules bypass) | "İşlem sırasında beklenmeyen durum. Sayfayı yenile." + reload |

---

## 7. Veri Akışı (akış diyagramı)

```
┌─────────────────────────────────────────────────────────────┐
│ /leaderboard mount                                           │
└────────────────────┬────────────────────────────────────────┘
                     ▼
        ┌─────────────────────────┐
        │ subscribeMyRooms()      │  ← cached as myRoomsCache
        └────────┬────────────────┘
                 ▼
        ┌────────────────────────┐    0 rooms
        │ rooms.length === 0 ?   │ ─────────────► EmptyState render
        └────────┬───────────────┘
                 ▼
        ┌────────────────────────┐    1 room
        │ ilk room.id            │ ─────────────► RoomView render
        └────────┬───────────────┘
                 ▼
   ┌──────────────────────────────────────────┐
   │ subscribeRoom(rid)                       │ ← oda metadata
   │ subscribeRoomMembers(rid)                │ ← leaderboard
   │ subscribeReactions(rid)                  │ ← tepkiler
   │ touchRoom(rid)                           │ ← lastOpenedAt
   │ timer.setRoomContext({ rid, uname })     │ ← presence sync
   └──────────────────────────────────────────┘
                 ▼
           Live update ◄──── onSnapshot
```

### Oda silindiğinde (sahip sildi veya network)

`subscribeRoom` null döner → mount'ta `room = null` → `notFound = true` → empty state göster + "Bu oda artık mevcut değil. Farklı bir odaya katılabilirsin." toast.

### Üye ayrıldığında

`leaveRoom()` başarılı → `joinedRooms` subscription'da doc kaybolur → `myRooms.length === 0` → empty state.

---

## 8. Hata Yönetimi

| Katman | Hata | Davranış |
|--------|------|----------|
| Client pre-check | `already-in-room` | Modal inline mesaj, Firestore'a yazılmaz |
| Firestore rule | `permission-denied` (create) | console.error + alert (beklenmez, race window) |
| Network | Timeout / offline | Alert + retry butonu |
| `leaveRoom` | Doc bulunamadı | "Zaten ayrılmışsın" + empty state'e dön |
| `deleteRoom` | `forbidden` | "Bu odayı sadece sahibi silebilir." (mevcut) |
| `deleteRoom` | `not-found` | "Oda zaten silinmiş." (mevcut) |
| `deleteRoom` | Sahip kendisi de değilse ayrılırsa | Sahip olmayan üye normal ayrılır, doc kalır (silinemez) |

**Race window (cross-tab):** İki sekmeden aynı anda join denirse, ikisi de başarılı olabilir (D-015 + auth yok). Kabul edilen trade-off. UI tutarlı kalır çünkü `subscribeMyRooms` her iki doc'u da görür — ama kurallar gereği sadece 1 gösterilir (UI'da ilk). Sprint-05 Cloud Function gelene kadar bu açık.

---

## 9. Güvenlik

### 9.1 Client tarafı (güvenilmez)

Pre-check UX kolaylığı içindir, güvenlik katmanı değildir.

### 9.2 Firestore rules — gereken değişiklikler

#### Değişiklik A — `users/{uid}/joinedRooms/{roomId}` create (D-059)

**Önce:** `allow create, update: if true;`
**Sonra:** `allow create: if true;` (aynı — rules'ta joinedRooms count kontrolü D-015 nedeniyle yapılamaz, cross-user atomic ops yok)

> **Açıklama:** Multi-room engellemenin tek sağlam yolu server-side'dır (Cloud Function: `if (await countUserJoinedRooms(uid) >= 1) reject`). Rules katmanı mevcut SDK ile bunu yapamaz. Client pre-check tek savunma hattı.

#### Değişiklik B — `users/{uid}/joinedRooms/{roomId}` delete (D-062)

**Önce:** `allow delete: if false;`
**Sonra:** `allow delete: if true;`

Kullanıcı kendi joinedRooms/{roomId} doc'unu silebilir (ayrılma için). Cross-user erişim yok (path'inde uid var).

#### Değişiklik C — `rooms/{roomId}` delete (D-049, SPRINT-03 KARARI, BU SPEC DIŞI)

**Önce:** `allow delete: if true;` (D-049, MVP bilinçli açık)
**Sonra:** Sprint-05'te ayrı bir spec'te ele alınacak. Bu spec dokunmuyor.

### 9.3 Bilinen sınırlar (D-015 ile tutarlı)

- Cross-user yazım koruması yok (auth yok) — D-015
- Rate-limit client-side (D-053) — server-side Sprint-04 #6
- Recursive delete yok — owner silince subcollection'lar orphan kalır — Sprint-04 #6

---

## 10. Test Stratejisi

Proje test altyapısı yok (no vitest config, no playwright config, sadece manual smoke). Bu spec de eklemiyor — pattern'i korur, sadece **manuel test senaryoları listesi**:

### Manuel smoke test checklist

- [ ] Oda yokken /leaderboard → empty state
- [ ] Empty state'de "Oda kur" → modal → isim → kurulur → RoomView açılır
- [ ] Empty state'de "Davet koduyla katıl" → modal → kod → katılır → RoomView açılır
- [ ] RoomView'da leaderboard görünür
- [ ] RoomView'da tepki baloncukları realtime günceller
- [ ] "Tepki yaz" modal açılır, metin girilir, gönderilir, modal kapanır
- [ ] Sahip → "Odayı sil" → onay → silinir → empty state'e döner
- [ ] Üye → "Odadan ayrıl" → onay → ayrılır → empty state'e döner
- [ ] Oda varken join/create denemesi → "already-in-room" hatası
- [ ] Cross-tab: 2 sekmeden aynı anda join denemesi → ikisi de görünür (race window, kabul)
- [ ] `npm run check` → 0 hata, 0 uyarı
- [ ] `npm run build` → başarılı

### Otomatik test eklemiyoruz (gerekçe)

- Mevcut projede vitest/playwright setup'ı yok
- Sprint-04 Debugging Pass "manual smoke" pattern'ini benimsemiş
- Bu spec ekleme yaparsa kapsam kayar (D-037 rozetlerle birlikte Sprint-05'e bırakılabilir)

---

## 11. Bağımlılıklar & Çapraz Etki

### Bu spec'in dokunduğu dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `mobile/src/routes/leaderboard/+page.svelte` | Yeniden yazılır (empty state + RoomView) |
| `mobile/src/routes/rooms/+page.svelte` | **SİLİNİR** |
| `mobile/src/routes/rooms/[id]/+page.svelte` | **SİLİNİR** |
| `mobile/src/lib/firebase/rooms.ts` | `leaveRoom()` eklenir; `joinRoomByCode`/`createRoom` mevcut haliyle kalır (pre-check store'da) |
| `mobile/src/lib/stores/rooms.svelte.ts` | `myRoomsCache` + pre-check + `already-in-room` reason |
| `mobile/firestore.rules` | joinedRooms delete: true (D-062); create/update mevcut (D-059 race window kabul) |
| `mobile/src/lib/firebase/stats.ts` | Dokunulmuyor (D-018 stats verisi /profile için kalır) |
| `mobile/src/lib/stores/timer.svelte.ts` | Dokunulmuyor |
| `mobile/src/lib/components/Nav.svelte` | Dokunulmuyor (zaten Liderlik sekmesi var) |

### DECISIONS.md güncellemesi (PR sonrası, PR kapsamında)

4 yeni karar eklenecek:
- D-059 Multi-room engellendi (client + rules)
- D-060 /leaderboard = tek-oda görünümü
- D-061 /rooms ve /rooms/[id] kaldırıldı
- D-062 Üye ayrılabilir, sahip silebilir

### Bu spec DIŞINDA kalan (Sprint-05 backlog'una)

- **#2 Home stats fix** (D-018 /+page.svelte hardcoded 0dk)
- **#3 Firestore delete rules tightening** (D-049 rooms delete: if true)
- **Sprint-04 #6 Cloud Functions** (rate-limit, recursive delete, owner check)
- **D-037 Rozetler** (Sprint-03+)
- **D-018 weekly rolling 7-day window** (henüz MVP-dışı)

### Çakışma / karar gerektiren nokta

- **joinedRooms delete rule (D-062)** ile **#3 Firestore delete rules tightening** task'ı çakışıyor. #3 task'ında joinedRooms delete kuralı zaten değiştirilmesi gereken yerlerden biri. **Sıralama önerisi:** Bu spec (D-062) önce gelir, çünkü leave için zorunlu. #3 task'ı D-062'yi de kapsayacak şekilde genişletilir veya ayrı tutulur — implementasyon sırasında netleşir.

---

## 12. Açık Sorular & İleri Çalışma

### Bu spec'te çözüldü

- ✅ /leaderboard ne gösterecek → tek-oda görünümü
- ✅ Multi-room nasıl engellenecek → client + rules
- ✅ Kullanıcı oda değiştirebilir mi → "Odadan ayrıl" butonu
- ✅ Navigasyon → /rooms ve /rooms/[id] kaldırılır

### Gelecek sprint'lere

- ❓ /rooms/[id]'deki içerik RoomView'a inline mı, ayrı component mi?
- ❓ Empty state'de "Oda kur" / "Davet koduyla katıl" — mevcut modal'ları taşıyor muyuz yoksa yeniden mi yazıyoruz?
- ❓ "Odadan ayrıl" sonrası roomCount cache'i ne zaman invalidate olur? (subscribeMyRooms'a güveniyoruz)
- ❓ /leaderboard → /+page.svelte geri dönüş akışı — timer context setRoomContext({roomId}) sekme değişiminde ne yapacak?

Bu sorular implementasyon sırasında `writing-plans` aşamasında detaylandırılır.

---

## 13. Referanslar

- [[DECISIONS]] — D-006, D-013, D-018, D-033, D-034, D-037, D-044, D-047, D-049, D-050, D-051, D-052, D-053, D-054
- [[docs/mvp-spec|MVP Spec]] — Sprint planı
- [[STATUS]] — Sprint-04 tamamlandı; Sprint-05 planlama aşamasında
- Kod referansları:
  - `mobile/src/lib/firebase/rooms.ts:265-280` (deleteRoom mevcut pattern)
  - `mobile/src/lib/stores/rooms.svelte.ts` (pre-check eklenecek yer)
  - `mobile/src/routes/rooms/[id]/+page.svelte` (silinecek ama içerik referans)
  - `mobile/firestore.rules:30-34` (joinedRooms rule değişecek)

---

> **Durum:** Taslak. Patron review'u bekliyor.
> **Sonraki adım:** Patron onayı → `superpowers:writing-plans` skill'i ile implementation plan oluşturma → 4 commit (leaderboard + store + rules + decisions).