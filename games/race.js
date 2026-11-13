// ===== 스피드 대결 게임 30개 (혼자: 최고기록 / 둘이: 같은 문제로 점수 대결) =====
const RC = 'race';

reg({ id: 'tap', cat: RC, em: '👆', name: '연타왕', desc: '버튼을 최대한 많이 누르세요!', dur: 15, start(c) {
  const b = el('button', 'tile', 'TAP!');
  b.style.cssText = 'margin:auto;width:min(60cqmin,320px);height:min(60cqmin,320px);border-radius:50%;background:var(--pc,var(--accent));color:#fff;font-size:12cqmin';
  c.el.appendChild(b);
  tap(b, () => { c.add(1, true); b.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], 110); });
} });

reg({ id: 'mole', cat: RC, em: '🐹', name: '두더지 잡기', desc: '두더지를 잡고 💣 폭탄은 피하세요.', dur: 25, start(c) {
  const g = c.grid(3, 3), st = Array(9).fill(0);
  const set = (i, v) => { st[i] = v; g[i].textContent = v === 1 ? '🐹' : v === 2 ? '💣' : ''; g[i].style.background = v ? '#ffe7a8' : ''; };
  g.forEach((t, i) => tap(t, () => { if (st[i] === 1) { c.good(); set(i, 0); } else if (st[i] === 2) { c.bad(2); set(i, 0); } }));
  c.every(520, () => {
    const free = [...st.keys()].filter(i => !st[i]); if (!free.length) return;
    const i = c.pick(free); set(i, c.r() < .2 ? 2 : 1);
    c.after(950, () => { if (st[i]) set(i, 0); });
  });
} });

reg({ id: 'react', cat: RC, em: '⚡', name: '반응속도', desc: '초록색이 되는 순간 누르세요! 미리 누르면 감점.', dur: 30, start(c) {
  const b = el('button', 'tile'); b.style.cssText = 'margin:14px;flex:1;font-size:9cqmin;color:#fff';
  c.el.appendChild(b);
  let state = 'wait', t0 = 0, gen = 0;
  const wait = () => {
    state = 'wait'; b.style.background = '#ff4d4f'; b.textContent = '기다리세요…';
    const g = ++gen; c.after(900 + c.r() * 2200, () => { if (g !== gen) return; state = 'go'; t0 = performance.now(); b.style.background = '#1fbf75'; b.textContent = '지금!'; });
  };
  tap(b, () => {
    if (state === 'wait') { gen++; c.bad(1); b.textContent = '너무 빨라요!'; state = 'pause'; c.after(700, wait); }
    else if (state === 'go') {
      const ms = Math.round(performance.now() - t0);
      const p = ms < 250 ? 5 : ms < 330 ? 4 : ms < 420 ? 3 : ms < 550 ? 2 : 1;
      c.good(p); state = 'pause'; b.style.background = 'var(--accent)'; b.textContent = ms + 'ms';
      c.after(700, wait);
    }
  });
  wait();
} });

reg({ id: 'stroop', cat: RC, em: '🎨', name: '글자 색 맞추기', desc: '글자의 뜻 말고 "글자 색"을 고르세요.', dur: 30, start(c) {
  c.quiz(() => {
    const cs = c.shuffle(COLORS).slice(0, 4), word = cs[0], ink = cs[1];
    const opts = c.shuffle(cs);
    return { q: `<div><div class="small">글자 색은?</div><span style="color:${ink.c}">${word.n}</span></div>`, opts: opts.map(o => o.n), ans: opts.indexOf(ink) };
  });
} });

reg({ id: 'math', cat: RC, em: '➕', name: '빠른 계산', desc: '덧셈 뺄셈 정답을 빨리 고르세요.', dur: 30, start(c) {
  c.quiz(() => {
    let a = c.ri(2, 20), b = c.ri(1, 15), plus = c.r() < .55;
    if (!plus && b > a) [a, b] = [b, a];
    const ans = plus ? a + b : a - b, o = c.numOpts(ans, 4, 4);
    return { q: `${a} ${plus ? '+' : '−'} ${b} = ?`, opts: o.opts, ans: o.ans };
  });
} });

reg({ id: 'order', cat: RC, em: '🔢', name: '1부터 순서대로', desc: '1부터 16까지 순서대로 누르세요.', dur: 30, start(c) {
  const board = () => {
    c.clear(); let next = 1;
    const g = c.grid(4, 4), nums = c.shuffle([...Array(16)].map((_, i) => i + 1));
    g.forEach((t, i) => { t.textContent = nums[i]; tap(t, () => {
      if (nums[i] === next) { next++; t.style.visibility = 'hidden'; c.add(1, true); if (next > 16) { c.good(5); board(); } }
      else if (nums[i] > next) c.bad(1);
    }); });
  };
  board();
} });

reg({ id: 'balloon', cat: RC, em: '🎈', name: '풍선 터뜨리기', desc: '올라가는 풍선을 터뜨리세요!', dur: 25, start(c) {
  const box = el('div', 'dotbox'); c.el.appendChild(box);
  const bs = [];
  c.every(600, () => {
    const b = el('button', 'abs', c.r() < .15 ? '🎁' : '🎈');
    b.style.cssText = `position:absolute;background:none;font-size:13cqmin;left:${c.ri(4, 82)}%;top:100%;padding:0`;
    const o = { b, y: 100, v: 18 + c.r() * 22, gift: b.textContent === '🎁' };
    tap(b, () => { c.good(o.gift ? 3 : 1); b.remove(); o.dead = true; });
    box.appendChild(b); bs.push(o);
  });
  c.loop(dt => {
    for (const o of bs) { if (o.dead) continue; o.y -= o.v * dt; o.b.style.top = o.y + '%'; if (o.y < -20) { o.dead = true; o.b.remove(); } }
  });
} });

reg({ id: 'oddcolor', cat: RC, em: '🟩', name: '다른 색 찾기', desc: '색이 조금 다른 한 칸을 찾으세요.', dur: 30, start(c) {
  let lv = 0;
  const round = () => {
    c.clear(); const n = Math.min(7, 2 + Math.floor(lv / 2)), d = Math.max(5, 24 - lv * 1.6);
    const h = c.ri(0, 359), odd = c.ri(0, n * n - 1);
    c.grid(n, n).forEach((t, i) => {
      t.style.background = `hsl(${h},70%,${i === odd ? 55 + d : 55}%)`;
      tap(t, () => { if (i === odd) { lv++; c.good(1); } else c.bad(1); round(); });
    });
  };
  round();
} });

reg({ id: 'arrow', cat: RC, em: '⬆️', name: '화살표 방향', desc: '파란 화살표는 같은 방향, 빨간 화살표는 반대 방향!', dur: 30, start(c) {
  const A = ['⬆', '⬇', '⬅', '➡'], opp = [1, 0, 3, 2];
  c.quiz(() => {
    const d = c.ri(0, 3), rev = c.r() < .35;
    return {
      q: `<div><div class="small">${rev ? '반대 방향!' : '같은 방향'}</div><span style="color:${rev ? '#ff4d4f' : '#2f8cff'};font-size:1.6em">${A[d]}</span></div>`,
      opts: A.slice(), ans: rev ? opp[d] : d
    };
  });
} });

reg({ id: 'bigger', cat: RC, em: '⚖️', name: '더 큰 수', desc: '두 숫자 중 더 큰 수를 누르세요.', dur: 25, start(c) {
  c.quiz(() => {
    const a = c.ri(10, 999); let b; do { b = a + c.ri(-40, 40); } while (b === a || b < 1);
    return { q: '더 큰 수는?', opts: [String(a), String(b)], ans: a > b ? 0 : 1 };
  });
} });

reg({ id: 'simon', cat: RC, em: '🎵', name: '순서 기억', desc: '불이 켜진 순서를 기억해서 똑같이 누르세요.', dur: 45, start(c) {
  const cols = ['#ff4d4f', '#2f8cff', '#1fbf75', '#f2b800'];
  const g = c.grid(2, 2); let len = 3, seq = [], pos = 0, input = false;
  g.forEach((t, i) => { t.style.background = cols[i]; t.style.opacity = .45;
    tap(t, () => {
      if (!input) return;
      t.animate([{ opacity: 1 }, { opacity: .45 }], 250);
      if (seq[pos] === i) { pos++; if (pos === seq.length) { input = false; c.good(len); len++; c.after(600, play); } }
      else { input = false; c.bad(0); c.after(600, play); }
    });
  });
  const play = () => {
    seq = [...Array(len)].map(() => c.ri(0, 3)); pos = 0;
    seq.forEach((v, k) => { c.after(k * 520, () => g[v].animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: .45 }], 450)); });
    c.after(len * 520, () => { input = true; });
  };
  c.after(300, play);
} });

reg({ id: 'target', cat: RC, em: '🎯', name: '과녁 맞추기', desc: '작아지기 전에 과녁을 맞추세요!', dur: 25, start(c) {
  const box = el('div', 'dotbox'); c.el.appendChild(box);
  c.every(650, () => {
    const t = el('button', '', '🎯');
    t.style.cssText = `position:absolute;background:none;padding:0;font-size:14cqmin;left:${c.ri(3, 80)}%;top:${c.ri(3, 75)}%;transition:transform 1.5s linear`;
    box.appendChild(t);
    tap(t, () => { c.good(1); t.remove(); });
    requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transform = 'scale(0.1)'; }));
    c.after(1500, () => t.remove());
  });
} });

reg({ id: 'fruit', cat: RC, em: '🍉', name: '과일만 쏙쏙', desc: '과일은 누르고 💣 폭탄은 피하세요.', dur: 25, start(c) {
  const g = c.grid(4, 4), st = Array(16).fill(null);
  const F = ['🍎', '🍉', '🍇', '🍓', '🍌', '🍑'];
  g.forEach((t, i) => tap(t, () => { const v = st[i]; if (!v) return; st[i] = null; t.textContent = ''; if (v === '💣') c.bad(3); else c.good(1); }));
  c.every(400, () => {
    const free = [...st.keys()].filter(i => !st[i]); if (!free.length) return;
    const i = c.pick(free), v = c.r() < .27 ? '💣' : c.pick(F);
    st[i] = v; g[i].textContent = v;
    c.after(1100, () => { if (st[i] === v) { st[i] = null; g[i].textContent = ''; } });
  });
} });

reg({ id: 'pairs', cat: RC, em: '🃏', name: '짝 맞추기', desc: '같은 그림 카드 두 장을 찾으세요.', dur: 45, start(c) {
  const deal = () => {
    c.clear();
    const em = c.shuffle(EMOJI).slice(0, 8), cards = c.shuffle([...em, ...em]);
    const g = c.grid(4, 4); let open = [], lock = false, found = 0;
    g.forEach((t, i) => { t.textContent = '❓'; tap(t, () => {
      if (lock || open.includes(i) || t.dataset.done) return;
      t.textContent = cards[i]; open.push(i);
      if (open.length === 2) {
        const [a, b] = open;
        if (cards[a] === cards[b]) { g[a].dataset.done = g[b].dataset.done = 1; g[a].style.opacity = g[b].style.opacity = .5; c.good(1); open = []; if (++found === 8) c.after(400, deal); }
        else { lock = true; c.after(550, () => { g[a].textContent = g[b].textContent = '❓'; open = []; lock = false; }); }
      }
    }); });
  };
  deal();
} });

reg({ id: 'count', cat: RC, em: '🔵', name: '점 세기', desc: '점이 몇 개인지 빨리 세어 보세요.', dur: 30, start(c) {
  c.quiz(() => {
    const n = c.ri(4, 14), box = el('div', 'dotbox'); box.style.cssText = 'position:absolute;inset:8px';
    const cells = c.shuffle([...Array(30)].map((_, i) => i)).slice(0, n);
    for (const k of cells) { const d = el('div', 'dot'); d.style.cssText = `width:7cqmin;height:7cqmin;background:var(--accent);left:${(k % 6) * 16 + 3 + c.r() * 6}%;top:${Math.floor(k / 6) * 19 + 2 + c.r() * 6}%`; box.appendChild(d); }
    const o = c.numOpts(n, 4, 2);
    return { q: box, opts: o.opts, ans: o.ans, cols: 4 };
  });
} });

reg({ id: 'oddeven', cat: RC, em: '🎲', name: '홀짝', desc: '숫자가 홀수인지 짝수인지 고르세요.', dur: 25, start(c) {
  c.quiz(() => { const n = c.ri(1, 99); return { q: String(n), opts: ['홀', '짝'], ans: n % 2 ? 0 : 1 }; });
} });

reg({ id: 'findem', cat: RC, em: '🔍', name: '그림 찾기', desc: '위에 나온 그림을 아래에서 찾으세요.', dur: 30, start(c) {
  const round = () => {
    c.clear();
    const pool = c.shuffle(EMOJI), target = pool[0], others = pool.slice(1, 16);
    const q = el('div', 'q', `<span class="small">찾아라 →</span> ${target}`); q.style.minHeight = '18%';
    c.el.appendChild(q);
    const cells = c.shuffle([target, ...others]);
    c.grid(4, 4).forEach((t, i) => { t.textContent = cells[i]; tap(t, () => { if (cells[i] === target) c.good(1); else c.bad(1); round(); }); });
  };
  round();
} });

reg({ id: 'timing', cat: RC, em: '⏱️', name: '타이밍 멈춰!', desc: '움직이는 막대가 초록 구역에 있을 때 누르세요.', dur: 30, start(c) {
  const wrap = el('div'); wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;padding:16px';
  const track = el('div'); track.style.cssText = 'position:relative;height:56px;border-radius:14px;background:var(--chip);overflow:hidden';
  const zone = el('div'); zone.style.cssText = 'position:absolute;top:0;bottom:0;background:#1fbf7566;border-left:3px solid #1fbf75;border-right:3px solid #1fbf75';
  const mark = el('div'); mark.style.cssText = 'position:absolute;top:-4px;bottom:-4px;width:8px;border-radius:4px;background:var(--ink)';
  track.append(zone, mark);
  const b = el('button', 'tile', 'STOP!'); b.style.cssText = 'height:40%;background:var(--pc,var(--accent));color:#fff;font-size:9cqmin';
  wrap.append(track, b); c.el.appendChild(wrap);
  let x = 0, dir = 1, sp = 55, zw = 26, zx = 0;
  const newZone = () => { zx = c.ri(5, 95 - zw); zone.style.left = zx + '%'; zone.style.width = zw + '%'; };
  newZone();
  c.loop(dt => { x += dir * sp * dt; if (x > 100) { x = 100; dir = -1; } if (x < 0) { x = 0; dir = 1; } mark.style.left = `calc(${x}% - 4px)`; });
  tap(b, () => {
    if (x >= zx && x <= zx + zw) { const mid = Math.abs(x - (zx + zw / 2)) < zw / 5; c.good(mid ? 2 : 1); zw = Math.max(8, zw * .9); sp = Math.min(160, sp * 1.08); }
    else c.bad(1);
    newZone();
  });
} });

reg({ id: 'flash', cat: RC, em: '💡', name: '순간 기억', desc: '잠깐 켜진 칸들을 기억해서 모두 누르세요.', dur: 45, start(c) {
  let k = 3;
  const round = () => {
    c.clear(); const g = c.grid(4, 4), lit = new Set(c.shuffle([...Array(16).keys()]).slice(0, k));
    let input = false, hit = 0;
    lit.forEach(i => g[i].style.background = '#f2b800');
    c.after(700 + k * 120, () => { lit.forEach(i => g[i].style.background = ''); input = true; });
    g.forEach((t, i) => tap(t, () => {
      if (!input || t.dataset.ok) return;
      if (lit.has(i)) { t.dataset.ok = 1; t.style.background = '#1fbf75'; if (++hit === k) { input = false; c.good(k); k = Math.min(9, k + 1); c.after(450, round); } }
      else { input = false; t.style.background = '#ff4d4f'; lit.forEach(j => g[j].style.background = '#f2b80088'); c.bad(0); k = Math.max(3, k - 1); c.after(700, round); }
    }));
  };
  round();
} });

reg({ id: 'sortnum', cat: RC, em: '📶', name: '작은 수부터', desc: '가장 작은 수부터 차례대로 누르세요.', dur: 30, start(c) {
  const round = () => {
    c.clear(); const set = new Set(); while (set.size < 6) set.add(c.ri(1, 99));
    const nums = [...set], sorted = nums.slice().sort((a, b) => a - b); let p = 0;
    c.grid(3, 2).forEach((t, i) => { t.textContent = nums[i]; tap(t, () => {
      if (t.dataset.ok) return;
      if (nums[i] === sorted[p]) { t.dataset.ok = 1; t.style.opacity = .25; p++; c.add(1, true); if (p === 6) { c.good(2); round(); } }
      else c.bad(1);
    }); });
  };
  round();
} });

reg({ id: 'piano', cat: RC, em: '🎹', name: '검은 건반', desc: '맨 아래 줄의 검은 건반만 빠르게 누르세요.', dur: 20, start(c) {
  let rows = [...Array(4)].map(() => c.ri(0, 3));
  const g = c.grid(4, 4); g.forEach(t => t.style.borderRadius = '8px');
  const draw = () => g.forEach((t, i) => { const r = 3 - Math.floor(i / 4), col = i % 4; const blk = rows[r] === col; t.style.background = blk ? (r === 0 ? 'var(--pc,var(--ink))' : 'var(--ink)') : ''; t.style.opacity = r === 0 ? 1 : .8; });
  g.forEach((t, i) => tap(t, () => {
    const r = 3 - Math.floor(i / 4), col = i % 4; if (r !== 0) return;
    if (rows[0] === col) { c.add(1, true); rows = [...rows.slice(1), c.ri(0, 3)]; draw(); } else c.bad(1);
  }));
  draw();
} });

reg({ id: 'rhythm', cat: RC, em: '🥁', name: '리듬 탭', desc: '음표가 선에 닿을 때 아래 버튼을 누르세요.', dur: 30, start(c) {
  const area = el('div'); area.style.cssText = 'position:relative;flex:1';
  const line = el('div'); line.style.cssText = 'position:absolute;left:0;right:0;top:82%;height:4px;background:var(--pc,var(--accent))';
  area.appendChild(line);
  for (let l = 1; l < 3; l++) { const s = el('div'); s.style.cssText = `position:absolute;top:0;bottom:0;left:${l * 33.33}%;width:2px;background:var(--line)`; area.appendChild(s); }
  const btns = el('div', 'bgrid'); btns.style.cssText = 'grid-template-columns:repeat(3,1fr);flex:0 0 22%';
  c.el.append(area, btns);
  const notes = [], E = ['🔴', '🟢', '🔵'];
  for (let l = 0; l < 3; l++) {
    const b = el('button', 'tile', E[l]); btns.appendChild(b);
    tap(b, () => {
      const n = notes.find(n => !n.dead && n.l === l && Math.abs(n.y - 82) < 11);
      if (n) { n.dead = true; n.d.remove(); c.add(1, true); c.flash(true); } else c.bad(1);
    });
  }
  let sp = 30;
  c.every(560, () => {
    const l = c.ri(0, 2), d = el('div', '', E[l]);
    d.style.cssText = `position:absolute;font-size:9cqmin;left:${l * 33.33 + 16.6}%;transform:translate(-50%,-50%);top:0`;
    area.appendChild(d); notes.push({ l, y: -5, d });
  });
  c.loop(dt => { sp += dt * .8; for (const n of notes) { if (n.dead) continue; n.y += sp * dt; n.d.style.top = n.y + '%'; if (n.y > 105) { n.dead = true; n.d.remove(); } } });
} });

reg({ id: 'truefalse', cat: RC, em: '⭕', name: '맞다 틀리다', desc: '계산식이 맞으면 ⭕, 틀리면 ❌!', dur: 30, start(c) {
  c.quiz(() => {
    const a = c.ri(2, 12), b = c.ri(2, 12), op = c.pick(['+', '×', '−']);
    const real = op === '+' ? a + b : op === '×' ? a * b : a - b, ok = c.r() < .5;
    const shown = ok ? real : real + c.pick([-3, -2, -1, 1, 2, 3]);
    return { q: `${a} ${op} ${b} = ${shown}`, opts: ['⭕', '❌'], ans: ok ? 0 : 1 };
  });
} });

reg({ id: 'hilo', cat: RC, em: '🃏', name: '높을까 낮을까', desc: '다음 숫자가 지금보다 클지 작을지 맞히세요.', dur: 30, start(c) {
  let cur = c.ri(1, 9);
  c.quiz(() => {
    let nx; do { nx = c.ri(1, 9); } while (nx === cur);
    const Q = { q: `<div><div class="small">지금 숫자</div>${cur}</div>`, opts: ['⬆ 더 크다', '⬇ 더 작다'], ans: nx > cur ? 0 : 1 };
    cur = nx; return Q;
  }, { penalty: 0 });
} });

reg({ id: 'rpsfast', cat: RC, em: '✌️', name: '이기는 손', desc: '지시에 따라 이기거나 지는 손을 내세요.', dur: 30, start(c) {
  const H = ['✊', '✋', '✌️'];
  c.quiz(() => {
    const h = c.ri(0, 2), win = c.r() < .6, ans = win ? (h + 1) % 3 : (h + 2) % 3;
    return { q: `<div><div class="small" style="color:${win ? '#1fbf75' : '#ff4d4f'}">${win ? '이겨라!' : '져라!'}</div>${H[h]}</div>`, opts: H.slice(), ans, cols: 3 };
  });
} });

reg({ id: 'longer', cat: RC, em: '📏', name: '더 긴 막대', desc: '두 막대 중 더 긴 것을 누르세요.', dur: 25, start(c) {
  c.quiz(() => {
    const a = c.ri(30, 95); let b; do { b = a + c.ri(-14, 14); } while (Math.abs(b - a) < 3 || b > 98 || b < 20);
    const bar = w => { const d = el('div'); d.style.cssText = `height:30%;min-height:16px;width:${w}%;border-radius:8px;background:var(--pc,var(--accent));margin-left:${c.ri(0, 98 - w)}%`; const box = el('div'); box.style.cssText = 'width:100%;display:flex;align-items:center;height:100%'; box.appendChild(d); return box; };
    return { q: '더 긴 막대는?', opts: [bar(a), bar(b)], ans: a > b ? 0 : 1, cols: 1 };
  });
} });

reg({ id: 'same', cat: RC, em: '👀', name: '똑같나요?', desc: '두 줄의 그림이 완전히 같으면 ⭕, 다르면 ❌.', dur: 30, start(c) {
  c.quiz(() => {
    const row = c.shuffle(EMOJI).slice(0, 4), same = c.r() < .5, row2 = row.slice();
    if (!same) { const i = c.ri(0, 3), lk = LOOKALIKE.find(p => p[0] === row[i]); row2[i] = lk ? lk[1] : c.r() < .5 ? c.pick(EMOJI.filter(e => !row.includes(e))) : row[(i + 1) % 4]; if (row2[i] === row[i]) row2[i] = '🍀'; }
    return { q: `<div style="font-size:.8em;line-height:1.4">${row.join('')}<br>${row2.join('')}</div>`, opts: ['⭕ 같다', '❌ 다르다'], ans: same ? 0 : 1 };
  });
} });

reg({ id: 'morecolor', cat: RC, em: '🔴', name: '어느 색이 많을까', desc: '빨강과 파랑 중 더 많은 색을 고르세요.', dur: 30, start(c) {
  c.quiz(() => {
    const r = c.ri(4, 12), b = r + c.pick([-3, -2, -1, 1, 2, 3]), box = el('div', 'dotbox');
    box.style.cssText = 'position:absolute;inset:8px';
    const cells = c.shuffle([...Array(36).keys()]).slice(0, r + b);
    cells.forEach((k, j) => { const d = el('div', 'dot'); d.style.cssText = `width:6cqmin;height:6cqmin;background:${j < r ? '#ff4d4f' : '#2f8cff'};left:${(k % 6) * 16 + 2 + c.r() * 8}%;top:${Math.floor(k / 6) * 16 + 2 + c.r() * 6}%`; box.appendChild(d); });
    return { q: box, opts: ['빨강', '파랑'], ans: r > b ? 0 : 1, style: (btn, i) => { btn.style.background = i ? '#2f8cff' : '#ff4d4f'; btn.style.color = '#fff'; } };
  });
} });

reg({ id: 'stopwatch', cat: RC, em: '⏲️', name: '5초 맞추기', desc: '시작을 누르고 마음속으로 5초를 센 뒤 멈추세요.', dur: 45, start(c) {
  const disp = el('div', 'q', '5.00초'), b = el('button', 'tile', '시작');
  b.style.cssText = 'margin:0 16px 16px;flex:1;background:var(--pc,var(--accent));color:#fff;font-size:9cqmin';
  c.el.append(disp, b);
  let t0 = 0, run = false, busy = false;
  c.loop(() => { if (run) { const t = (performance.now() - t0) / 1000; disp.textContent = t < 1.2 ? t.toFixed(2) + '초' : '?.??초'; } });
  tap(b, () => {
    if (busy) return;
    if (!run) { run = true; t0 = performance.now(); b.textContent = '멈춰!'; return; }
    run = false; const t = (performance.now() - t0) / 1000, d = Math.abs(t - 5);
    const p = d < .05 ? 10 : d < .15 ? 6 : d < .3 ? 4 : d < .6 ? 2 : d < 1 ? 1 : 0;
    disp.textContent = t.toFixed(2) + '초'; if (p) c.good(p); else c.bad(0);
    busy = true; b.textContent = '…'; c.after(1200, () => { busy = false; b.textContent = '시작'; disp.textContent = '5.00초'; });
  });
} });

reg({ id: 'make10', cat: RC, em: '🔟', name: '10 만들기', desc: '더해서 10이 되는 두 숫자를 누르세요.', dur: 30, start(c) {
  const g = c.grid(4, 4); let v = [...Array(16)].map(() => c.ri(1, 9)), sel = -1;
  const ensure = () => {
    const has = v.some((a, i) => v.some((b, j) => i !== j && a + b === 10));
    if (!has) { const i = c.ri(0, 15); let j = c.ri(0, 15); if (j === i) j = (i + 1) % 16; v[j] = 10 - v[i]; if (v[j] === 0) { v[i] = 5; v[j] = 5; } }
  };
  const draw = () => g.forEach((t, i) => { t.textContent = v[i]; t.style.background = i === sel ? '#f2b800' : ''; });
  g.forEach((t, i) => tap(t, () => {
    if (sel < 0) { sel = i; }
    else if (sel === i) { sel = -1; }
    else if (v[sel] + v[i] === 10) { c.good(1); v[sel] = c.ri(1, 9); v[i] = c.ri(1, 9); sel = -1; ensure(); }
    else { c.bad(0); sel = -1; }
    draw();
  }));
  ensure(); draw();
} });
