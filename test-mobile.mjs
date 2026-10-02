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
const first = await page.evaluate(() => window.PUZZLES[0].sol[0]);
// 打つ駒は決め打ちせず、解答手順の駒種から名前を引く（問題集を差し替えても壊れない）
if (first.from < 0) {
  const name = await page.evaluate(p => S.NAMES[p], first.piece);
  await page.locator('#hand-black .hand-piece').filter({ hasText: name }).first().click();
} else await page.locator('#board .cell').nth(first.from).click();
await page.locator('#board .cell').nth(first.to).click();
await page.waitForTimeout(2800);
console.log('stage after tap:', await page.locator('#stage-no').textContent());
console.log('errors after tap:', errors);
await browser.close();
