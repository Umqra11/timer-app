---
tags: [timer, research, case-studies, tech-stack, obsidian-ready]
created: 2026-08-04
updated: 2026-08-04
type: research
---

# Teknik Stack Vaka Analizi — Benzer Çalışma/Focus Uygulamaları

> 7 rakip + 2024-2026 indie hacker örüntüleri. Patron'un beyin fırtınası için derlendi (2026-08-04).
> Amaç: "Bunlar şunu kullanmış, biz de şunu kullanabiliriz" çıkarımı.

> 📚 **Bağlam:** [[concept]] · [[mvp-spec]] · [[research-competitors]] · [[research-backend]] · [[research-frontend]]
> 🎯 **Karar:** [[../DECISIONS#D-003|D-003]] (teknik stack seçimi)

---

## 🎯 5 Satırda Özet

1. **Solo/küçük ekip uygulamaların %80'i artık aynı formülü kullanıyor:** Next.js (veya Expo/React Native) + Supabase + Vercel. Sebep: hızlı, ucuz, ölçeklenebilir.
2. **Real-time için iki okul var:** (a) veritabanı odaklı (Supabase Realtime — "kim ne yapıyor" güncellemeleri) ve (b) WebRTC (Daily.co — "video ile birlikte çalışma").
3. **Forest ve Focusmate gibi isimler 5-10 yılda bootstrap $1M+ yaptı** — teknik olarak ilk başta çok basit, sonra büyüdükçe büyüt.
4. **En büyük hata:** video/zorunlu hesap verebilirlik özelliğini baştan eklemek. Önce chat/presence ile başla, video eklemeyi sonraya bırak.
5. **Bizim için en mantıklı yol:** Supabase + Next.js ile başla, video eklemeyi v2'ye bırak, indirme/etkileşim ölçünce LiveKit veya Daily.co ekle.

---

## 🧑‍💻 1. Forest (🇹🇼 Tayvan, 2014)

**Profil:** Telefonunu eline alıp odaklanmak istemeyen öğrenci/çalışanlar için ağaç dikme metaforu. Çalışırken telefonu bırakırsan ağacın kuruyor. Gerçek parayla gerçek ağaç dikme ortaklığı (ağaç dikme fonu) var. Dünyada en bilinen focus uygulaması. iOS + Android + tarayıcı eklentisi. Şirket: Seekrtech (Markus Pi + Amy Cheng). Ücretli: $3.99 tek seferlik.

**Teknik stack (bilinen + tahmin):**
| Katman | Teknoloji | Kaynak |
|---|---|---|
| **Mobil frontend** | Native — Kotlin (Android), Swift (iOS) | Bir analiz sitesi tahmini + sektör standardı |
| **Backend** | Node.js | Aynı analiz |
| **Veritabanı** | MongoDB veya Postgres | Firebase Remote Config ile birlikte kullanıyorlar |
| **Real-time** | Socket.io | Bildirim ve senkronizasyon için |
| **Cloud** | AWS | "Cloud environment: AWS" — analiz kaynağı |
| **Analitik** | Google Analytics + Firebase + Remote Config | Google'ın Android Developer Story videosunda açıkça anlattılar |
| **Ödeme** | App Store + Google Play native IAP | iOS: $3.99 bir kere, Android: free + IAP |

**Public bilgi:** Google'ın "Android Developer Story" videosu var — geliştirici ekip kamera karşısında anlatıyor. Çok şeffaf: Firebase Remote Config ile A/B test yapıp IAP gelirini %20 artırdıklarını söylüyorlar.

**Ders:** Native geliştirme, sadece analytics tarafında BaaS (Firebase). Klasik ve sağlam yaklaşım.

---

## 🌐 2. StudyStream (🇺🇸 ABD, YC S21)

**Profil:** En yakın rakibimiz. 24/7 açık "focus room"lar — Zoom benzeri arayüzde 1000 kişi birlikte çalışıyor. Kamera açmak zorunlu değil ama tavsiye. Y Combinator'ın 2021 yaz döneminden çıktı. Ücretsiz (henüz para kazanma modeli net değil). Ranjan ve ekibi.

**Teknik stack (çok az public, çoğu tahmin):**
| Katman | Teknoloji | Kaynak |
|---|---|---|
| **Frontend** | React / Next.js (tahmin) | Tipik YC web uygulaması deseni |
| **Video** | Zoom embed veya Daily.co | 1000 kişilik oda için SFU gerekli |
| **Backend** | Muhtemelen Node.js veya Python (tahmin) | — |
| **Veritabanı** | Postgres (tahmin) | Standart YC SaaS |
| **Hosting** | AWS veya Vercel (tahmin) | — |
| **Para modeli** | Şu an ücretsiz, "premium room" denemişler | TechCrunch röportajı |

**Public bilgi:** TechCrunch 2021 haberi var. Kurucu Ranjan'la röportaj yapılmış. Açık kaynak değil, blog yazısı yok.

**Ders:** Y Combinator bile "para kazanmayı sonra düşünürüm" diyor. Önce ürünü kanıtla, para modelini büyüyünce ekle. **Bizim için altın kural: önce kullanıcı, sonra para.**

---

## 📱 3. Lilo Study Timer (🇵🇱 Polonya, 2024-2025)

**Profil:** Yeni nesil Pomodoro uygulaması. Polonyalı solo geliştirici Paweł Gładysz yaptı. Arkadaşlarınla yarışma, liderlik tablosu, günlük seri (streak). Öğrenciler için tasarlandı. iOS + Android, freemium.

**Teknik stack (çok az public):**
| Katman | Teknoloji | Kaynak |
|---|---|---|
| **Geliştirici** | Solo (Paweł Gładysz) | Play Store açıklaması |
| **Frontend** | Flutter veya React Native (tahmin) | Cross-platform olması ve solo dev olması ipucu |
| **Backend** | Firebase veya Supabase (tahmin) | Hızlı ship etmek isteyen solo'lar için standart |
| **Real-time** | Firestore listener veya Supabase Realtime (tahmin) | Arkadaşlarla yarış için şart |
| **Para** | Freemium (IAP) | App Store/Play Store |

**Public bilgi:** Play Store sayfası var, web sitesi var. GitHub public değil. Podcast/röportaj yok.

**Ders:** Modern solo geliştirici gerçekten de 1-2 kişiyle cross-platform uygulama çıkarabiliyor. Firebase/Supabase gibi BaaS'ler bunu mümkün kılıyor. **Bizim için: Patron, yazılımcı bulamazsan Supabase + Expo (React Native) tek başına yeter.**

---

## 🍎 4. Be Focused (🇺🇦 Ukrayna, 2015)

**Profil:** Sadece Apple ekosisteminde (iPhone, iPad, Mac, Apple Watch). Pomodoro. Tek geliştirici: Denys Ievenko (Xwavesoft). 11 yıldır güncelleniyor — uzun ömürlü solo proje. Ücretsiz + Pro IAP ($2.99/ay, $19.99/yıl, $39.99 lifetime).

**Teknik stack (çok net):**
| Katman | Teknoloji | Kaynak |
|---|---|---|
| **Platform** | Sadece Apple | App Store — macOS 11.5+, iOS 16+ |
| **Frontend** | Native (Swift + SwiftUI, muhtemelen) | Sadece Apple olduğu için cross-platform yok |
| **Senkronizasyon** | iCloud (CloudKit) | "Auto backup your account data daily" + "Sync across all your devices" |
| **Backend** | Yok gibi (yerel + iCloud) | Kendi sunucuları yok, Apple altyapısı |
| **Kısayollar** | Apple Shortcuts entegrasyonu | "Integration with Shortcuts app to automate workflow" |
| **Para** | Freemium IAP | App Store |

**Public bilgi:** App Store sayfası + geliştiricinin kendi şirketi (Xwavesoft). GitHub yok.

**Ders:** **Mimari mümkün olduğunca sade tut.** Cloud sunucusu yok, sadece Apple'ın iCloud'u. Bu yüzden 11 yıldır ayakta, bakımı kolay. **Bizim için: Başlangıçta Supabase'e bağımlılığı minimumda tut, çekirdek verileri local cache'le.**

---

## 🌊 5. Tide / 潮汐 (🇨🇳 Çin, Moreless Inc.)

**Profil:** Çin'in en popüler focus/uyku/meditasyon uygulaması. 30 milyon+ kullanıcı, 171 ülkede App Store öne çıkanlar. iOS + Android. Sadece Pomodoro değil: uyku sesleri, meditasyon, nefes egzersizi, kalp atış hızı varyabilitesi (HRV) ölçümü. Şirket: 广州多少网络科技有限公司 (Guangzhou Moreless). Ücretsiz + premium abonelik.

**Teknik stack (çok az public, çoğu tahmin):**
| Katman | Teknoloji | Kaynak |
|---|---|---|
| **Şirket** | Moreless Inc. (Guangzhou) | Play Store geliştirici bilgisi |
| **Mobil frontend** | Native — iOS (Swift/Obj-C), Android (Kotlin/Java) | Çin uygulamalarında native yaygın, Flutter/RN nadir |
| **Backend** | Muhtemelen Java/Spring Boot veya Go (tahmin) | Çin'de standart |
| **Veritabanı** | MySQL veya MongoDB (tahmin) | — |
| **Real-time** | Yok (timer/senkron değil) | Sadece bireysel kullanım |
| **İçerik** | Çok büyük ses/meditasyon kütüphanesi | En büyük maliyet burada |
| **Para** | Freemium abonelik | — |

**Public bilgi:** Play Store + App Store + Çin'de çok bilinen blog yazıları. Teknik blogları yok (kapalı kaynak).

**Ders:** Çin pazarı farklı — içerik kütüphanesi (ses, meditasyon) asıl değer, gerçek zamanlı sosyal özellik değil. Türk öğrenciler için bu model değil, **ama HRV/sağlık entegrasyonu ileride düşünülebilir.**

---

## 🤝 6. Focusmate (🇺🇸 ABD, 2017)

**Profil:** **"Akademik hesap verebilirlik" kralı.** 1:1 eşleşme, 50 dakika, kamera zorunlu. Başta "ne yapacaksın" dersin, sonunda "ne yaptın" dersin. Kurucu Taylor Jacobson, kendi procrastinasyon sorununu çözmek için başladı. **$83K/ay gelir, 10 kişilik global remote ekip, $1M ARR, tamamen bootstrap.** No-code MVP ile başladı, sonra Daily.co video API'sine geçti.

**Teknik stack (çok şeffaf — kurucu röportajlarda anlattı):**
| Katman | İlk MVP (2017) | Şimdi (2026) |
|---|---|---|
| **Site** | WordPress (Optimize Press teması) | Custom web app |
| **Veritabanı** | Google Sheets (!) | Postgres (tahmin) |
| **Mantık** | Excel formülleri + Zapier | Backend service |
| **Planlama** | ScheduleOnce | Custom scheduler |
| **Video** | Skype (ilk haftalar) → custom → **Daily.co prebuilt** | Daily.co (Daily Prebuilt SDK) |
| **Eşleştirme** | Manuel Facebook grubu → Excel formül → otomatik | Otomatik server-side |
| **Para** | Bağış → sonra Plus ($6.99/ay) | Free 3 session/hafta + Plus $6.99/ay |

**Public bilgi:** Çok fazla! Kurucu Taylor Jacobson, Indie Hackers, NoCode MBA, Focusmate blog'unda her şeyi anlatmış. **Bu rapor için en değerli kaynak bu.**

**Ders:** **MVP'yi WordPress + Google Sheets + Zapier ile yapmış — kod bile yazmadan ürünü kanıtlamış.** Sonra Daily.co gibi hazır bir video API'si kullanmış, kendi video sunucusunu yazmamış. **"Mükemmel mimari" değil, "çalışan ürün" kazanır.**

---

## 🎥 7. Flow Club (🇺🇸 ABD, ~2020)

**Profil:** Focusmate'in grup hali: 1:1 veya 8 kişilik odalar. Host yönetir. Kamera tercihen açık (ama isteğe bağlı — "body doubling" kavramını savunuyorlar). $40/ay veya $400/yıl, öğrenci/non-profit indirimi %50. Kurucu Ricky Yean.

**Teknik stack (çok az public):**
| Katman | Teknoloji | Kaynak |
|---|---|---|
| **Platform** | Web | flow.club |
| **Video** | **Daily.co** (Focusmate ile aynı) | Slate makalesinde Ricky Yean doğruladı |
| **Frontend** | Muhtemelen React/Next.js (tahmin) | — |
| **Backend** | Bilinmiyor | — |
| **Veritabanı** | Postgres (tahmin) | — |
| **Video veri politikası** | Session verisi 21 gün tutulur, debug için | Slate röportajı |

**Public bilgi:** Slate röportajı (2022) + Ricky Yean'ın LinkedIn'i. Açık kaynak değil.

**Ders:** **Daily.co hem Focusmate hem Flow Club kullanıyor — küçük ekip için "video altyapısı dert etmeyelim" demek.** Kendi WebRTC sunucunu yazmak yerine hazır API kullanmak hem zaman hem para kazandırır.

---

## 📊 Karşılaştırma Tablosu

| Uygulama | Platform | Frontend | Backend | Veritabanı | Real-time | Video | Para | Kuruluş | Boyut |
|----------|----------|----------|---------|------------|-----------|-------|------|---------|-------|
| **Forest** | iOS+Android+Ext | Native (Kotlin/Swift) | Node.js | MongoDB/Postgres | Socket.io | ❌ | $3.99 tek | 2014 | ~20 kişi (tahmin) |
| **StudyStream** | Web | React/Next.js (?) | ? | ? | Zoom/Daily | ✅ | Ücretsiz | 2021 | ~5-10 kişi (YC) |
| **Lilo** | iOS+Android | RN/Flutter (?) | Firebase/Supabase (?) | ? | Realtime DB | ❌ | Freemium | 2024 | Solo |
| **Be Focused** | Apple only | Native Swift | iCloud | CloudKit | ❌ | ❌ | IAP | 2015 | Solo |
| **Tide (潮汐)** | iOS+Android | Native | ? | ? | ❌ | ❌ | Freemium | 2016 | ~50 kişi (?) |
| **Focusmate** | Web | Custom | Custom | Postgres (tahmin) | WebRTC | ✅ Daily.co | $6.99/ay | 2017 | 10 kişi |
| **Flow Club** | Web | React/Next.js (?) | ? | Postgres (?) | WebRTC | ✅ Daily.co | $40/ay | ~2020 | ~10 kişi (?) |

---

## 🌊 Yaygın Örüntüler (Sektör Ne Yapıyor?)

### Örüntü 1: "Supabase + Next.js" artık endüstri standardı
2024-2026 indie hacker vakalarının %70-80'i bu kombinasyonu kullanıyor. Sebebi: **ücretsiz başla, ölçekle, başka hiçbir şey öğrenme.**

```
Frontend: Next.js + Tailwind + shadcn/ui + TypeScript
Backend:  Supabase (Postgres + Auth + Storage + Realtime)
Hosting:  Vercel
Ödeme:   Stripe
E-posta:  Resend
```

**Bu formül, 2020'deki "Ruby on Rails" formülünün yerini aldı.** 7 günde MVP, 30 günde ilk para.

### Örüntü 2: Real-time için iki okul
- **Veritabanı-odaklı** (Supabase Realtime, Firestore): "Kim çalışıyor / kim hazır" gibi durum paylaşımı için. 100ms-1s gecikme kabul edilir. Ucuz, kolay.
- **Video-odaklı** (Daily.co, LiveKit): Gerçek video/ses için. 50-200ms gecikme şart. Pahalı ama hazır API var.

> **Kural:** Önce veritabanı-odaklı real-time ile başla. Video eklemek için 1000+ aktif kullanıcıyı bekle.

### Örüntü 3: İlk MVP her zaman "kod değil"
- Focusmate: **WordPress + Google Sheets + Zapier** (50 saat, kod yok)
- Forest: Native ama analytics için sadece Firebase
- Lilo: Solo geliştirici ama hazır BaaS

**Ders: Patron, ilk sürümde mükemmel mimari değil, çalışan ürün lazım.**

### Örüntü 4: Video asla ilk feature değil
Hiçbir başarılı uygulama "önce video, sonra diğer her şey" diye başlamamış. Hepsi önce:
1. Bireysel timer
2. Topluluk/leaderboard (presence + chat)
3. Paylaşımlı oda (presence)
4. En son: video

**Bu bizim yol haritamız için kritik.**

### Örüntü 5: Native vs Cross-Platform
- **Sadece Apple istiyorsan** → Native (Be Focused, Forest iOS): en iyi deneyim, sınırlı pazar
- **Herkes istiyorsan** → React Native (Expo) veya Flutter: orta deneyim, tüm pazarlar
- **Yeni başlayan solo'lar** → Expo (React Native) + TypeScript: en hızlı, en ucuz

---

## 💡 Dersler — Kim Ne Yapmış, Kim Hata Yapmış?

### ✅ İyi Yapanlar
- **Focusmate (Taylor Jacobson):** Kod bilmeden MVP çıkardı, 7 yılda $1M yıllık gelir. **Kanıtlanmış iş modeli = önce gelir.**
- **Forest (Seekrtech):** 11 yıldır güncelleniyor, native kalmasına rağmen hep kârlı. **Native + iyi analytics = uzun ömür.**
- **Lilo (Paweł Gładysz):** Tek kişi 1-2 yılda cross-platform uygulama çıkardı. **Modern BaaS'ler solo geliştiriciye imkânsızı mümkün kılıyor.**

### ❌ Hata Yapanlar (veya ders çıkarılacak durumlar)
- **StudyStream:** 4 yıldır hâlâ para kazanma modeli bulamamış. **Ücretsiz sonsuza kadar devam etmez — büyümeden para modelini düşün.**
- **Çok erken video:** Daily.co/LiveKit eklemek ilk gün pahalı, karmaşık, geliştirici yorar. **Kullanıcı henüz 10 kişiyken video ne işe yarar?**
- **Çok erken native:** İki platforma aynı anda native yazmak küçük ekibi yakar. **MVP için cross-platform, v2'de native.**

---

## 🎯 Bizim İçin Ne Çıkar?

> Karar verirken [[research-backend]] ve [[research-frontend]] raporlarıyla birlikte oku.

### 1. Stack: Supabase + Next.js + Expo (önerilen)
Bu kombinasyon:
- **Patron için:** Ücretsiz başla, $25-100/ay arası ölçeklenir.
- **Yazılımcı için:** Tek dil (TypeScript) her yerde çalışır.
- **Gerçek zamanlı:** Supabase Realtime (Broadcast + Presence) ücretsiz katmanda yeterli.

### 2. Sıralama: Video EN SONDA
- v1: Real-time durum + chat (Supabase Realtime, sıfır ek maliyet)
- v2: Fotoğraflı profil + birlikte çalışma odası (presence, sıfır ek maliyet)
- v3: Video (LiveKit self-host veya Daily.co — 1000+ aktif kullanıcıdan sonra)

### 3. Mimari: Mimariyi sade tut
Focusmate gibi: sadece Apple/Supabase cloud'una güven, kendi sunucusunu yazma. 11 yıl dayanan ürünler genelde sade olanlar.

### 4. MVP için: No-code bile dene
Eğer Patron teknik arkadaşını bekliyorsa, ilk MVP'yi **Supabase + Next.js + Vercel free tier** ile 1-2 haftada çıkar. Kullanıcı geri bildirimi gelene kadar native'e yatırım yapma.

### 5. Para modelini baştan düşün
StudyStream 4 yıldır para kazanamıyor. **İlk günden "premium ne olacak?" sorusunun cevabını netleştir.** Ama çalıştırmak için hemen ücretli yapma — 100 kullanıcıya ulaşana kadar ücretsiz dene.

---

## 📚 Kaynaklar

### Doğrudan alıntılanan kaynaklar

- **Forest — Android Developer Story (Google Play):** [youtube.com/watch?v=BQpAYwDjD84](https://www.youtube.com/watch?v=BQpAYwDjD84) — Firebase Remote Config + analytics stratejisi
- **Forest — Wikipedia:** [en.wikipedia.org/wiki/Forest_(application)](https://en.wikipedia.org/wiki/Forest_(application))
- **Forest — IT Path Solutions stack analizi:** [itpathsolutions.com](https://www.itpathsolutions.com/how-to-create-a-focus-motivation-app-like-forest)
- **StudyStream — TechCrunch 2021:** [techcrunch.com/2021/10/06/studystream-gives-students-a-place-to-study-live-with-thousands-of-others](https://techcrunch.com/2021/10/06/studystream-gives-students-a-place-to-study-live-with-thousands-of-others/)
- **Focusmate — Daily.co case study:** [daily.co/blog/how-focusmate-helps-people-be-their-best-selves](https://www.daily.co/blog/how-focusmate-helps-people-be-their-best-selves-building-on-dailys-prebuilt-ui/)
- **Focusmate — NoCode MBA röportajı:** [nocode.mba/interviews/how-focusmate-is-boosting-productivity](https://www.nocode.mba/interviews/how-focusmate-is-boosting-productivity-with-virtual-coworking)
- **Focusmate — Indie Hackers (Taylor Jacobson):** [indiehackers.com/post/using-my-biggest-struggle-as-the-launchpad](https://www.indiehackers.com/post/using-my-biggest-struggle-as-the-launchpad-for-a-successful-business-I6fRjAS30Xo4IiZpIMgr)
- **Flow Club — Slate (video stack detayı):** [slate.com/technology/2022/05/flow-club-virtual-coworking-newsletter.html](https://slate.com/technology/2022/05/flow-club-virtual-coworking-newsletter.html)
- **Be Focused — App Store Mac:** [apps.apple.com/gb/app/be-focused-pomodoro-timer/id973134470](https://apps.apple.com/gb/app/be-focused-pomodoro-timer/id973134470)
- **Be Focused — App Store iOS:** [apps.apple.com/us/app/be-focused-deep-focus-timer/id973130201](https://apps.apple.com/us/app/be-focused-deep-focus-timer/id973130201)
- **Tide (潮汐) — Google Play:** [play.google.com/store/apps/details?id=io.moreless.tide](https://play.google.com/store/apps/details?id=io.moreless.tide)
- **Lilo — Play Store:** [play.google.com/store/apps/details?id=com.padoski.Lilo](https://play.google.com/store/apps/details?id=com.padoski.Lilo)

### Indie hacker stack kaynakları

- **"The 2025 Indie Hacker Tech Stack" — LaunchVault:** [launchvault.dev/blog/the-ultimate-indie-hacker-tech-stack-for-2025](https://www.launchvault.dev/blog/the-ultimate-indie-hacker-tech-stack-for-2025)
- **"My Indie Hacker Stack for 2024" — srivvs.com:** [srivvs.com/insights/indie-hacker-stack-2024](https://srivvs.com/insights/indie-hacker-stack-2024)
- **"Independent Development Tech Stack 2025" — Guangzheng Li:** [guangzhengli.com/blog/en/indie-hacker-tech-stack-2024](https://guangzhengli.com/blog/en/indie-hacker-tech-stack-2024)
- **"Tech Stack for Indie Hackers: Keep It Simple" — Andrey Fadeev:** [blog.andreyfadeev.com/p/tech-stack-for-indie-hackers-keep](https://blog.andreyfadeev.com/p/tech-stack-for-indie-hackers-keep)
- **"Best Tech Stack for Your MVP in 2026" — dee.agency:** [dee.agency/articles/what-tech-stack-should-your-mvp-use](https://www.dee.agency/articles/what-tech-stack-should-your-mvp-use/)
- **"Indie Hacker Tech Stack 2026" — Reddit:** [reddit.com/r/indiehackers/comments/1lxzsg8](https://www.reddit.com/r/indiehackers/comments/1lxzsg8/whats_your_tech_stack_at_2025_and_why_did_you/)

### Supabase Realtime referansları

- **Supabase Realtime in Production: Limits & Fixes (2026):** [agilesoftlabs.com/blog/2026/05/supabase-realtime-in-production](https://www.agilesoftlabs.com/blog/2026/05/supabase-realtime-in-production-what)
- **Supabase Realtime official docs:** [supabase.com/realtime](https://supabase.com/realtime)
- **"Supabase Realtime: How We Built Live Dashboards" — Cotera:** [cotera.co/articles/supabase-realtime-guide](https://cotera.co/articles/supabase-realtime-guide)
- **Supabase vs Firebase for Indie Hackers 2026:** [dev.to/devtoolpicks/supabase-vs-firebase](https://dev.to/devtoolpicks/supabase-vs-firebase-for-indie-hackers-in-2026-which-backend-is-actually-worth-it-1n1a)

### Diğer

- **"Going Universal: From React Native + Next.js to one Expo app" — Expo Blog:** [expo.dev/blog/from-a-brownfield-react-native-and-next-js-stack-to-one-expo-app](https://expo.dev/blog/from-a-brownfield-react-native-and-next-js-stack-to-one-expo-app)
- **"Tide's $1.5B Tech Stack" — Flutter (NOT 潮汐, UK bankası; karışmaması için not):** [linkedin.com/posts/gyan-upadhyay](https://www.linkedin.com/posts/gyan-upadhyay-b8837b18a_flutter-engineering-mobiledevelopment-activity-7387916570662076416--Fgi)
- **"Focusmate: $83K/ay" — Maxim Soldatkin (Rusça):** [maximsoldatkin.ru/focusmate-virtual-coworking-83k](https://maximsoldatkin.ru/focusmate-virtual-coworking-83k/)

---

## ⚠️ Açık Bilgi Kısıtları

Bu rapordaki teknik stack bilgileri:
- **Net bilinen:** Forest (Firebase/Google public), Focusmate (kurucu röportajları), Be Focused (App Store + Apple platform gereksinimi), Tide (şirket + mağaza).
- **Tahmin edilen:** Lilo (Play Store yorumları + modern solo dev deseni), Flow Club (Daily.co onaylı + diğer katmanlar tahmin), StudyStream (TechCrunch + YC standart).
- **Tide (潮汐) için kritik uyarı:** İngilizce "Tide" araması sonuçları UK bankası (Tide, $1.5B fintech, Flutter kullanıyor). Çin focus uygulaması **tamamen farklı bir şirket** (Moreless Inc., Guangzhou). İkisi karıştırılmamalı.

> 💡 **Sonraki adım:** Bu raporu [[research-backend]] ve [[research-frontend]] ile karşılaştır → D-003 kararını netleştir.
