---
tags: [timer, decisions, technical-decisions, product-decisions, obsidian-ready]
created: 2026-08-04
updated: 2026-08-04 (D-021 → D-025 eklendi — UX detayları netleşti, Sprint-01 başlıyor)
type: decisions-log
---

# Timer — Karar Defteri

> Alınan tüm teknik ve ürün kararları burada. Tarih sırasıyla.
> Her karar: **ID · Tarih · Bağlam · Karar · Gerekçe · Etki**

> 📚 **Bağlantılar:** [[00-Home]] · [[STATUS]] · [[IDEAS]] · [[HUB]] · [[docs/mvp-spec|MVP Spec]]

---

## ✅ Karar Listesi (MVP Öncesi Tamamlanan)

### D-001 · Proje konsepti
- **Tarih:** 2026-08-04
- **Bağlam:** Patron mobil bir uygulama istedi
- **Karar:** Sosyal çalışma takip uygulaması (arkadaşlarla aynı odada çalışma)
- **Gerekçe:** Tek başına çalışmak zor, birlikte motivasyon artıyor
- **Etki:** Tüm ürün kararları bu konsept etrafında döner

### D-002 · Hedef pazar
- **Tarih:** 2026-08-04
- **Karar:** 🇹🇷 Türkiye önce
- **Gerekçe:** Türkiye pazarı boş, kültürel olarak "beraber çalışma" değerli, dil bilinir
- **Etki:** UI Türkçe, sunucu Türkiye'de (veya yakın bölgede), kültürel uyum (örn. kütüphane metaforu)

### D-003 · Çalışma kapsamı
- **Tarih:** 2026-08-04
- **Karar:** 🌐 Her şey (esnek)
- **Gerekçe:** Kullanıcı etiketler — ders, kitap, proje, spor, meditasyon hepsi olabilir
- **Etki:** "Çalışma" sabit tanımlı değil, etiket sistemi ile esnek

### D-004 · Oda yapısı
- **Tarih:** 2026-08-04
- **Karar:** 🏠🌍 Hem özel hem açık odalar (kullanıcı seçer)
- **Gerekçe:** Esneklik — arkadaşlarla veya konuya göre yabancılarla
- **Etki:** İki oda tipi, davet sistemi, açık oda listesi

### D-005 · Video özelliği
- **Tarih:** 2026-08-04
- **Karar:** ❌ YOK (kesin karar)
- **Gerekçe:** Kullanıcı açıkça istemedi, öğrenci için rahat olmayabilir
- **Etki:** Sadece metin/simge durumu (çalışıyor/molada/bitti), WebRTC/sunucu yok

### D-006 · Gerçek zamanlı durum
- **Tarih:** 2026-08-04
- **Karar:** ✅ EVET, basit durum paylaşımı
- **Gerekçe:** "Diğerleri onu çalışıyor olarak görsün yeterli" — kullanıcı vurgusu
- **Etki:** WebSocket veya polling ile canlı durum, minimum veri (3 state: çalışıyor/molada/bitti)

### D-007 · Platform
- **Tarih:** 2026-08-04
- **Karar:** 📱💻 Telefon öncelikli web uygulaması (responsive)
- **Gerekçe:** Tek kod tabanı iki platform, hızlı MVP, native'e gerek yok
- **Etki:** Web teknolojileri (React/Next.js + PWA), mobil tarayıcıda optimize, native app sonra

### D-008 · Gelir modeli
- **Tarih:** 2026-08-04
- **Karar:** 🆓 Tamamen ücretsiz (MVP), monetization yok
- **Gerekçe:** Patron açıkça istemedi, kişisel/arkadaş grubu projesi
- **Etki:** Ödeme sistemi yok, reklam yok, sadece maliyet = geliştirici zamanı + sunucu

---

## ❓ Hâlâ Açık Kararlar (Mimari/Teknik)

### D-009 · Teknoloji stack (ONAYLANDI 2026-08-04, güncellendi D-020)
- **Tarih:** 2026-08-04 (orijinal) → 2026-08-04 (Firestore'a geçiş, D-020)
- **Karar (güncel):**
  - **Frontend:** SvelteKit (PWA, küçük bundle, AI dostu)
  - **Backend + DB + Realtime:** 🔥 **Firestore** (europe-west, NoSQL doküman DB)
  - **Auth:** ❌ YOK (D-015 — sadece username, localStorage)
  - **Real-time:** Firestore `onSnapshot()` listeners (native, built-in) + BroadcastChannel (aynı tarayıcı sekmeleri)
  - **Sync (multi-device):** Firestore realtime subscription (D-019)
  - **Deploy (frontend):** Vercel (git push = canlı)
  - **Domain:** timer.app.tr (veya muadili) — sonra karar
- **Gerekçe:** SvelteKit basit kod + AI güvenilir üretim, Firestore SDK basit + NoSQL doğal + ücretsiz tier cömert (1GB)
- **Maliyet:** MVP $0/ay (Firestore Spark + Vercel Hobby); 500+ kullanıcıda ~$25/ay (Blaze)
- **Etki:** Tüm geliştirme bu stack üzerinden
- **Kaynak:** [[docs/research-frontend]] · [[docs/research-backend]] (Supabase, güncelliğini yitirmiş olabilir) · [[docs/research-case-studies]]

### D-020 · Supabase → Firestore geçişi (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** Veritabanı altyapısı **Supabase'den Firestore'a** değiştirildi
- **Gerekçe:** Patron kararı — Firestore daha basit SDK, NoSQL doğal (basit veri), ücretsiz tier daha cömert
- **Etkilenen kararlar:**
  - D-009 (stack)
  - D-019 (multi-device sync — Realtime provider değişti)
- **Teknik not:** Firestore `onSnapshot()` = Supabase Realtime subscription (eşdeğer)
- **Açık sorular:** Region (europe-west vs Frankfurt)? Supabase Auth zaten kullanılmıyordu, etki yok.

---

### D-010 · Geliştirme planı (Müdür öneri)
- **Sprint yapısı:** 3 sprint (her biri 1 hafta)
  - **Sprint-01: Altyapı + Auth** (SvelteKit kurulumu, Supabase bağlantısı, magic link giriş)
  - **Sprint-02: Oda sistemi** (oda oluştur, listele, davet kodu, katıl)
  - **Sprint-03: Zamanlayıcı + Real-time** (timer başlat, durum paylaş, canlı gör)
- **Görev dağılımı:** Müdür (yönetim) + coder (kod) + verifier (test)
- **İlk sprint:** Sprint-01 (altyapı)

### D-011 · Deployment (Müdür öneri)
- **Frontend:** Vercel (SvelteKit native desteği, ücretsiz tier)
- **Backend:** Supabase (managed, ücretsiz tier)
- **Domain:** İleride — şimdilik `*.vercel.app` alt domain
- **GitHub:** Repo oluşturulacak, push → otomatik deploy

### D-012 · Prototip stratejisi (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🚀 Sıfırdan başla, eski prototip (`claude-ss-three.vercel.app`) sadece görsel referans
- **Gerekçe:** Patron kararı — yeni stack (SvelteKit + Supabase) temiz kurulsun
- **Etki:** Yeni SvelteKit projesi başlatılacak, eski kod/proje ile bağlantı yok

### D-013 · Odalar sayfası düzeni (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** ⭐ Hero stil — büyük öne çıkan oda + altta aktif odalar listesi
- **Gerekçe:** Dikkat çekici, "popüler oda" vurgular, modern
- **Görsel:** `docs/mockups/odalar-hero.jpg`
- **Etki:** Odalar sayfası için layout referansı

### D-014 · Hero oda seçim mantığı (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 👋 Son katıldığın oda (last joined)
- **Gerekçe:** Kişisel, "hızlı devam" hissi, kullanıcıya özel
- **Etki:** Odalar sayfası açıldığında hero, kullanıcının en son ziyaret ettiği oda olur (yoksa liste)
- **Fallback:** Hiç odaya katılmamışsa → "Henüz oda yok, ilk odayı sen kur" CTA

### D-015 · Auth stratejisi (ONAYLANDI 2026-08-04, sesli mesaj)
- **Tarih:** 2026-08-04
- **Karar:** 🚫 E-posta YOK. Sadece **username**, ilk girişte, sonra bir daha sorma
- **Gerekçe:** "Kullanıcılara zorluk çıkarmak istemiyorum" — Patron açıkça istedi
- **Akış:**
  1. İlk ziyaret → "Kullanıcı adın ne olsun?" ekranı
  2. Username girilir → localStorage'a kaydedilir
  3. Direkt ana ekrana yönlendirilir (selamlama: "Merhaba, [username]")
  4. Sonraki ziyaretler → localStorage kontrol, varsa direkt ana ekran
- **Teknik değişiklik:** Magic Link YOK, Supabase Auth YOK (MVP'de)
- **Etki:**
  - Çok daha basit onboarding
  - Kullanıcı sayısı arttığında conflict olabilir (aynı username'i iki kişi alabilir)
  - Tarayıcı verisi silinirse "hesap kaybolur" — kabul edilebilir (kişisel proje)
- **Açık sorular:**
  - Aynı username iki kişi tarafından alınırsa ne olur? (D-016 ile çözüldü)
  - Hesap kurtarma / profil bağlama (sonra)

### D-016 · Username çakışma politikası (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🔒 **Unique zorunlu** — alınmışsa reddet
- **Gerekçe:** Patron seçti — en temiz, karışıklık önlenir
- **Akış:** Kullanıcı "Ahmet" yazarsa → DB'de var mı? Varsa "Bu isim alınmış, başka dene" mesajı
- **Validasyon:** Server-side kontrol (Supabase), localStorage'da duplicate önleme yetmez
- **Etki:** Kullanıcı kafasından yeni isim bulmak zorunda kalabilir ama nadir olur (küçük ölçek)

### D-017 · Ses & bildirim stratejisi (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🔔 Basit — kısa "tık" sesi + görsel geri bildirim
- **MVP kapsamı:**
  - ✅ Kısa "tık" sesi (başla/duraklat/bitir anında)
  - ✅ Görsel animasyon (buton değişimi, sayaç pulse)
  - ❌ Tarayıcı bildirimi (sonra)
  - ❌ Telefon titreşimi (sonra)
  - ❌ Ses seçenekleri / özelleştirme (sonra)
- **Gerekçe:** Odaklı çalışma, kullanıcıyı yorma, basit MVP
- **Etki:** Hafif, profesyonel, dikkat dağıtmayan deneyim

### D-018 · Motivasyon seviyesi (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🔥 Light — streak + haftalık özet, abartısız
- **MVP kapsamı:**
  - ✅ Günlük seri (streak) — ardışık gün sayısı, kaçırırsan sıfırlanır
  - ✅ Haftalık özet — "Bu hafta X saat çalıştın"
  - ✅ "Bugün X saat" küçük kutlama (subtle animasyon)
  - ❌ Rozetler, seviyeler, liderlik tablosu, günlük görevler (sonra)
- **Gerekçe:** Sadece motive edici, dikkat dağıtmayan
- **Detaylar (varsayılan, gerekirse değiştirilir):**
  - Gün: takvim günü (Türkiye timezone)
  - Streak reset: o gün 0 dk çalışma varsa sıfırla
  - Haftalık hedef: başlangıçta yok, sadece özet (kullanıcı isterse sonra eklenir)

### D-019 · Çoklu sekme/cihaz davranışı (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🔄 Otomatik senkron — tüm sekmeler/cihazlar aynı durumu görsün
- **Gerekçe:** Patron seçti — "vay be" etkisi, modern UX
- **Teknik gereksinimler:**
  - **Aynı tarayıcı sekmeleri:** BroadcastChannel API (native, hızlı)
  - **Farklı cihazlar:** 🔥 **Firestore `onSnapshot()` realtime listener** (D-020 ile değişti)
  - **State storage:** Timer durumu Firestore'da, tüm client'lar subscribe
  - **Conflict resolution:** Last-write-wins (basit, MVP için yeterli)
- **Kullanıcı deneyimi:**
  - Telefondan başlat → bilgisayardan da aynı durumu gör
  - 2 sekme açık → birinde başlat, diğeri anında güncellenir
  - Bir yerde duraklat → diğer yerde de duraklamış olur
- **Gecikme:** Firestore Realtime ile ~1-2 saniye, tolere edilebilir

---

## 🔄 Karar Alma Süreci

1. **Fikir/tercih** → Patron veya Müdür belirtir
2. **Araştırma** → Müdür gerekirse seçenekleri araştırır
3. **Sunum** → Müdür seçenekleri + artı/eksi listeler
4. **Karar** → Patron karar verir
5. **Kayıt** → Buraya yazılır
6. **Uygulama** → Karar gerçekleştirilir

---

---

## 🎨 UX Detay Kararları (Sprint-01 Öncesi Netleştirme)

### D-021 · Sayaç rengi çalışırken değişsin mi? (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** ✅ **EVET** — sayaç çalışırken hafif yeşil (çalışıyor hissi)
- **Bağlam:** Varsayılan beyaz; "çalışıyor" state'inde subtle yeşil tonuna geçer
- **Detay:** D-017 ile uyumlu — görsel feedback, dikkat dağıtmaz
- **Etki:** Tek buton, tek renk geçişi; kod basit (CSS class toggle)

### D-022 · Pulse animasyonu (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** ❌ **HAYIR** — pulse/nabız animasyonu yok
- **Gerekçe:** Patron istemedi — "gereksiz dikkat çekici, sade olsun"
- **Etki:** D-017'nin "görsel feedback" maddesinden pulse çıkarıldı; sadece renk değişimi + buton değişimi yeterli

### D-023 · Selamlama konumu (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 📍 **Sadece Kronometre ekranında** — "Merhaba, [isim]"
- **Gerekçe:** Odalar ve Profil'de tekrarlayan selamlama gereksiz; Kronometre kişisel alan, doğal yer
- **Etki:** Sadece `routes/+page.svelte` (Kronometre) selamlama render eder; diğer 2 sayfa sadece içerik

### D-024 · Onboarding akışı netleştirme (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🚪 **İlk kez girenler için username sor, sonra bir daha sorma**
- **Detay:** D-015'in pratik netleştirmesi — "ilk ziyaret" kontrolü
  - `localStorage.getItem('timer_username')` → null ise onboarding ekranı
  - Username girilir → localStorage'a yaz → ana ekrana yönlendir
  - Sonraki ziyaretlerde onboarding gösterilmez
- **Gerekçe:** Sürtünmesiz deneyim, sadece 1 kez sor, rahatsız etme
- **Etki:** Onboarding = `routes/onboarding/+page.svelte` (D-015 akışıyla aynı)

### D-025 · Domain kararı (ONAYLANDI 2026-08-04)
- **Tarih:** 2026-08-04
- **Karar:** 🌐 **Şimdilik Vercel default domain** (`*.vercel.app`), custom domain sonra
- **Gerekçe:** MVP öncesi domain masrafı/uyuğraşı gereksiz; Vercel default hemen canlıya alır
- **İleride:** `timer.app.tr` veya muadili — kullanıcı sayısı artınca değerlendirilecek
- **Etki:** D-011 ile uyumlu; deploy süreci hızlanır

---

## ✨ Tasarım İncelik Kararları (S-0018 — Patron Tasarım Turu)

### D-026 · Arka plan: Pure black teyit
- **Tarih:** 2026-08-04
- **Karar:** Pure black (`#000000`) kalsın, koyu griye geçmeye gerek yok
- **Gerekçe:** D-007 ile uyumlu, Patron referans ekran görüntüsü saf siyah
- **Araştırma notu:** Araştırma "OLED'de halation riski" uyarısı yapıyor; Patron bilinçli tercih etti, koruyoruz
- **Etki:** app.css'deki `--color-bg: #000000` değişmez

### D-027 · Sayaç font ağırlığı: İnce (Apple-vari)
- **Tarih:** 2026-08-04
- **Karar:** Sayaç **ultralight (200)** — Inter font ailesinden
- **Bağlam:** Apple'ın gerçek timer'ı (Clock, Watch) ultralight kullanır; daha şık, modern
- **Değişiklik:** Sprint-01'de semibold (600) kullanmıştık → **extralight (200)**'a düşürüyoruz
- **Gerekçe:** Patron "Apple-vari olsun" dedi (S-0018 #2)
- **Teknik:** Google Fonts linkine `wght@200;400;500;600;700` ekle; Tailwind `font-extralight` class'ı
- **Etki:** Tasarım kimliği "Apple reklamı" havasına yaklaşır; okunabilirlik biraz azalır ama kontras yüksek (beyaz üstüne siyah)

### D-028 · Sayaç etrafında circular ring: YOK
- **Tarih:** 2026-08-04
- **Karar:** Sayaç etrafında dönen halka **olmasın**, sade dijital rakam
- **Gerekçe:** Patron "pure black kalsın, sade kal" istedi (S-0018 #3) → minimal, dikkat dağıtmayan
- **Araştırma notu:** Araştırma circular ring önermişti (Apple Watch stopwatch); Patron tercih etmedi
- **Etki:** D-022 (pulse animasyonu yok) ile tutarlı — sade, abartısız

### D-029 · Selamlama formatı: 2 satır (şu anki)
- **Tarih:** 2026-08-04
- **Karar:** Üstte küçük gri "Hoş geldin" + altta büyük beyaz isim
- **Gerekçe:** Patron "mantıklı bu olsun" dedi (S-0018 #4) → Sprint-01'deki hali iyi
- **D-023 ile uyumlu:** Selamlama sadece Kronometre'de
- **Etki:** Değişiklik yok, mevcut hali onaylandı

### D-030 · Timer sayfasında avatar/ayar ikonu: YOK
- **Tarih:** 2026-08-04
- **Karar:** Sağ üst boş kalsın, avatar/ayar ikonu ekleme
- **Gerekçe:** Patron "farketmez, takılma" dedi (S-0018 #5) → biz minimal tutuyoruz
- **D-022/D-028 tutarlı:** Sade, abartısız tasarım
- **Etki:** Profil'e erişim sadece alt navigasyondan; daha sade üst bar

### D-031 · Vercel Sprint-02'den çıkarıldı
- **Tarih:** 2026-08-04
- **Karar:** Vercel deploy **Sprint-02'de yapılmasın**, Sprint-03 veya sonrasına ertelendi
- **Gerekçe:** Patron "Vercel şimdilik çıkar" dedi (S-0018 #6)
- **Etkilenen kararlar:**
  - D-011 (deployment planı güncellenmeli: Vercel opsiyonel)
  - D-025 (domain kararı: Vercel default'u zorunlu değil)
- **Açık:** İleride GitHub Pages, Cloudflare Pages, Netlify, kendi sunucu seçenekleri değerlendirilebilir
- **Not:** Şu an dev server lokalde çalışıyor, deploy ihtiyacı yok

---

## 🔄 Referans Ekran Görüntüsü Revizyonu (S-0019)

> Patron eski prototipin (`claude-ss-three.vercel.app`) "Seansı bitirdin" + ana ekran ekran görüntülerini gönderdi. "Bu şekilde olsun istiyorum" dedi. Aşağıdaki kararlar alındı:

### D-032 · Selamlama formatı: TEK SATIR ortada (D-029 İPTAL)
- **Tarih:** 2026-08-04
- **Karar:** "Merhaba, [isim]" — tek satır, ortalanmış, açık gri renk
- **D-029 iptal:** "2 satır (Hoş geldin / isim)" artık geçerli değil
- **Gerekçe:** Patron referans görseli tercih etti
- **Renk:** `--color-fg-muted` (#A1A1A1) — vurgulu değil, sade
- **Konum:** Üst bar ortası, `text-center`

### D-033 · Alt navigasyon: Kronometre | Liderlik | Profil (D-013 kapsam değişikliği)
- **Tarih:** 2026-08-04
- **Karar:** Ortanca sekme **"Liderlik"** (leaderboard) — Odalar ertelendi
- **D-013 etkilendi:** "Odalar hero layout" kararı ertelendi; ileride 4. sekme olarak eklenebilir
- **Gerekçe:** Patron referans görselde Liderlik var, sosyal karşılaştırma istedi
- **Liderlik kapsamı:** Kim ne kadar çalışmış, sıralama (basit, MVP sonrası detaylandırılır)
- **Etki:** `routes/rooms/` → `routes/leaderboard/` (rename), Nav ortanca sekmesi güncellendi

### D-034 · İstatistik: TEK PİLL kart
- **Tarih:** 2026-08-04
- **Karar:** İki ayrı kart (Bugün / Bu hafta) yerine **tek pill**: "Bugün: Xdk · Bu hafta: Ysa"
- **Gerekçe:** Patron referans görseli tercih etti, daha kompakt
- **Tasarım:** Border + şeffaf arka plan, ince çerçeve, tek satırda iki metin
- **Etki:** Daha az yer kaplar, buton ile reset notu arasında denge sağlar

### D-035 · Kronometre layout: sayaç orta, büyük boş alan
- **Tarih:** 2026-08-04
- **Karar:** Sayaç ekranın dikey ortasında, altında büyük boş alan, buton alt-orta
- **Gerekçe:** Patron referans görseli tercih etti
- **Etki:** Sayı "özne" oluyor, etraf boş; göz hemen sayıya gidiyor (Apple tipografik vurgu)
- **Teknik:** `flex flex-col` + sayaç `flex-1` ortalı, buton `mt-10`

### D-036 · Seansı bitirme kutlama ekranı
- **Tarih:** 2026-08-04
- **Karar:** Timer sıfırlandığında (swipe ile veya manuel) **kutlama modalı** göster
- **İçerik (referans):**
  - "Seansı bitirdin 👏" başlık
  - "Bu seans Xdk · Bugün toplam Xdk · Bu hafta toplam Xdk" özet
  - Opsiyonel: "Sonraki rozet İlk Adım için 60dk kaldı" (rozet sistemi Sprint-03'te)
  - "Kapat" butonu (teal pill)
- **Gerekçe:** Patron "bu şekilde olsun" — motivasyon + geri bildirim
- **D-017 ile uyumlu:** Görsel feedback (ses eklenirse S-0018'de kararlaştırıldı)

### D-037 · Rozet sistemi (Sprint-03+)
- **Tarih:** 2026-08-04
- **Karar:** Rozetler ileride eklenecek (Sprint-03+), MVP'de sadece görsel placeholder
- **Örnekler (referans):** "İlk Adım" (60dk), "Maraton" (5 saat), vs.
- **D-018 güncelleme:** Streak + haftalık özet (MVP) + rozetler (sonraki sprintler)

---

## 🔄 Referans Running State Revizyonu (S-0020)

> Patron referansın "çalışıyor" durumu ekranını gönderdi. "Bu ekranlara benzet, plana göre revize et" dedi. 4 ana değişiklik:

### D-038 · İki buton yan yana (D-007 İPTAL)
- **Tarih:** 2026-08-04
- **Karar:** Çalışırken **İKİ buton yan yana** — "Duraklat" (sade) + "Durdur" (kırmızımsı)
- **D-007 iptal:** "Tek buton (Başlat/Duraklat)" artık geçerli değil
- **Gerekçe:** Patron referans görseli tercih etti
- **State machine (yeni):**
  - **idle:** TEK buton — "Başlat" (teal pill, dolu)
  - **running:** İKİ buton — "Duraklat" (sade/border) + "Durdur" (kırmızımsı)
  - **paused:** İKİ buton — "Devam Et" (teal) + "Sıfırla" (kırmızımsı)
  - **durduruldu:** Kutlama modalı (D-036) → idle

### D-039 · "Duraklat" vs "Durdur" anlamı
- **Tarih:** 2026-08-04
- **Karar:**
  - **Duraklat** = süre dursun, sonra devam ettirilebilir (geçici)
  - **Durdur** = süreyi kaydet + sıfırla + kutlama modalı göster (kalıcı, bitir)
- **Paused karşılığı:** "Devam Et" = paused → running; "Sıfırla" = paused → kutlama modalı (D-036)

### D-040 · Durum metni: "🟢 Çalışıyorsun" (samimi, 1. şahıs)
- **Tarih:** 2026-08-04
- **Karar:** Sayaç altında yeşil nokta + "Çalışıyorsun" (running), "Hazır" (idle), "Duraklatıldın" (paused)
- **Gerekçe:** Patron referansı tercih etti, daha samimi his
- **Etki:** Daha önce "Çalışıyor · sürükle ve bırak" gibi uzun not vardı, kaldırıldı

### D-041 · Sayaç rengi: beyaz (D-021 İPTAL)
- **Tarih:** 2026-08-04
- **Karar:** Sayaç **her zaman beyaz**, çalışırken bile yeşile dönüşmez
- **D-021 iptal:** "Sayaç çalışırken hafif yeşil" artık geçerli değil
- **Gerekçe:** Patron referansı tercih etti — "şu an çalışıyor" bilgisi 🟢 nokta + "Çalışıyorsun" metni ile veriliyor, sayının rengi değişmesin
- **Etki:** Daha tutarlı görsel, göz takibi daha kolay (renk değişimi dikkat dağıtmaz)

### D-042 · Selamlama: semibold (D-032 güncelleme)
- **Tarih:** 2026-08-04
- **Karar:** "Merhaba, [isim]" — semibold (600) ağırlık, gri renk
- **D-032 güncelleme:** Renk ve konum aynı (gri, ortada), ama font semibold (kalın)
- **Gerekçe:** Patron referansı tercih etti

### D-043 · Swipe sıfırlama kaldırıldı (D-021 eski swipe kararı iptal)
- **Tarih:** 2026-08-04
- **Karar:** Pointer swipe ile sıfırlama **kaldırıldı**
- **D-021 eski karar iptal:** "Swipe ile sıfırlama" artık geçerli değil (önceki yorumda "Gerek yok" cevabı swipe'a aitti)
- **Gerekçe:** Artık "Durdur" / "Sıfırla" butonu var, swipe gereksiz
- **Etki:** Daha basit, daha net. Kullanıcı kazara swipe yapıp kaybetme riski yok
- **D-017 etkilenmedi:** Tık sesi ve görsel feedback hala geçerli

---

**Son güncelleme:** 2026-08-04 (D-001 → D-043 ✅ tamamlandı — 43 karar; S-0020 referans running state revizyonuyla plan kapandı)
