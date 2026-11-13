// ===== 화면 / 모드 / 대결 진행 =====
const app = document.getElementById('app');
const S = {
  mode: null,              // 'solo' | 'local' | 'online'
  tab: Store.get('tab', 'all'),
  names: Store.get('names', ['빨강', '파랑']),
  myName: Store.get('myName', ''),
  oppName: '상대',
  onNet: null,             // 현재 화면의 네트워크 메시지 처리기
  cleanup: null
};
const byId = id => GAMES.find(g => g.id === id);
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

Net.onMsg(m => {
  if (m.t === 'hello') { S.oppName = String(m.name || '상대').slice(0, 12); if (S.onNet) S.onNet(m); return; }
  if (m.t === 'leave') { if (S.screen === 'play') { toast('상대가 게임을 나갔어요'); showList(); } return; }
  if (m.t === 'req' && Net.role === 'host') { startOnline(m.g); return; }
  if (m.t === 'start') { S.mode = 'online'; startGame(byId(m.g), m.seed); return; }
  if (S.onNet) S.onNet(m);
});
Net.onStatus((st, d) => {
  if (st === 'connected') { Net.send({ t: 'hello', name: S.myName || (Net.role === 'host' ? '방장' : '친구') }); if (S.onNet) S.onNet({ t: '_conn' }); }
  if (st === 'closed') { toast('연결이 끊어졌어요'); if (S.onNet) S.onNet({ t: '_closed' }); }
});

function toast(msg) {
  const t = el('div', '', esc(msg));
  t.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:12px 18px;border-radius:14px;font-weight:700;z-index:99;max-width:90vw;text-align:center';
  document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
}
function screen(name) {
  if (S.cleanup) { try { S.cleanup(); } catch (e) {} S.cleanup = null; }
  S.screen = name; S.onNet = null; app.innerHTML = ''; window.scrollTo(0, 0);
}

// ---------- 홈 ----------
function showHome() {
  screen('home');
  const p = el('div', 'page');
  p.innerHTML = `<h1>🎮 미니게임 놀이터</h1><p class="sub">손가락으로 톡톡! 미니게임 ${GAMES.length}개 · 혼자, 한 기기로 둘이, 두 기기로 둘이</p>`;
  const modes = el('div', 'modes');
  const add = (em, title, d, fn) => { const b = el('button', 'mode', `<div class="big">${em}</div><b>${title}</b><span>${d}</span>`); tap(b, fn); modes.appendChild(b); };
  add('🙋', '혼자 하기', '스피드 게임은 최고 기록 도전, 보드 게임은 컴퓨터와 대결', () => { S.mode = 'solo'; showList(); });
  add('👫', '한 기기로 둘이', '아이패드를 가운데 두고 마주 앉아 위·아래로 나눠서 대결', () => { S.mode = 'local'; showList(); });
  add('📱📱', '두 기기로 둘이', '방 번호로 친구 기기와 연결해서 대결', () => { S.mode = 'online'; showLobby(); });
  p.appendChild(modes);
  const tip = el('div', 'panel');
  tip.style.marginTop = '16px';
  tip.innerHTML = `<b>📲 앱처럼 설치하기</b><div class="small" style="margin-top:6px;line-height:1.6">아이폰·아이패드(사파리): 아래 <b>공유 버튼(□↑)</b> → <b>홈 화면에 추가</b><br>안드로이드(크롬): 오른쪽 위 <b>⋮</b> → <b>홈 화면에 추가</b></div>`;
  p.appendChild(tip);
  app.appendChild(p);
}

// ---------- 게임 목록 ----------
function showList() {
  screen('list');
  const p = el('div', 'page');
  const top = el('div', 'topbar');
  const back = el('button', 'back', '← 처음으로');
  tap(back, () => { if (S.mode === 'online') { Net.send({ t: 'leave' }); Net.close(); } showHome(); });
  const label = { solo: '🙋 혼자 하기', local: '👫 한 기기로 둘이', online: '📱 두 기기로 둘이' }[S.mode];
  top.append(back, el('span', 'tag', label));
  if (S.mode === 'online') top.appendChild(el('span', 'tag', Net.connected ? `🟢 ${esc(S.oppName)}와 연결됨 · 방 ${Net.code}` : '🔴 연결 끊김'));
  p.appendChild(top);

  if (S.mode === 'local') {
    const nb = el('div', 'namebar');
    [0, 1].forEach(i => {
      const inp = el('input'); inp.value = S.names[i]; inp.maxLength = 10; inp.placeholder = i ? '파랑 이름' : '빨강 이름';
      inp.style.borderColor = i ? 'var(--p2)' : 'var(--p1)';
      inp.addEventListener('input', () => { S.names[i] = inp.value || (i ? '파랑' : '빨강'); Store.set('names', S.names); });
      nb.appendChild(inp);
    });
    p.appendChild(nb);
  }
  if (S.mode === 'online' && Net.role === 'guest') p.appendChild(el('p', 'sub', '게임을 누르면 방장에게 요청해서 둘 다 함께 시작해요.'));

  const tabs = el('div', 'tabs');
  const T = [['all', `전체 ${GAMES.length}`], ['race', `⚡ 스피드 ${GAMES.filter(g => g.cat === 'race').length}`], ['board', `♟️ 보드 ${GAMES.filter(g => g.cat === 'board').length}`]];
  T.forEach(([k, t]) => { const b = el('button', S.tab === k ? 'on' : '', t); tap(b, () => { S.tab = k; Store.set('tab', k); showList(); }); tabs.appendChild(b); });
  p.appendChild(tabs);

  const grid = el('div', 'grid');
  GAMES.filter(g => S.tab === 'all' || g.cat === S.tab).forEach(g => {
    const best = Store.get('best_' + g.id, null);
    const sub = g.cat === 'race' ? (S.mode === 'solo' ? '최고기록 도전' : '같은 문제로 점수 대결') : (S.mode === 'solo' ? '컴퓨터와 대결' : '번갈아 두기');
    const c = el('button', 'card', `<div class="em">${g.em}</div><b>${g.name}</b><small>${sub}</small>${S.mode === 'solo' && g.cat === 'race' && best != null ? `<span class="best">🏆 ${best}</span>` : ''}`);
    let moved = false, y0 = 0;
    c.addEventListener('pointerdown', e => { moved = false; y0 = e.clientY; });
    c.addEventListener('pointermove', e => { if (Math.abs(e.clientY - y0) > 10) moved = true; });
    c.addEventListener('click', () => { if (!moved) pick(g); });
    grid.appendChild(c);
  });
  p.appendChild(grid);
  app.appendChild(p);
  if (S.mode === 'online') S.onNet = m => { if (m.t === 'hello' || m.t === '_conn' || m.t === '_closed') showList(); };
}
function pick(g) {
  if (S.mode === 'online') {
    if (!Net.connected) { toast('먼저 친구와 연결하세요'); showLobby(); return; }
    if (Net.role === 'host') startOnline(g.id); else { Net.send({ t: 'req', g: g.id }); toast('방장에게 요청했어요…'); }
    return;
  }
  startGame(g, newSeed());
}
function startOnline(id) { const seed = newSeed(); Net.send({ t: 'start', g: id, seed }); startGame(byId(id), seed); }
function startGame(g, seed) { if (!g) return; if (g.cat === 'race') playRace(g, seed); else playBoard(g, seed); }

// ---------- 온라인 로비 ----------
function showLobby(prefill) {
  screen('lobby');
  const p = el('div', 'page');
  const top = el('div', 'topbar'); const back = el('button', 'back', '← 처음으로');
  tap(back, () => { Net.close(); showHome(); }); top.append(back, el('span', 'tag', '📱 두 기기로 둘이')); p.appendChild(top);

  const nameP = el('div', 'panel', '<b>내 이름</b>');
  const nb = el('div', 'namebar'); const inp = el('input'); inp.value = S.myName; inp.maxLength = 10; inp.placeholder = '이름 (예: 지민)';
  inp.addEventListener('input', () => { S.myName = inp.value; Store.set('myName', inp.value); });
  nb.appendChild(inp); nameP.appendChild(nb); p.appendChild(nameP);

  const hostP = el('div', 'panel', '<b>방 만들기</b><p class="small">방 번호를 친구에게 알려주거나 링크를 문자로 보내세요.</p>');
  const hb = el('button', 'btn', '🏠 방 만들기'); const hostOut = el('div'); hostP.append(hb, hostOut); p.appendChild(hostP);

  const joinP = el('div', 'panel', '<b>방 들어가기</b><p class="small">친구가 알려준 4자리 방 번호를 입력하세요.</p>');
  const row = el('div', 'row'); const code = el('input', 'code'); code.inputMode = 'numeric'; code.maxLength = 4; code.placeholder = '0000'; if (prefill) code.value = prefill;
  const jb = el('button', 'btn', '들어가기'); const joinOut = el('div', 'status');
  row.append(code, jb); joinP.append(row, joinOut); p.appendChild(joinP);
  app.appendChild(p);

  const waitingConn = () => { S.onNet = m => { if (m.t === 'hello') { toast(`${S.oppName}와 연결됐어요!`); showList(); } }; };
  tap(hb, async () => {
    hostOut.innerHTML = '<p class="status">방을 만드는 중…</p>';
    try {
      const c = await Net.host();
      const inClaude = Net.mode() === 'room';
      const link = location.origin + location.pathname + '?room=' + c;
      hostOut.innerHTML = `<div class="codebig">${c}</div><p class="status">친구를 기다리는 중… ⏳</p>`;
      if (!inClaude) {
        const r = el('div', 'row');
        const sh = el('button', 'btn ghost', '🔗 링크 보내기');
        tap(sh, async () => {
          const text = `미니게임 같이 하자! 방 번호 ${c}`;
          try { if (navigator.share) { await navigator.share({ title: '미니게임 놀이터', text, url: link }); return; } } catch (e) { return; }
          try { await navigator.clipboard.writeText(link); toast('링크를 복사했어요. 문자에 붙여넣으세요!'); } catch (e) { prompt('이 링크를 복사하세요', link); }
        });
        r.appendChild(sh); hostOut.appendChild(r);
      }
      waitingConn();
    } catch (e) { hostOut.innerHTML = `<p class="status">방을 만들 수 없어요: ${esc(e.message || e.type || e)}<br>인터넷 연결을 확인해 주세요.</p>`; }
  });
  const doJoin = async () => {
    const v = code.value.trim(); if (!/^\d{4}$/.test(v)) { joinOut.textContent = '4자리 숫자를 입력하세요'; return; }
    joinOut.textContent = '연결하는 중… ⏳';
    waitingConn();
    try { await Net.join(v); joinOut.textContent = '연결됐어요!'; }
    catch (e) { joinOut.textContent = '😢 ' + (e.message || '연결 실패'); }
  };
  tap(jb, doJoin);
  if (prefill) doJoin();
}

// ---------- 스피드 대결 진행 ----------
function playRace(g, seed) {
  screen('play');
  const mode = S.mode;
  const wrap = el('div', 'play'); app.appendChild(wrap);
  const players = mode === 'local'
    ? [{ name: S.names[0], cls: 'p1', flip: true }, { name: S.names[1], cls: 'p2' }]
    : [{ name: mode === 'online' ? (S.myName || '나') : '나', cls: mode === 'online' ? (Net.role === 'host' ? 'p1' : 'p2') : '' }];
  const Z = players.map((pl, i) => {
    if (i) wrap.appendChild(el('div', 'divider'));
    const z = el('div', `zone ${pl.cls}${pl.flip ? ' flip' : ''}`);
    const hud = el('div', 'hud');
    const x = el('button', 'x', '✕'); tap(x, () => exit());
    const who = el('div', 'who', `${g.em} ${esc(pl.name)}`), opp = el('div', 'opp'), sc = el('div', 'score', '0');
    hud.append(x, who, opp, sc);
    const tb = el('div', 'tbar', '<i></i>'), stage = el('div', 'stage');
    z.append(hud, tb, stage); wrap.appendChild(z);
    return { z, sc, opp, bar: tb.firstChild, stage, ctx: null, score: 0 };
  });
  let oppScore = 0, oppDone = false, myDone = false, ended = false, iv = null, lastSent = 0;
  const showOpp = () => { if (mode === 'online') Z[0].opp.textContent = `${S.oppName} ${oppScore}${oppDone ? ' (끝)' : ''}`; };
  showOpp();

  // 준비 화면 → 카운트다운
  Z.forEach(zz => {
    const ov = el('div', 'overlay', `<div class="cnt">3</div><div class="t">${g.em} ${g.name}</div><div class="d">${g.desc}</div>`);
    zz.stage.appendChild(ov); zz.ov = ov;
  });
  let n = 3;
  const cd = setInterval(() => {
    n--;
    Z.forEach(zz => zz.ov.querySelector('.cnt').textContent = n > 0 ? n : '시작!');
    if (n <= 0) { clearInterval(cd); setTimeout(begin, 450); }
  }, 900);

  function begin() {
    if (S.screen !== 'play' || ended) return;
    Z.forEach(zz => {
      zz.ov.remove();
      zz.ctx = makeRaceCtx(zz.stage, seed, s => {
        zz.score = s; zz.sc.textContent = s;
        if (mode === 'online' && Date.now() - lastSent > 350) { lastSent = Date.now(); Net.send({ t: 'score', s }); }
      });
      try { g.start(zz.ctx); } catch (e) { console.error(e); }
    });
    const t0 = Date.now(), dur = g.dur * 1000;
    iv = setInterval(() => {
      const left = Math.max(0, 1 - (Date.now() - t0) / dur);
      Z.forEach(zz => zz.bar.style.width = (left * 100) + '%');
      if (left <= 0) finish();
    }, 100);
  }
  function stopAll() { clearInterval(cd); clearInterval(iv); Z.forEach(zz => zz.ctx && zz.ctx.stop()); }
  function finish() {
    if (myDone) return; myDone = true; stopAll();
    if (mode === 'online') { Net.send({ t: 'score', s: Z[0].score, done: true }); if (!oppDone) { waitOverlay(); return; } }
    results();
  }
  function waitOverlay() { const ov = el('div', 'overlay', `<div class="t">끝! 내 점수 ${Z[0].score}</div><div class="d">${esc(S.oppName)}의 결과를 기다리는 중… ⏳</div>`); Z[0].stage.appendChild(ov); Z[0].wait = ov; }
  function results() {
    if (ended) return; ended = true;
    if (mode === 'solo') {
      const s = Z[0].score, key = 'best_' + g.id, best = Store.get(key, null), rec = best == null || s > best;
      if (rec) Store.set(key, s);
      resultBox(Z[0], rec ? '🏆' : '👏', rec ? '새 최고 기록!' : '수고했어요!', `점수 ${s} · 최고 ${rec ? s : best}`);
    } else if (mode === 'local') {
      const [a, b] = [Z[0].score, Z[1].score];
      Z.forEach((zz, i) => {
        const me = i ? b : a, ot = i ? a : b;
        resultBox(zz, me > ot ? '🥇' : me < ot ? '🥈' : '🤝', me > ot ? '승리!' : me < ot ? '아쉬워요!' : '무승부!', `${esc(S.names[0])} ${a} : ${b} ${esc(S.names[1])}`);
      });
    } else {
      const a = Z[0].score, b = oppScore;
      if (Z[0].wait) Z[0].wait.remove();
      resultBox(Z[0], a > b ? '🥇' : a < b ? '🥈' : '🤝', a > b ? '승리!' : a < b ? '아쉬워요!' : '무승부!', `나 ${a} : ${b} ${esc(S.oppName)}`);
    }
  }
  function resultBox(zz, em, title, line) {
    const ov = el('div', 'overlay', `<div class="res">${em}</div><div class="t">${title}</div><div class="d">${line}</div>`);
    const r = el('div', 'row'); r.style.justifyContent = 'center';
    const again = el('button', 'btn', '🔄 다시 하기'), list = el('button', 'btn ghost', '📋 게임 목록');
    tap(again, () => { if (mode === 'online') { if (Net.role === 'host') startOnline(g.id); else { Net.send({ t: 'req', g: g.id }); toast('방장에게 요청했어요…'); } } else playRace(g, newSeed()); });
    tap(list, () => showList());
    r.append(again, list); ov.appendChild(r); zz.stage.appendChild(ov);
  }
  function exit() { stopAll(); if (mode === 'online' && !ended) Net.send({ t: 'leave' }); showList(); }
  S.onNet = m => {
    if (m.t === 'score') { oppScore = m.s; if (m.done) oppDone = true; showOpp(); if (oppDone && myDone) results(); }
    if (m.t === '_closed' && myDone) { oppDone = true; results(); }
  };
  S.cleanup = stopAll;
}

// ---------- 보드 대결 진행 ----------
function playBoard(g, seed) {
  screen('play');
  const mode = S.mode;
  const me = mode === 'online' ? (Net.role === 'host' ? 0 : 1) : 0;
  const names = mode === 'local' ? S.names.slice() : mode === 'solo' ? ['나', '컴퓨터 🤖'] : (me === 0 ? [S.myName || '나', S.oppName] : [S.oppName, S.myName || '나']);
  const aiRng = rngFrom(seed ^ 0x5bd1e995);
  let s = g.init(rngFrom(seed)), count = 0, over = false, aiT = null;
  const wrap = el('div', 'play'); app.appendChild(wrap);

  const can = () => !over && (mode === 'local' || g.turn(s) === me);
  function draw() {
    wrap.innerHTML = '';
    const tb = el('div', 'turnbar');
    const x = el('button', 'x back', '✕'); tap(x, exit); tb.appendChild(x);
    const t = g.turn(s);
    [0, 1].forEach(i => tb.appendChild(el('div', `pl ${i ? 'b' : 'a'}${!over && t === i ? ' on' : ''}`, `${i ? '🔵' : '🔴'} ${esc(names[i])}${mode === 'online' && i === me ? ' (나)' : ''}`)));
    wrap.appendChild(tb);
    const turnTxt = over ? '' : mode === 'local' ? `${esc(names[t])} 차례` : t === me ? '내 차례!' : mode === 'solo' ? '컴퓨터가 생각 중… 🤔' : `${esc(names[t])} 차례 기다리는 중…`;
    wrap.appendChild(el('div', 'msgline', `${g.em} ${g.name} · ${turnTxt}${g.info ? ' · ' + g.info(s) : ''}`));
    const box = el('div'); box.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0';
    wrap.appendChild(box);
    g.render(box, s, { can: can(), play, names, me });
    const w = g.winner(s);
    if (w != null) {
      over = true;
      const title = w === 'draw' ? '🤝 무승부!' : mode === 'local' ? `🎉 ${esc(names[w])} 승리!` : w === me ? '🎉 승리!' : '😢 졌어요!';
      const ov = el('div', 'overlay', `<div class="t" style="font-size:34px">${title}</div>${g.info ? `<div class="d">${g.info(s)}</div>` : ''}`);
      ov.style.background = 'color-mix(in srgb,var(--bg) 70%,transparent)';
      const r = el('div', 'row'); r.style.justifyContent = 'center';
      const again = el('button', 'btn', '🔄 다시 하기'), list = el('button', 'btn ghost', '📋 게임 목록');
      tap(again, () => { if (mode === 'online') { if (Net.role === 'host') startOnline(g.id); else { Net.send({ t: 'req', g: g.id }); toast('방장에게 요청했어요…'); } } else playBoard(g, newSeed()); });
      tap(list, () => showList());
      r.append(again, list); ov.appendChild(r);
      setTimeout(() => { if (S.screen === 'play' && wrap.isConnected) wrap.appendChild(ov); }, 700);
    }
  }
  function commit(ns, m, local) {
    s = ns; count++;
    if (mode === 'online' && local) Net.send({ t: 'move', n: count, m });
    draw();
    if (!over && mode === 'solo' && g.turn(s) === 1) {
      aiT = setTimeout(() => { if (over || S.screen !== 'play') return; const mv = g.ai(s, aiRng); const n2 = mv != null && g.apply(s, mv); if (n2) commit(n2, mv, false); }, g.aiDelay || 550);
    }
  }
  function play(m) {
    if (!can()) { if (!over) toast('지금은 내 차례가 아니에요'); return; }
    const ns = g.apply(s, m);
    if (!ns) { wrap.classList.remove('flashb'); void wrap.offsetWidth; wrap.classList.add('flashb'); return; }
    commit(ns, m, true);
  }
  function exit() { clearTimeout(aiT); if (mode === 'online' && !over) Net.send({ t: 'leave' }); showList(); }
  S.onNet = msg => {
    if (msg.t === 'move' && msg.n === count + 1 && !over) { const ns = g.apply(s, msg.m); if (ns) commit(ns, msg.m, false); }
    if (msg.t === '_closed') draw();
  };
  S.cleanup = () => clearTimeout(aiT);
  draw();
}

// ---------- 시작 ----------
(function boot() {
  const q = new URLSearchParams(location.search).get('room');
  if (q && /^\d{4}$/.test(q)) { S.mode = 'online'; showLobby(q); }
  else showHome();
})();
