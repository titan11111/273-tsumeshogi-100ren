// 難易度構成の検証: 章の導出・章バナー・7手詰の通し解答・コンソールエラー
import { chromium } from '/Users/gosho/.npm-global/lib/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(800);

const dist = await page.evaluate(() => {
  const d = {};
  for (const p of window.PUZZLES) d[p.moves] = (d[p.moves] || 0) + 1;
  return { total: window.PUZZLES.length, dist: d };
});
console.log('出題構成:', JSON.stringify(dist));

await page.locator('#start-btn').click();
await page.waitForTimeout(600);

const chapters = await page.evaluate(() => CHAPTERS.map(c => ({ no: c.no, moves: c.moves, from: c.from, count: c.count })));
console.log('章:', JSON.stringify(chapters));

// 各章の先頭で章バナーが出るか
for (const c of chapters) {
  await page.evaluate(n => loadStage(n), c.from);
  await page.waitForTimeout(250);
  const banner = (await page.locator('#stage-banner').textContent()).trim();
  const chip = (await page.locator('#stage-moves').textContent()).trim();
  const okBanner = banner.includes(`第${c.no}章`) && banner.includes(`${c.moves}手詰`);
  console.log(`${okBanner ? 'OK ' : 'NG '} 章${c.no} 先頭#${c.from + 1} banner="${banner}" chip="${chip}"`);
  if (!okBanner) process.exitCode = 1;
  // 章の2問目は通常バナー（章バナーを毎局出さない）
  if (c.count > 1) {
    await page.evaluate(n => loadStage(n), c.from + 1);
    await page.waitForTimeout(250);
    const b2 = (await page.locator('#stage-banner').textContent()).trim();
    if (b2.includes('章')) { console.log(`NG  章${c.no} 2問目にも章バナーが出ている: "${b2}"`); process.exitCode = 1; }
  }
}

// 最長章の1問を解答手順どおりに指して詰みまで到達するか
const last = chapters[chapters.length - 1];
await page.evaluate(n => loadStage(n), last.from);
await page.waitForTimeout(300);
const sol = await page.evaluate(() => state.puzzle.sol.filter(m => m.owner === 1));
for (const m of sol) {
  if (m.from < 0) {
    const name = await page.evaluate(p => S.NAMES[p], m.piece);
    await page.locator('#hand-black .hand-piece').filter({ hasText: name }).first().click();
  } else {
    await page.locator('#board .cell').nth(m.from).click();
  }
  await page.waitForTimeout(120);
  await page.locator('#board .cell').nth(m.to).click();
  if (m.promote) { await page.waitForTimeout(200); const d = page.locator('#promote-yes'); if (await d.isVisible()) await d.click(); }
  await page.waitForTimeout(700);
}
await page.waitForTimeout(3500);
const stageNo = await page.locator('#stage-no').textContent();
const advanced = Number(stageNo) > last.from + 1;
console.log(`${advanced ? 'OK ' : 'NG '} ${last.moves}手詰を解答手順で詰めて次局へ進行 (stage-no=${stageNo}, 期待>${last.from + 1})`);
if (!advanced) process.exitCode = 1;

await page.screenshot({ path: '/private/tmp/273-difficulty.png' });
console.log('errors:', errors);
if (errors.length) process.exitCode = 1;
await browser.close();
