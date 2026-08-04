---
tags: [timer, design, ui, design-system, obsidian-ready]
created: 2026-08-04
updated: 2026-08-04 (Patron'un referans ekran görüntüsüne göre düzeltildi)
type: design-spec
---

# Timer — Tasarım Sistemi

> Anasayfa timer'ı için görsel tasarım. **Dark Mode, modern, sade — Patron'un referans ekran görüntüsüne göre.**

> 📚 **Bağlam:** [[../DECISIONS]] · [[mvp-spec]] · [[research-competitors]]
> 🖼️ **Referans:** Patron'un gönderdiği ekran görüntüsü (claude-ss-three.vercel.app, mevcut prototip)

---

## 🎨 Genel Kararlar (Güncellendi)

| Karar | Seçim | Neden |
|-------|-------|-------|
| Stil | 🌙 Dark Mode (pure black) | Patron referansı |
| Zamanlayıcı tipi | ⏱ Serbest kronometre (Pomodoro YOK) | Patron açıkça istemedi |
| Buton | Tek buton (Başlat/Duraklat) | Patron referansı, daha sade |
| Tipografi | Inter | Temiz, modern, okunaklı |
| His | Minimal, profesyonel | Apple + Linear tarzı |

---

## 🌈 Renk Paleti (Referanstan)

| Kullanım | Renk | Hex (tahmin) | Not |
|----------|------|--------------|-----|
| Ana arka plan | **Pure black** | `#000000` | Patron referansı, lacivert değil! |
| Üst yazı (selamlama) | Açık gri | `#E5E5E5` | "Merhaba, Enes" |
| Sayaç | Açık gri (ince) | `#E5E5E5` | 00:00:00, thin font |
| "Hazır" durumu | Gri | `#9CA3AF` | İkincil metin |
| **🟢 Ana buton (Başlat)** | **Turkuaz/Teal** | `#10B981` (tahmin) | Pill şeklinde, dolu |
| Buton yazısı | Beyaz | `#FFFFFF` | Bold |
| İstatistik kartı | Border + şeffaf | border: `#374151` | Koyu kenar, içi şeffaf |
| İstatistik metin | Gri + Beyaz | `#9CA3AF` + `#F3F4F6` | "Bugün: 0dk · Bu hafta: 0dk" |
| Reset notu | Soluk gri | `#6B7280` | "Salı 00:00'da sıfırlanır" |
| Alt nav aktif | Turkuaz/Teal | `#10B981` | "Kronometre" |
| Alt nav pasif | Gri | `#9CA3AF` | "Odalar", "Profil" |

---

## 🔤 Tipografi (Referanstan)

| Eleman | Font | Boyut | Ağırlık | Not |
|--------|------|-------|---------|-----|
| Selamlama | Inter / SF Pro | 16-18px | 600 | "Merhaba, Enes." |
| Sayaç | Inter | 88-96px | **200 (extra light)** | "00:00:00", tabular-nums |
| Durum ("Hazır") | Inter | 16px | 400 | Sayaç altında |
| Ana buton | Inter | 18-20px | 600 bold | "Başlat", "Duraklat" |
| İstatistik kartı | Inter | 14px | 400 | "Bugün: 0dk" (gri) |
| Reset notu | Inter | 12-13px | 400 | "Salı 00:00'da sıfırlanır" |
| Alt nav | Inter | 11-12px | 500 | "Kronometre" / "Odalar" / "Profil" |

---

## 🎯 Buton Sistemi (Tek Buton, Akıllı + Swipe Reset)

**Ekranda her an TEK buton** (Patron referansı):

| Durum | Buton | Renk |
|-------|-------|------|
| **Hazır** (00:00:00, durmuş) | **Başlat** | Turkuaz/Teal |
| **Çalışıyor** (sayaç artıyor) | **Duraklat** | Turkuaz/Teal (veya kehribar?) |
| **Duraklatıldı** (süre > 0, durmuş) | **Devam Et** | Turkuaz/Teal |
| **Sıfırla** | 👉 **SWIPE** (kaydırma) | Gizli yöntem |

**Buton şekli:** Yatay **pill** (köşeler yuvarlatılmış), içi dolu, gölge yok.
**Boyut:** Genişlik ~80% (mobil), yükseklik 56-64px, hizalama ortada.

### Sıfırlama: Swipe (Patron kararı)

Sayaç alanını **sağa veya sola kaydırınca** sıfırlanır (sadece duraklatıldığında veya hazır'da).

**Animasyon:**
- Kullanıcı kaydırmaya başlayınca sayaç hafif yana kaysın (parmağı takip etsin)
- Belirli bir eşiği geçince (örn. ekran genişliğinin %30'u) **"Bırak sıfırlansın"** tooltip'i çıksın
- Bırakınca sayaç 00:00:00'a dönüş animasyonu (fade)
- Çalışırken swipe çalışmaz (kazara sıfırlanmasın diye)

**Görsel ipucu:**
- İlk açılışta küçük bir **"← Sıfırla"** yazısı sayaç altında görünebilir (3 saniye sonra kaybolur)
- Veya ayar sayfasında "Sıfırlamak için kaydırın" notu

**Alternatif eylemler swipe ile:**
- Yukarı swipe: bugünün özetine git
- Aşağı swipe: ayarlar

---

## 📐 Layout (Referans Görüntüden)

```
┌──────────────────────────────┐
│         Merhaba, Enes.        │  ← selamlama (üstte, ortada)
│                              │
│                              │
│                              │
│       00 : 00 : 00           │  ← sayaç (büyük, ortada, ince)
│                              │
│          Hazır               │  ← durum (sayaç altında, küçük)
│                              │
│                              │
│                              │
│   ┌─────────────────────┐    │
│   │      Başlat         │    │  ← TEK buton (pill, ortada)
│   └─────────────────────┘    │
│                              │
│   ┌─────────────────────┐    │
│   │ Bugün: 0dk · Bu hafta: 0dk │  ← istatistik kartı
│   └─────────────────────┘    │
│   Salı 00:00'da sıfırlanır  │  ← reset notu
│                              │
├──────────────────────────────┤
│   ⏱          👥         👤   │  ← alt nav
│ Kronometre  Odalar  Profil   │     (Kronometre aktif, teal)
└──────────────────────────────┘
```

**3 sekmeli alt navigasyon:**
- **Kronometre** (timer sayfası, varsayılan) — aktif
- **Odalar** (sosyal — ileride)
- **Profil** (kullanıcı ayarları, istatistikler)

---

## 🔄 Durum Makinesi (Basit + Swipe)

```
[Hazır: 00:00:00] → "Başlat" tıklanır → [Çalışıyor: 00:00:01, 00:00:02, ...]
[Çalışıyor] → "Duraklat" tıklanır → [Durakmatıldı: süre sabit]
[Çalışıyor] → swipe → (engellendi, kazara sıfırlanmasın)
[Durakmatıldı] → "Devam Et" tıklanır → [Çalışıyor: süre artmaya devam]
[Durakmatıldı] → swipe → [Hazır: 00:00:00] (sıfırla)
[Hazır] → swipe → (etki yok, zaten 00:00:00)
```

**Görsel geri bildirim:**
- **Çalışıyorken:** sayaç hafif pulse animasyonu (?)
- **Duraklatıldığında:** buton rengi değişebilir (?)
- **Hazır'da:** minimal, sade

---

## 🌀 Animasyonlar (Opsiyonel)

- **Sayaç değişimi:** çok hafif, dikkat dağıtmayan
- **Buton hover:** hafif scale veya glow
- **Sayfa geçişi:** fade (alt nav sekmeleri arası)
- **Çalışıyorken pulse:** hafif, opsiyonel

---

## ❓ Patron'a Sorulacaklar (Kalan)

1. **Sayaç rengi** çalışıyorken değişsin mi? (örn. hafif yeşil)
2. **Pulse animasyonu** istiyor mu? (Bazıları sevmez, dikkat dağıtır)
3. **Selamlama** her sayfada görünsün mü, sadece Kronometre'de mi?
4. **Mevcut prototip** (`claude-ss-three.vercel.app`) — üzerine iterasyon mu, sıfırdan mı?

---

## 📚 Notlar

- **Mevcut prototip:** `claude-ss-three.vercel.app` (Vercel'de canlı, referans olarak kullanılacak)
- **Pomodoro YOK** — sadece serbest kronometre
- **3 sekmeli nav** — Kronometre (şimdi), Odalar (sosyal, MVP sonrası), Profil (şimdi yapılabilir)
- **Kullanıcı adı:** Enes (selamlamada kullanılabilir)
- **Haftalık reset:** Salı 00:00 (Türkiye'de hafta sonu tatil Cuma-Cumartesi, yeni hafta Pazartesi ama Salı mı ilginç — Patron'a sorulabilir)

---

---

## 🏠 Odalar Sayfası (D-013, Hero Stil)

> **Karar:** ⭐ Hero stil — büyük öne çıkan oda + altta liste
> **Mockup:** `docs/mockups/odalar-hero.jpg`

### Layout (D-013)

```
┌──────────────────────────────┐
│   Odalar              🔍      │  ← üst bar
│                              │
│  ┌─────────────────────┐    │  ← HERO oda (öne çıkan)
│  │ 📐 TYT Matematik    │    │
│  │    Çalışma          │    │
│  │  👤👤👤👤 +4        │    │
│  │  🟢 6 kişi çalışıyor │    │
│  │  [   Katıl   ]      │    │
│  └─────────────────────┘    │
│                              │
│  Aktif Odalar      Tümü →   │
│                              │
│  ┌─ Kitap Kulübü ─────┐     │  ← küçük liste kartları
│  │ 👤👤 +2  🟢 2 çalışıyor │     │
│  └─────────────────────┘     │
│  ┌─ Kod Yazarları ────┐     │
│  │ 👤 +1  ☕ molada      │     │
│  └─────────────────────┘     │
│  ┌─ ... ──────────────┐     │
│                              │
├──────────────────────────────┤
│  ⏱       👥        👤        │  ← alt nav (Odalar aktif, teal)
└──────────────────────────────┘
```

### Hero Oda Bileşenleri
- **Üstte:** emoji/icon (konuya göre)
- **Başlık:** büyük, bold, beyaz
- **Avatar grubu:** 4-5 circular avatar, üstüste binen, +X ile fazlası
- **Durum:** 🟢 "X kişi çalışıyor" / ☕ "X kişi molada" / ⚪ "X kişi boşta"
- **CTA butonu:** büyük, pill, teal, **"Katıl"** yazılı

### Liste Kartları (alt)
- Kompakt: avatar grubu + isim + durum (tek satır)
- Dokunulunca o odaya gir
- 4-5 kart görünür, scroll edilebilir

### Hero Oda Seçimi (D-014)
- **Mantık:** 👋 Kullanıcının **son katıldığı oda** (last joined)
- **Gerekçe:** Kişisel, "hızlı devam" hissi
- **Fallback:** Hiç odaya katılmamışsa → "Henüz oda yok, ilk odayı sen kur" CTA göster

### Üst Bar
- **"Odalar"** başlığı (sol)
- 🔍 arama ikonu (sağ) — sonra eklenir, MVP'de olmayabilir

### Tüm Odalar
- Liste kartları "Tümü →" linki
- Tıklanınca ayrı sayfa (tüm odaların listesi, filtreler, arama)

### Filtreler / Sekmeler (ileride)
- Açık / Özel / Arkadaşlarım (3 sekme)
- Konuya göre: Ders / Kitap / Proje / Spor (filter chips)
- MVP'de sadece "Açık odalar" gösterilebilir

---

## 👤 Profil Sayfası (henüz tasarlanmadı)

Daha sonra detaylandırılacak. Şimdilik kabaca:
- Üst: avatar + isim + e-posta
- İstatistik kartı (toplam süre, haftalık, aylık)
- Ayarlar listesi (bildirim, tema, hesap)
- Çıkış butonu

---

**Son güncelleme:** 2026-08-04 (Patron kararı — pure black, tek buton, alt nav, kronometre, **swipe sıfırlama**, selamlama, istatistik kartı, **Odalar hero stil**)
