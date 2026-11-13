// 공통 유틸 + 게임 등록 + 스피드 대결용 컨텍스트
const GAMES = [];
function reg(g) { GAMES.push(g); }

function rngFrom(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function tap(node, fn) {
  node.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(e); });
  return node;
}
function shuffleWith(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const COLORS = [
  { n: '빨강', c: '#ff4d4f' }, { n: '파랑', c: '#2f8cff' }, { n: '초록', c: '#1fbf75' },
  { n: '노랑', c: '#f2b800' }, { n: '보라', c: '#9b5cff' }, { n: '주황', c: '#ff8a1f' }
];
const EMOJI = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🐶', '🐱', '🐰', '🦊', '🐼', '🐸', '🐵', '🐧', '🚗', '🚀', '⚽', '🎈', '⭐', '🌈', '🍩', '🍦', '🦄', '🐙', '🌻', '🍄'];
const LOOKALIKE = [['😀', '😃'], ['🐶', '🐕'], ['🍎', '🍅'], ['🌕', '🌝'], ['🐱', '🐈'], ['⭐', '🌟'], ['🍊', '🍑'], ['🚗', '🚙'], ['🐻', '🐨'], ['💚', '💙']];

const Store = {
  get(k, d) { try { const v = localStorage.getItem('mg40.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mg40.' + k, JSON.stringify(v)); } catch (e) {} }
};

// 스피드 대결 게임 하나를 stage 안에서 돌리는 컨텍스트
function makeRaceCtx(stage, seed, onScore) {
  const timers = [];
  let alive = true;
  const rng = rngFrom(seed);
  const root = el('div');
  root.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;';
  stage.appendChild(root);
  const c = {
    el: root, stage, rng, score: 0,
    r: () => rng(),
    ri: (a, b) => a + Math.floor(rng() * (b - a + 1)),
    pick: a => a[Math.floor(rng() * a.length)],
    shuffle: a => shuffleWith(a, rng),
    add(n, quiet) {
      c.score = Math.max(0, c.score + n); onScore(c.score);
      if (!quiet) c.fx((n > 0 ? '+' : '') + n, n > 0 ? 'var(--good)' : 'var(--bad)');
    },
    good(n = 1, quiet) { c.add(n, quiet); c.flash(true); },
    bad(n = 1) { if (n) c.add(-n); c.flash(false); },
    flash(ok) {
      const cls = ok ? 'flashg' : 'flashb';
      stage.classList.remove('flashg', 'flashb'); void stage.offsetWidth; stage.classList.add(cls);
    },
    fx(text, color) {
      const f = el('div', 'fx', text); f.style.color = color || 'var(--accent)';
      stage.appendChild(f); setTimeout(() => f.remove(), 650);
    },
    every(ms, fn) { const id = setInterval(() => alive && fn(), ms); timers.push(() => clearInterval(id)); return id; },
    after(ms, fn) { const id = setTimeout(() => alive && fn(), ms); timers.push(() => clearTimeout(id)); return id; },
    loop(fn) {
      let last = performance.now(), id;
      const f = t => { if (!alive) return; fn(Math.min(50, t - last) / 1000, t); last = t; id = requestAnimationFrame(f); };
      id = requestAnimationFrame(f);
      timers.push(() => cancelAnimationFrame(id));
    },
    clear() { root.innerHTML = ''; },
    grid(cols, rows, cls = 'tile') {
      const g = el('div', 'bgrid');
      g.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      g.style.gridTemplateRows = `repeat(${rows},1fr)`;
      const tiles = [];
      for (let i = 0; i < cols * rows; i++) { const t = el('button', cls); g.appendChild(t); tiles.push(t); }
      root.appendChild(g);
      return tiles;
    },
    // 문제 + 보기 버튼형 게임
    quiz(gen, opt = {}) {
      const next = () => {
        if (!alive) return;
        const Q = gen();
        root.innerHTML = '';
        const q = el('div', 'q');
        if (typeof Q.q === 'string') q.innerHTML = Q.q; else q.appendChild(Q.q);
        root.appendChild(q);
        const o = el('div', 'opts');
        o.style.gridTemplateColumns = `repeat(${Q.cols || opt.cols || 2},1fr)`;
        Q.opts.forEach((lab, i) => {
          const b = el('button');
          if (typeof lab === 'string') b.innerHTML = lab; else b.appendChild(lab);
          if (Q.style) Q.style(b, i);
          tap(b, () => { if (i === Q.ans) c.good(Q.pts || 1); else c.bad(opt.penalty == null ? 1 : opt.penalty); next(); });
          o.appendChild(b);
        });
        root.appendChild(o);
      };
      next();
    },
    numOpts(ans, k = 4, spread = 4) {
      const s = new Set([ans]);
      while (s.size < k) { const v = ans + c.ri(-spread, spread); if (v !== ans && v >= 0) s.add(v); }
      const opts = c.shuffle([...s]);
      return { opts: opts.map(String), ans: opts.indexOf(ans) };
    },
    stop() { alive = false; timers.forEach(f => f()); },
    get alive() { return alive; }
  };
  return c;
}
