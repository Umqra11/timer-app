---
tags: [timer, resume, session-handoff, obsidian-ready]
created: 2026-08-04
updated: 2026-08-07 (S-0026 — Sprint-03 Faz 2 debug denemesi: timer.svelte.ts intervalId tip karmaşası çözüldü (TickHandle alias), $effect ile setRoomContext reactive. Presence doc Firestore'a yine yazılmıyor (404), Sprint-04'te root cause araştırılacak — setRoomContext mount'ta çalışmıyor olabilir. Faz 3'e geçmeden önce debug gerekli.)

type: session-resume
---

# 🏁 Timer Projesi — Session Özeti / Devam Planı

> **Bu dosya yeni bir session'da işe başlarken İLK okunacak dosyadır.**
> Tüm kararları, durumu, sıradaki adımları tek bakışta özetler.

> 📚 **Detay:** [[STATUS]] · [[DECISIONS]] · [[HUB]] · [[00-Home]] · [[IDEAS]]

---
**Aşama:** Sprint-03 Faz 1 + Faz 2 (kısmen) tamamlandı. Faz 3 (mesaj) ve debug ⏳.
**Tarih:** 2026-08-07 (S-0025)
**Patron:** Enes

### ✅ Bu oturumda tamamlanan (S-0025)

**Sprint-03 Faz 1 — Oda temel (D-045, D-046, D-048, D-049)**
1. **Oda detay sayfası** (`routes/rooms/[id]/+page.svelte`) — geri butonu, davet kodu kopyala, Odayı sil (owner), onay modalı
2. **D-048: `memberCount` denormalize sayaç** — `createRoom` initial 1, `joinRoomByCode` transaction atomik +1
3. **D-049: Oda sahibi silebilir** — `deleteRoom()` server-side owner check, MVP'de rules `allow delete: if true` (custom function olmadan uid karşılaştırması yapılamadı, Sprint-04'te Cloud Function)
4. **`firestore.rules`** — rooms create/update/delete strict kurallar, presence match eklendi (önce unutulmuştu!)
5. **Canlı doğrulama** — Oda oluştur → "1 kişi" → ikinci kullanıcı katıl → "2 kişi" → detay → odayı sil → Firestore'da 404

**Sprint-03 Faz 2 — Leaderboard (D-047, D-050, D-051)**
6. **`subscribeRoomMembers`** — N+1 query: her presence için `users/{uid}.totalSeconds` okur, client-side sıralama (totalSeconds desc)
7. **D-050: `setRoomContext` + `visibilitychange` + `beforeunload` listener** — sayfa gizlendiğinde `idle` yaz, stale kalma
8. **D-051: `effective` status çözümlemesi** — `running` + 2dk eski → 'stale'; `finished` + 5dk eski → 'finished-late' (D-051)
9. **Leaderboard UI** — username, durum pill (yeşil/sarı nokta), "X dk önce bitti" (D-051), toplam süre
10. **Canlı smoke** — MemberCount çalışıyor ✅; leaderboard UI render ✅; presence verisi henüz tam görünmüyor (debug Sprint-04)

**Bilinen sorun — Faz 2 debug (Sprint-04'te)**
 - `setRoomContext` mount'ta `writePresence('idle', 0)` çağırıyor ama Firestore'da doc 404 dönüyor
 - Olası sebep: `username.current` race (mount anında null), ya da `presence.writePresence` sessizce hata
 - 0 hata 0 uyarı, build temiz, deploy edildi
 - Screenshot: leaderboard "Henüz kimse yok" placeholder'ı görünüyor (doğru UI, veri yok)

### ✅ Bu oturumda tamamlanan (S-0022)
2. **Adapter-static'e geçildi** — `adapter-vercel`/`adapter-auto` çıkar, `adapter-static` (SPA fallback `index.html`) kuruldu
3. **Vite config** — `adapter()` artık sveltekit plugin içinde SPA modunda
4. **Firebase SDK + firebase-tools** kuruldu
5. **Firebase client (`src/lib/firebase/client.ts`)** — lazy init, `VITE_FIREBASE_*` env'den config okur; yoksa offline fallback (warn log)
6. **Device-scoped uid (`uid.ts`)** — localStorage UUID, kimlik doğrulama yok
7. **D-016 username claim (`usernames.ts`)** — Firestore transaction ile atomik check-then-create, "taken/invalid/unavailable" sonuçları
8. **Rooms CRUD (`rooms.ts`)** — `users/{uid}/joinedRooms/{roomId}` + `rooms/{roomId}` şeması, 6-char base32 invite code (I,O,0,1 çıkarıldı)
9. **Presence (`presence.ts`)** — `rooms/{roomId}/presence/{uid}` — idle/running/paused/finished
10. **Stats (`stats.ts`)** — `users/{uid}.streak/lastDayWorked/totalSeconds/weekSeconds`; Europe/Istanbul TZ
11. **Mevcut store'lar Firestore'a bağlandı** — `username.svelte.ts` (claim API), `rooms.svelte.ts` (subscribeMyRooms + create/join/makeHero async), `timer.svelte.ts` (BroadcastChannel + Firestore onSnapshot + setRoomContext + finish())
12. **Onboarding D-016** — "Bu kullanıcı adı çoktan alınmış" + "kaydedilemedi, internetini kontrol et" mesajları
13. **Tık sesi (D-017)** — `src/lib/utils/click.ts` Web Audio sentetik tık, tüm 4 handle'da çal
14. **İstatistikler (D-018)** — profile sayfası streak + bugün + toplam kartları, "İlk Adım" rozet hint'i kutlama modalında
15. **Odalar sayfası subscribe** — `+page.svelte` mount'ta `rooms.subscribe()` Firestore dinlemeye başlar
16. **`firestore.rules`** — MVP: usernames atomik claim, presence/rooms herkese açık read
17. **`firebase.json` + `.firebaserc`** — Hosting SPA rewrites, `public: "build"`, cache headers
18. **Build & check temiz** — `svelte-check` 0 hata 0 uyarı, `npm run build` SPA fallback üretiyor
19. **GitHub push** — 2 commit main'e (Vercel cleanup + Sprint-02 features), `Umqra11/timer-app`
20. **Smoke test** — Preview build: onboarding → sayaç (idle→running→stop) → kutlama modalı → odalar sayfası (hero + 3 oda) → profil (çevrimdışı placeholder). Tüm 4 route 200.


**Toplam karar: 44 (D-001 → D-044)**

### ⏳ Kalan (deploy — Patron'a bağımlı)
1. ⏳ **Firebase projesi oluşturma** — `console.firebase.google.com` → `timer-app`, europe-west
2. ⏳ **Firestore database** aç (production mode)
3. ⏳ **Firebase Hosting** aktifleştir
4. ⏳ **Firebase config'i** `mobile/.env.local`'e yapıştır:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. ⏳ **`firebase login`** (Patron hesabı) + `firebase deploy --only hosting,firestore:rules`
6. ⏳ **GitHub Actions** Firebase bağlantısı (otomatik deploy isteğe bağlı)

---

## 🎯 Ürün Özeti (Yeni Session İçin)

**Timer** = Telefon öncelikli web uygulaması, Türkiye pazarı, ücretsiz, kişisel/arkadaş grubu.

**MVP Ekranları (3):**
1. **Kronometre** (✅ Sprint-01 tamam) — 2 buton (D-038: Başlat / [Duraklat+Durdur]), selamlama, sayaç, istatistik pill, seansı bitirme modalı
2. **Odalar** (sosyal — Sprint-02/03) — ⭐ Hero stil (D-013), 👋 son katıldığın oda hero olur (D-014)
3. **Profil** (Sprint-03) — kullanıcı ayarları, istatistikler, rozetler

**Tasarım:** Pure Black Dark Mode, Inter font (ultralight 200 — D-027), Turkuaz/Teal vurgu, modern minimalist.

---

## 🛠️ Teknoloji Stack (D-009, D-015, D-020, **D-044** ile güncellendi)

| Katman | Seçim |
|--------|-------|
| Frontend | SvelteKit (PWA) — `adapter-static` (D-044 ile değişti) |
| **Hosting** | 🔥 **Firebase Hosting** (D-044 — Vercel çıkarıldı) |
| Backend + DB + Realtime | 🔥 **Firestore** (europe-west, NoSQL) (D-020) |
| **Auth** | ❌ **YOK** (D-015 — sadece username, localStorage) |
| **Sync** | ✅ BroadcastChannel (aynı tarayıcı) + Firestore `onSnapshot()` (farklı cihaz) (D-019) |
| Styling | Tailwind CSS |
| CI/CD | Firebase Hosting GitHub entegrasyonu (git push = canlı) |
| Versiyon kontrol | Git + GitHub (henüz push yapılmadı) |

**Maliyet:** MVP $0/ay (Firebase Spark: 10 GB hosting + 1 GB Firestore). 500+ kullanıcıda ~$25/ay (Blaze).

**Domain:** `*.web.app` veya `*.firebaseapp.com` (ücretsiz, otomatik). Custom domain istenirse sonra bağlanır.

---

## 📁 Vault Yapısı

```
Timer/
├── 00-Home.md          ← vault giriş
├── HUB.md              ← vault kuralları
├── STATUS.md           ← proje durumu (güncel)
├── DECISIONS.md        ← 58 karar
├── IDEAS.md            ← beyin fırtınası
├── RESUME.md           ← BU DOSYA — yeni session için
├── daily/              ← günlük notlar
├── docs/
│   ├── concept.md              ← konsept
│   ├── mvp-spec.md             ← MVP ürün özeti
│   ├── design-system.md        ← tasarım (Dark, 2 buton, vs.)
│   ├── research-frontend.md    ← SvelteKit seçim gerekçesi
│   ├── research-backend.md     ← Supabase seçim gerekçesi (tarihsel)
│   ├── research-case-studies.md ← rakip analizi
│   ├── research-competitors.md ← 8 rakip + 5 fırsat
│   ├── reference-screenshot-kronometre.jpg  ← Patron'un gönderdiği ekran görüntüsü
│   └── mockups/
│       ├── odalar-list.jpg     ← Liste görünümü (seçilmedi)
│       ├── odalar-grid.jpg     ← Grid görünümü (seçilmedi)
│       └── odalar-hero.jpg     ← Hero stil (D-013 ✅)
├── mobile/             ← SvelteKit kodu (Sprint-01 tamam)
├── backend/            ← (boş, gerek yok, Firebase managed)
└── scripts/            ← (boş)
```

---

## 📋 Sıradaki Adımlar (Yeni Session İçin Net Yol Haritası)

### Aşama 1: Vercel temizliği (D-044 gereği — küçük iş, hemen yapılır)
- [ ] `mobile/.vercel/` klasörünü sil
- [ ] `mobile/vercel.json` dosyasını sil
- [ ] `mobile/package.json`'dan `@sveltejs/adapter-vercel` çıkar
- [ ] `@sveltejs/adapter-static` ekle ve `npm install` çalıştır
- [ ] `svelte.config.js`'de adapter'ı `static` yap

### Aşama 2: Git & GitHub
- [ ] Mevcut `mobile/.git` durumunu kontrol et
- [ ] GitHub'da `timer-app` repo oluştur
- [ ] Remote ekle, ilk push (Vercel dosyaları silindikten SONRA)

### Aşama 3: Firebase kurulumu
- [ ] **Patron:** console.firebase.google.com'da proje oluştur (`timer-app`, europe-west)
- [ ] **Patron:** Firestore Database aç (production mode)
- [ ] **Patron:** Firebase Hosting'i aktifleştir
- [ ] **Müdür:** Firebase config'i `mobile/.env.local`'e yaz
- [ ] **Müdür:** `npm install firebase firebase-tools`
- [ ] **Müdür:** `firebase login` (Patron hesabıyla)
- [ ] **Müdür:** `firebase init hosting` (SvelteKit `build/` klasörünü bağla)
- [ ] **Müdür:** `firebase.json` ayarla (SPA rewrites)

### Aşama 4: Firebase Hosting Deploy
- [ ] `npm run build` ile SvelteKit build al
- [ ] `firebase deploy --only hosting` ile canlıya al
- [ ] Canlı URL: `https://timer-app.web.app` (Firebase otomatik verir)
- [ ] GitHub repo'yu Firebase'e bağla (otomatik deploy için)

### Aşama 5: Firestore + Özellikler (Sprint-02 devamı)
- [ ] Username unique kontrol (D-016) — server-side
- [ ] Timer state Firestore + `onSnapshot` (D-019)
- [ ] BroadcastChannel (D-019 — aynı tarayıcı sekmeleri)
- [ ] Odalar sayfası kodu (D-013 hero + D-014 last-joined)
- [ ] Oda oluşturma + davet kodu
- [ ] Gerçek zamanlı durum (D-006)

### Aşama 6: Polish (Sprint-02 sonu)
- [ ] Tık sesi (D-017)
- [ ] Seansı bitirme kutlama modalı (D-036)
- [ ] İstatistikler (D-018 — streak + haftalık özet)

---

## 🤔 Açık Sorular (çoğu çözüldü)

- [x] ~~**Sayaç rengi** çalışıyorken değişsin mi?~~ → D-021 (iptal D-041) → beyaz kalır
- [x] ~~**Pulse animasyonu** istiyor mu?~~ → D-022 ❌ HAYIR
- [x] ~~**Selamlama** her sayfada görünsün mü?~~ → D-023 → sadece Kronometre
- [x] ~~**İlk açılışta onboarding** gerekli mi?~~ → D-024 → ilk kez sor
- [x] ~~**Domain** için son karar~~ → D-025 (D-044 ile değişti) → Firebase default
- [x] ~~**Vercel Sprint-02'de yapılsın mı?**~~ → D-031 (D-044 ile iptal) → tamamen çıkarıldı
- [x] ~~**Tek buton mu, iki buton mu?**~~ → D-038 → iki buton
- [x] ~~**Swipe sıfırlama kalsın mı?**~~ → D-043 → kaldırıldı

---

## 💡 Yeni Session İçin Hızlı Hatırlatma

**Patron ilk mesajda şöyle diyebilir:** "Timer kaldığımız yerden devam" veya "HMC'yi oku, devam et"

**Müdür (sen, Mavis) yapacağın:**
1. Bu `RESUME.md` dosyasını oku
2. `STATUS.md`'i kontrol et (ilerleme)
3. `DECISIONS.md`'i gözden geçir (zaten alınmış kararlar, özellikle D-044 — Vercel çıkarıldı)
4. `docs/mvp-spec.md` ve `docs/design-system.md`'e bak
5. `docs/reference-screenshot-kronometre.jpg` ekran görüntüsünü incele
6. **Sprint-02'ye başla** — Vercel temizliği + Git + Firebase Hosting

**Eğer Patron "önce şunu konuşalım" derse:**
- Yeni fikir/örnek varsa değerlendir
- `IDEAS.md`'e yaz, yeni D-XXX kararı olarak `DECISIONS.md`'e ekle

---

**Son güncelleme:** 2026-08-07 (S-0025 — D-056..D-058 eklendi: omp fan-out cap (max 3), auto-compaction 600K, session dispose child drain. 58 karar. `reports/omp-research-agent-donma-2026-08-07.md` yazıldı.)
**Patron:** Enes
**Müdür:** Mavis
**Sıradaki sprint:** Sprint-02 — Vercel temizliği + Firebase Hosting + Firestore bağlantısı
