import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
const puzzles = JSON.parse(html.match(/window\.PUZZLES = (\[[\s\S]*?\]);/)[1]);
const engine = html.match(/const S = \(\(\) => \{([\s\S]*?)\n\}\)\(\);/)[1];
const S = vm.runInNewContext(`(() => {${engine}\n})()`);
const keys = new Map();
const issues = [];
const byLength = {};
for (const p of puzzles) {
  byLength[p.moves] = (byLength[p.moves] || 0) + 1;
  const key = JSON.stringify([p.b, p.h]);
  if (keys.has(key)) issues.push(`#${p.n}: #${keys.get(key)} と同一局面`);
  else keys.set(key, p.n);
  if (p.b.length !== 81 || p.h.length !== 2 || p.sol.length !== p.moves) issues.push(`#${p.n}: データ長が不正`);
  let pos = S.deserialize(p);
  if (S.findKing(pos, -1) < 0 || S.inCheck(pos, -1)) issues.push(`#${p.n}: 開始時の玉方が不正`);
  for (let i = 0; i < p.sol.length; i++) {
    const wanted = p.sol[i];
    const side = i % 2 ? -1 : 1;
    const found = S.legalMoves(pos, side, side === 1).find(m => m.from === wanted.from && m.to === wanted.to && m.piece === wanted.piece && m.promote === wanted.promote);
    if (!found) { issues.push(`#${p.n}: ${i + 1}手目が合法手でない`); break; }
    pos = S.applyMove(pos, found);
    if (i === p.sol.length - 1 && !S.isMate(pos, -1)) issues.push(`#${p.n}: 最終局面が詰みでない`);
  }
}
console.log(JSON.stringify({ total: puzzles.length, lengths: byLength, distinct: keys.size, issueCount: issues.length, issues }, null, 2));
