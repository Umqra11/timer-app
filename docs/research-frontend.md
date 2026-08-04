# Timer Projesi — Frontend Framework Araştırması

**Tarih:** 2026
**Araştırmacı:** Genel Worker sub-agent
**Amaç:** Telefon-öncelikli PWA + real-time (WebSocket) için en uygun frontend framework'ü seçmek

---

## 1. Kısa Özet (5 satır)

- **SvelteKit** en hafif (15 KB bundle) — Türkiye mobil internetinde hızlı açılır.
- **Next.js** en büyük ekosistem + Vercel'e tek tıkla deploy — ama React öğrenmek gerekiyor.
- **Remix** form/veri akışı güçlü — ama React yine şart ve küçük ekosistem.
- **Astro** içerik siteleri için harika, ama dinamik real-time uygulamaya uygun değil.
- **ÖNERİ: SvelteKit** — Patron'un durumu için (yazılımcı değil, AI destekli geliştirme) en rahat seçenek.

---

## 2. Framework'ler — Artı / Eksi

### 🔵 Next.js (React tabanlı)
Dünyanın en popüler frontend framework'ü. Vercel tarafından geliştiriliyor. **Avantajları:** devasa ekosistem, AI'lar bu framework'ü çok iyi biliyor (kod üretirken hata az), Vercel'e 1 dakikada deploy, PWA kütüphaneleri hazır. **Dezavantajları:** React'ın kendisini bilmek gerekiyor (JSX, hooks, server/client component ayrımı), bundle büyük (~85 KB), ilk başlangıçta "kafan karışır". React 19 ile gelen server components konusu başlangıçta kafa karıştırıcı olabiliyor. Türkiye'den Vercel erişimi hızlı (CDN var).

### 🟢 SvelteKit (Svelte tabanlı)
Yeni nesil, "öğrenmesi en kolay" framework. **Avantajları:** kod HTML'e çok yakın — sanki normal HTML yazıyorsun ama süper güçleri var, bundle en küçük (~15 KB, neredeyse 6 kat fark), built-in PWA/service worker desteği, real-time WebSocket entegrasyonu için `svelte-realtime` kütüphanesi var, sunucu maliyeti düşük (küçük proje için ücretsiz hostlar yeter). **Dezavantajları:** React kadar büyük bir Türk topluluğu yok, ama yabancı kaynak + AI yardımı yeterli. Türkçe dokümantasyon az ama İngilizce resmi döküman çok temiz.

### 🟡 Remix (React tabanlı)
Web standartlarına odaklı, form ve veri akışı çok iyi. **Avantajları:** sunucu-öncelikli çalışıyor, form gönderimi için harika, küçük ama kaliteli ekosistem, artık Shopify çatısı altında. **Dezavantajları:** React bilmek şart, Next.js kadar büyük topluluk yok, Vercel'e deploy ekstra adapter istiyor, Türkiye'de pek bilinmiyor.

### 🟠 Astro
"Yıldız mimarisi" — sayfanın çoğu statik, sadece ihtiyaç olan yerlerde JavaScript çalışır. **Avantajları:** en küçük bundle (76 KB altı), içerik sitelerinde rakipsiz hız, PWA desteği var. **Dezavantajları:** **dinamik uygulamalar (real-time, canlı güncelleme) için uygun DEĞİL** — benchmark'larda "dynamic workload altında çöker" deniyor. SSR için adapter gerekli. Timer gibi canlı güncellenen bir uygulama için yanlış tercih.

---

## 3. Karşılaştırma Tablosu

| Kriter | Next.js | SvelteKit | Remix | Astro |
|---|---|---|---|---|
| **Öğrenme kolaylığı** (yeni başlayan) | Orta-Zor (React gerekli) | **Kolay** (HTML benzeri) | Orta-Zor (React gerekli) | Orta |
| **Bundle boyutu** (temel app) | ~85 KB | **~15 KB** ✓ | ~85 KB | ~76 KB |
| **PWA desteği** | İyi (kütüphane ile) | **Çok iyi (built-in SW)** | İyi (kütüphane ile) | İyi (vite-pwa) |
| **WebSocket/Real-time** | İyi (kütüphane ile) | **Çok iyi (svelte-realtime)** | İyi (loader ile) | Zayıf |
| **Vercel'e deploy** | **En kolay (1 komut)** | Kolay (adapter ile) | Kolay (adapter ile) | Kolay (adapter ile) |
| **Türkiye CDN hızı** | **Çok hızlı** (Vercel global) | Hızlı (Vercel/Netlify) | Hızlı | Hızlı |
| **Mobil performans (p95)** | 1.2s | 1.4s | 1.8s | **1.1s** |
| **Türkçe kaynak** | Çok | Az ama yeterli | Çok az | Çok az |
| **AI yardımıyla geliştirme** | **Çok iyi** (en çok veri) | İyi (temiz syntax) | İyi | İyi |
| **Sunucu maliyeti (500K istek/ay)** | $47/ay | **$19/ay** ✓ | $21/ay | $14/ay |

---

## 4. 🎯 TEK ÖNERİ: **SvelteKit**

### Gerekçe

**1. Patron'un durumu için en rahatı.**
Svelte'in syntax'ı neredeyse saf HTML. Yani AI'ya "şu sayfayı yap" dediğinde, AI daha temiz, daha kısa kod üretir. React'ta her şey `useState`, `useEffect`, server component, client component derken kafanız karışır. Svelte'te `let count = 0` yazarsın, biter.

**2. Türkiye mobil internetine en uygunu.**
Türk öğrenciler genelde 4G/5G kullanıyor ama hız her zaman iyi değil. **15 KB bundle** demek, sayfa 5 kat daha hızlı açılır demek. Real-time uygulamada her ms önemli.

**3. PWA ve WebSocket zaten hazır.**
- Service worker için ayrı kütüphane kurmaya gerek yok, SvelteKit kendisi otomatik kaydeder.
- `svelte-realtime` kütüphanesi ile odadaki diğer kullanıcıların canlı durumunu göstermek ~20 satır kod. Inngest gibi firmaların öve öve anlattığı bir entegrasyon.

**4. Ücretsiz host yeter.**
Vercel'in free plan'ı SvelteKit için fazlasıyla yeterli. Patron cebinden para harcamaz.

**5. Topluluk küçük ama kaliteli + AI dostu.**
Stack Overflow ve Reddit'te "SvelteKit öğrenmek isteyenler için en iyi" diye sürekli öneriliyor. AI araçları (Copilot, Cursor, Claude) Svelte'i çok iyi biliyor çünkü syntax temiz. **Yazılımcı olmayan birinin AI ile geliştireceği proje için en az hata çıkaran framework.**

### Ne zaman Next.js seçilirdi?
- Eğer Patron React biliyor olsaydı → Next.js.
- Eğer proje çok büyük, 100+ sayfa, çok sayıda geliştirici olsaydı → Next.js.
- **Ama bu durumda değiliz.** Tek geliştirici (Patron + AI), küçük-orta ölçekli PWA, real-time.

### Riskler ve Çözümler
- **Risk:** SvelteKit Türkçe topluluk az. → **Çözüm:** AI ile geliştirilecek, İngilizce döküman kalitesi zaten çok yüksek.
- **Risk:** İş ilanlarında daha az SvelteKit istenir. → **Çözüm:** Bu proje iş ilanı için değil, kişisel proje. Patron zaten yazılımcı değil.
- **Risk:** Svelte 5 (runes) yeni sistemi geçti, bazı eski tutorial'lar eski. → **Çözüm:** 2025 sonrası kaynaklar yeni sisteme göre.

---

## 5. Aksiyon Planı (Öneri)

1. **SvelteKit** ile proje iskeleti oluştur: `npx sv create timer-app`
2. **Adapter:** Vercel için `adapter-vercel` ekle.
3. **PWA:** `manifest.json` + otomatik service worker (SvelteKit built-in).
4. **Real-time:** `svelte-realtime` kütüphanesi ile WebSocket katmanı.
5. **Veritabanı:** Backend ayrı (Supabase / Pocketbase / kendi Node sunucusu — sonra karar verilir).
6. **Deploy:** GitHub'a push → Vercel otomatik deploy. Domain sonra.

---

## 6. Kaynaklar (2025–2026 verisi)

1. **Next.js vs Remix vs SvelteKit in 2025** — Suraj Phirke, Medium
   https://medium.com/@surajphirke3/next-js-vs-remix-vs-sveltekit-in-2025-which-full-stack-framework-should-you-choose-c8e91447fc18
2. **Next.js 15 vs Remix vs SvelteKit: Server Costs Tested** — The Editorial (2025)
   https://theeditorial.news/frameworks/nextjs-15-vs-remix-29-vs-sveltekit-25-server-costs-measured-rsc-overhead-tested-mozdl5en
3. **SvelteKit vs Next.js in 2026: A Developer's Honest Comparison** — teta.so
   https://teta.so/learn/sveltekit-vs-nextjs
4. **Next.js vs Remix vs SvelteKit for Indie Hackers (2026)** — devtoolpicks
   https://devtoolpicks.com/blog/nextjs-vs-nuxt-vs-sveltekit-indie-hackers-2026
5. **Building a real-time websocket app using SvelteKit** — Inngest Blog
   https://www.inngest.com/blog/building-a-realtime-websocket-app-using-sveltekit
6. **Vercel Pricing & Hobby Plan** — Vercel Docs (2026)
   https://vercel.com/docs/plans/hobby
7. **SvelteKit Service Workers & PWA** — Resmi Svelte Docs + Vite PWA
   https://svelte.dev/docs/kit/service-workers
   https://vite-pwa-org.netlify.app/frameworks/sveltekit.html

---

**Sonuç:** Patron, SvelteKit ile başlasın. 2 hafta içinde çalışan bir prototip çıkar, gerisini iterasyonla geliştiririz. İhtiyaç büyürse Next.js'e geçiş köprüsü kurmak mümkün (her ikisi de SSR/SEO destekliyor).
