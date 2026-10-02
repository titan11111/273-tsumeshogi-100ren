import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { S } from './gen.mjs';

const QUOTA = { 1: 5, 3: 25, 5: 40, 7: 30 };   // タイタン決定（2026-10-02）
const groups = { 1: [], 3: [], 5: [], 7: [] };
const seen = new Set();

for (let i = 1; i <= 8; i++) {
  const f = new URL(`pool-${i}.json`, import.meta.url);
  if (!existsSync(f)) continue;
  const pool = JSON.parse(readFileSync(f, 'utf8'));
  for (const k of Object.keys(groups)) for (const p of (pool[k] || [])) {
    const key = JSON.stringify([p.b, p.h]);
    if (seen.has(key)) continue;
    seen.add(key); groups[k].push(p);
  }
}
console.log('プール:', Object.fromEntries(Object.entries(groups).map(([k, v]) => [k + '手', v.length])));

const short = Object.entries(QUOTA).filter(([k, q]) => groups[k].length < q);
if (short.length) { console.error('不足:', short.map(([k, q]) => `${k}手 ${groups[k].length}/${q}`).join(' / ')); process.exit(1); }

// 「解いて気持ちいい」順に採用: 捨て駒 > 打 > 玉方の応手が多い > 攻め駒が少ない
const picked = {};
for (const k of Object.keys(QUOTA)) {
  picked[k] = groups[k].slice().sort((a, b) => b.meta.s - a.meta.s).slice(0, QUOTA[k]);
  // 章の中では易→難（応手の多さ）で並べる
  picked[k].sort((a, b) => a.meta.replies - b.meta.replies);
}
const puzzles = [...picked[1], ...picked[3], ...picked[5], ...picked[7]]
  .map((p, i) => ({ n: i + 1, moves: p.moves, b: p.b, h: p.h, sol: p.sol }));

// 書き戻し前に全件を再検証（監査器と同じ基準）
let bad = 0;
for (const p of puzzles) {
  let pos = S.deserialize(p);
  if (S.findKing(pos, -1) < 0 || S.inCheck(pos, -1)) { console.error(`#${p.n} 開始局面が不正`); bad++; continue; }
  for (let i = 0; i < p.sol.length; i++) {
    const w = p.sol[i], side = i % 2 ? -1 : 1;
    const m = S.legalMoves(pos, side, side === 1).find(x => x.from === w.from && x.to === w.to && x.piece === w.piece && x.promote === w.promote);
    if (!m) { console.error(`#${p.n} ${i + 1}手目が不正`); bad++; break; }
    pos = S.applyMove(pos, m);
  }
  if (!S.isMate(pos, -1)) { console.error(`#${p.n} 最終局面が詰みでない`); bad++; }
}
if (bad) { console.error(`検証失敗 ${bad}件 — 書き込みを中止`); process.exit(1); }

const stats = {};
for (const p of puzzles) stats[p.moves] = (stats[p.moves] || 0) + 1;
console.log('採用:', stats, '／ 盤面ユニーク:', new Set(puzzles.map(p => JSON.stringify([p.b, p.h]))).size);

for (const file of ['index.html', 'dobagaki_standalone.html']) {
  const path = new URL(file, import.meta.url);
  const src = readFileSync(path, 'utf8');
  const next = src.replace(/window\.PUZZLES = \[[\s\S]*?\];/, `window.PUZZLES = ${JSON.stringify(puzzles)};`);
  if (next === src) { console.error(`${file}: PUZZLES を置換できなかった`); process.exit(1); }
  writeFileSync(path, next);
  console.log(`${file}: 書き込み完了`);
}
