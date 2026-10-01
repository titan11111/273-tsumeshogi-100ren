import { chromium } from '/Users/gosho/.npm-global/lib/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1000);
console.log('title:', await page.title());
console.log('errors:', errors);
console.log('active:', await page.locator('.screen.active').getAttribute('id'));
console.log('buttons:', await page.locator('button').allTextContents());
await page.screenshot({ path: '/private/tmp/273-mobile-title.png' });
await page.locator('#start-btn').click();
await page.waitForTimeout(500);
console.log('play active:', await page.locator('#play-screen').getAttribute('class'));
for (const id of ['#play-header', '#board', '#hand-black', '#hint-btn', '#reset-btn', '#music-btn']) {
  const box = await page.locator(id).boundingBox();
  console.log(id, box && { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) });
}
console.log('errors after start:', errors);
await page.screenshot({ path: '/private/tmp/273-mobile-play.png' });
await browser.close();
