import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const files = ['index.html', 'dobagaki_standalone.html'];
const html = readFileSync(new URL(files[0], import.meta.url), 'utf8');
const original = JSON.parse(html.match(/window\.PUZZLES = (\[[\s\S]*?\]);/)[1]);
const engine = html.match(/const S = \(\(\) => \{([\s\S]*?)\n\}\)\(\);/)[1];
const S = vm.runInNewContext(`(() => {${engine}\n})()`);
const seeds = [...new Map(original.map(p => [JSON.stringify([p.b, p.h]), p])).values()];
const quotas = { 1: 30, 3: 44, 5: 26 };
const groups = { 1: [], 3: [], 5: [] };
const seen = new Set();
const transformSq = (sq, flip, shift, rowShift = 0) => {
  if (sq < 0) return -1;
  const c = (flip ? 8 - sq % 9 : sq % 9) + shift;
  const r = Math.floor(sq / 9) + rowShift;
  return c < 0 || c > 8 || r < 0 || r > 8 ? -2 : r * 9 + c;
};
function variant(seed, flip, shift, rowShift = 0) {
  const b = Array(81).fill(0);
  for (let sq = 0; sq < 81; sq++) if (seed.b[sq]) {
    const to = transformSq(sq, flip, shift, rowShift);
    if (to < 0) return null;
    b[to] = seed.b[sq];
  }
  const sol = seed.sol.map(m => ({ ...m, from: transformSq(m.from, flip, shift, rowShift), to: transformSq(m.to, flip, shift, rowShift) }));
  if (sol.some(m => m.to < 0 || m.from === -2)) return null;
  return { n: 0, moves: seed.moves, b, h: seed.h, sol };
}
function verify(p) {
  let pos = S.deserialize(p);
  if (S.inCheck(pos, -1)) return false;
  for (let i = 0; i < p.sol.length; i++) {
    const w = p.sol[i], side = i % 2 ? -1 : 1;
    const m = S.legalMoves(pos, side, side === 1).find(x => x.from === w.from && x.to === w.to && x.piece === w.piece && x.promote === w.promote);
    if (!m) return false;
    pos = S.applyMove(pos, m);
  }
  if (!S.isMate(pos, -1)) return false;
  const start = S.deserialize(p);
  if (p.moves > 1 && S.solve(start, p.moves - 2, { nodes: 0, limit: 150000 })) return false;
  const line = S.solve(start, p.moves, { nodes: 0, limit: 150000 });
  if (!line || line.length !== p.moves) return false;
  p.sol = line.map(m => ({ from: m.from, to: m.to, piece: m.piece, promote: m.promote, owner: m.owner }));
  return true;
}
for (let pass = 0; pass < 3; pass++) {
  for (const seed of seeds) {
    const group = groups[seed.moves];
    if (group.length >= quotas[seed.moves]) continue;
    for (const rowShift of pass < 2 ? [0] : [1, -1, 2, -2]) {
    for (const flip of pass === 0 ? [false] : [true, false]) {
      for (const shift of pass === 0 ? [0] : [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8]) {
        if (group.length >= quotas[seed.moves]) break;
        const p = variant(seed, flip, shift, rowShift);
        if (!p) continue;
        const key = JSON.stringify([p.b, p.h]);
        if (seen.has(key)) continue;
        if (!verify(p)) continue;
        seen.add(key); group.push(p);
      }
    }}
  }
}
console.log(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])));
if (Object.entries(groups).some(([k, v]) => v.length < quotas[k])) process.exit(1);
const puzzles = [...groups[1], ...groups[3], ...groups[5]].map((p, i) => ({ ...p, n: i + 1 }));
for (const file of files) {
  const url = new URL(file, import.meta.url);
  const src = readFileSync(url, 'utf8');
  writeFileSync(url, src.replace(/window\.PUZZLES = \[[\s\S]*?\];/, `window.PUZZLES = ${JSON.stringify(puzzles)};`));
}
