---
tags: [timer, ideas, brainstorming, obsidian-ready]
created: 2026-08-04
updated: 2026-08-04
type: ideas
---

# Timer — Fikirler

> Beyin fırtınası notları, açık uçlu düşünceler, özellik önerileri.
> Yeni fikir aklına gelirse buraya ekle — düzenleme yok, akış var.

> 📚 **Detay:** [[docs/concept]] · [[DECISIONS]] · [[STATUS]]

---

## 💡 Çekirdek Fikir (2026-08-04, Patron)

**Sosyal çalışma takip uygulaması:**
- Mobil (iOS + Android)
- Arkadaşlarla aynı "odada" çalışma
- Birbirinin süresini ve durumunu canlı görme
- Hesap verebilirlik → motivasyon

Detay: [[docs/concept]] · [[docs/research-competitors|Rakip analizi]] · [[DECISIONS#D-001|D-001]]

---

## 🌟 Özellik Fikirleri

### Temel (MVP için aday) ⭐
- Oda oluşturma (genel / özel)
- Arkadaş davet etme (kod ile)
- Zamanlayıcı başlatma (25 dk çalışma + 5 dk mola)
- Durum paylaşımı (çalışıyor / molada / bitirmiş)
- Süre istatistikleri (günlük / haftalık)

### İleri seviye 🚀
- Başarı rozetleri / streak (ardışık gün sayısı)
- Liderlik tablosu (odalarda)
- Sohbet / chat (odada kısa mesaj)
- Ses (odada müzik paylaşımı?)
- Kamera (çalışırken kamera açık — gerçek hesap verebilirlik 😄)

### Çılgın fikirler 🌀
- Çalışırken telefon ters çevrilirse otomatik uyku
- "Çalışma arkadaşı eşleştirme" — rastgele biriyle eşleş (Focusmate gibi)
- Hava durumu → odanın teması (yağmurluysa sessiz oda, güneşliyse hareketli)
- Yapay zeka koç — "15 dakikadır duraksın, devam et" der
- Çalışma sonunda "ne öğrendin?" sorusu, kısa cevap kaydı (günlük defter gibi)
- Gerçek hayat metaforu: oda = kütüphane, çalışan = masa, biten = raflara kitap yerleştirme

---

## 🧠 Düşünce Deneyleri

**Açık odalar** seçersek:
- ✅ "Bu odada 50 kişi benimle birlikte çalışıyor" hissi
- ❌ Mahremiyet düşük, troll/rahatsız etme riski

**Gerçek zamanlı** seçersek:
- ✅ Anlık hesap verebilirlik güçlü
- ❌ Pil çok yer, internet sürekli açık

**Sadece ders** seçersek:
- ✅ Hedef kitlesi net: öğrenciler
- ❌ Esneklik az, sınırlandırılmış hissi

**Önce iOS** seçersek:
- ✅ Türkiye'de gelir seviyesi yüksek kullanıcılar
- ❌ Türkiye'de Android daha yaygın

**İkisi birden (cross-platform)** seçersek:
- ✅ Daha geniş kullanıcı tabanı
- ❌ Geliştirme karmaşıklığı (ama Flutter/RN ile çözülür)

---

## ❓ Açık Sorular (Patron cevaplayacak)

### Ürün soruları
1. Odalar nasıl olacak? Açık / Özel / İkisi
2. Gerçek zamanlı mı, geçmişe dönük mü?
3. Çalışma = sadece ders mi, başka şeyler de olabilir mi?
4. Hangi platforma öncelik? iOS / Android / İkisi

### Teknik sorular
5. Teknoloji: native mi (Swift/Kotlin), cross-platform mu (Flutter/React Native)?
6. Backend: hazır servis (Firebase/Supabase) mı, kendi sunucumuz mu?
7. Gelir modeli: ücretsiz mi, freemium mi, reklam mı?

---

**Son güncelleme:** 2026-08-04
