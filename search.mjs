import { S, MAXCOUNT, makeHands, pack, verifyStrict } from './gen.mjs';

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const row = (sq) => Math.floor(sq / 9), col = (sq) => sq % 9;

// 駒の段制約（成らずで置けない段）: 先手は上(r小)が前
const legalRank = (pc, sq) => {
  const t = Math.abs(pc), r = row(sq), mine = pc > 0;
  if (t === 1 || t === 2) return mine ? r >= 1 : r <= 7;
  if (t === 3) return mine ? r >= 2 : r <= 6;
  return true;
};
const nifu = (board) => {
  for (const side of [1, -1]) {
    const seen = new Set();
    for (let sq = 0; sq < 81; sq++) if (board[sq] === side * 1) { if (seen.has(col(sq))) return true; seen.add(col(sq)); }
  }
  return false;
};

const ATTACK = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15];
const DEFEND = [1, 2, 3, 4, 5, 6, 7];

export function randomPosition(cfg) {
  const board = Array(81).fill(0);
  // 玉は上段寄り（攻め手が詰められる位置）
  const kr = rnd(cfg.kingRows), kc = rnd(9);
  const ksq = kr * 9 + kc;
  board[ksq] = -8;
  const near = [];
  for (let sq = 0; sq < 81; sq++) {
    const d = Math.max(Math.abs(row(sq) - kr), Math.abs(col(sq) - kc));
    if (sq !== ksq && d <= cfg.radius) near.push(sq);
  }
  const used = {};
  const place = (types, sign, count) => {
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 40; tries++) {
        const t = pick(types), sq = pick(near);
        const base = S.baseType(t);
        if (board[sq]) continue;
        if ((used[base] || 0) >= MAXCOUNT[base]) continue;
        const pc = sign * t;
        if (!legalRank(pc, sq)) continue;
        board[sq] = pc; used[base] = (used[base] || 0) + 1; break;
      }
    }
  };
  place(ATTACK, 1, cfg.attackers);
  place(DEFEND, -1, cfg.defenders);
  if (nifu(board)) return null;
  // 攻め方の持ち駒
  const hand = {};
  for (let i = 0; i < cfg.handCount; i++) {
    const t = pick([1, 2, 3, 4, 5, 6, 7]);
    if ((used[t] || 0) + (hand[t] || 0) >= MAXCOUNT[t]) continue;
    hand[t] = (hand[t] || 0) + 1;
  }
  const hands = makeHands(board, hand);
  if (!hands) return null;
  return pack(board, hands, cfg.moves);
}

export function searchOne(cfg, attempts) {
  for (let i = 0; i < attempts; i++) {
    const p = randomPosition(cfg);
    if (!p) continue;
    const v = verifyStrict(p, cfg.limit || 400000);
    if (v) return { p: v, attempts: i + 1 };
  }
  return null;
}
