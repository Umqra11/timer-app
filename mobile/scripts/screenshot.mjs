// Screenshot script — Sprint-02 doğrulama
// 5 ekran görüntüsü alır: onboarding, kronometre (idle + running), odalar hero, odalar modal
import { chromium } from 'playwright';
import fs from 'node:fs';

const SHOTS_DIR = '/Users/bigbrother/Documents/Timer/docs/screenshots';
const URL = 'http://127.0.0.1:5173';

fs.mkdirSync(SHOTS_DIR, { recursive: true });

const browser = await chromium.launch();

// --- 1) Onboarding (localStorage temiz) ---
const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page1 = await ctx1.newPage();
await page1.goto(`${URL}/onboarding`, { waitUntil: 'networkidle' });
await page1.screenshot({ path: `${SHOTS_DIR}/01-onboarding.png`, fullPage: false });
console.log('✓ 01-onboarding.png');
await ctx1.close();

// --- Username set edilmiş context ---
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx2.addInitScript(() => {
	localStorage.setItem('timer_username', 'Enes');
});

// --- 2) Kronometre idle ---
const page2 = await ctx2.newPage();
await page2.goto(`${URL}/`, { waitUntil: 'networkidle' });
await page2.screenshot({ path: `${SHOTS_DIR}/02-kronometre-idle.png` });
console.log('✓ 02-kronometre-idle.png');

// --- 3) Kronometre running (Başlat'a tıkla, 2.5 saniye bekle) ---
await page2.click('button:has-text("Başlat")');
await page2.waitForTimeout(2500);
await page2.screenshot({ path: `${SHOTS_DIR}/03-kronometre-running.png` });
console.log('✓ 03-kronometre-running.png');

// --- 4) Odalar (hero + diğerleri) ---
const page3 = await ctx2.newPage();
await page3.goto(`${URL}/rooms`, { waitUntil: 'networkidle' });
await page3.waitForTimeout(300); // stores hydrate olsun
await page3.screenshot({ path: `${SHOTS_DIR}/04-odalar-hero.png`, fullPage: false });
console.log('✓ 04-odalar-hero.png');

// --- 5) Odalar — Oda Oluştur modal ---
await page3.click('button[aria-label="Yeni oda oluştur"]');
await page3.waitForSelector('[role="dialog"]', { state: 'visible' });
await page3.screenshot({ path: `${SHOTS_DIR}/05-odalar-create-modal.png`, fullPage: false });
console.log('✓ 05-odalar-create-modal.png');

// --- 6) Profil ---
const page4 = await ctx2.newPage();
await page4.goto(`${URL}/profile`, { waitUntil: 'networkidle' });
await page4.screenshot({ path: `${SHOTS_DIR}/06-profile.png` });
console.log('✓ 06-profile.png');

await browser.close();
console.log('\nTüm ekran görüntüleri:', SHOTS_DIR);
