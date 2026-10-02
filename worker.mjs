import { writeFileSync } from 'node:fs';
import { searchOne } from './search.mjs';
import { S } from './gen.mjs';

const ID = process.argv[2];
const SECONDS = Number(process.argv[3]);
const OUT = new URL(`pool-${ID}.json`, import.meta.url);
// 1手8 / 3手30 / 5手55 / 7手45 を4ワーカーで割る（余剰を作って選別する）
const TARGET = { 1: 3, 3: 10, 5: 16, 7: 13 };
const pool = { 1: [], 3: [], 5: [], 7: [] };
const seen = new Set();

function score(p) {
  const start = S.deserialize(p);
  const m0 = p.sol[0];
  const isDrop = m0.from < 0;
  const after = S.applyMove(start, m0);
  const sacrifice = S.attackedBy(after, m0.to, -1) ? 1 : 0;
  const replies = S.legalMoves(after, -1, false, false).length;
  const attackers = p.b.filter(v => v > 0).length;
  const defenders = p.b.filter(v => v < 0).length - 1;
  return { s: sacrifice * 4 + (isDrop ? 2 : 0) + Math.min(replies, 12) * 0.4 + defenders * 0.6 - attackers * 0.3,
           sacrifice, isDrop: isDrop ? 1 : 0, replies, attackers, defenders };
}
const CFG = {
  1: { kingRows: 3, radius: 2, attackers: 3, defenders: 2, handCount: 1, limit: 200000 },
  3: { kingRows: 3, radius: 2, attackers: 3, defenders: 2, handCount: 2, limit: 300000 },
  5: { kingRows: 3, radius: 3, attackers: 4, defenders: 2, handCount: 2, limit: 300000 },
  7: { kingRows: 3, radius: 3, attackers: 4, defenders: 2, handCount: 2, limit: 300000 },
};
const DEADLINE = Date.now() + SECONDS * 1000;
let saved = 0;
while (Date.now() < DEADLINE) {
  let done = true;
  for (const moves of [7, 5, 3, 1]) {
    if (pool[moves].length >= TARGET[moves]) continue;
    done = false;
    const r = searchOne({ moves, ...CFG[moves] }, 40);
    if (!r) continue;
    const key = JSON.stringify([r.p.b, r.p.h]);
    if (seen.has(key)) continue;
    seen.add(key);
    r.p.meta = score(r.p);
    pool[moves].push(r.p);
    if (Date.now() - saved > 4000) { writeFileSync(OUT, JSON.stringify(pool)); saved = Date.now(); }
  }
  if (done) break;
}
writeFileSync(OUT, JSON.stringify(pool));
console.log(`worker${ID} FINAL`, Object.fromEntries(Object.entries(pool).map(([k, v]) => [k + '手', v.length])));
