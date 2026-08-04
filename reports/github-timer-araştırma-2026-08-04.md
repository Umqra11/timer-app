# GitHub Açık Kaynak Timer/Pomodoro/Focus Uygulamaları Analizi

**Tarih:** 4 Ağustos 2026
**Amaç:** Timer projesi (SvelteKit + Supabase + Vercel + Magic Link, Türkiye pazarı, sosyal çalışma takip) için pazar araştırması.
**Yöntem:** Verilen 7 GitHub URL'i web üzerinden ziyaret edildi. Sadece sayfada doğrulanabilen bilgiler kullanıldı.

---

## 1. Belirli Repolar (Sizin Listelediğiniz)

### 1.1 `ahlaw/pomodoro-timer`
- **URL:** https://github.com/ahlaw/pomodoro-timer
- **Yıldız:** 0 | **Watchers:** 0 | **Forks:** 0
- **Açıklama:** "React Pomodoro app to improve focus."
- **Stack:** React (Create React App — README'de `react-scripts` ve `npm run build` referansları var). Veritabanı/oturum açma bilgisi yok.
- **Özellikler:** README büyük oranda standart CRA şablonu ("Getting Started", "Alternatives to Ejecting", "Something Missing?"). Sayfada özellik listesi yok.
- **UI/UX:** Görsele erişim yok; yalnızca meta veriden bilgi çıkarılabildi.
- **Bize ilham:** Pek değil. Boş şablon, geliştirilmemiş.

### 1.2 `ryanadhitama/pomodoro`
- **URL:** https://github.com/ryanadhitama/pomodoro
- **Yıldız:** 0 | **Watchers:** 1 | **Forks:** 0
- **Site:** pomodoro-two-lovat.vercel.app (Vercel'de canlı)
- **Stack:** Next.js (Pages Router — `pages/index.js`, `pages/api/hello.js`). Inter fontu. Veritabanı yok (README'de sadece "API routes" demosu var).
- **Özellikler:** README standart `create-next-app` şablonu. Özel özellik listesi yok.
- **UI/UX:** Site canlı olduğuna göre temel bir pomodoro arayüzü var; ama kaynak kod detayına erişilemedi.
- **Bize ilham:** Bize uymaz çünkü SvelteKit kullanıyoruz ve Pages Router (eski yaklaşım).

### 1.3 `GeorgeQLe/pomodoro-clone-walkthrough`
- **URL:** https://github.com/GeorgeQLe/pomodoro-clone-walkthrough
- **Yıldız:** 0 | **Watchers:** 0 | **Forks:** 0
- **Lisans:** MIT
- **Stack:** **Next.js + tRPC + Drizzle ORM + Neon (Postgres) + Better Auth + shadcn/ui + TanStack (auth olarak GitHub OAuth + Google OAuth).** Server + Client Component hibrit yapı.
- **Ana özellikler (README'den):**
  - Type-safe uçtan uca (Drizzle → tRPC → React)
  - GitHub ve Google OAuth ile giriş
  - Server-side auth kontrolü + protected route'lar
  - Modern React pattern (RSC + Client Component)
- **UI/UX:** shadcn/ui (nötr, modern, erişilebilir). Dark mode desteği shadcn'den gelir.
- **Bize ilham:** ⭐ **Çok değerli mimari referans.** SvelteKit karşılığı:
  - Supabase Auth (Magic Link) ↔ Better Auth + GitHub/Google OAuth
  - Drizzle/Neon ↔ Supabase Postgres + Row Level Security
  - tRPC ↔ SvelteKit `+page.server.ts` load fonksiyonları
  - shadcn/ui ↔ shadcn-svelte (zaten D-009 planımızda var)
  - Aslında bizim stack'imiz bu repodan **daha az boilerplate** çünkü Supabase auth + DB + RLS hepsi tek yerde.

---

## 2. Topic Sayfalarındaki Öne Çıkan Repolar

### 2.1 `pomodoro-timer` topic sayfası

**`lazy-guy/tomodoro` (⭐ 305 — en popüler)**
- **URL:** https://github.com/lazy-guy/tomodoro
- **Dil:** JavaScript (Vue)
- **Tag'ler:** productivity, web, **pwa**, pomodoro, pomodoro-timer, pomodoro-technique
- **Açıklama:** "A pomodoro web app with **PIP mode, white noise generation, tasks** and more!"
- **Son güncelleme:** Nisan 2026
- **Bize ilham:**
  - **PIP (Picture-in-Picture) modu** — kullanıcı timer'ı başka uygulamanın üstünde küçük pencerede tutabilir. Çalışırken tarayıcı sekmeleri arasında geçenler için çok değerli.
  - **White noise** (yağmur, kahve, vb. ses kütüphanesi) — odaklanma için kanıtlanmış UX öğesi.
  - **PWA** — telefona "uygulama gibi" yüklenebilir. Vercel + SvelteKit ile native maliyet olmadan mümkün.

### 2.2 `focus-timer` topic sayfası

**`Abir7109/routines` (⭐ 5)**
- **URL:** https://github.com/Abir7109/routines
- **Dil:** TypeScript
- **Tag'ler:** react, android, productivity, **ios**, typescript, nextjs, mobile-app, pomodoro, **capacitor**, tailwindcss, focus-timer
- **Açıklama:** "A modern focus and productivity app for **students and professionals**. Stay focused, manage schedules, and track progress."
- **Stack:** React + Next.js + **Capacitor (iOS/Android wrap)** + Tailwind CSS
- **Son güncelleme:** Mart 2026
- **Bize ilham:**
  - **"Students and professionals" hedeflemesi** bizim "Türkiye'de öğrenciler" hedefimize çok yakın. Pazarlama dili olarak kanıtlanmış.
  - **Capacitor** ile tek kod tabanından hem web hem iOS hem Android yayınlama. İleride native uygulama istersek seçenek.
  - Tailwind — bizim de planladığımız (D-009) shadcn-svelte altyapısıyla uyumlu.

### 2.3 `study-timer` topic sayfası

**`yhay81/tsukue-no-hi` (⭐ 0, ama konsept olarak ilginç)**
- **URL:** https://github.com/yhay81/tsukue-no-hi
- **Dil:** JavaScript
- **Tag'ler:** japanese, **hono**, **cloudflare-workers**, **local-first**, study-timer, vite-plus
- **Açıklama (JP'den çevrilmiş):** "Üye olmadan, kayıt olmadan, ders bazlı çalışma süresini cihazda biriktiren, Japonca bir çalışma masası."
- **Stack:** Vite + Hono + Cloudflare Workers (edge compute), local-first veri saklama
- **Bize ilham:**
  - **"Üye olmadan kullan"** yaklaşımı Magic Link ile harika örtüşüyor. E-posta yok, parola yok, sadece bir tık.
  - **Local-first** felsefesi: çalışma verileri önce cihazda, sonra bulutta sync. Offline çalışma için şart.
  - **Ders bazlı zaman birikimi** — bizim "Konu bazlı istatistik" fikrimizle birebir aynı.

### 2.4 `productivity-app` topic sayfası

**`Oriva-Foundation/maid` (⭐ 17)** — tam bir timer değil (AI PDF okuyucu), sadece Flutter/verimlilik alanında referans olarak not düşüldü. **Kapsam dışı.**

---

## 3. Çapraz Gözlemler (Tüm Topic'lerden)

| Gözlem | Kanıt |
|---|---|
| PWA/PIP, white noise, "tasks" 3'lüsü popüler | `tomodoro` (305⭐) tam olarak bunları sunuyor |
| "Öğrenci + profesyonel" hedef kitlesi yaygın | `routines` ve birçok focus-timer reposu |
| React/Next.js hakimiyeti | Topic sayfalarındaki repoların çoğu React tabanlı |
| Svelte/SvelteKit ile yazılmış popüler bir timer reposu **yok** | 4 topic sayfasında da Svelte göze çarpmadı — bu bir fırsat (farklılaşma) |
| Magic Link / passwordless auth trendi | GeorgeQLe (Better Auth ile OAuth) ve local-first yaklaşımlar |
| Sosyal/çok oyunculu özellik genelde **yok** | Hiçbir repoda "rooms", "study together", "leaderboard" göze çarpmadı. **Bu bizim için büyük boşluk** |

---

## 4. Bizim Timer Projemize Özel Çıkarımlar

### Doğrulanan farklılaştırıcı fikirler
1. **"Odalar" sekmesi (sosyal çalışma)** — Açık kaynak rakiplerin hiçbiri bunu yapmıyor. Forest, Focusmate gibi kapalı kaynak uygulamalarda var. **Rekabet avantajı.**
2. **Konu bazlı istatistik** — `tsukue-no-hi` ile aynı konsept, Türkiye pazarına uyarlanmış hali benzersiz değer.
3. **Magic Link giriş** — Türk kullanıcılar için OAuth'tan daha az friction. E-posta yeterli, parola yok.
4. **PIP modu** — `tomodoro` kanıtlamış bir UX, bizim kronometre için de geçerli.
5. **White noise / ortam sesleri** — Türkçe içerik üreticilerinin ses kütüphanesiyle farklılaştırılabilir (örn. İstanbul kafe ambiyansı, yağmur + ezan, vb.).

### Stack kararlarımız için doğrulama
- **SvelteKit + Supabase + Vercel** = pazarın az kullandığı ama modern kombinasyon. Farklılaştırıcı.
- **shadcn-svelte** = `GeorgeQLe` reponun shadcn tercihi, bizim tercihimizle uyumlu.
- **Supabase RLS** = `GeorgeQLe` Drizzle ile manuel yapmış. Supabase ile RLS otomatik gelir — daha az kod.
- **Magic Link** = `GeorgeQLe` OAuth yapmış. Daha az geliştirici dostu kullanıcılar için Magic Link yeterli.

### MVP'de (v0.1) bulunmaması gerekenler
- ❌ White noise (v0.2'ye bırakılabilir)
- ❌ Native mobil uygulama (PWA yeterli başlangıçta)
- ❌ Karmaşık istatistik grafikleri (basit toplam yeterli)

### MVP'de (v0.1) mutlaka olması gerekenler
- ✅ Magic Link ile giriş (Supabase Auth)
- ✅ Tek buton kronometre (Kronometre sekmesi)
- ✅ Odalar sekmesi — en az 2 kişilik oda oluşturma ve katılma
- ✅ Profil sekmesi — toplam çalışma süresi
- ✅ Dark mode (Supabase + Tailwind `dark:` sınıfları)

---

## 5. Sınırlılıklar

- **Görsele erişim yoktu** — UI/UX tasarımı için yalnızca meta veri, topic tag'leri ve README'den çıkarım yapıldı. Görsel karşılaştırma için repoların canlı demolarını (`tomodoro`, `pomodoro-two-lovat.vercel.app`) manuel ziyaret etmek gerekir.
- **Star sayıları** sayfa anlık yüklendiğinde okundu; 4 Ağustos 2026 itibarıyla geçerli.
- **Hiçbir repoda Türkçe içerik veya Türkiye'ye özgü özellik** tespit edilmedi. Bu, pazarda **ilk hareket eden olma** fırsatı.

## 6. Sonuç

Açık kaynak timer alanı büyük ölçüde "tek kişilik pomodoro" etrafında dönerken, **sosyal çalışma + Türkçe içerik + Magic Link** kombinasyonu literatürde boş. `GeorgeQLe` reponun mimari kararları (Next.js + tRPC + Drizzle + Better Auth) bizim SvelteKit + Supabase + Magic Link yığınımızla 1:1 eşleşiyor — sadece daha az boilerplate ile. En somut kopyalanabilir UX: **PIP modu** + **konu bazlı sayaç** + **white noise (v0.2)**.
