---
tags: [timer, resume, session-handoff, obsidian-ready]
created: 2026-08-04
updated: 2026-08-05 (S-0020 — referans running revizyonu tamam, plan referanslara birebir uyumlu, 43 karar kilitli)
type: session-resume
---

# 🏁 Timer Projesi — Session Özeti / Devam Planı

> **Bu dosya yeni bir session'da işe başlarken İLK okunacak dosyadır.**
> Tüm kararları, durumu, sıradaki adımları tek bakışta özetler.

> 📚 **Detay:** [[STATUS]] · [[DECISIONS]] · [[HUB]] · [[00-Home]] · [[IDEAS]]

---

## 📍 Şu An Neredeyiz

**Aşama:** Planlama tamamlandı, inşaat başlamadı
**Tarih:** 2026-08-04 (S-0015 sonu)
**Patron:** Enes (adı `claude-ss-three.vercel.app` prototip ekran görüntüsündeki "Merhaba, Enes" selamlamasından öğrenildi)

### ✅ Tamamlanan (Bugün Yapıldı)

1. **Proje konsepti netleşti** — Sosyal çalışma takip uygulaması (Türkiye, ücretsiz, kişisel)
2. **Tüm ürün kararları** (D-001 → D-008) — 8 karar kilitlendi
3. **Teknoloji kararı** (D-009) — SvelteKit + Supabase + Vercel + Magic Link (**D-015 ile değişti: Auth çıkarıldı**)
4. **Sprint planı** (D-010) — 3 sprint, 1'er hafta
5. **Deployment planı** (D-011) — Vercel + Supabase managed
6. **Prototip stratejisi** (D-012) — sıfırdan başla, eski prototip referans
7. **Vault yapısı** kuruldu — 00-Home, HUB, STATUS, IDEAS, DECISIONS, daily/
8. **3 araştırma raporu** — frontend, backend, vaka analizi
9. **MVP spec** yazıldı
10. **Tasarım sistemi** tamamlandı (Dark Mode, swipe reset, 3 sekme, **Odalar hero, son katıldığın oda**)
11. **Odalar sayfası 3 mockup** (list, grid, hero) → hero seçildi (D-013)
12. **Onboarding 3 mockup** → "no email, sadece username" kararı (D-015)
13. **Ses/bildirim** kararı (D-017) — kısa tık + görsel feedback
14. **Motivasyon** kararı (D-018) — light streak + haftalık özet
15. **Multi-device** kararı (D-019) — otomatik senkron, tüm cihazlar aynı
16. **Referans ekran görüntüsü** vault'a kaydedildi (`docs/reference-screenshot-kronometre.jpg`)
17. **6 mockup** vault'a kaydedildi (3 odalar + 3 onboarding)

**Toplam karar: 19 (D-001 → D-019)**

### ⏳ Henüz Yapılmadı (Sırada)

1. ✅ ~~SvelteKit proje iskeleti~~ (S-0017 — Sprint-01'de tamam)
2. ⏳ **Git başlat** + ilk commit
3. ⏳ **Vercel deploy** (D-025 — frontend canlıya)
4. ⏳ **Firebase projesi** oluşturma (ücretsiz tier, europe-west bölgesi) (D-020)
5. ⏳ **Firestore** database açma, collection'ları tasarlama
6. ⏳ **Username unique kontrolü** server-side (D-016)
7. ⏳ **Timer state Firestore** + `onSnapshot` (D-019 multi-device)
8. ⏳ **BroadcastChannel** (aynı tarayıcı sekmeleri, D-019)
9. ⏳ **Odalar sayfası** kodu (D-013 hero layout + D-014 last-joined hero)
10. ⏳ **Oda oluşturma** + davet kodu
11. ⏳ **Gerçek zamanlı durum** (çalışıyor/molada/bitti, D-006)
12. ⏳ **İstatistikler** (D-018 — streak + haftalık özet)
13. ⏳ **Tık sesi** (D-017 — Sprint-02/03'te)

---

## 🎯 Ürün Özeti (Yeni Session İçin)

**Timer** = Telefon öncelikli web uygulaması, Türkiye pazarı, ücretsiz, kişisel/arkadaş grubu.

**MVP Ekranları (3):**
1. **Kronometre** (şimdi yapılacak) — tek buton (Başlat/Duraklat/Devam), swipe ile sıfırla, günlük/haftalık istatistik
2. **Odalar** (sosyal — sonra) — ⭐ Hero stil (D-013), 👋 son katıldığın oda hero olur (D-014)
3. **Profil** (sonra) — kullanıcı ayarları, istatistikler

**Tasarım:** Pure Black Dark Mode, Inter font, Turkuaz/Teal vurgu, modern minimalist.

---

## 🛠️ Teknoloji Stack (D-009, D-015, D-020 ile güncellendi)

| Katman | Seçim |
|--------|-------|
| Frontend | SvelteKit (PWA) |
| Backend + DB + Realtime | 🔥 **Firestore** (europe-west, NoSQL) (D-020) |
| **Auth** | ❌ **YOK** (D-015 — sadece username, localStorage) |
| **Sync** | ✅ BroadcastChannel (aynı tarayıcı) + Firestore `onSnapshot()` (farklı cihaz) (D-019) |
| Styling | Tailwind CSS |
| Deploy | Vercel (git push = canlı) |
| Versiyon kontrol | Git (henüz başlatılmadı) |

**Maliyet:** MVP $0/ay (Firestore Spark + Vercel Hobby). 500+ kullanıcıda ~$25/ay (Blaze).

---

## 📁 Vault Yapısı

```
Timer/
├── 00-Home.md          ← vault giriş
├── HUB.md              ← vault kuralları
├── STATUS.md           ← proje durumu (güncel)
├── DECISIONS.md        ← 12 karar
├── IDEAS.md            ← beyin fırtınası
├── RESUME.md           ← BU DOSYA — yeni session için
├── daily/              ← günlük notlar
├── docs/
│   ├── concept.md              ← konsept
│   ├── mvp-spec.md             ← MVP ürün özeti
│   ├── design-system.md        ← tasarım (Dark, swipe, vs.)
│   ├── research-frontend.md    ← SvelteKit seçim gerekçesi
│   ├── research-backend.md     ← Supabase seçim gerekçesi
│   ├── research-case-studies.md ← rakip analizi
│   ├── research-competitors.md ← 8 rakip + 5 fırsat
│   ├── reference-screenshot-kronometre.jpg  ← Patron'un gönderdiği ekran görüntüsü
│   └── mockups/
│       ├── odalar-list.jpg     ← Liste görünümü (seçilmedi)
│       ├── odalar-grid.jpg     ← Grid görünümü (seçilmedi)
│       └── odalar-hero.jpg     ← Hero stil (D-013 ✅)
├── mobile/             ← (boş, kod buraya)
├── backend/            ← (boş, gerek yok, Supabase managed)
└── scripts/            ← (boş)
```

---

## 📋 Sıradaki Adımlar (Yeni Session İçin Net Yol Haritası)

### Aşama 1: Altyapı (Sprint-01 başlangıcı)
- [ ] `mobile/` klasörü içinde SvelteKit projesi başlat (`npm create svelte@latest`)
- [ ] Tailwind CSS ekle
- [ ] Supabase client'ı kur
- [ ] `.env.example` oluştur (Supabase URL + ANON_KEY placeholder)
- [ ] `package.json` script'leri ayarla (dev, build, preview, check)
- [ ] Git başlat, ilk commit

### Aşama 2: Kronometre Ekranı
- [ ] `routes/+page.svelte` — ana sayfa (Kronometre)
- [ ] Selamlama: "Merhaba, [isim]." (auth'tan sonra)
- [ ] Sayaç component'i (Inter, 96px, tabular-nums)
- [ ] Tek buton (Başlat/Duraklat/Devam) — pill şeklinde, teal
- [ ] İstatistik kartı (Bugün: 0dk · Bu hafta: 0dk)
- [ ] Reset notu ("Salı 00:00'da sıfırlanır")
- [ ] State management (Svelte stores)

### Aşama 3: Swipe Sıfırlama
- [ ] Pointer events (touchstart, touchmove, touchend)
- [ ] Threshold: ekran genişliğinin %30'u
- [ ] Görsel feedback (kaydırma sırasında sayaç kayar)
- [ ] Bırakınca sıfırlama + animasyon
- [ ] Çalışırken swipe engelle (kazara sıfırlama)

### Aşama 4: Alt Navigasyon
- [ ] 3 sekme: Kronometre / Odalar / Profil
- [ ] Aktif sekme vurgusu (teal)
- [ ] Sayfa yönlendirme (SvelteKit routing)

### Aşama 5: Magic Link Auth (Supabase)
- [ ] Supabase projesi oluştur (Patron)
- [ ] `.env` ayarla
- [ ] Login sayfası (e-posta gir → link gönder)
- [ ] Callback handler
- [ ] Session yönetimi
- [ ] "Çıkış" butonu (muhtemelen Profil'de)

### Aşama 5 (Güncellendi): Firestore bağlantısı
- [ ] Firebase projesi oluştur (Patron — console.firebase.google.com)
- [ ] Firestore database aç (europe-west, test mode)
- [ ] Firebase config'i `.env`'e ekle (apiKey, projectId, vs.)
- [ ] `firebase` SDK kur (`npm install firebase`)
- [ ] Username uniqueness kontrol: Firestore query (`where('username', '==', input)`)
- [ ] Rooms collection: `users/{userId}/rooms/{roomId}` (veya `/rooms/{roomId}` global)
- [ ] Timer state collection: real-time `onSnapshot` listener
- [ ] BroadcastChannel ekle (aynı tarayıcı sekmeleri için D-019)

### Aşama 6: Vercel Deploy
- [ ] GitHub repo oluştur
- [ ] Vercel'e bağla
- [ ] Env değişkenlerini Vercel'e ekle
- [ ] Custom domain (sonra)

---

## 🤔 Açık Sorular (Sprint-01'de Çözülecek)

- [x] ~~**Sayaç rengi** çalışıyorken değişsin mi? (örn. hafif yeşil)~~ → D-021 ✅ EVET
- [x] ~~**Pulse animasyonu** istiyor mu? (Bazıları sevmez)~~ → D-022 ❌ HAYIR
- [x] ~~**Selamlama** her sayfada görünsün mü, sadece Kronometre'de mi?~~ → D-023 ✅ Sadece Kronometre
- [x] ~~**İlk açılışta onboarding** gerekli mi, direkt Kronometre'ye mi düşsün?~~ → D-024 ✅ İlk kez sor, sonra sorma
- [x] ~~**Domain** için son karar (`timer.app.tr` veya muadili)~~ → D-025 ✅ Şimdilik Vercel default

---

## 💡 Yeni Session İçin Hızlı Hatırlatma

**Patron ilk mesajda şöyle diyebilir:** "Timer kaldığımız yerden devam" veya "HMC'yi oku, devam et"

**Müdür (sen, Mavis) yapacağın:**
1. Bu `RESUME.md` dosyasını oku
2. `STATUS.md`'i kontrol et (ilerleme)
3. `DECISIONS.md`'i gözden geçir (zaten alınmış kararlar)
4. `docs/mvp-spec.md` ve `docs/design-system.md`'e bak
5. `docs/reference-screenshot-kronometre.jpg` ekran görüntüsünü incele
6. **Sprint-01'e başla** — SvelteKit kurulumu

**Eğer Patron "önce şunu konuşalım" derse:**
- Yeni fikir/örnek varsa değerlendir
- `IDEAS.md`'e yaz, yeni D-XXX kararı olarak `DECISIONS.md`'e ekle

---

**Son güncelleme:** 2026-08-04 (S-0015 sonu — planlama fazı tamamlandı)
**Patron:** Enes
**Müdür:** Mavis
**Sıradaki sprint:** Sprint-01 — Altyapı (SvelteKit kurulumu)
