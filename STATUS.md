---
tags: [timer, status, project-status, obsidian-ready]
created: 2026-08-04
updated: 2026-08-07 (S-0022 — Sprint-02 KOD tamamlandı, deploy ⏳ Patron config bekliyor)
type: status
---

# Timer — Proje Durumu

> **Son güncelleme:** 2026-08-07 (Sprint-02 kod tarafı bitti: Vercel temizlendi, Firebase SDK entegre, store'lar Firestore'a bağlandı, tık sesi + istatistikler eklendi, build & check temiz. Deploy ⏳ Patron'un Firebase projesini açıp config vermesi bekleniyor.)

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
| Hosting kararı | ✅ Tamam (D-044 — Vercel çıkarıldı, Firebase Hosting + Firestore) |
| Rakip analizi | ✅ Tamam (8 rakip, 5 fırsat) |
| MVP ürün özeti | ✅ Tamam (5 ekran, özellik seti) |
| Teknoloji stack | ✅ Tamam (D-009, D-020, D-044) |
| Tasarım sistemi | ✅ Tamam (Dark Mode, swipe, 3 sekme) |
| **Sprint-01: Altyapı** | ✅ **TAMAM** |
| **Sprint-02: Kod** | ✅ **TAMAM** — usernames/rooms/presence/stats, BroadcastChannel + Firestore onSnapshot, tık sesi (D-017), istatistikler (D-018) |
| **Sprint-02: GitHub push** | ✅ **TAMAM** — `Umqra11/timer-app`, 3 commit (Vercel cleanup, Firebase entegre, polish) |
| **Sprint-02: Deploy** | ⏳ **Patron config bekliyor** — Firebase projesi açılmalı, `VITE_FIREBASE_*` env'e yapıştırılmalı, `firebase deploy` çalıştırılmalı |

---

## 🎯 Hedef

- **Kısa vadeli:** MVP — basit mobil uygulama + backend
  - Oda oluşturma, arkadaş ekleme, zamanlayıcı, durum paylaşımı
- **Orta vadeli:** Gerçek zamanlı durum, istatistikler, rozetler
- **Vizyon:** Ders çalışan öğrenciler için sosyal motivasyon uygulaması

---

## 📋 Kalan Görevler (Sprint-02 Deploy)

> Tek Patron'a bağımlı adım — `console.firebase.google.com`'da proje açılınca deploy otomatik.

### Patron'un yapacağı (~5 dk)
- [ ] `console.firebase.google.com` → yeni proje: `timer-app`, region `europe-west`
- [ ] Build → Firestore Database → Create database → Production mode → `europe-west`
- [ ] Build → Hosting → Get started (kurulumu daha sonra CLI ile yapacağız)
- [ ] Project settings → Your apps → Web app ekle (`</>`) → Config bilgilerini Müdür'e ilet

### Müdür'ün yapacağı (config alınca ~3 dk)
- [ ] Config'i `mobile/.env.local`'e yapıştır (placeholder'lar hazır)
- [ ] `firebase login` → Patron hesabıyla
- [ ] `firebase deploy --only hosting,firestore:rules`
- [ ] Canlı URL: `https://timer-app.web.app` (veya Firebase'in verdiği)

---

## 📋 Tamamlanan (Sprint-02)

### Faz 1: Vercel temizliği (D-044) ✅
- `mobile/.vercel/`, `vercel.json`, `VERCEL_OIDC_TOKEN` silindi
- `adapter-vercel` ve `adapter-auto` çıkar, `adapter-static` kuruldu (SPA fallback `index.html`)
- `vite.config.ts` `adapter()` artık sveltekit plugin içinde, build temiz

### Faz 2: Git & GitHub ✅
- `Umqra11/timer-app` remote zaten bağlı
- 3 commit push'landı (Vercel cleanup, Firebase integration, polish)

### Faz 3: Firebase kod entegrasyonu ✅
- `firebase` SDK + `firebase-tools` (devDep) kuruldu
- `src/lib/firebase/client.ts` — lazy init, env yoksa offline mode (warn log)
- `src/lib/firebase/uid.ts` — device-scoped UUID (kimlik doğrulama yok)
- `src/lib/firebase/usernames.ts` — atomik claim (D-016), transaction-based
- `src/lib/firebase/rooms.ts` — rooms + `users/{uid}/joinedRooms/{roomId}` + invite code
- `src/lib/firebase/presence.ts` — `rooms/{roomId}/presence/{uid}` (idle/running/paused/finished)
- `src/lib/firebase/stats.ts` — streak/totals, Europe/Istanbul TZ (D-002)
- `firestore.rules` — MVP: usernames atomik claim, presence/rooms herkese açık read
- `firebase.json` — Hosting SPA rewrites, cache headers
- `.firebaserc` — proje alias

### Faz 4: Store'lar Firestore'a bağlandı ✅
- `username.svelte.ts` — `claim()` async API, taken/invalid/unavailable sonuçları
- `rooms.svelte.ts` — `subscribe()` mount'ta, `create/joinByCode/makeHero` async
- `timer.svelte.ts` — `setRoomContext` ile Firestore presence + BroadcastChannel hibrit (D-019)
- `finish()` yeni — presence'a 'finished' yaz, `touchStreak` çağır, state'i idle'a çek

### Faz 5: UI ✅
- Onboarding — D-016 server-side hata mesajları
- `src/lib/utils/click.ts` — Web Audio sentetik tık (D-017), 4 handle'da
- Profile sayfası — streak / bugün / toplam kartları + "İlk Adım" rozet hint'i
- Kutlama modalı — stats özetini gösteriyor

### Faz 6: Verification ✅
- `npm run check` — 0 hata 0 uyarı (372 dosya)
- `npm run build` — `build/index.html` SPA fallback, `build/_app/` chunks, `build/robots.txt`
- Smoke test — preview build'de onboarding → sayaç (idle→running→stop) → kutlama modalı → odalar (hero + 3 oda) → profil (çevrimdışı placeholder). Tüm 4 route 200.

---

## 🚧 Açık Sorular

_Çözüldü:_ D-021, D-022, D-023, D-024, D-025, D-026 → D-031, D-032 → D-043, **D-044**.

Yeni açık soru yok. Sprint-03'te: rozetler, haftalık özet (gerçek), özel oda davet linki, profil ayarları.

Detay: [[IDEAS]] · [[DECISIONS]]

---

## 📈 İlerleme Özeti

| Alan | Tamamlanan | Bekleyen |
|------|------------|----------|
| Konsept | 1/1 | 0 |
| Altyapı (vault/klasör) | 3/3 | 0 |
| Kararlar | **58/58** | 0 |
| Tasarım | 1/1 | 0 |
| Araştırma | 3/3 | 0 |
| Kod (Sprint-01) | 7/7 | 0 |
| Kod (Sprint-02) | **19/19** | 0 |
| Deploy | 0/1 | 1 (Patron config) |
| **Toplam** | **80/83** | **3/83** |

---

**Son güncelleme:** 2026-08-07 (S-0025 — D-056..D-058 eklendi: omp fan-out cap (max 3), auto-compaction 600K, session dispose child drain; 58 karar. `reports/omp-research-agent-donma-2026-08-07.md` yazıldı.)
