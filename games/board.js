// ===== 차례대로 하는 보드 대결 10개 (혼자: 컴퓨터와 / 둘이: 번갈아) =====
const BC = 'board';
const clone = o => JSON.parse(JSON.stringify(o));
const stone = p => `<div class="stone s${p}"></div>`;
function boardEl(box, cols, rows, ratio) {
  const b = el('div', 'board');
  b.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  b.style.gridTemplateRows = `repeat(${rows},1fr)`;
  if (ratio) b.style.aspectRatio = ratio;
  const w = el('div', 'bwrap'); w.appendChild(b); box.appendChild(w);
  return b;
}
function lineWinner(b, W, H, n) {
  const D = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = b[y * W + x]; if (p < 0) continue;
    for (const [dx, dy] of D) {
      let k = 1;
      while (k < n) { const xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= W || yy >= H || b[yy * W + xx] !== p) break; k++; }
      if (k === n) return p;
    }
  }
  return null;
}

// 1. 틱택토
reg({ id: 'ttt', cat: BC, em: '❌', name: '틱택토', desc: '가로·세로·대각선으로 3개를 먼저 놓으면 승리!',
  init: () => ({ b: Array(9).fill(-1), t: 0, last: -1 }),
  turn: s => s.t,
  apply(s, m) { if (s.b[m] !== -1) return null; s = clone(s); s.b[m] = s.t; s.t ^= 1; s.last = m; return s; },
  winner(s) { const w = lineWinner(s.b, 3, 3, 3); return w != null ? w : s.b.every(v => v >= 0) ? 'draw' : null; },
  ai(s, rng) {
    const free = s.b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0);
    if (rng() < .2) return free[Math.floor(rng() * free.length)];
    const me = s.t;
    const mm = (b, t, depth) => {
      const w = lineWinner(b, 3, 3, 3); if (w != null) return w === me ? 10 - depth : depth - 10;
      if (b.every(v => v >= 0)) return 0;
      let best = t === me ? -99 : 99;
      for (let i = 0; i < 9; i++) if (b[i] < 0) { b[i] = t; const v = mm(b, t ^ 1, depth + 1); b[i] = -1; best = t === me ? Math.max(best, v) : Math.min(best, v); }
      return best;
    };
    let bm = free[0], bv = -99; for (const i of free) { const b = s.b.slice(); b[i] = me; const v = mm(b, me ^ 1, 1); if (v > bv) { bv = v; bm = i; } }
    return bm;
  },
  render(box, s, ui) {
    const b = boardEl(box, 3, 3);
    s.b.forEach((v, i) => { const c = el('div', 'c' + (i === s.last ? ' last' : ''), v < 0 ? '' : v === 0 ? '<span style="color:var(--p1)">✕</span>' : '<span style="color:var(--p2)">◯</span>'); c.style.fontSize = 'clamp(30px,16vmin,120px)'; if (v < 0) tap(c, () => ui.play(i)); b.appendChild(c); });
  } });

// 2. 사목 (네 줄)
const C4W = 7, C4H = 6;
function c4drop(b, col, p) { for (let r = C4H - 1; r >= 0; r--) if (b[r * C4W + col] < 0) { b[r * C4W + col] = p; return r * C4W + col; } return -1; }
function c4score(b, me) {
  let sc = 0; const D = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = 0; y < C4H; y++) for (let x = 0; x < C4W; x++) for (const [dx, dy] of D) {
    let m = 0, o = 0, ok = true;
    for (let k = 0; k < 4; k++) { const xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= C4W || yy >= C4H) { ok = false; break; } const v = b[yy * C4W + xx]; if (v === me) m++; else if (v >= 0) o++; }
    if (!ok || (m && o)) continue;
    sc += [0, 1, 6, 40, 1000][m] - [0, 1, 7, 50, 1000][o];
  }
  for (let y = 0; y < C4H; y++) if (b[y * C4W + 3] === me) sc += 3;
  return sc;
}
reg({ id: 'c4', cat: BC, em: '🔴', name: '사목 (네 줄)', desc: '칸을 떨어뜨려 4개를 한 줄로 먼저 만드세요.',
  init: () => ({ b: Array(C4W * C4H).fill(-1), t: 0, last: -1 }),
  turn: s => s.t,
  apply(s, m) { if (s.b[m] !== -1) return null; s = clone(s); const at = c4drop(s.b, m, s.t); if (at < 0) return null; s.last = at; s.t ^= 1; return s; },
  winner(s) { const w = lineWinner(s.b, C4W, C4H, 4); return w != null ? w : s.b.every(v => v >= 0) ? 'draw' : null; },
  ai(s, rng) {
    const me = s.t, order = [3, 2, 4, 1, 5, 0, 6];
    const search = (b, t, d, a, be) => {
      const w = lineWinner(b, C4W, C4H, 4);
      if (w != null) return w === me ? 100000 + d : -100000 - d;
      if (d === 0 || b.every(v => v >= 0)) return c4score(b, me);
      let best = t === me ? -1e9 : 1e9;
      for (const col of order) { if (b[col] >= 0) continue; const bb = b.slice(); c4drop(bb, col, t); const v = search(bb, t ^ 1, d - 1, a, be);
        if (t === me) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); be = Math.min(be, v); } if (a >= be) break; }
      return best;
    };
    let bm = order.find(c => s.b[c] < 0), bv = -1e9;
    for (const col of order) { if (s.b[col] >= 0) continue; const bb = s.b.slice(); c4drop(bb, col, me); const v = search(bb, me ^ 1, 4, -1e9, 1e9) + rng() * 3; if (v > bv) { bv = v; bm = col; } }
    return bm;
  },
  render(box, s, ui) {
    const b = boardEl(box, C4W, C4H, '7/6');
    s.b.forEach((v, i) => { const c = el('div', 'c' + (i === s.last ? ' last' : ''), v >= 0 ? stone(v) : ''); c.style.borderRadius = '50%'; tap(c, () => ui.play(i % C4W)); b.appendChild(c); });
  } });

// 3. 오목
const GN = 11;
reg({ id: 'gomoku', cat: BC, em: '⚫', name: '오목', desc: '돌 5개를 한 줄로 먼저 놓으면 승리!',
  init: () => ({ b: Array(GN * GN).fill(-1), t: 0, last: -1 }),
  turn: s => s.t,
  apply(s, m) { if (s.b[m] !== -1) return null; s = clone(s); s.b[m] = s.t; s.t ^= 1; s.last = m; return s; },
  winner(s) { const w = lineWinner(s.b, GN, GN, 5); return w != null ? w : s.b.every(v => v >= 0) ? 'draw' : null; },
  ai(s, rng) {
    const b = s.b, me = s.t;
    if (b.every(v => v < 0)) return Math.floor(GN * GN / 2);
    const val = (i, p) => {
      const x = i % GN, y = Math.floor(i / GN); let tot = 0;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        let cnt = 1, open = 0;
        for (const sg of [1, -1]) { let k = 1; while (true) { const xx = x + dx * k * sg, yy = y + dy * k * sg; if (xx < 0 || yy < 0 || xx >= GN || yy >= GN) break; const v = b[yy * GN + xx]; if (v === p) { cnt++; k++; continue; } if (v < 0) open++; break; } }
        tot += cnt >= 5 ? 100000 : cnt === 4 ? (open === 2 ? 20000 : open ? 3000 : 0) : cnt === 3 ? (open === 2 ? 1500 : open ? 200 : 0) : cnt === 2 ? (open === 2 ? 100 : open ? 20 : 0) : open;
      }
      return tot;
    };
    let bm = -1, bv = -1;
    for (let i = 0; i < b.length; i++) {
      if (b[i] >= 0) continue;
      const x = i % GN, y = Math.floor(i / GN); let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < GN && yy < GN && b[yy * GN + xx] >= 0) { near = true; break; } }
      if (!near) continue;
      const v = val(i, me) * 1.1 + val(i, me ^ 1) + rng() * 5;
      if (v > bv) { bv = v; bm = i; }
    }
    return bm;
  },
  render(box, s, ui) {
    const b = boardEl(box, GN, GN); b.style.gap = '2px';
    s.b.forEach((v, i) => { const c = el('div', 'c' + (i === s.last ? ' last' : ''), v >= 0 ? stone(v) : ''); c.style.borderRadius = '4px'; if (v < 0) tap(c, () => ui.play(i)); b.appendChild(c); });
  } });

// 4. 뒤집기 (리버시)
const RW = [100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5, 5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100];
function rvFlips(b, i, p) {
  if (b[i] >= 0) return [];
  const x = i % 8, y = Math.floor(i / 8), out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const line = []; let xx = x + dx, yy = y + dy;
    while (xx >= 0 && yy >= 0 && xx < 8 && yy < 8 && b[yy * 8 + xx] === (p ^ 1)) { line.push(yy * 8 + xx); xx += dx; yy += dy; }
    if (line.length && xx >= 0 && yy >= 0 && xx < 8 && yy < 8 && b[yy * 8 + xx] === p) out.push(...line);
  }
  return out;
}
const rvMoves = (b, p) => b.map((_, i) => i).filter(i => rvFlips(b, i, p).length);
reg({ id: 'reversi', cat: BC, em: '⚪', name: '뒤집기', desc: '상대 돌을 내 돌 사이에 끼워 뒤집으세요. 돌이 많은 쪽이 승리!',
  init() { const b = Array(64).fill(-1); b[27] = b[36] = 1; b[28] = b[35] = 0; return { b, t: 0, last: -1, over: false }; },
  turn: s => s.t,
  apply(s, m) {
    const f = rvFlips(s.b, m, s.t); if (!f.length) return null;
    s = clone(s); s.b[m] = s.t; f.forEach(i => s.b[i] = s.t); s.last = m;
    if (rvMoves(s.b, s.t ^ 1).length) s.t ^= 1; else if (!rvMoves(s.b, s.t).length) s.over = true;
    return s;
  },
  winner(s) { if (!s.over) return null; const a = s.b.filter(v => v === 0).length, b = s.b.filter(v => v === 1).length; return a > b ? 0 : b > a ? 1 : 'draw'; },
  info: s => `🔴 ${s.b.filter(v => v === 0).length} : ${s.b.filter(v => v === 1).length} 🔵`,
  ai(s, rng) { let bm = -1, bv = -1e9; for (const m of rvMoves(s.b, s.t)) { const v = RW[m] + rvFlips(s.b, m, s.t).length * 2 + rng() * 4; if (v > bv) { bv = v; bm = m; } } return bm; },
  render(box, s, ui) {
    const b = boardEl(box, 8, 8), mv = ui.can ? new Set(rvMoves(s.b, s.t)) : new Set();
    s.b.forEach((v, i) => { const c = el('div', 'c' + (i === s.last ? ' last' : ''), v >= 0 ? stone(v) : mv.has(i) ? '<div class="hint"></div>' : ''); c.style.background = 'color-mix(in srgb,var(--good) 22%,var(--panel))'; tap(c, () => ui.play(i)); b.appendChild(c); });
  } });

// 5. 점 잇기 (상자 만들기)
const DB = 4; // 4x4 상자
const dbH = (r, c) => r * DB + c;                       // 가로선 (DB+1)*DB 개
const dbV = (r, c) => (DB + 1) * DB + r * (DB + 1) + c; // 세로선 DB*(DB+1) 개
const dbBoxLines = (r, c) => [dbH(r, c), dbH(r + 1, c), dbV(r, c), dbV(r, c + 1)];
function dbBoxesOf(line) {
  const out = [];
  if (line < (DB + 1) * DB) { const r = Math.floor(line / DB), c = line % DB; if (r > 0) out.push([r - 1, c]); if (r < DB) out.push([r, c]); }
  else { const k = line - (DB + 1) * DB, r = Math.floor(k / (DB + 1)), c = k % (DB + 1); if (c > 0) out.push([r, c - 1]); if (c < DB) out.push([r, c]); }
  return out;
}
const dbSides = (L, r, c) => dbBoxLines(r, c).filter(l => L[l] >= 0).length;
reg({ id: 'dots', cat: BC, em: '🔲', name: '상자 만들기', desc: '선을 하나씩 그어요. 상자의 4번째 선을 그으면 내 상자! 한 번 더!',
  init: () => ({ L: Array(2 * DB * (DB + 1)).fill(-1), B: Array(DB * DB).fill(-1), t: 0, sc: [0, 0], last: -1 }),
  turn: s => s.t,
  apply(s, m) {
    if (s.L[m] !== -1) return null; s = clone(s); s.L[m] = s.t; s.last = m; let got = 0;
    for (const [r, c] of dbBoxesOf(m)) if (dbSides(s.L, r, c) === 4 && s.B[r * DB + c] < 0) { s.B[r * DB + c] = s.t; got++; }
    s.sc[s.t] += got; if (!got) s.t ^= 1; return s;
  },
  winner(s) { if (s.L.some(v => v < 0)) return null; return s.sc[0] > s.sc[1] ? 0 : s.sc[1] > s.sc[0] ? 1 : 'draw'; },
  info: s => `🔴 ${s.sc[0]} : ${s.sc[1]} 🔵`,
  ai(s, rng) {
    const free = s.L.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0);
    const take = free.filter(l => dbBoxesOf(l).some(([r, c]) => dbSides(s.L, r, c) === 3));
    if (take.length) return take[0];
    const safe = free.filter(l => dbBoxesOf(l).every(([r, c]) => dbSides(s.L, r, c) < 2));
    const pool = safe.length ? safe : free.slice().sort((a, b) => dbBoxesOf(a).reduce((x, [r, c]) => x + dbSides(s.L, r, c), 0) - dbBoxesOf(b).reduce((x, [r, c]) => x + dbSides(s.L, r, c), 0)).slice(0, 3);
    return pool[Math.floor(rng() * pool.length)];
  },
  render(box, s, ui) {
    const N = 2 * DB + 1, b = boardEl(box, N, N);
    const tpl = [...Array(N)].map((_, i) => i % 2 ? '4fr' : '1fr').join(' ');
    b.style.gridTemplateColumns = b.style.gridTemplateRows = tpl; b.style.gap = '0'; b.style.background = 'var(--panel)';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = el('div');
      if (y % 2 === 0 && x % 2 === 0) { c.style.cssText = 'background:var(--ink);border-radius:50%;margin:15%'; }
      else if (y % 2 === 0) { const l = dbH(y / 2, (x - 1) / 2); lineCell(c, l, true); }
      else if (x % 2 === 0) { const l = dbV((y - 1) / 2, x / 2); lineCell(c, l, false); }
      else { const o = s.B[((y - 1) / 2) * DB + (x - 1) / 2]; c.style.cssText = `border-radius:6px;margin:6%;background:${o < 0 ? 'transparent' : o ? 'var(--p2)' : 'var(--p1)'};opacity:.75`; }
      b.appendChild(c);
    }
    function lineCell(c, l, hor) {
      const v = s.L[l]; c.style.cssText = 'display:flex;align-items:center;justify-content:center';
      const bar = el('div'); bar.style.cssText = `${hor ? 'width:100%;height:28%' : 'height:100%;width:28%'};border-radius:6px;background:${v < 0 ? 'var(--line)' : v ? 'var(--p2)' : 'var(--p1)'};${l === s.last ? 'box-shadow:0 0 0 3px #ffd23f' : ''}`;
      c.appendChild(bar); if (v < 0) tap(c, () => ui.play(l));
    }
  } });

// 6. 막대 가져가기 (님)
reg({ id: 'nim', cat: BC, em: '🥢', name: '막대 가져가기', desc: '한 줄에서 막대를 원하는 만큼 가져가요. 마지막 막대를 가져가면 패배!',
  init: () => ({ h: [1, 3, 5, 7], t: 0, last: null }),
  turn: s => s.t,
  apply(s, m) { if (!(m.k >= 1 && m.k <= s.h[m.r])) return null; s = clone(s); s.h[m.r] -= m.k; s.last = m; s.lastBy = s.t; s.t ^= 1; return s; },
  winner(s) { return s.h.every(v => v === 0) ? s.t : null; }, // 마지막을 가져간 사람이 지므로, 지금 차례인 사람이 승리
  ai(s, rng) {
    const h = s.h, moves = [];
    h.forEach((n, r) => { for (let k = 1; k <= n; k++) moves.push({ r, k }); });
    if (rng() < .15) return moves[Math.floor(rng() * moves.length)];
    for (const m of moves) {
      const nh = h.slice(); nh[m.r] -= m.k;
      const big = nh.filter(v => v > 1).length, x = nh.reduce((a, b) => a ^ b, 0), ones = nh.filter(v => v === 1).length;
      const losingForOpp = big === 0 ? ones % 2 === 1 : x === 0;
      if (losingForOpp && nh.some(v => v > 0)) return m;
    }
    const nonEmpty = moves.filter(m => !(h.reduce((a, b) => a + b, 0) - m.k === 0));
    return (nonEmpty.length ? nonEmpty : moves)[Math.floor(rng() * (nonEmpty.length || moves.length))] || moves[0];
  },
  render(box, s, ui) {
    const w = el('div', 'bwrap'); w.style.flexDirection = 'column'; w.style.gap = '14px';
    s.h.forEach((n, r) => {
      const row = el('div'); row.style.cssText = 'display:flex;gap:10px;justify-content:center;min-height:min(14vh,90px)';
      for (let i = 0; i < n; i++) {
        const st = el('button'); st.style.cssText = 'width:min(8vw,46px);border-radius:10px;background:#c98a4b;box-shadow:inset -4px 0 0 rgba(0,0,0,.18)';
        tap(st, () => ui.play({ r, k: n - i }));
        st.addEventListener('pointerenter', () => [...row.children].forEach((x, j) => x.style.opacity = j >= i ? .45 : 1));
        st.addEventListener('pointerleave', () => [...row.children].forEach(x => x.style.opacity = 1));
        row.appendChild(st);
      }
      if (!n) row.innerHTML = '<span class="small" style="align-self:center">비었음</span>';
      w.appendChild(row);
    });
    const tip = el('div', 'small', '막대를 누르면 그 막대부터 오른쪽 끝까지 가져가요.'); w.appendChild(tip);
    box.appendChild(w);
  } });

// 7. 만칼라
function mcSow(s, pit) {
  const b = s.b, p = s.t, myStore = p ? 13 : 6, oppStore = p ? 6 : 13;
  let n = b[pit]; b[pit] = 0; let i = pit;
  while (n) { i = (i + 1) % 14; if (i === oppStore) continue; b[i]++; n--; }
  const mine = p ? (i >= 7 && i <= 12) : (i >= 0 && i <= 5);
  if (mine && b[i] === 1 && b[12 - i] > 0) { b[myStore] += b[i] + b[12 - i]; b[i] = b[12 - i] = 0; }
  const s0 = b.slice(0, 6).reduce((a, c) => a + c, 0), s1 = b.slice(7, 13).reduce((a, c) => a + c, 0);
  if (!s0 || !s1) { for (let k = 0; k < 6; k++) { b[6] += b[k]; b[k] = 0; b[13] += b[k + 7]; b[k + 7] = 0; } s.over = true; return; }
  if (i !== myStore) s.t ^= 1;
}
reg({ id: 'mancala', cat: BC, em: '🫘', name: '만칼라', desc: '내 구멍의 씨앗을 한 칸씩 나눠 담아요. 내 창고에 많이 모으면 승리!',
  init: () => ({ b: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], t: 0, over: false, last: -1 }),
  turn: s => s.t,
  apply(s, m) { const ok = s.t ? m >= 7 && m <= 12 : m >= 0 && m <= 5; if (!ok || !s.b[m]) return null; s = clone(s); s.last = m; mcSow(s, m); return s; },
  winner(s) { if (!s.over) return null; return s.b[6] > s.b[13] ? 0 : s.b[13] > s.b[6] ? 1 : 'draw'; },
  info: s => `🔴 창고 ${s.b[6]} : ${s.b[13]} 창고 🔵`,
  ai(s, rng) {
    const me = s.t;
    const moves = st => (st.t ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5]).filter(i => st.b[i]);
    const ev = st => (me ? st.b[13] - st.b[6] : st.b[6] - st.b[13]);
    const mm = (st, d) => {
      if (st.over || d === 0) return ev(st);
      let best = st.t === me ? -1e9 : 1e9;
      for (const m of moves(st)) { const ns = clone(st); mcSow(ns, m); const v = mm(ns, d - 1); best = st.t === me ? Math.max(best, v) : Math.min(best, v); }
      return best;
    };
    let bm = moves(s)[0], bv = -1e9;
    for (const m of moves(s)) { const ns = clone(s); mcSow(ns, m); const v = mm(ns, 4) + rng(); if (v > bv) { bv = v; bm = m; } }
    return bm;
  },
  render(box, s, ui) {
    const w = el('div', 'bwrap');
    const b = el('div'); b.style.cssText = 'display:grid;grid-template-columns:1.2fr repeat(6,1fr) 1.2fr;grid-template-rows:1fr 1fr;gap:8px;width:min(96vw,760px);aspect-ratio:8/2.9;background:#b07a45;padding:10px;border-radius:24px';
    const pit = (i, col, row) => {
      const c = el('button'); const store = i === 6 || i === 13;
      c.style.cssText = `grid-column:${col};grid-row:${row};border-radius:${store ? '40px' : '50%'};background:#7a4f28;color:#fff;font-weight:900;font-size:clamp(16px,4.5vmin,34px);display:flex;align-items:center;justify-content:center;${i === s.last ? 'box-shadow:0 0 0 3px #ffd23f;' : ''}${!store ? `outline:3px solid ${i < 6 ? 'var(--p1)' : 'var(--p2)'};outline-offset:-3px;` : ''}`;
      c.textContent = s.b[i]; if (!store) tap(c, () => ui.play(i)); b.appendChild(c);
    };
    pit(13, 1, '1 / span 2'); pit(6, 8, '1 / span 2');
    for (let k = 0; k < 6; k++) { pit(12 - k, k + 2, 1); pit(k, k + 2, 2); }
    w.appendChild(b); box.appendChild(w);
    box.appendChild(el('div', 'msgline', '🔴은 아래 줄, 🔵는 위 줄. 씨앗은 반시계 방향으로 돌아요. 마지막 씨앗이 내 창고에 들어가면 한 번 더!'));
  } });

// 8. 카드 짝 대결
reg({ id: 'memory', cat: BC, em: '🎴', name: '카드 짝 대결', desc: '번갈아 카드 2장을 뒤집어요. 짝을 맞추면 한 번 더!',
  init(rng) { const em = shuffleWith(EMOJI, rng).slice(0, 10); return { cards: shuffleWith([...em, ...em], rng), own: Array(20).fill(-1), open: [], rev: [], seen: {}, t: 0, sc: [0, 0] }; },
  turn: s => s.t,
  apply(s, m) {
    if (s.own[m] >= 0 || s.open.includes(m)) return null;
    s = clone(s); if (!s.open.length) s.rev = [];
    s.open.push(m); s.seen[m] = 1;
    if (s.open.length === 2) {
      const [a, b] = s.open;
      if (s.cards[a] === s.cards[b]) { s.own[a] = s.own[b] = s.t; s.sc[s.t]++; }
      else { s.rev = [a, b]; s.t ^= 1; }
      s.open = [];
    }
    return s;
  },
  winner(s) { if (s.own.some(v => v < 0)) return null; return s.sc[0] > s.sc[1] ? 0 : s.sc[1] > s.sc[0] ? 1 : 'draw'; },
  info: s => `🔴 ${s.sc[0]} : ${s.sc[1]} 🔵`,
  aiDelay: 900,
  ai(s, rng) {
    const avail = s.own.map((v, i) => v < 0 && !s.open.includes(i) ? i : -1).filter(i => i >= 0);
    const remember = i => s.seen[i] && rng() < .75;
    const unknown = avail.filter(i => !s.seen[i]);
    const rnd = a => a[Math.floor(rng() * a.length)];
    if (s.open.length === 1) {
      const o = s.open[0], mate = avail.find(i => i !== o && s.cards[i] === s.cards[o] && remember(i));
      return mate != null ? mate : rnd(unknown.length ? unknown : avail);
    }
    for (const i of avail) if (remember(i)) { const j = avail.find(k => k !== i && s.cards[k] === s.cards[i] && remember(k)); if (j != null) return i; }
    return rnd(unknown.length ? unknown : avail);
  },
  render(box, s, ui) {
    const b = boardEl(box, 5, 4, '5/4');
    s.cards.forEach((e, i) => {
      const up = s.own[i] >= 0 || s.open.includes(i) || s.rev.includes(i);
      const c = el('div', 'c', up ? e : '');
      c.style.background = s.own[i] >= 0 ? `color-mix(in srgb,${s.own[i] ? 'var(--p2)' : 'var(--p1)'} 35%,var(--panel))` : up ? 'var(--panel)' : 'var(--accent)';
      c.style.fontSize = 'clamp(22px,8vmin,64px)';
      if (!up) { c.textContent = '?'; c.style.color = '#fff'; }
      tap(c, () => ui.play(i)); b.appendChild(c);
    });
  } });

// 9. 가위바위보 (3선승)
const RPS = ['✊', '✋', '✌️'];
reg({ id: 'rps', cat: BC, em: '✊', name: '가위바위보', desc: '먼저 3번 이기면 승리! 상대가 고른 손은 보이지 않아요.',
  init: () => ({ pick: [null, null], sc: [0, 0], t: 0, res: null }),
  turn: s => s.t,
  apply(s, m) {
    s = clone(s); s.pick[s.t] = m;
    if (s.t === 0) { s.t = 1; return s; }
    const [a, b] = s.pick, w = a === b ? -1 : (a + 1) % 3 === b ? 1 : 0;
    if (w >= 0) s.sc[w]++;
    s.res = { a, b, w }; s.pick = [null, null]; s.t = 0; return s;
  },
  winner: s => s.sc[0] >= 3 ? 0 : s.sc[1] >= 3 ? 1 : null,
  info: s => `🔴 ${s.sc[0]} : ${s.sc[1]} 🔵`,
  ai: (s, rng) => Math.floor(rng() * 3),
  render(box, s, ui) {
    const w = el('div', 'bwrap'); w.style.flexDirection = 'column'; w.style.gap = '18px';
    const r = s.res;
    const show = el('div'); show.style.cssText = 'font-size:clamp(50px,16vmin,130px);display:flex;gap:30px;align-items:center';
    show.innerHTML = r ? `<span style="filter:drop-shadow(0 0 0 var(--p1))">${RPS[r.a]}</span><span class="small">vs</span><span>${RPS[r.b]}</span>` : '<span>🤜</span><span class="small">vs</span><span>🤛</span>';
    w.appendChild(show);
    w.appendChild(el('div', 'msgline', r ? (r.w < 0 ? '비겼어요!' : `${ui.names[r.w]} 승!`) : '손을 고르세요'));
    if (s.pick[0] != null) w.appendChild(el('div', 'msgline', `${ui.names[0]}: 선택 완료 🙈`));
    const row = el('div', 'row'); row.style.justifyContent = 'center';
    RPS.forEach((h, i) => { const b = el('button', 'tile', h); b.style.cssText = 'width:min(26vw,140px);height:min(26vw,140px);font-size:clamp(40px,12vmin,80px)'; tap(b, () => ui.play(i)); row.appendChild(b); });
    w.appendChild(row); box.appendChild(w);
  } });

// 10. 독 초콜릿 (Chomp)
const CR = 5, CCOL = 7;
const chKey = l => l.join(',');
const chMove = (l, r, c) => l.map((v, i) => i >= r ? Math.min(v, c) : v);
const chMemo = {};
function chWin(l) { // 지금 차례인 사람이 이기는가
  const k = chKey(l); if (k in chMemo) return chMemo[k];
  let res = false;
  if (!(l[0] === 1 && l.slice(1).every(v => v === 0))) {
    for (let r = 0; r < CR && !res; r++) for (let c = 0; c < l[r] && !res; c++) { if (r === 0 && c === 0) continue; if (!chWin(chMove(l, r, c))) res = true; }
  }
  return chMemo[k] = res;
}
reg({ id: 'chomp', cat: BC, em: '🍫', name: '독 초콜릿', desc: '초콜릿 한 칸을 고르면 그 칸과 오른쪽·아래가 모두 사라져요. ☠️ 독 칸을 먹으면 패배!',
  init: () => ({ l: Array(CR).fill(CCOL), t: 0, loser: null }),
  turn: s => s.t,
  apply(s, m) {
    const { r, c } = m; if (c >= s.l[r]) return null; s = clone(s);
    if (r === 0 && c === 0) { s.loser = s.t; s.l = Array(CR).fill(0); return s; }
    s.l = chMove(s.l, r, c); s.t ^= 1; return s;
  },
  winner: s => s.loser == null ? null : s.loser ^ 1,
  ai(s, rng) {
    const moves = [];
    for (let r = 0; r < CR; r++) for (let c = 0; c < s.l[r]; c++) if (r || c) moves.push({ r, c });
    if (!moves.length) return { r: 0, c: 0 };
    if (rng() > .2) { const w = moves.find(m => !chWin(chMove(s.l, m.r, m.c))); if (w) return w; }
    const small = moves.filter(m => m.r === CR - 1 || s.l[m.r + 1] <= m.c);
    const pool = small.length ? small : moves; return pool[Math.floor(rng() * pool.length)];
  },
  render(box, s, ui) {
    const b = boardEl(box, CCOL, CR, `${CCOL}/${CR}`); b.style.background = 'transparent';
    for (let r = 0; r < CR; r++) for (let c = 0; c < CCOL; c++) {
      const has = c < s.l[r];
      const cell = el('div', 'c', has && r === 0 && c === 0 ? '☠️' : '');
      cell.style.background = has ? '#6b3a1f' : 'transparent';
      cell.style.boxShadow = has ? 'inset -4px -4px 0 rgba(0,0,0,.25), inset 3px 3px 0 rgba(255,255,255,.12)' : 'none';
      if (has) {
        tap(cell, () => ui.play({ r, c }));
        cell.addEventListener('pointerenter', () => [...b.children].forEach((x, k) => { const rr = Math.floor(k / CCOL), cc = k % CCOL; if (rr >= r && cc >= c && cc < s.l[rr]) x.style.opacity = .5; }));
        cell.addEventListener('pointerleave', () => [...b.children].forEach(x => x.style.opacity = 1));
      }
      b.appendChild(cell);
    }
  } });
