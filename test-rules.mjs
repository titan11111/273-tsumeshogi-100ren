import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

for (const file of ['index.html', 'dobagaki_standalone.html']) {
  const html = readFileSync(new URL(file, import.meta.url), 'utf8');
  const source = html.match(/const S = \(\(\) => \{([\s\S]*?)\n\}\)\(\);/);
  assert(source, `${file}: engine found`);
  const S = vm.runInNewContext(`(() => {${source[1]}\n})()`);
  const targets = (piece, from = 40, other = {}) => {
    const b = Array(81).fill(0); b[from] = piece;
    for (const [sq, pc] of Object.entries(other)) b[Number(sq)] = pc;
    return [...S.pieceTargets(b, from, piece)].sort((a, b) => a - b);
  };
  const eq = (actual, expected, label) => assert.deepEqual(actual, expected.sort((a, b) => a - b), `${file}: ${label}`);
  eq(targets(1), [31], '歩');
  eq(targets(-1), [49], '後手歩');
  eq(targets(2), [4, 13, 22, 31], '香');
  eq(targets(-2), [49, 58, 67, 76], '後手香');
  eq(targets(3), [21, 23], '桂');
  eq(targets(-3), [57, 59], '後手桂');
  eq(targets(4), [30, 31, 32, 48, 50], '銀');
  eq(targets(5), [30, 31, 32, 39, 41, 49], '金');
  eq(targets(6, 40, { 20: 1, 60: -1 }), [8, 16, 24, 30, 32, 48, 50, 56, 60, 64, 72], '角と遮蔽物');
  eq(targets(7, 40, { 31: 1, 49: -1 }), [36, 37, 38, 39, 41, 42, 43, 44, 49], '飛と遮蔽物');
  eq(targets(8), [30, 31, 32, 39, 41, 48, 49, 50], '王');
  eq(targets(9), [30, 31, 32, 39, 41, 49], 'と金');
  eq(targets(14), [0, 8, 10, 16, 20, 24, 30, 31, 32, 39, 41, 48, 49, 50, 56, 60, 64, 70, 72, 80], '馬');
  eq(targets(15), [4, 13, 22, 30, 31, 32, 36, 37, 38, 39, 41, 42, 43, 44, 48, 49, 50, 58, 67, 76], '龍');
  const pos = S.newPosition();
  pos.board[4] = -8; pos.board[76] = 8; pos.board[13] = 1;
  assert(S.inCheck(pos, -1), `${file}: 王手を認識`);
  assert(!S.legalMoves(pos, 1).some(m => m.to === 4), `${file}: 玉を取れない`);
  const drop = S.newPosition(); drop.board[76] = 8; drop.board[4] = -8;
  drop.board[49] = 1; drop.hands[0][1] = 1;
  assert(!S.legalMoves(drop, 1).some(m => m.from < 0 && m.piece === 1 && S.colOf(m.to) === 4), `${file}: 二歩禁止`);
  assert(!S.legalMoves(drop, 1).some(m => m.from < 0 && m.piece === 1 && S.rowOf(m.to) === 0), `${file}: 歩の最終段打ち禁止`);
  for (const [pc, from, to] of [[9, 9, 0], [10, 9, 0], [11, 9, 0]]) {
    const p = S.newPosition(); p.board[from] = pc; p.board[76] = 8; p.board[4] = -8;
    assert(S.legalMoves(p, 1).some(m => m.from === from && m.to === to && !m.promote), `${file}: 成駒 ${pc} が最終段へ移動`);
  }
  console.log(`${file}: rules OK`);
}
