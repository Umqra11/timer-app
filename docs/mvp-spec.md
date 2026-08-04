---
tags: [timer, mvp-spec, product-spec, obsidian-ready]
created: 2026-08-04
updated: 2026-08-04
type: mvp-specification
---

# Timer — MVP Ürün Özeti

> Tüm MVP-öncesi ürün kararlarına göre somut özellik listesi.
> Bu, geliştirmenin başlayacağı spec. Onayınla kod yazımına geçeriz.

> 📚 **Bağlam:** [[../DECISIONS]] · [[../STATUS]] · [[../IDEAS]] · [[research-competitors]]
> ⏭️ **Sonraki:** [[technical-spec|Teknik Spec]]

---

## 🎯 Ürün Özeti (1 cümle)

**"Arkadaşlarınla aynı odaya gir, çalışmaya başla, birbirinizin süresini ve durumunu canlı gör"** — Türkiye'nin ilk telefon-öncelikli, sosyal çalışma uygulaması.

---

## 👤 Hedef Kullanıcı

- Türk öğrenciler (lise, üniversite, sınav hazırlığı)
- Çalışma arkadaşı olan gençler
- Yanında biri olmadan odaklanmakta zorlananlar

---

## 🖼️ MVP Ekranları (5 ekran)

### 1️⃣ Giriş / Kayıt
- Kullanıcı adı (nickname) al
- Magic link veya basit e-posta ile giriş (şifre yok)
- Profil: nickname, avatar (opsiyonel)

### 2️⃣ Ana Sayfa (Odalarım)
- **Açık odalar listesi** (konuya göre filtrelenebilir)
- **Özel odalarım** (arkadaşlarımla)
- **Hızlı oluştur** butonu (yeni özel oda)
- **Arkadaşlarım** listesi (durumları görünür)

### 3️⃣ Oda Ekranı (en kritik ekran)
- **Üstte oda bilgisi:** oda adı, kaç kişi, kaç kişi çalışıyor
- **Orta:** o an odadaki herkesin listesi
  - 👤 Avatar/isim
  - 🟢 Durum simgesi: 🟢 Çalışıyor / ☕ Molada / ✅ Bitirmiş
  - ⏱ Süre (örn. "12:34" — ne kadar süredir bu oturumda)
- **Altta "Çalışmaya Başla" butonu** (büyük, dikkat çekici)
  - Tıklayınca zamanlayıcı başlar
  - Seçenek: Pomodoro (25/5) veya serbest

### 4️⃣ Çalışma Ekranı (aktif olduğunda)
- **Büyük sayaç** (örn. "12:34" — geçen süre)
- **Durum:** "Çalışıyorsun" 
- **Kontrol:** Duraklat / Molaya Geç / Bitir butonları
- **Arka planda:** Odadaki diğerlerinin durumu küçük rozetlerde görünür

### 5️⃣ Profil / İstatistik
- Toplam çalışma süresi (günlük/haftalık/aylık)
- Hangi odalarda ne kadar
- Arkadaş listesi

---

## ⚙️ Temel Özellikler (MVP)

### ✅ Olacak
- Kullanıcı kaydı (e-posta + nickname)
- Oda oluşturma (özel veya açık)
- Açık oda listesi (konuya göre)
- Odaya katılma
- Oda davet kodu (arkadaşla paylaş)
- Zamanlayıcı başlatma (Pomodoro veya serbest)
- Durum paylaşımı (çalışıyor/molada/bitti) — gerçek zamanlı
- Odadaki herkesin süresini görme
- Temel istatistik (günlük toplam)

### ❌ MVP'de OLMAYACAK (sonra)
- Video (kesinlikle yok)
- Chat
- Liderlik tablosu
- Ağaç metaforu / gamifikasyon
- Bildirimler (push notification)
- Tema/kişiselleştirme
- Çoklu kategori / komünite
- Hesap silme / veri yönetimi

---

## 🏠 Oda Tipleri Detayı

### Özel Oda
- Oluşturan kişi oda sahibi
- 6 haneli davet kodu var
- Sadece kodu bilenler girebilir
- Maks 10 kişi (başlangıç)

### Açık Oda
- Sistem veya kullanıcı oluşturur
- Konuya göre etiketli: "TYT Mat", "Kitap Okuma", "Kod Yazma"
- Herkes görebilir ve girebilir
- Maks 30 kişi (başlangıç)

---

## 🟢 Durum Makinesi (3 state)

```
[Boşta] → "Çalışmaya Başla" tıklanır → [Çalışıyor]
[Çalışıyor] → "Mola" tıklanır → [Molada]
[Çalışıyor] → "Bitir" tıklanır → [Boşta]
[Çalışıyor] → süre 25 dk dolunca (Pomodoro) → otomatik [Molada]
[Molada] → 5 dk dolunca → otomatik [Çalışıyor] (veya Boşta, tercihe göre)
```

**Görsel:**
- 🟢 Yeşil: Çalışıyor (süre artıyor)
- ☕ Sarı: Molada
- ⚪ Gri: Boşta / bitirmiş

---

## 📱 Kullanıcı Akışı (İlk Ziyaret)

1. Kullanıcı siteye gelir
2. Kayıt olur (nickname + e-posta)
3. Ana sayfada açık odaları görür
4. Bir odaya girer (örn. "TYT Mat")
5. "Çalışmaya Başla" tıklar
6. Odadaki diğerleri onu "🟢 Çalışıyor 00:01" olarak görür
7. 25 dk çalışır → otomatik mola → 5 dk mola → tekrar çalışma
8. Bitirince "⚪ Bitirdi" olur
9. İstersen başka odaya girer, ister arkadaşına özel oda kodu yollar

---

## 🚫 Yapmayız Listesi (Kararlı)

- ❌ Kullanıcı hesap silme/veri yönetimi (kişisel proje, gerek yok)
- ❌ Şifre (magic link veya OAuth yeter)
- ❌ Admin paneli (gerek yok)
- ❌ Ödeme/stripe (ücretsiz)
- ❌ E-posta bildirimleri (gerek yok)
- ❌ Push notification (MVP'de zor, sonra)
- ❌ Karmaşık istatistik (sadece toplam süre)
- ❌ Çoklu dil (sadece Türkçe)

---

## 📊 Başarı Metrikleri (MVP sonrası değerlendirme)

- Kaç kişi kayıt oldu
- Kaç oda oluşturuldu
- Kaç aktif çalışma seansı
- Ortalama oturum süresi
- Tekrar gelen kullanıcı oranı (retention)

---

## 🗓️ Tahmini Süre

- **MVP:** 2-3 hafta (sprint yapısına göre)
- **İçerik:**
  - Backend: 1 hafta
  - Frontend: 1 hafta
  - Real-time + auth + polish: 0.5-1 hafta

---

**Son güncelleme:** 2026-08-04 (D-001 → D-008 sonrası, MVP scope kilitli)
