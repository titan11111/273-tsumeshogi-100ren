// 別解検査: 採用後の全問について「詰みに至る初手が本当に1通りか」を高い探索上限で再検査する。
// 生成時より上限を上げ、探索打ち切りによる見落とし（別解を一意と誤判定）を潰す。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
const puzzles = JSON.parse(html.match(/window\.PUZZLES = (\[[\s\S]*?\]);/)[1]);
const engine = html.match(/const S = \(\(\) => \{([\s\S]*?)\n\}\)\(\);/)[1];
const S = vm.runInNewContext(`(() => {${engine}\n})()`);
const LIMIT = Number(process.argv[2] || 4000000);

const bad = [];
let truncated = 0;
for (const p of puzzles) {
  const start = S.deserialize(p);
  const roots = [];
  for (const m of S.legalMoves(start, 1, true)) {
    const p2 = S.applyMove(start, m);
    const replies = S.legalMoves(p2, -1, false, false);
    if (replies.length === 0) { if (p.moves === 1) roots.push(m); continue; }
    if (p.moves === 1) continue;
    let ok = true, hitLimit = false;
    for (const r of replies) {
      const budget = { nodes: 0, limit: LIMIT };
      if (!S.solve(S.applyMove(p2, r), p.moves - 2, budget)) {
        if (budget.nodes > LIMIT) hitLimit = true;
        ok = false; break;
      }
    }
    if (hitLimit) truncated++;
    if (ok) roots.push(m);
  }
  // 短い詰みの有無も上限を上げて再検査
  const shortBudget = { nodes: 0, limit: LIMIT };
  const shorter = p.moves > 1 ? S.solve(S.deserialize(p), p.moves - 2, shortBudget) : null;
  if (roots.length !== 1) bad.push(`#${p.n}(${p.moves}手): 詰みに至る初手が ${roots.length} 通り`);
  if (shorter) bad.push(`#${p.n}(${p.moves}手): ${shorter.length}手で詰む（手数表示より短い）`);
}
console.log(JSON.stringify({ total: puzzles.length, limit: LIMIT, 探索打ち切り: truncated, 不合格: bad.length, 内容: bad }, null, 2));
process.exit(bad.length ? 1 : 0);
