---
tags: [timer, backlog, bugs, improvements, obsidian-ready]
created: 2026-08-11
updated: 2026-08-11
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

**Toplam:** 3 nokta (2 bug, 1 iyileştirme)
**Son güncelleme:** 2026-08-11
