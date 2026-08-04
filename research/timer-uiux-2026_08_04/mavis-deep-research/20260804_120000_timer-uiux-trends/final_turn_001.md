# Timer Uygulaması UI/UX Tasarım Raporu

**Tarih:** Ağustos 2026  
**Kapsam:** Apple tarzı modern timer/focus uygulamaları, SvelteKit + PWA + Supabase + Magic Link yapısına uyarlanmış.  
**Hedef:** Senin Timer uygulaman için uygulanabilir UI/UX önerileri.

---

## 1. Büyük Resim: Apple Tasarım Dili 2026

iOS 26 ile Apple, **"Liquid Glass"** adlı yeni bir malzeme dili getirdi. Bu, yarı saydam, hafifçe kırılgan, içeriğin rengini/emojilerini yansıtan bir cam tabaka gibi davranıyor. Tab bar, navigation bar ve floating butonlarda kullanılıyor; içerik katmanında (listeler, medya) asla değil [1]. Pratik sonuç: **Timer uygulamasının alt navigasyonu, başlat/duraklat butonu, swipe-to-stop barı cam gibi görünebilir**, ama timer'ın kendi yüzeyi düz ve sade kalmalı.

Apple'ın 2025-2026 tasarım felsefesi özetle: **"Deference, Clarity, Depth"** — yani içerik önde, kontrol ikinci planda ama hissedilir, derinlik ışık/gölgeyle değil katmanlama ile [2]. 2025 UI trend raporlarına göre mikro-etkileşimler, stratejik renk vurguları ve "morphing" geçişler bu yılın öne çıkan temaları [3].

**Referans uygulamaların ortak dili:**

- **Apple Clock (iOS 17+):** Yeni "Recents" sekmesi eklendi, multi-timer desteği, swipe-to-stop ile bitti (iOS 26'da). Ama durdurma butonu "ekranın dibinde minicik" olduğu için eleştiriliyor [4]. Yani Apple'ın kendisi bile burada hata yapıyor — biz bu hatayı tekrarlamayalım.
- **Be Focused (iOS/Mac):** 4.7 yıldız, 53K değerlendirme. "Minimal ama güçlü", "az shiny şey = az dikkat dağıtıcı" [5]. Başarı = sade UI + Apple Watch senkronu + CSV export.
- **Sessions (Mac/iOS):** "macOS native tasarımı bozmuyor", menubar entegrasyonu, klavye kısayolları, native chime sesi [6]. Apple kullanıcısı için "doğal hissettiren" timer.
- **Tide (iOS):** 4.8 yıldız, 1.7K değerlendirme. Dört modül (Focus, Sleep, Nap, Breath) tek bir ana ekranda döner. Pomodoro + doğa sesleri. Kullanıcı şikayeti: "İçeriklere ulaşmak için çok fazla katman" [7] — yani derinlik iyi, labirent kötü.
- **Things 3 / Linear / Notion:** "Tek tipografi, tek vurgu rengi, sıkı hiyerarşi" [8]. Linear "gradient orb" damgası, Things 3 sadece anlam için renk (sarı=Today, kırmızı=Deadline) [9].

---

## 2. Dark Mode Renk Paleti (Apple Standartları)

Apple'ın dark mode sistemi koyu griler kullanır, **saf siyah (#000) değil** [10]. Bu kontrastı yumuşatır, OLED'de "halation" parlamasını önler.

| Token | HEX | Kullanım |
|---|---|---|
| `surface-default` | `#1C1C1E` | Ana arka plan |
| `surface-card` | `#2C2C2E` | Kartlar, modal iç yüzeyleri |
| `surface-elevated` | `#3A3A3C` | Yükseltilmiş elementler |
| `surface-modal` | `#48484A` | Modal overlay |
| `text-primary` | `#F5F5F5` | %87 opacity (Apple önerisi) |
| `text-secondary` | `rgba(235,235,235,0.6)` | Orta vurgu |
| `text-tertiary` | `rgba(235,235,235,0.38)` | Devre dışı / ipucu |
| `accent` | `#FF453A` veya `#0A84FF` | Tek vurgu rengi (aşağıya bak) |

**Önemli kurallar:**
- **Saf siyahı arka plan olarak kullanma** — göz yorulur, OLED'de "pikselation/ghost" olur [11].
- **Saf beyaz metin kullanma** — `#F5F5F5` veya `#E0E0E0` daha rahat [12].
- **Renkleri %10-20 desature et** — parlak kırmızı/mavi neon gibi görünür karanlıkta [13].
- **Tek bir vurgu rengi seç ve anlamı için kullan.** Linear: gradient orb. Apple Music: pembe-kırmızı. Senin Timer için: **"devam ediyor" durumu** için tek renk (örn. `#0A84FF` Apple mavi) ve **"tamamlandı"** için tek renk (örn. `#30D158` yeşil).

**Senin Timer için önerim:** Marka rengin ne olursa olsun, sadece **iki anlamsal renk** kullan: biri "şu an ölçüyor", biri "bitti". Geri kalan her şey grinin tonu.

---

## 3. Tipografi: 2 Font, Sıkı Hiyerarşi

Apple'ın resmi yaklaşımı: **SF Pro gövde + New York başlıklar** (yeni serif sistem fontu). İkisi de optik boyutlandırma ile ölçeklenir, Dynamic Type'ı destekler, 150+ dilde çalışır [14]. Önemli: SF Pro'yu **asla** uygulama bundle'ına gömme — sistem API'si (Font.system) ile gelir.

**Web için (senin SvelteKit PWA) tavsiyem:**

- **Inter** (gövde) — Apple'ın sistem fontuna en yakın açık kaynak alternatif. iOS/Android/web hepsinde benzer görünür [15].
- **Başlıklar** için aynı Inter ailesinin 600-700 weight'i yeterli. İkinci bir font ekleme — Things 3 ve Linear tek aile kullanıyor, Apple Music tek aile [16].

**Tipografi skalası (mobile-first):**

| Seviye | Boyut | Ağırlık | Satır yüksekliği | Kullanım |
|---|---|---|---|---|
| Display | 56-72px | 200 (ultralight) | 1.05 | Timer sayıları (merkez) |
| H1 | 28-34px | 600 | 1.2 | Sayfa başlığı |
| H2 | 20-22px | 600 | 1.3 | Kart başlıkları |
| Body | 16px | 400 | 1.5 | Genel metin |
| Caption | 12px | 400 | 1.4 | Meta bilgi |
| Label | 14px | 500 | 1.0 | Buton, tab ismi |

Apple'ın timer ekranlarındaki sayılar inanılmaz büyük olur (SF Pro Ultralight 96+). Senin için de bu geçerli — **timer rakamları ekranın %30'unu kaplayacak kadar büyük olmalı**, çünkü onlar "içerik"tir, geri kalan her şey kontrol.

---

## 4. Circular vs Digital: Hangisi, Ne Zaman?

2024 Linköping Üniversitesi çalışması (12 üniversite öğrencisi) net bir sonuç verdi: **dijital countdown kesinlik hissi verir ama orta düzey stres yaratır; analog circular zamanı çarpıtır ama daha düşük stres; hiçbiri en kötü (belirsizlik)** [17]. Katılımcılar **hibrit tasarım** istedi: görsel bir daire + sayılar.

Ayrı bir araştırma: **"full ring" circular göstergesi bar progress'ten daha iyi deneyim yaratır** [18].

**Senin kararın:** Sen **kronometre** istiyorsun (count up, Pomodoro değil). Bu durumda:

- **Circular ring doldurma** geri sayım için klasik, ama bizde geri sayım yok.
- **Cronometre için en iyi görsel:** Ortada büyük dijital rakam (HH:MM:SS veya MM:SS.cs), etrafında ince bir **ring** (gri temel, üstüne tek renkli aktif segment) başlangıç noktasından beri geçen süreyi gösterir.
- Apple Watch'un stopwatch'ı bunu yapıyor: dijital sayı + etrafında dönen ince bir kırmızı tik [19].
- **Apple'ın HIG** "içerik birincil" diyor: rakam önde, ring dekoratif.

**Pratik tavsiye:** Circular ring'i sadece **"şu an çalışıyor"** durumunda göster, bekleme/duraklatıldığında ince gri çizgi olsun. Tamamlandığında tam dolu halka + kısa bir **pulse animasyonu** (aşağıya bak).

---

## 5. Micro-Interactions: Zamanlama Tablosu

Apple HIG "**brevity and precision**" diyor — kısa ve isabetli [20]. NN/g verileri 100ms altı "instant" hissettiriyor, 300ms üstü "yavaş" [21].

| Aksiyon | Süre | Eğri | Neden |
|---|---|---|---|
| Buton tap (scale 0.97) | 80-120ms | ease-out | "Tuttum ve bıraktım" hissi |
| Tab geçişi | 150-200ms | ease-in-out | Sık tekrarlanan eylem |
| Timer başlat (ring dolma başlangıcı) | 200ms | ease-out | Onay hissi |
| Sayfa geçişi | 300-400ms | custom (cubic-bezier) | Kapsam değişimi |
| Timer tamamlandı (celebration pulse) | 600-800ms | spring | Nadir, özel an |
| Snackbar/toast | 200ms in / 150ms out | ease-out | Dikkat çekme |

**Somut öneriler:**

- **Başlat/Duraklat butonu:** Tap'ta `scale(0.97)` 100ms ile. Duraklatıldığında ikon rotate geçişi.
- **Ring doldurma:** Stroke-dashoffset animasyonu, `linear` easing (zamanı çarpıtmaması için — circular ring analog hissettirmemeli, dijital netlikte olmalı).
- **Tamamlanma:** Tek bir "bounce + glow" (300ms), sonra kısa bir haptic (Success), sonra ambient sound.
- **Reduced motion:** `prefers-reduced-motion: reduce` algıla, animasyonları 0ms'e indir [22].

**SvelteKit'te implementasyon:** `svelte/transition` (fly, fade) veya `motion` (Framer Motion benzeri Svelte 5 kütüphanesi) [23]. Sayfa geçişleri için View Transitions API (tarayıcı destekli, SvelteKit 1.24+ `onNavigate` ile entegre) [24].

---

## 6. Haptic Feedback: Apple'ın Resmi Pattern'leri

Apple HIG [25] her haptic için "anlam" tanımlıyor. Rastgele titreşim değil, **neden-sonuç ilişkisi** olmalı.

| Olay | Haptic Pattern | Yoğunluk |
|---|---|---|
| Timer başladı | **Start** | Light |
| Timer duraklatıldı | **Stop** | Light |
| Timer bitti (başarı) | **Success** (3 pulse) | Medium |
| Hata / iptal | **Notification Failure** | Medium |
| Long press ile preset değişimi | **Click** | Light |
| Her 5 dakikada sessiz uyarı | **Subtle tap** | Çok hafif |

**Web'de (PWA) durum:** `navigator.vibrate()` var ama Apple Safari'de **desteklenmiyor** (W3C spec'in dışında, sadece Chrome/Android). Bu yüzden:
- **iOS kullanıcıları için haptic olmayacak** (Supabase + web stack gerçeği).
- **Android Chrome'da** `navigator.vibrate([50])` veya `[20, 30, 50]` pattern ile çalışır.
- Alternatif: **Web Vibration API polyfill** veya native bridge (ileride native wrap düşünürsen Capacitor).

**Pratik:** iOS'ta haptic olmayacağını bilerek, **görsel feedback** (parlaklık, ikon değişimi, ring color) haptic'in yerini almalı. Android için vibrate pattern'i hazır tut ama gizle (kullanıcı ayarıyla).

---

## 7. Ses Tasarımı: Alarm + Ambient

Üç katman var:

**A. Tamamlanma alarmı (zorunlu):**
- Apple'ın kendi timer'ı "Radial" adlı sesi kullanır — kısa, net, yumuşak.
- Seçenek: "Tink", "Chime", "Bell", "Submarine" (Apple'ın sunduğu seslerden).
- Be Focused "interaktif" + "yumuşak chime" sunar, "jarring alarm" değil [26].
- **Senin için:** Tek bir varsayılan chime, 2-3 alternatif, hepsi 0.5-1 sn, "alarm" gibi değil "bildirim" gibi.

**B. Ambient ses (opsiyonel, premium):**
- Apple'ın kendi iOS Background Sounds özelliği var: ocean, rain, bright noise, dark noise, balanced noise, pink noise [27].
- Tide, Focast, myNoise, Focus Sounds gibi uygulamalar **20-300+ soundscape** sunuyor [28].
- Brown noise ADHD odağında özellikle etkili (yayınlanmış araştırmalar).
- **Senin için:** Ücretsiz: white noise + rain. Premium: forest, cafe, fireplace, brown noise. Mix imkânı (slider'larla).

**C. Tik-tak (tercihe bağlı):**
- Be Focused kronometre tick sesi sunar, sıklığı ayarlanabilir. Bazı kullanıcılar için hipnotik, bazıları için sinir bozucu. **Toggle ile sun.**

**Ses prensibi:** Kullanıcı her sesi **denemeden** seçebilmeli (preview). 5-10 saniyelik klipler yeterli.

---

## 8. PWA + Bottom Navigation + Thumb Zone

**PWA gerçekleri (SvelteKit):** `manifest.json` + service worker (SvelteKit 1.24+ native) ile installable PWA olur, 10 satır kod [29]. iOS Safari "Add to Home Screen" destekliyor — native hissettiren bir simge, splash screen ve standalone mod ile.

**Bottom navigation (3 sekme: Kronometre / Odalar / Profil):**
- Apple'ın standart tab bar yüksekliği **49-56px** (safe area dahil ~83px iPhone'larda) [30].
- 3 sekme = mükemmel sayı (2-5 arası ideal, 5 üstü sıkışıyor) [31].
- **Thumb zone:** Ekranın alt %40'ı tek elle rahat erişim alanı [32]. Senin tek butonun + tab bar burada olmalı.
- Her tab ikon + label (44x44 minimum touch target, WCAG).
- **Aktif tab:** ikon rengi vurgu rengi + label kalın (semantic), opacity ile değil renkle.

**Görsel referans:** [Dribbble "pomodoro timer"](https://dribbble.com/search/pomodoro-timer) ve [Mobbin iOS Flows](https://mobbin.com/browse/ios/flows) — gerçek uygulamaların nasıl yaptığını görmek için en iyi kaynak.

**Sayfa geçişleri:** Liquid Glass çağında Apple "morphing" geçişler kullanıyor (bir element diğerine dönüşüyor). SvelteKit'te bu **View Transitions API** ile yapılabilir — `onNavigate` hook'u, `document.startViewTransition()` çağrısı, sonra CSS [33]. Veya `svelte/transition` ile `fly`/`fade` (basit ama etkili).

**Reduced motion** için media query (`@media (prefers-reduced-motion: reduce)`) ile animasyonları kapatmayı unutma [34].

---

## 9. Magic Link Authentication UX

Supabase'in varsayılan akışı [35]:
1. Kullanıcı email girer
2. "Send magic link" tıklar
3. "Check your email" ekranı gelir
4. Email'i açar, linke tıklar
5. Siteye geri döner, session kurulur

**Kritik PKCE kısıtı:** Magic link **aynı tarayıcıda** açılmalı. Farklı cihaz/ browser'da açılırsa link geçersiz olur. Bu kullanıcı kafasını karıştırır [36].

**En iyi pratikler:**

| Karar | Öneri |
|---|---|
| Form sadelik | Sadece email input, "Sign in" butonu. "Sign up / Log in" ayrımı yok (passwordless'ta gereksiz) [37]. |
| "Check your email" ekranı | Tam ekran, tek ikon, "Resend in 30s" geri sayım, "Wrong email?" linki [38]. |
| Email tasarımı | Tek CTA butonu, sade metin, "Spam'e düştü mü?" uyarısı, marka logosu [39]. |
| Link süresi | 15 dakika (Supabase varsayılanı 1 saat — bunu kısalt) [40]. |
| Tek kullanımlık | Supabase zaten tek kullanımlık, ama session hijacking riski için HTTPS zorunlu. |
| iOS PWA caveat | iOS'ta mail linki Safari'de açılır. PWA'ya dönmek için kullanıcının manuel dönmesi gerekir. **"Open the app" deep link** Supabase redirect URL ile çözülebilir. |
| Fallback | OTP kodu göster (6 haneli), link çalışmazsa kullanıcı kodu elle girer. Supabase bunu destekler. |

**Onboarding sonrası:** İlk başarılı girişte **"Hoş geldin Enes"** (kişisel selamlama, profilden ad çek) + 1 ekran "Nasıl çalışır" + direkt timer ekranı.

---

## 10. Onboarding Akışı (3-5 Ekran)

Mükemmel onboarding **60 saniye** içinde ilk değer anına ulaştırır [41]. Senin uygulaman için:

1. **Welcome** (5sn): "Kronometren, odaların, odaklan." — tek cümle değer, tek "Devam" butonu.
2. **İlk değer (15sn):** Timer ekranı gösterilir, "Başlat"a bas. **Kullanıcı ilk timer'ı 30 saniyede başlatmış olur.**
3. **Magic Link** (10sn): Email gir → gönder. (Üstteki kurallara göre UX.)
4. **İlk özelleştirme (10sn):** "Adın ne?" (tek input). Sonra direkt uygulama.
5. **İlk başarı (20sn):** "Hoş geldin Enes, 25 dakikan başladı."

**Yapma:** Splash ekranı, 3 swipe'lık carousel, "telefonunu çevir" tarzı boş interaktif öğretici, anlamsız "skip" butonları.

**Referans:** Notion'un "empty canvas as brand" yaklaşımı — kullanıcıyı hemen içeri at, sonra keşfettir [42].

---

## 11. Senin Timer Uygulaman İçin Somut Reçete

**Stack:** SvelteKit + Tailwind + Supabase + Vercel. PWA, mobile-first.

### Renk paleti (Tailwind config'e yapıştır):

```js
// tailwind.config.js
colors: {
  surface: {
    DEFAULT: '#1C1C1E',   // iOS dark gray 1
    card: '#2C2C2E',       // iOS dark gray 2
    elevated: '#3A3A3C',   // iOS dark gray 3
    modal: '#48484A',      // iOS dark gray 4
  },
  text: {
    primary: '#F5F5F5',
    secondary: 'rgba(235,235,235,0.6)',
    tertiary: 'rgba(235,235,235,0.38)',
  },
  accent: {
    primary: '#0A84FF',   // Apple system blue (dark)
    success: '#30D158',   // Apple system green (dark)
    danger: '#FF453A',    // Apple system red (dark)
  }
}
```

### Tipografi:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
```

- **Display** (timer): 80-120px, weight 200 (ultralight), tabular-nums, letter-spacing -0.02em
- **Heading**: 22px, weight 600
- **Body**: 16px, weight 400, line-height 1.5
- **Label**: 14px, weight 500

### Timer ekranı layout:

```
┌────────────────────────────┐
│  [avatar/name]      [☰]    │  ← Üst bar (Liquid Glass)
│                            │
│      ┌──────────────┐     │
│      │  ◯ ring     │     │  ← 280-320px diameter
│      │   12:34.56  │     │     ortada dijital, etraf ring
│      │              │     │     ring stroke 4-6px
│      └──────────────┘     │
│                            │
│      [      ▶      ]       │  ← Tek büyük buton (96px, accent)
│                            │
│      [laps list]           │  ← Küçük liste, monospace
│                            │
├────────────────────────────┤
│  ⏱ Kronometre  👥 Odalar  👤 Profil │
└────────────────────────────┘
```

### Tek buton (Başlat/Duraklat/Sıfırla):

- **Durum 1 (Hazır):** İkon `▶`, label "Başlat", accent renkli.
- **Durum 2 (Çalışıyor):** İkon `⏸`, label "Duraklat", beyaz.
- **Durum 3 (Duraklatıldı):** İki buton: "Devam" + "Sıfırla" (sıfırla destructive, secondary).
- **Durum 4 (Tamamlandı - preset varsa):** Çal butonu otomatik preset kontrolü.

### Bottom nav (3 sekme):

- **Kronometre** (timer ikonu) — birincil, varsayılan sekme
- **Odalar** (people ikonu) — sosyal
- **Profil** (person ikonu) — ayarlar, istatistik

iOS standart 49-56px, ortalanmış ikon + label, aktif olan accent rengi.

### Sayfa geçişi (SvelteKit):

```js
// src/routes/+layout.svelte
import { onNavigate } from '$app/navigation';

onNavigate((navigation) => {
  if (!document.startViewTransition) return;
  return new Promise((resolve) => {
    document.startViewTransition(async () => {
      resolve();
      await navigation.complete;
    });
  });
});
```

Reduced motion için CSS'te `@media (prefers-reduced-motion: reduce)` ile sıfırla [43].

### Haptic (Android):

```js
function tap() {
  if ('vibrate' in navigator) navigator.vibrate(15);
}
function success() {
  if ('vibrate' in navigator) navigator.vibrate([20, 50, 30]);
}
```

iOS'ta çalışmaz — görsel fallback zorunlu.

### Ses (opsiyonel, premium):

- **Ücretsiz:** "Chime" (tamamlanma, tek ses) + beyaz gürültü.
- **Premium:** Yağmur, kahve, brown noise, forest, fireplace. Mix destekli (her ses için slider).

---

## 12. Görsel Referans Listesi (Tıkla İncele)

**Tasarım ilhamı:**
- [Dribbble "pomodoro timer"](https://dribbble.com/search/pomodoro-timer) — 559+ örnek
- [Dribbble "timer app"](https://dribbble.com/search/timer-app)
- [Dribbble "focus timer app"](https://dribbble.com/search/focus-timer-app)
- [Mobbin iOS Flows](https://mobbin.com/browse/ios/flows) — gerçek iOS ekranları
- [Mobbin Pomodoro/Focus](https://mobbin.com/) (arama: "pomodoro", "focus")
- [Behance Pomodoro UI](https://www.behance.net/search/projects/pomodoro%20timer%20ui%20design)

**Referans uygulamalar:**
- [Be Focused — App Store](https://apps.apple.com/us/app/be-focused-deep-focus-timer/id973130201)
- [Sessions — App Store](https://apps.apple.com/us/app/session-pomodoro-focus-timer/id1521432881)
- [Tide — sitesi](https://tide.fm/en_US/) ve [Tide App Store](https://apps.apple.com/gb/app/tide-sleep-focus-meditation/id1077776989)
- [Apple Clock kullanıcı rehberi](https://help.apple.com/pdf/watch/10/en_US/apple-watch-user-guide-watchos10.pdf)
- [furbo.org: watchOS 10 timer eleştirisi](https://furbo.org/2023/09/28/the-timer-in-watchos-10/) (Apple'ın neyi yanlış yaptığını anlamak için altın değerinde)

**Tasarım dili ilhamı:**
- [Linear: UI redesign (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear: design refresh](https://linear.app/now/behind-the-latest-design-refresh)
- [Things 3 design study](https://blakecrosley.com/es/guides/design/things)
- [Notion UX vaka çalışması](https://raw.studio/blog/how-notion-ux-converts-100-million-users/)

**Teknik kaynaklar:**
- [Apple HIG: Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics?changes=_3__2)
- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple: Liquid Glass WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Apple: Background Sounds](https://support.apple.com/en-us/109346)
- [Supabase: Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [SvelteKit View Transitions](https://svelte.dev/blog/view-transitions)
- [SvelteKit PWA guide](https://thecodingchannel.hashnode.dev/turn-your-sveltekit-app-into-a-pwa-in-3-simple-steps)
- [Magic Link UX checklist](https://appmaster.io/blog/passwordless-magic-links-ux-security-checklist)

---

## 13. Sonuç: Üç Altın Kural

1. **Az ama keskin:** Apple'ın kendi Clock timer'ının swipe-to-stop butonu ekranın dibinde minicik, kullanıcılar çıldırıyor [4]. Senin tek Başlat/Duraklat butonun **ekranın orta-altında, en az 80px, parmak hedefi 48dp+**. Tek bir yere bas, o yeterli.

2. **Gri + tek vurgu:** Tasarımın %90'ı grinin tonu (`#1C1C1E`, `#2C2C2E`, `#3A3A3C`). Sadece "şu an çalışıyor" ve "tamamlandı" için tek renk. Apple'ın iOS 26 Liquid Glass dokunuşunu sadece **bottom tab bar** ve **floating CTA**'da dene, timer yüzeyinde değil.

3. **60 saniye kuralı:** Yeni kullanıcı 60 saniye içinde ilk timer'ını başlatabilmeli. Magic link, splash, çok sayıda onboarding ekranı — hepsini atla, doğrudan timer'a düşür. İlk değer = ilk başlatma. Gerisini sonra öğret.

---

**Kelime sayısı:** ~2.100  
**Hazırlayan:** Deep research workflow, Ağustos 2026
