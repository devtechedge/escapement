import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('qa-shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
const requests = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('request', (request) => {
  if (!request.url().startsWith('http://127.0.0.1:4391')) requests.push(request.url());
});

await page.goto('http://127.0.0.1:4391/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa-shots/desktop.png', fullPage: true });

const desktopMetrics = await page.evaluate(() => {
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
  };
  return {
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    plate: rect('.plate-stage'),
    movement: rect('.plate-wrap'),
    cabinet: rect('.cabinet'),
    stand: rect('.timing-stand'),
    card: rect('.calibre-card'),
    log: rect('.bench-log'),
  };
});

// Regulate to zero, then run a still-mode test.
await page.getByRole('button', { name: 'Toggle still mode' }).click();
const slider = page.getByRole('slider', { name: /Regulator index/ });
await slider.focus();
await page.keyboard.press('Home');
for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-shots/desktop-regulated.png', fullPage: true });
await page.getByRole('button', { name: /Run test/ }).click();
await page.waitForTimeout(1400);
await page.screenshot({ path: 'qa-shots/desktop-certified.png', fullPage: true });
const certifiedText = await page.locator('.calibre-card').innerText();

// Pocket repair state.
const caseSelect = page.getByRole('combobox', { name: /Case/i });
await caseSelect.selectOption('pocket');
await page.waitForTimeout(400);
await page.screenshot({ path: 'qa-shots/desktop-pocket.png', fullPage: true });
const pocketText = await page.locator('.cabinet').innerText();

// Mobile.
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa-shots/mobile.png', fullPage: true });
const mobileMetrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  scrollHeight: document.documentElement.scrollHeight,
}));

console.log(JSON.stringify({
  desktopMetrics,
  mobileMetrics,
  errors,
  externalRequests: requests,
  certifiedHasStamp: certifiedText.includes('BENCH CERTIFIED'),
  pocketHasFault: pocketText.includes('Worn fourth pivot'),
}, null, 2));

await browser.close();
