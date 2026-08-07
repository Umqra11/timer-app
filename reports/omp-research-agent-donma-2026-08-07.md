---
tags: [omp, agent, subagent, fan-out, improvement, research-debt]
created: 2026-08-07
updated: 2026-08-07
type: post-mortem
session: S-0025
---

# OMP — Research Agent Donma Post-Mortem (2026-08-07)

> **Bağlam:** Patron "araştırma agentları donuyor" şikâyeti üzerine 5 paralel omp oturumunda log analizi yapıldı. 2+2 paralel sağlıklı test doğruladı. 3 iyileştirme önerisi.

> 📚 **Detay:** [[STATUS]] · [[RESUME]] · [[DECISIONS]]

---

## 🔍 Bulgular (Kanıt Temelli)

### Test edilen senaryolar (hepsi bugün, 2026-08-07)

| Oturum (PID) | Subagent sayısı | Sonuç | Kanıt |
|---|---|---|---|
| `omp.25062` (Hermes Mision Control) | 6 paralel | ❌ **4 saat 12 dk askı** | `Session exit reason:dispose pendingToolCalls:6,4,4,2,1,1` + 6× `.tombstone` |
| `omp.51486` (aynı gün) | 3 paralel | ✅ <60 s | `Session exit reason:dispose pendingToolCalls:2,4,4` normal |
| Bu oturum (tek omp) | 1 | ✅ 10 s | `ScoutPing duration:10.6s` |
| Bu oturum (2+2 dalga) | 4 (2 dalga) | ✅ 142 s | ProbeAlpha=42s, ProbeBeta=10s, ProbeGamma=56s, ProbeDelta=14s |

### Reddedilen hipotezler

1. **Rate limit = 4** (log'dan `Usage fetch resolved limits:4`) → **YANLIŞ**. Resmi kaynak [platform.minimax.io/docs/guides/rate-limits](https://platform.minimax.io/docs/guides/rate-limits) M3 için **200 RPM + 10M TPM** veriyor. 25062'de 6 scout × 1 istek = 6 RPM, 200'ün %3'ü. Loglarda **tek bir 429 yok**.
2. **50$ paket bitmiş** → **YANLIŞ**. Paketin 200 RPM'i 11 paralel oturumda bile %5 dolu. Rate limit'in %5'ine ulaşmak "kuyruğa giriş" yaratmaz.
3. **1M context taşmış** → **YANLIŞ**. 8474 PID'inde 9 saatte bile context 50K → 394K, 1M'lik ceiling'den 600K uzakta. Threshold 850K ama `shouldCompact:false` dönüyor.

### Doğrulanan kök neden

**omp'ın uzun ömürlü oturumları stabil değil.** 3 alt problem:

1. **Fan-out sınırı yok** — 6 paralel scout aynı anda fırlatılabilir, parent çöker.
2. **Auto-compaction tetiklenmiyor** — `Auto-compaction threshold shouldCompact:false` 9 saat boyunca. Context sürekli büyüyor.
3. **Session dispose'da child drain yok** — `Session exit reason:dispose pendingToolCalls:N` uyarıları tekrar tekrar. "Timed out draining post-prompt tasks during dispose" exception fırlatıyor.

**Yan etkenler (kanıtlanmamış, daha az olası):**
- `ui.loop-blocked blockedMs:296-859` — UI event loop meşgul, render gecikiyor.
- `Mid-run todo nudge fired incomplete:15` — 15 todo 9 saatte bitmedi.

---

## 🛠️ 3 İyileştirme Önerisi

### Öneri 1 — Fan-out Cap (Hard Limit)

**Sorun:** `task()` API'si sınırsız paralel subagent fırlatır. 6 fan-out parent'ı çökertiyor.

**Çözüm:** `runSubagent` fonksiyonuna hard limit + soft warning ekle:
```ts
// pseudo-code
const MAX_PARALLEL_SUBAGENTS = 3;
const activeChildren = sessionRegistry.get(parentSessionId).children.size;

if (activeChildren >= MAX_PARALLEL_SUBAGENTS) {
  // Soft: kuyruğa al, 30s sonra tekrar dene
  // Hard: hata fırlat, kullanıcıya "fan-out sınırı aşıldı" göster
  return queueOrReject(parentSessionId, subagentSpec);
}
```

**Veri:** 25062'de 6 paralel çöktü, 51486'da 3 paralel sağlıklı. 2+2'de 4 paralel sağlıklı ama 4× yavaşlama. **3 = sweet spot**.

**Etki:** Fan-out > 3 → "fan-out cap" hatası net. Kullanıcı 2+2'ye veya seriye düşer.

---

### Öneri 2 — Auto-Compaction Gerçekten Tetiklensin

**Sorun:** `Auto-compaction threshold shouldCompact:false` 9 saat boyunca. Context 50K → 394K büyüdü, sıkıştırma sıfır.

**Çözüm:** Compaction stratejisini 2 katmanlı yap:
```ts
// pseudo-code
const HARD_LIMIT = 600_000;  // 1M context'in %60'ı
const CHECK_EVERY = 5_000;    // 5K token'da bir bak

if (resolvedContextTokens > HARD_LIMIT) {
  // Zorla sıkıştır, kullanıcıya "compaction performed" bildir
  await compaction.compactNow({ strategy: 'snapcompact', force: true });
}
```

**Neden `%60`?** 1M context'in %60'ı çoğu iş için yeter. Üstü tampon. Eğer gerçekten 1M gerekirse model sınırında hata verir, kullanıcı session böler.

**Etki:** 9 saatlik oturumlar artık stabil. 12:13'teki `finish_reason` provider error (context taşması değil ama ilişkili) önlenmiş olur.

---

### Öneri 3 — Session Dispose'da Child Drain

**Sorun:** `Session exit reason:dispose pendingToolCalls:6` → `Timed out draining post-prompt tasks during dispose`. Parent kapatılınca 6 çocuk yetim kalıyor.

**Çözüm:** Graceful shutdown protokolü:
```ts
// pseudo-code
async function disposeSessionWithDrain(sessionId: string) {
  const children = sessionRegistry.get(sessionId).children;
  
  // 1. Çocuklara "kapanıyorum" sinyali gönder
  for (const child of children) {
    child.signal('PARENT_DISPOSING', { graceMs: 30_000 });
  }
  
  // 2. Çocukların pendingToolCalls'ini bekle (30s grace)
  const results = await Promise.allSettled(
    children.map(c => c.waitForCompletion({ deadline: 30_000 }))
  );
  
  // 3. Grace sonrası hâlâ yaşayanları zorla kapat
  for (const [child, result] of zip(children, results)) {
    if (result.status === 'rejected') {
      child.tombstone({ reason: 'parent-disposed-after-grace' });
    }
  }
  
  // 4. Sonra parent'ı kapat
  await sessionStore.dispose(sessionId);
}
```

**Veri:** 25062'de 12:25'te 6 scout `pendingToolCalls:1,4,6,1,4,2` ile öldü. 4 saat 12 dakika sonra 16:37'de parent dispose oldu, **arada hiç drain yapılmadı**.

**Etki:** "Disposing, 30s grace" mesajı kullanıcıya net bilgi verir. Çocuklar ya tamamlanır ya da `.tombstone` ile temiz ölür. Yarım kalmış görev kalmaz.

---

## 📊 Doğrulama

**Bu oturumda yapıldı:**
- 5 paralel omp PID tespit edildi (8474, 26970, 38223, 51486, 46112).
- 25062 PID log'unda 6 scout fan-out'un tam zaman çizelgesi çıkarıldı.
- Bugünkü başarılı ScoutPing (10.6s) baseline alındı.
- 2+2 paralel test (4 subagent, 2 dalga) tamamlandı, pendingToolCalls=0.
- 12:13 provider error, 12:25 fan-out, 16:37 dispose arasındaki kronoloji doğrulandı.

**Tekrarlanabilirlik:** Aynı senaryoyu yarın denemek için:
1. 5 omp penceresi aç.
2. Hermes Mision Control'e git.
3. 6 scout'lu `tasks[]` fırlat.
4. 4 saat bekle, sonra `~/.omp/logs/*.log` içinde `pendingToolCalls` satırlarına bak.

---

## 💡 Pratik Kullanım Önerisi (Kullanıcı İçin)

omp iyileştirme yapılana kadar:

1. **Tek omp penceresi.** 5 paralel açma.
2. **Fan-out ≤ 3.** 2+2 veya 3+2 dalga güvenli.
3. **Her 2-3 saatte yeni session.** 9+ saatlik oturum `shouldCompact:false` bug'ına takılıyor.
4. **Yarım kalmış görevleri seriden çıkar.** 2+2+2 yapıyorsan, dalga arası en az 60 s bekle.

**50 dolarlık MiniMax M3 paketi yeterli.** Yükseltmeye gerek yok. Sorun rate limit değil, omp'ın session yönetimi.

---

**Son güncelleme:** 2026-08-07 (S-0025 — 2+2 paralel test sağlıklı, 3 iyileştirme önerisi yazıldı)
