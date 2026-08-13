---
tags: [timer, backlog, bugs, improvements, obsidian-ready]
created: 2026-08-11
updated: 2026-08-12
type: backlog
---

# 🐛 Backlog — Timer

> Gözden geçirilecek bug / iyileştirme / gözlem noktaları.
> Tarihe göre ayrılmıştır; her tarih altında tip kategorileri.
> Yeni nokta → `[tarih] #N` numarası ile eklenir (ID kalıcıdır).

> 📚 **Detay:** [[RESUME]] · [[STATUS]] · [[DECISIONS]] · [[IDEAS]]
> 🗂 **Plan:** [[docs/superpowers/plans/2026-08-12-backlog-triage|2026-08-12 Backlog Triage]] — 3 nokta için detaylı plan, TDD tasklarıyla.

---

## 📅 2026-08-11 (3 nokta)

### 🐛 Bug

#### #1 — Seans bitiş modal'ında tutarsız süre bilgileri
**Sorun:** Çalışma durdurulduğunda açılan "Seansı bitirdin 👋" ekranında değerler çelişiyor:
- "Bu seans **139sn**" (~2.3 dk)
- "Bugün toplam **0dk**"
- "Bu hafta toplam **0dk**"
- "Sonraki rozet İlk Adım için **60dk** kaldı"

→ Seans süresi toplama yansımıyor ya da format birimleri karışıyor (sn ↔ dk). Kullanıcı kafası karışık.

**Beklenen:** Seans süresi doğru toplamlara eklensin veya aynı modal'da tutarlı birimler kullanılsın.

**İlgili karar:** D-018 (stats rolling week sum) — Sprint-04 kalan işlerden. Bu bug muhtemelen istatistik hesabının seans bitiminde tetiklenmemesinden kaynaklanıyor.

**Ekran görüntüsü:** Paylaşıldı (23:18:40 — "Seansı bitirdin 👋" modal).

**Dosya:** Muhtemelen `routes/+page.svelte` veya session-end modal component'i. Tam yer tespit edilmeli.

---

#### #3 — "Odayı sil" butonu tüm üyelerde görünüyor
**Sorun:** Oda detay sayfasındaki "Odayı sil" butonu, odanın kurucusu olmayan kullanıcılarda da görünüyor. Sadece owner görmeli (D-049 kararı gereği).

**Beklenen:** Buton yalnızca `room.ownerUid === currentUid` koşulunda render edilsin. Client-side guard yeterli MVP için; server-side zaten D-049 ile korunuyor.

**Dosya:** `routes/rooms/[id]/+page.svelte` (oda detay sayfası).

---

### ✨ İyileştirme

#### #2 — Arka planda zamanlayıcı devam etsin (PWA persistence)
**İstek:** Sayfa yenilendiğinde veya kullanıcı sekmeyi kapatıp uygulamadan çıktığında sayaç durmasın. Aynı cihazdan geri girildiğinde **kaldığı yerden devam etsin**.

**Davranış spec:**
- Timer başlatıldığında başlangıç zamanı `localStorage` (veya IndexedDB)'ye yazılsın.
- Background'da sayaç hesabı `startTime + elapsed` formülünden yapılsın (setInterval zorunlu değil).
- Sayfa tekrar açıldığında elapsed = now - startTime olarak hesaplanıp UI'a yansıtılsın.
- **Çapraz platform:** Hem iOS Safari hem Android Chrome'da çalışmalı. PWA + Service Worker gerekebilir (Background Sync API).
- "Duraklat / Durdur" gibi kullanıcı aksiyonları persistence'ı temizlemeli.

**Dosya:** Timer core — `src/lib/timer/` (muhtemelen `timer.ts` veya `state.ts`). PWA için `static/sw.js` veya Workbox.

**Karar bekleyen:** Tam persistence stratejisi (localStorage vs IndexedDB) ve Service Worker ihtiyacı patron ile netleştirilmeli.

---

### 🤔 Gözlem
_(henüz yok)_

---

## 📅 2026-08-12 (3 nokta) — Sprint-05 Faz 1.5 parked

### 🐛 Bug

#### #4 — Yanıp sönen nokta (pulsing dot) çalışmıyor
**Sorun:** Sprint-05 Faz 1.5 #2 maddesi olarak eklendi. `effective === 'running'` durumunda username yanında yeşil pulsing dot görünmeli. 5 fix denendi (commit d0a7112, 699e3cc, 22f4e14, 25beb62, 69d1c43) — hepsi başarısız. Brave shield hipotezi elendi (Safari'de de çalışmıyor). Client-side presence write mimarisi fragile.

**Beklenen:** `timer.setRoomContext` mount'ta çağrılmalı, Firestore `status: "running"` yazılmalı, `/leaderboard` subscribe ile render etmeli. Debug log kanıtı: `pushToRemote writing presence, status= running` çağrıldı ama doc hâlâ `idle, 0` (override pattern — Fix 5 guard snapshot re-fire'ları engelledi, ama başka sorun var).

**Park kararı:** Sprint-05 Faz 1.5 patron kararı (2026-08-12): #2/#5/#6 Faz 2'ye park edildi. Client-side mimari değiştirilemez. Server-side presence write (Cloud Functions) gerekli.

**İlgili karar:** Sprint-05 Faz 2 planlaması (D-022) — Cloud Functions + server-side rate limit + owner check + recursive delete.

**Dosya:** `mobile/src/routes/+page.svelte` (Fix 5 lastRoomId guard eklendi, kalmalı) + `mobile/src/lib/stores/timer.svelte.ts` (presence write mimarisi).

---

#### #5 — Sessions write başarısız
**Sorun:** Sprint-05 Faz 1.5 #5 maddesi olarak eklendi. `timer.finish()` her seans bitişinde `users/{uid}/sessions/{sid}` doc yazmalı. Patron Firebase Console'da 2 doc oluştuğunu gördü (önceki test'ten), ama yeni finish'lerde doc oluşmuyor gibi. Aynı presence write mimarisi sorunundan muzdarip.

**Beklenen:** Her finish'te `recordSession({ dayKey, startedAt, endedAt: serverTimestamp(), elapsedMs })` → `users/{uid}/sessions/{sid}` doc. Subscribers (`subscribeUserWeeklySeconds`) bu doc'ları sum'lamalı.

**Park kararı:** Sprint-05 Faz 1.5 patron kararı (2026-08-12): #5 Faz 2'ye park. `recordSession` aynı mimari sorunundan muzdarip, server-side yazım gerekli.

**İlgili karar:** Sprint-05 Faz 2 (D-067 sessions subcollection + Faz 2 server-side).

**Dosya:** `mobile/src/lib/firebase/sessions.ts` (yeni) + `mobile/src/lib/stores/timer.svelte.ts:174-192` (finish()).

---

#### #6 — Weekly live timer (rolling 7-day) çalışmıyor
**Sorun:** Sprint-05 Faz 1.5 #6 maddesi olarak eklendi. `/leaderboard`'da her kullanıcının yanında "bu hafta" / "şu an" etiketi + her saniye artan süre görünmeli. 5 fix denendi — hepsi başarısız.

**Beklenen:** `liveSeconds(entry, now)` pure fn ile weeklySeconds + elapsedMs/1000 + (running only)(now - lastSeen)/1000 hesaplamalı. 1 saniyelik `$effect` + `setInterval` ile `nowMs` reaktif. Patron'un test'i: "manuel idle → running değiştir → istediğim çıktıyü gördüm" → render doğru, write başarısız.

**Park kararı:** Sprint-05 Faz 1.5 patron kararı (2026-08-12): #6 Faz 2'ye park. Subscribe çalışıyor (manuel test kanıtı), write başarısız. Server-side aggregation Faz 2'de.

**İlgili karar:** Sprint-05 Faz 2 (D-068 weekly live + Faz 2 server-side aggregation).

**Dosya:** `mobile/src/lib/utils/live-timer.ts` (yeni) + `mobile/src/lib/firebase/rooms.ts:368-479` (LeaderboardEntry + subscribeRoomMembers merge).

---

**Toplam:** 6 nokta (3 bug + 1 iyileştirme + 3 Faz 1.5 parked bug)
**Son güncelleme:** 2026-08-12
