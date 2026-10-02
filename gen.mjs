import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
const engine = html.match(/const S = \(\(\) => \{([\s\S]*?)\n\}\)\(\);/)[1];
export const S = vm.runInNewContext(`(() => {${engine}\n})()`);
export const MAXCOUNT = { 1: 18, 2: 4, 3: 4, 4: 4, 5: 4, 6: 2, 7: 2, 8: 2 };

// 盤上の駒から「玉方の持ち駒＝残り全部」を算出（詰将棋の標準ルール）
export function makeHands(board, attackerHand) {
  const used = {};
  for (const pc of board) if (pc) { const t = S.baseType(pc); used[t] = (used[t] || 0) + 1; }
  const gote = Array(9).fill(0), sente = Array(9).fill(0);
  for (const [t, n] of Object.entries(attackerHand)) { sente[t] = n; used[t] = (used[t] || 0) + n; }
  for (let t = 1; t <= 7; t++) gote[t] = MAXCOUNT[t] - (used[t] || 0);
  if (gote.some(v => v < 0)) return null;
  return [sente, gote];
}

export function pack(board, hands, moves) { return { n: 0, moves, b: board.slice(), h: [hands[0].slice(), hands[1].slice()], sol: [] }; }

// 初手が一通りか／指定手数ぴったりで詰むか／短い詰みが無いかを検査
export function verifyStrict(p, limit = 600000) {
  const start = S.deserialize(p);
  if (S.findKing(start, -1) < 0) return null;
  if (S.inCheck(start, -1)) return null;
  if (p.moves > 1 && S.solve(S.deserialize(p), p.moves - 2, { nodes: 0, limit })) return null;
  const line = S.solve(S.deserialize(p), p.moves, { nodes: 0, limit });
  if (!line || line.length !== p.moves) return null;
  // 初手の一意性: 詰みに至る初手が2通り以上あれば捨てる
  let roots = 0;
  for (const m of S.legalMoves(start, 1, true)) {
    const p2 = S.applyMove(start, m);
    const replies = S.legalMoves(p2, -1, false, false);
    if (replies.length === 0) { if (p.moves === 1) roots++; continue; }
    if (p.moves === 1) continue;
    let ok = true;
    for (const r of replies) {
      if (!S.solve(S.applyMove(p2, r), p.moves - 2, { nodes: 0, limit })) { ok = false; break; }
    }
    if (ok) roots++;
    if (roots > 1) return null;
  }
  if (roots !== 1) return null;
  p.sol = line.map(m => ({ from: m.from, to: m.to, piece: m.piece, promote: m.promote, owner: m.owner }));
  return p;
}
