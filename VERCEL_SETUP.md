# Vercel Deploy — Kurulum Notları

Bu dosya Patron'un Vercel panelinde yapacağı 3 adımı içerir.

## Sorun

`Command "vite build" exited with 127` — bu "command not found" demek.
Sebebi: Vercel `mobile/` klasöründeki SvelteKit projesini değil, repo kökünü
(`/`) build etmeye çalışıyor. Root'ta `package.json` yok, sadece
`mobile/package.json` var → Vercel install step'i atlamış → vite binary
hiç kurulmamış → exit 127.

## Çözüm: 2 dakikalık ayar

### Adım 1 — vercel.json (ben yazdım, push ettim)
Repo'da `mobile/vercel.json` var:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".vercel/output",
  "framework": "sveltekit"
}
```
Bu, install/build komutlarını explicit yapıyor (Settings'teki override
sorunlu olsa bile çalışır).

### Adım 2 — Vercel panel'de Root Directory
1. https://vercel.com/dashboard → `timer-app` projesine gir
2. Üst menüden **Settings**
3. Sol menüden **General**
4. **Root Directory** alanını bul
5. Yanındaki **Edit** butonuna bas → `mobile` yaz → Save
   (Vercel "Root Directory olarak `mobile` ayarla" diye uyarı verebilir,
   kabul et)

### Adım 3 — Redeploy
1. Üst menüden **Deployments**
2. En üstteki (latest) deployment'ın yanındaki **⋯** menüsüne tıkla
3. **Redeploy** seç
4. Veya yeni bir commit push'la → Vercel otomatik tetikler

## Doğrulama

Build log'da artık şunlar gözükmeli:
- `Cloning github.com/Umqra11/timer-app (Branch: main, Commit: b6542b0)`
- `Running "install"` → `npm install` çıktısı
- `Running "vercel build"`
- `✓ Compiled successfully` (veya benzeri başarı mesajı)
- Deployment başarılı → canlı URL

## Ortam değişkenleri

Şu an için `.env` gerekmiyor (Firestore henüz yok). Sprint-02'nin devamında
Firebase config eklenince:
- Settings → Environment Variables
- `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_PROJECT_ID`, vs.
- Production / Preview / Development kutularını işaretle
