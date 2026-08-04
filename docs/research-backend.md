# Timer Projesi — Backend / Realtime / Auth / Veritabanı Araştırması

**Tarih:** 2026  
**Hazırlayan:** Araştırma sub-agent'ı  
**Hedef kitle:** Patron (yazılım bilgisi az, makine mühendisi)

> ⚠️ **GÜNCEL DEĞİL — 2026-08-04 itibarıyla:** Bu rapor Supabase önerisi ile yazıldı. **D-020 kararıyla Firestore'a geçildi.** Karşılaştırma referans olarak tutulur ama alınan karar Firestore.

---

## 📌 Kısa Özet (5 satır)

1. Timer için **Supabase** (PostgreSQL + Auth + Realtime + Storage — hepsi tek pakette) en uygun "her şey bir arada" çözüm.
2. **Auth için Magic Link** (şifresiz giriş — e-posta ile tek tıkla giriş) öneriyorum. Hem modern, hem öğrenciler için pratik.
3. **Real-time** için Supabase Realtime yeterli: 200 kişi aynı anda bağlanabilir, ayda 2 milyon mesaj — 50-500 kullanıcı için fazlasıyla yeter.
4. **Frontend yayını** için Vercel (Next.js için en pratik, ücretsiz tier var). **Backend/Edge fonksiyon** ihtiyacı olursa Supabase zaten kendi içinde çalışıyor.
5. **Toplam maliyet: $0** — hobi ölçekte tamamen ücretsiz. Pro'ya geçiş gerekirse ileride **$25/ay** ile rahatça büyür.

---

## 1) Real-time (Canlı Veri Akışı)

Real-time, "odadaki herkes birbirinin zamanlayıcısını canlı görsün" ihtiyacı için gerekli.

### Seçenek A: **Supabase Realtime** ⭐
- **Ücretsiz:** 200 eşzamanlı bağlantı, ayda 2 milyon mesaj, mesaj başına max 256 KB.
- **Artı:** Kurulumu sıfır (Supabase hesabı açınca hazır). PostgreSQL ile entegre — veri değişince otomatik yayın.
- **Eksi:** Çok büyük ölçekte ($25/ay Pro: 500 bağlantı, 5M mesaj) sınır var.

### Seçenek B: **Pusher / Ably**
- **Pusher Free:** 200 bağlantı + günde 200K mesaj → sonra $49/ay.
- **Ably Free:** 200 bağlantı + ayda 6M mesaj → sonra $29/ay.
- **Artı:** Real-time konusunda uzman, düşük gecikme.
- **Eksi:** Ayrı servis yönetmek gerek (DB + Auth + Realtime → 3 farklı yer).

### ✅ Karar: Supabase Realtime yeterli
500 kullanıcı için 200 eşzamanlı bağlantı fazlasıyla yeter. Odalar aynı anda 5-10 kişilik olacak zaten.

---

## 2) Auth (Kimlik Doğrulama)

Kullanıcıların "kim olduğunu" bilmesi için.

### Seçenek A: **Supabase Auth (Magic Link / OTP)** ⭐
- **Magic Link:** E-posta adresine tek kullanımlık link gönderilir, tıklayınca giriş yapılır. **Şifre yok.**
- **OTP:** E-postaya 6 haneli kod gelir, girilir, giriş yapılır.
- **Ücretsiz:** Aylık 50.000 aktif kullanıcıya kadar.
- **Artı:** Şifre unutma/sıfırlama yok, öğrenciler için hızlı, güvenli.
- **Eksi:** E-posta gelmesi 5-10 sn sürer (spam klasörü uyarısı gerekir).

### Seçenek B: **Clerk**
- Magic link + OAuth + MFA, çok şık UI componentleri.
- **Ücretsiz:** 10.000 MAU. Sonra $25/ay.
- **Artı:** Hazır login/register sayfası componentleri.
- **Eksi:** Ayrı bir servis daha, maliyet katıyor.

### Seçenek C: E-posta + şifre (klasik)
- **Artı:** Kullanıcılar aşina.
- **Eksi:** Şifre sıfırlama, güvenlik, hash, salt... Patron'un uğraşmak istemeyeceği şeyler.

### ✅ Karar: Supabase Auth + Magic Link
Şifresiz giriş modern standart. Slack, Notion, Linear hep böyle yapıyor. Öğrenciler için de en pratik yol.

---

## 3) Veritabanı

Kullanıcı bilgisi, odalar, çalışma kayıtları burada duracak.

### Seçenek A: **Supabase (PostgreSQL)** ⭐
- **Ücretsiz:** 500 MB veritabanı, 1 GB dosya depolama, 2 GB trafik.
- **Artı:** SQL (standart, taşınabilir), hazır admin paneli, otomatik API.
- **Eski:** 500 MB küçük duruyor ama 50.000 kullanıcının sadece temel verisi = 5-20 MB.

### Seçenek B: **Firebase Firestore (NoSQL)**
- **Ücretsiz:** 50.000 okuma + 20.000 yazma/gün.
- **Artı:** Mobilde çok hızlı, offline çalışır.
- **Eksi:** NoSQL — ilişkisel sorgular zor. Fiyatlandırma "kullan-bil" → büyüyünce sürpriz fatura.

### Seçenek C: Kendi sunucuda **SQLite**
- **Artı:** Bedava.
- **Eski:** Kurulum, yedekleme, ölçekleme patronun işi olur. **Önermiyorum.**

### ✅ Karar: Supabase PostgreSQL
Sektör standardı, taşınabilir, ücretsiz tier cömert. SQL biliyorsan (ya da AI biliyorsa) çok rahat.

---

## 4) Deployment (Yayınlama)

Kodun internette çalışması için.

### Seçenek A: **Vercel (frontend/Next.js için)** ⭐
- **Ücretsiz (Hobby):** Ayda 100 GB trafik, 1 milyon fonksiyon çağrısı, sınırsız proje.
- **Kısıt:** **Ticari kullanıma kapalı.** Sponsor/reklam geliri olursa Pro'ya ($20/ay) geçmek gerek.
- **Artı:** GitHub'a push → otomatik deploy. Next.js'in anavatanı, sıfır konfigürasyon.

### Seçenek B: **Railway** (backend + DB için)
- 2023'ten beri ücretsiz tier yok, $5/ay'den başlıyor.
- **Artı:** Kolay, veritabanı birlikte.
- **Eski:** Tamamen ücretsiz değil.

### Seçenek C: **Render**
- **Ücretsiz** ama **15 dk boşta kalınca uykuya geçer** (cold start 30-60 sn). Real-time için kötü.

### Seçenek D: **Fly.io**
- Ücretsiz tier 2024'te kaldırıldı. Artık ~$5/ay.

### ✅ Karar: Vercel (frontend) + Supabase (backend)
Vercel Hobby şu an yeterli. Timer kişisel/arkadaş grubu projesi olduğu için "ticari" sınırı şimdilik sorun değil. İleride gelir gelirse Pro'ya geçilir.

---

## 5) "Hepsi Bir Arada" Karşılaştırma

| Özellik | **Supabase** ⭐ | Firebase | Appwrite |
|---|---|---|---|
| Veritabanı | PostgreSQL (SQL) | Firestore (NoSQL) | MariaDB / Document |
| Auth | Magic Link + OAuth + Email | OAuth + Email + Phone | OAuth + Email + MFA |
| Realtime | ✅ Dahil (200 bağlantı) | ✅ Dahil (100 bağlantı) | ✅ Dahil |
| Dosya depolama | 1 GB ücretsiz | 5 GB ücretsiz | Sınırlı |
| Ücretsiz tier | 500 MB DB + 50K MAU | 50K okuma/gün | Sınırlı |
| Taşınabilir mi? | ✅ PostgreSQL her yerde çalışır | ❌ Firestore kilitli | ✅ Açık kaynak |
| Latency Türkiye | Frankfurt ≈ 50ms ✅ | İyi (Google CDN) | Değişken |
| Öğrenme eğrisi | Orta (SQL) | Orta (NoSQL kuralları) | Orta |
| Maliyet büyüyünce | **$25/ay** sabit | Kullan-bil, sürpriz olabilir | Self-host: $0 |

---

## 🎯 TEK ÖNERİ: **Supabase + Vercel + Magic Link**

### Neden Supabase?

1. **Tek pakette her şey:** Veritabanı + Auth + Realtime + Storage + Admin paneli → ayrı servis yönetmeye gerek yok. Patron'un öğrenmesi gereken tek bir dashboard.
2. **Şifresiz giriş (Magic Link):** Kullanıcı sadece e-posta girer, gelen linke tıklar, içeri girer. Şifre unutma/çalma derdi yok. Öğrenciler için alışık oldukları modern yöntem.
3. **PostgreSQL:** Endüstri standardı SQL veritabanı. İstediğin zaman başka yere taşırsın (Vercel + Neon, Railway, hatta kendi sunucun). Firebase'e geçmek çok daha zor.
4. **Frankfurt bölgesi var:** Türkiye'ye coğrafi yakınlık → gecikme 50ms civarı (fark edilmez).
5. **Ücretsiz tier cömert:** 50.000 aylık kullanıcı + 500 MB veritabanı + 2M realtime mesaj. 50-500 kullanıcı için **yıllarca** yeter.
6. **Açık kaynak:** İleride kendi sunucuna da kurabilirsin, kimseye bağımlı değilsin.
7. **Dokümantasyonu harika + Türkçe topluluk:** AI yazarken de en rahat öğretilen platform.

### Maliyet Tahmini (Timer ölçeğinde)

| Senaryo | Aylık Maliyet |
|---|---|
| 0-500 kullanıcı, hobi kullanım | **$0** (Supabase Free + Vercel Hobby) |
| 500-5.000 kullanıcı, küçük gelir | **$25** (Supabase Pro) + $20 (Vercel Pro) = ~$45 |
| 5.000+ kullanıcı, ciddi gelir | Ölçeklenebilir, tahmin $100-200/ay |

> 💡 **Patron için özet:** İlk yıl için $0. Pro'ya geçince ayda bir öğle yemeği parası ($25). Firebase'e göre 3-5 kat ucuz.

### Neden Vercel?

- Next.js (modern React framework) için **birinci sınıf** destek.
- GitHub'a push → otomatik deploy, 30 saniyede canlıda.
- Hobby plan kişisel projeler için yeterli. Süre sınırı yok.

### Patron için "Aksiyon Planı"

1. **Supabase** hesabı aç → yeni proje → Frankfurt bölgesi seç.
2. **Auth** kısmından Magic Link'i aç.
3. Veritabanında tabloları oluştur (`users`, `rooms`, `study_sessions`).
4. **Vercel**'e GitHub repo bağla → deploy.
5. Kullanıcı e-posta ile giriş yapar, oda oluşturur, zamanlayıcı başlatır → herkes canlı görür.

---

## ⚠️ Riskler ve Dikkat Edilecekler

| Risk | Çözüm |
|---|---|
| Supabase Free **1 hafta hareketsizlikte duraklıyor** | 7 günde bir otomatik ping at (Vercel cron job) veya Pro'ya geç ($25/ay). |
| Magic link **spam'e düşebilir** | Kullanıcıya "spam klasörünü kontrol et" mesajı göster. |
| Free tier'da **2 proje sınırı** var | Sadece 1 tane aç, yedekleme yap. |
| Vercel Hobby **ticari değil** | Reklama/satışa başlarsan Pro'ya ($20/ay) geç. |
| Veritabanı 500 MB sınırı | Eski çalışma kayıtlarını arşivle/sil. Çok rahat 50K kullanıcı sığar. |

---

## 🔗 Kaynaklar (2025-2026)

1. **Supabase Pricing & Free Tier (2026)** — `supabase.com/pricing`  
   *Doğrulandı: Free tier 500 MB DB, 50K MAU, 200 realtime bağlantı, 2M mesaj/ay.*

2. **Supabase Realtime Quotas** — `supabase.com/docs/guides/realtime/limits`  
   *Eşzamanlı bağlantı limitleri, mesaj boyutu, presence kuralları.*

3. **Supabase vs Firebase 2026 Karşılaştırması** — `justinmckelvey.com/blog/supabase-vs-firebase`  
   *10K DAU ölçeğinde Supabase $50-100/ay, Firebase $500-1500/ay (3-5x fark).*

4. **Realtime Pricing Karşılaştırması (Pusher / Ably / Supabase)** — `buildmvpfast.com/api-costs/realtime`  
   *Ably 6M mesaj/ay ücretsiz, Pusher $49/ay'den başlıyor.*

5. **Supabase Auth — Magic Link Dokümantasyonu** — `supabase.com/docs/guides/auth/auth-email-passwordless`  
   *Magic link + OTP yöntemleri, ücretsiz tier'da tam destek.*

6. **Supabase Global Latency Testi** — `latencyradar.com/latency/supabase/`  
   *Frankfurt, Singapur, SF, Montreal hepsi 50ms altında. Türkiye için Frankfurt ideal.*

7. **Railway vs Render vs Fly.io 2026** — `expresstech.io/render-vs-railway-vs-fly-io-2026-pricing-showdown/`  
   *Railway ücretsiz tier'ı 2023'te, Fly.io 2024'te kaldırdı. Render'da cold start var.*

8. **Vercel Hobby Plan Limitleri (2026)** — `vercel.com/docs/plans/hobby`  
   *100 GB trafik, 1M fonksiyon çağrısı, ticari kullanım yasak.*

---

## Sonuç

**Supabase + Vercel + Magic Link** kombinasyonu, Timer için:

- ✅ Patron'un yönetebileceği **tek bir dashboard** (Supabase).
- ✅ **$0 başlangıç** maliyeti.
- ✅ Türkiye'ye **düşük gecikme** (Frankfurt).
- ✅ **Şifresiz** modern giriş.
- ✅ Büyüyünce **$25/ay**'e sorunsuz geçiş.
- ✅ Taşınabilir (PostgreSQL her yerde çalışır).
- ✅ Açık kaynak, kimseye bağımlılık yok.

Firebase/Appwrite de olur ama Supabase hem daha ucuz, hem SQL taşınabilirliği, hem de realtime + auth + DB'nin birleşik sadeliği ile bu ölçek için en mantıklı seçim.

**Patron olarak onaylarsan, Supabase + Vercel kurulumuna geçiyoruz.** 🚀
