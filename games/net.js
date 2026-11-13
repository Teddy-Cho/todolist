// 두 기기 연결: claude.ai 안에서는 room(presence) 채널, 그 밖(일반 웹)에서는 PeerJS(WebRTC)
const Net = (() => {
  const PREFIX = 'mg40play-';
  let mode = null;          // 'peer' | 'room'
  let peer = null, conn = null, room = null, roomUnsub = null;
  let msgFn = () => {}, statusFn = () => {};
  let outbox = [], seq = 0, lastIn = 0, otherPeer = null;
  const api = { role: null, code: null, connected: false };

  function status(s, detail) { statusFn(s, detail); }
  function deliver(m) { try { msgFn(m); } catch (e) { console.error(e); } }

  async function getRoom() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return null;
      return await Promise.race([window.claude.use('room'), new Promise(r => setTimeout(() => r(null), 5000))]);
    } catch (e) { return null; }
  }
  function loadPeerLib() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('PeerJS 로드 실패'));
      document.head.appendChild(s);
    });
  }
  function newCode() { return String(Math.floor(1000 + Math.random() * 9000)); }

  // ---------- PeerJS ----------
  function wire(c) {
    conn = c;
    c.on('open', () => { api.connected = true; status('connected'); });
    c.on('data', d => { try { deliver(typeof d === 'string' ? JSON.parse(d) : d); } catch (e) {} });
    c.on('close', () => { api.connected = false; status('closed'); });
    c.on('error', () => { api.connected = false; status('error', '연결 오류'); });
  }
  async function peerHost(tries = 0) {
    await loadPeerLib();
    const code = newCode();
    return new Promise((res, rej) => {
      const p = new window.Peer(PREFIX + code);
      p.on('open', () => { peer = p; api.code = code; res(code); });
      p.on('connection', c => { if (conn && api.connected) { c.close(); return; } wire(c); });
      p.on('error', e => {
        if (e.type === 'unavailable-id' && tries < 5) { p.destroy(); peerHost(tries + 1).then(res, rej); }
        else if (!api.code) rej(e); else status('error', e.type);
      });
      p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
    });
  }
  async function peerJoin(code) {
    await loadPeerLib();
    return new Promise((res, rej) => {
      const p = new window.Peer();
      peer = p;
      let done = false;
      p.on('open', () => {
        const c = p.connect(PREFIX + code, { reliable: true });
        wire(c);
        c.on('open', () => { done = true; res(); });
      });
      p.on('error', e => {
        if (!done) rej(new Error(e.type === 'peer-unavailable' ? '그 방 번호를 찾을 수 없어요' : '연결 실패 (' + e.type + ')'));
        else status('error', e.type);
      });
      setTimeout(() => { if (!done) rej(new Error('연결 시간이 초과됐어요')); }, 15000);
    });
  }

  // ---------- claude room (presence 기반 메시지) ----------
  async function roomOpen(code) {
    const base = await getRoom();
    if (!base) return false;
    room = await base.join(PREFIX + code);
    outbox = []; seq = 0; lastIn = 0; otherPeer = null;
    await room.presence({ role: api.role, out: [] });
    roomUnsub = room.onPeers(ch => {
      const others = ch.peers.filter(p => !p.isMe && p.presence && p.presence.role && p.presence.role !== api.role);
      const o = others[0];
      if (!o) { if (api.connected) { api.connected = false; status('closed'); } return; }
      if (otherPeer !== o.peer) { otherPeer = o.peer; lastIn = 0; }
      if (!api.connected) { api.connected = true; status('connected'); }
      const out = Array.isArray(o.presence.out) ? o.presence.out : [];
      for (const m of out) { if (m && m.q > lastIn) { lastIn = m.q; deliver(m.d); } }
    });
    return true;
  }
  function roomSend(obj) {
    seq += 1; outbox.push({ q: seq, d: obj });
    if (outbox.length > 40) outbox = outbox.slice(-40);
    room.presence({ role: api.role, out: outbox }).catch(() => {});
  }

  api.onMsg = fn => { msgFn = fn; };
  api.onStatus = fn => { statusFn = fn; };
  api.host = async () => {
    api.close(); api.role = 'host';
    const r = await getRoom();
    if (r) { mode = 'room'; api.code = newCode(); await roomOpen(api.code); return api.code; }
    mode = 'peer'; return peerHost();
  };
  api.join = async code => {
    api.close(); api.role = 'guest'; api.code = code;
    const r = await getRoom();
    if (r) {
      mode = 'room'; await roomOpen(code);
      await new Promise((res, rej) => {
        const t0 = Date.now();
        const iv = setInterval(() => {
          if (api.connected) { clearInterval(iv); res(); }
          else if (Date.now() - t0 > 15000) { clearInterval(iv); rej(new Error('그 방 번호에 아무도 없어요')); }
        }, 200);
      });
      return;
    }
    mode = 'peer'; await peerJoin(code); api.connected = true;
  };
  api.send = obj => {
    if (!api.connected) return;
    if (mode === 'peer' && conn) { try { conn.send(JSON.stringify(obj)); } catch (e) {} }
    else if (mode === 'room' && room) roomSend(obj);
  };
  api.close = () => {
    try { if (conn) conn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    try { if (roomUnsub) roomUnsub(); if (room) room.leave(); } catch (e) {}
    conn = peer = room = roomUnsub = null; api.connected = false; api.code = null; mode = null;
  };
  api.mode = () => mode;
  return api;
})();
