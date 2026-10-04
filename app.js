// Party Hub — núcleo: hub de jogos, salas e rede.
// O celular do Host guarda o estado da sala (room) e envia a cada jogador, via WebRTC (PeerJS),
// só o que ele pode ver. Sem servidor próprio.
// Cada jogo vive em games/<id>.js e se registra em GAMES (veja games/impostor.js como modelo).
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const PREFIX = 'partyhub-v1-';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I
const newCode = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), n => CHARS[n % CHARS.length]).join('');
const GAMES = {};

let me = localStorage.getItem('pg-name') || '';
// Quem não digitar nome vira "Usuário 1234" (fixo neste aparelho, para reconectar com o mesmo nome)
const guest = localStorage.getItem('pg-guest') || `Usuário ${1000 + Math.floor(Math.random() * 9000)}`;
localStorage.setItem('pg-guest', guest);
const deviceId = localStorage.getItem('pg-id') || Math.random().toString(36).slice(2) + Date.now().toString(36);
localStorage.setItem('pg-id', deviceId);
let peer, hostConn, room, view, error = '', selected = null; // selected = jogo aberto no hub
let lastSeen = 0, rejoinAt = 0, wake = null; // conexão com o host / tela acesa

// ---------- Host ----------
function createRoom(game) {
  const code = newCode();
  peer = new Peer(PREFIX + code);
  peer.on('open', () => {
    room = { code, game, host: me, phase: 'lobby', players: [{ name: me }], settings: structuredClone(GAMES[game].settings || {}) };
    sync();
  });
  peer.on('connection', onGuest);
  peer.on('disconnected', () => !peer.destroyed && peer.reconnect()); // conexões já abertas continuam
  peer.on('error', e => {
    if (e.type === 'unavailable-id') { peer.destroy(); createRoom(game); }
    else if (!room) fail('Erro ao criar sala: ' + e.type);
  });
}

function onGuest(conn) {
  const name = String(conn.metadata?.name || '').trim().slice(0, 20);
  const id = String(conn.metadata?.id || '');
  conn.on('open', () => {
    const p = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
    const reject = msg => { conn.send({ type: 'error', msg }); setTimeout(() => conn.close(), 500); };
    // mesmo aparelho voltando assume a vaga, mesmo que a conexão antiga ainda pareça aberta
    if (conn.metadata?.game !== room.game) return reject('Esse código é de uma sala de outro jogo.');
    if (!name || (p && (p.name === room.host || (p.conn?.open && p.id !== id)))) return reject('Nome vazio ou já em uso nesta sala.');
    if (!p && room.players.length >= (GAMES[room.game].max || 20)) return reject('Sala cheia.');
    if (p) { if (p.conn !== conn) p.conn?.close(); Object.assign(p, { conn, id }); } // reconexão: recupera o mesmo papel
    else room.players.push({ name, id, conn });
    const who = p?.name || name;
    conn.on('data', m => { // jogador apertou um botão do jogo; o jogo decide se ele pode
      const fn = m?.type === 'act' && GAMES[room.game].actions?.[m.act];
      if (fn) { fn(room, m.v, who); sync(); }
    });
    conn.on('close', () => {
      if (room.phase === 'lobby') room.players = room.players.filter(x => x.conn !== conn);
      sync();
    });
    sync();
  });
}

const online = p => p.name === room.host || p.conn?.open;

function stateFor(name) {
  return {
    code: room.code, game: room.game, host: room.host, phase: room.phase, settings: room.settings, you: name, // nome oficial na sala
    players: room.players.map(p => ({ name: p.name, on: !!online(p) })),
    data: room.phase === 'game' ? GAMES[room.game].stateFor(room, name) : null, // parte privada de cada jogador
  };
}

function sync() {
  for (const p of room.players) if (p.conn?.open) p.conn.send({ type: 'state', state: stateFor(p.name) });
  view = stamp(stateFor(me));
  render();
}

// Cronômetros: o jogo manda msLeft; vira um horário local (deadline) ao chegar, sem depender do relógio de cada aparelho
// Mínimo de jogadores para iniciar: o jogo pode calcular pelas opções (ex.: nº de duplas × 2)
const need = (g, settings) => g.need?.(settings) ?? g.min;
const stamp = s => { if (s.data?.msLeft != null) s.data.deadline = Date.now() + s.data.msLeft; return s; };

// Ações do host comuns a todos os jogos; as do jogo ficam em GAMES[id].actions
const hostAct = {
  start: r => {
    r.players = r.players.filter(online);
    if (r.players.length < need(GAMES[r.game], r.settings) || GAMES[r.game].startError?.(r.players.length)) return;
    GAMES[r.game].start(r);
    r.phase = 'game';
  },
  lobby: r => { r.phase = 'lobby'; r.round = null; r.players = r.players.filter(online); },
};

// ---------- Jogador ----------
function joinRoom(code, game) {
  code = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) return fail('Código deve ter 4 letras/números.');
  peer?.destroy();
  peer = new Peer();
  lastSeen = Date.now();
  peer.on('open', () => {
    const c = hostConn = peer.connect(PREFIX + code, { metadata: { name: me, id: deviceId, game }, reliable: true });
    c.on('data', m => {
      lastSeen = Date.now();
      if (m.type === 'state') { view = stamp(m.state); me = view.you || me; error = ''; render(); }
      else if (m.type === 'error') fail(m.msg);
    });
    c.on('close', () => { if (view && c === hostConn) rejoin(); });
  });
  peer.on('error', e => fail(e.type === 'peer-unavailable' ? 'Sala não encontrada.' : 'Erro de conexão: ' + e.type));
}

// Celular apagou a tela e a conexão morreu (às vezes sem avisar)? Reconecta sozinho e recupera o papel.
function rejoin() {
  if (Date.now() - rejoinAt < 8000) return;
  rejoinAt = Date.now();
  view.lost = true;
  render();
  joinRoom(view.code, view.game);
}
setInterval(() => { if (view && !room && Date.now() - lastSeen > 8000) rejoin(); }, 2000); // host manda ping a cada 1s
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (view && !room && (view.lost || Date.now() - lastSeen > 3000)) rejoin();
  keepAwake();
});
// Host: avisa a cada 1s que está vivo e deixa o jogo conferir o relógio (ex.: fim do tempo)
setInterval(() => {
  if (!room) return;
  GAMES[room.game].tick?.(room);
  for (const p of room.players) if (p.conn?.open) p.conn.send({ type: 'ping' });
}, 1000);
// Mantém a tela acesa durante a sala (só funciona em HTTPS; o host precisa disso)
function keepAwake() {
  if (!view || wake || document.hidden || !navigator.wakeLock) return;
  wake = true;
  navigator.wakeLock.request('screen').then(w => { wake = w; w.onrelease = () => wake = null; }).catch(() => wake = null);
}

function leave() {
  if (room && !confirm('Sair encerra a sala para todos. Continuar?')) return;
  peer?.destroy();
  wake?.release?.();
  peer = hostConn = room = view = null;
  render();
}

function fail(msg) {
  error = msg;
  if (!room) { peer?.destroy(); peer = view = null; }
  render();
}

// ---------- Componentes (usados também pelos jogos) ----------
const btn = 'w-full rounded-2xl py-4 font-bold text-lg active:scale-[.97] transition disabled:opacity-40 disabled:active:scale-100';
const primary = `${btn} bg-gradient-to-r from-fuchsia-600 to-violet-600 shadow-lg shadow-fuchsia-900/40`;
const play = `${btn} bg-emerald-500 text-white text-xl shadow-lg shadow-emerald-900/50`;
const secondary = `${btn} bg-zinc-800`;
const card = 'rounded-3xl bg-zinc-900 border border-white/5 p-5';
const input = 'w-full min-w-0 rounded-2xl bg-zinc-800 border border-white/10 px-4 py-4 text-lg outline-none focus:border-fuchsia-500 placeholder:text-zinc-600';
const label = 'block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2';
const COLORS = ['bg-fuchsia-600', 'bg-violet-600', 'bg-sky-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-teal-600', 'bg-indigo-600'];
const avatar = (name, size = 'w-9 h-9 text-sm') => {
  name = name || '?';
  return `<span class="${size} ${COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORS.length]} shrink-0 rounded-full grid place-items-center font-bold uppercase">${esc([...name][0])}</span>`;
};
const you = name => name === me ? '<span class="text-xs text-fuchsia-400 font-semibold">você</span>' : '';
// Barra de ação presa no rodapé, ao alcance do polegar
const bar = html => `<div class="sticky bottom-0 mt-auto -mx-4 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0f1014] via-[#0f1014] to-transparent">${html}</div>`;
const errorBox = () => error ? `<div class="rounded-2xl bg-red-950/60 border border-red-800 text-red-200 p-4 mb-4 text-center">${esc(error)}</div>` : '';
const players = g => g.playersLabel || (g.min === g.max ? `${g.min} jogadores` : `${g.min}–${g.max || 20} jogadores`);
// Capa do jogo, estilo thumbnail
const thumb = (g, emoji = 'text-7xl', aspect = 'aspect-square') => `
  <div class="relative ${aspect} overflow-hidden rounded-2xl bg-gradient-to-br ${g.thumb}">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.35),transparent_55%)]"></div>
    ${g.img ? `<img src="${g.img}" alt="" class="absolute inset-0 w-full h-full object-cover object-top">`
      : `<div class="absolute inset-0 grid place-items-center ${emoji} drop-shadow-[0_8px_16px_rgba(0,0,0,.5)]">${g.emoji}</div>`}
    ${g.badge ? `<span class="absolute top-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-black uppercase">${esc(g.badge)}</span>` : ''}
  </div>`;
const profile = () => `
  <label class="ml-auto flex items-center gap-2 rounded-full bg-zinc-800 border pl-1 pr-3 py-1 focus-within:border-fuchsia-500 border-white/10">
    ${avatar(me || guest, 'w-8 h-8 text-sm')}
    <input id="name" maxlength="20" value="${esc(me)}" placeholder="${esc(guest)}" autocomplete="nickname" class="bg-transparent w-28 sm:w-32 outline-none font-semibold placeholder:text-zinc-500">
  </label>`;
const logo = '<div class="flex items-center gap-2 font-black text-xl tracking-tight"><img src="logo.svg" alt="" class="w-9 h-9">Party Hub</div>';

// ---------- Telas ----------
function render() {
  // Hub largo no PC; dentro da sala, coluna de celular
  app.className = `mx-auto min-h-dvh flex flex-col pt-[max(.5rem,env(safe-area-inset-top))] ${view ? 'max-w-md px-4' : 'max-w-5xl px-4 sm:px-6 pb-10'}`;
  if (!view) return app.innerHTML = selected ? detail(selected) : home();
  keepAwake();
  const isHost = !!room, g = GAMES[view.game];
  app.innerHTML = `
    <header class="flex items-center justify-between h-12 mb-3">
      <button data-act="leave" class="-ml-2 px-2 h-11 text-zinc-400 font-medium">← Sair</button>
      <div class="text-sm font-semibold text-zinc-300">${g.emoji} ${esc(g.name)}</div>
      <div class="font-mono text-sm text-zinc-500 w-12 text-right">${esc(view.code)}</div>
    </header>
    ${view.lost ? `<div class="${card} mb-4 !border-amber-500/50 text-amber-300 text-center">⚠️ Conexão perdida com o host
      <button data-act="rejoin" class="${secondary} mt-3">Reconectar</button></div>` : ''}
    ${view.phase === 'lobby' ? lobby(isHost, g) : g.view(view.data, isHost)}`;
}

function home() {
  const list = Object.entries(GAMES);
  const soon = Math.max(0, 4 - list.length); // ponytail: placeholders somem sozinhos quando houver 4+ jogos
  return `
    <header class="flex items-center gap-3 h-16 mb-2">${logo}${profile()}</header>
    <h2 class="text-xl sm:text-2xl font-black mt-2 mb-4">Jogos</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      ${list.map(([id, g]) => `
        <button data-act="open" data-v="${id}" class="group text-left">
          <div class="transition group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-fuchsia-900/30 group-active:scale-95">${thumb(g, 'text-6xl sm:text-7xl')}</div>
          <div class="mt-2 font-bold leading-tight line-clamp-2">${esc(g.name)}</div>
          <div class="text-xs text-zinc-400 mt-0.5">👥 ${players(g)}</div>
        </button>`).join('')}
      ${`<div><div class="aspect-square rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-800 grid place-items-center">
          <div class="text-center text-zinc-600"><div class="text-3xl">🔒</div><div class="text-xs font-semibold mt-1">Em breve</div></div>
        </div></div>`.repeat(soon)}
    </div>
    <h2 class="text-xl sm:text-2xl font-black mt-12 mb-4">Como funciona</h2>
    <div class="grid sm:grid-cols-3 gap-3">
      ${[['🎮', 'Escolha um jogo', 'Toque na capa e depois em Criar sala.'],
         ['🔑', 'Compartilhe o código', 'Seus amigos abrem o mesmo jogo e digitam o código.'],
         ['📱', 'Cada um no seu celular', 'Sem cadastro e sem instalar nada.']].map(([i, t, d]) => `
        <div class="${card} flex sm:block items-center gap-4">
          <div class="text-3xl sm:mb-3">${i}</div>
          <div><div class="font-bold">${t}</div><div class="text-sm text-zinc-400">${d}</div></div>
        </div>`).join('')}
    </div>`;
}

function detail(id) {
  const g = GAMES[id];
  const sala = new URLSearchParams(location.search).get('sala') || '';
  return `
    <header class="flex items-center gap-3 h-16 mb-2">
      <button data-act="back" class="-ml-2 px-2 h-11 text-zinc-400 font-medium hover:text-white">← Jogos</button>
      ${profile()}
    </header>
    <div class="grid md:grid-cols-2 gap-6 md:gap-10 md:items-center">
      ${thumb(g, 'text-[7rem] md:text-[11rem]', 'aspect-[16/10] md:aspect-square')}
      <div>
        <h1 class="text-3xl sm:text-4xl font-black">${esc(g.name)}</h1>
        <div class="flex flex-wrap gap-2 mt-3 text-xs font-semibold text-zinc-300">
          <span class="rounded-full bg-zinc-800 px-3 py-1">👥 ${players(g)}</span>
          ${g.time ? `<span class="rounded-full bg-zinc-800 px-3 py-1">⏱ ${esc(g.time)}</span>` : ''}
          <span class="rounded-full bg-zinc-800 px-3 py-1">📱 1 celular por pessoa</span>
        </div>
        <p class="text-zinc-300 mt-4">${esc(g.desc)}</p>
        <div class="mt-6">
          ${errorBox()}
          <button data-act="create" data-v="${id}" class="${play}">▶ Criar sala</button>
          <div class="flex items-center gap-3 my-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <span class="h-px flex-1 bg-zinc-800"></span>ou entre numa sala<span class="h-px flex-1 bg-zinc-800"></span>
          </div>
          <div class="flex gap-2">
            <input id="code" maxlength="4" value="${esc(sala)}" placeholder="CÓDIGO" autocapitalize="characters" autocomplete="off" spellcheck="false"
              class="${input} !py-3 flex-1 uppercase tracking-[.25em] text-center font-mono font-bold text-xl placeholder:tracking-widest placeholder:text-base">
            <button data-act="join" data-v="${id}" class="shrink-0 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 px-6 font-bold active:scale-95 transition">Entrar</button>
          </div>
        </div>
      </div>
    </div>
    ${g.rules ? `<h2 class="text-xl font-black mt-10 mb-4">Como jogar</h2>
      <ol class="grid sm:grid-cols-2 gap-3">${g.rules.map((r, i) => `<li class="flex gap-3 rounded-2xl bg-zinc-900 border border-white/5 p-4 text-sm text-zinc-300">
        <span class="w-7 h-7 shrink-0 grid place-items-center rounded-full bg-fuchsia-600/20 text-fuchsia-300 font-bold text-xs">${i + 1}</span>${esc(r)}</li>`).join('')}</ol>` : ''}`;
}

function lobby(isHost, g) {
  const n = view.players.filter(p => p.on).length, min = need(g, view.settings);
  const wait = n < min ? `Aguardando jogadores (${n}/${min})` : g.startError?.(n); // texto do botão quando não dá para iniciar
  return `
    <div class="${card} text-center mb-4 bg-gradient-to-br from-fuchsia-900/40 to-violet-900/40">
      <div class="${label} !mb-0">Código da sala</div>
      <div class="text-6xl font-black font-mono tracking-[.15em] my-2 select-all">${esc(view.code)}</div>
      <button data-act="share" class="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold active:scale-95 transition">📤 Convidar amigos</button>
    </div>
    ${g.ownPlayers ? '' : `<div class="flex items-baseline justify-between mb-2">
      <h2 class="${label} !mb-0">Jogadores</h2><span class="text-sm text-zinc-500">${n} na sala</span>
    </div>
    <ul class="grid grid-cols-2 gap-2 mb-6">
      ${view.players.map(p => `<li class="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-white/5 p-2 pr-3 min-w-0 ${p.on ? '' : 'opacity-40'}">
        ${avatar(p.name)}
        <span class="min-w-0 leading-tight">
          <span class="block truncate font-semibold">${esc(p.name)} ${p.name === view.host ? '👑' : ''}</span>${you(p.name)}
        </span>
      </li>`).join('')}
    </ul>`}
    ${g.settingsView?.(view.settings, isHost, view.players) || ''}
    ${bar(isHost
      ? `<button data-act="start" class="${primary}" ${wait ? 'disabled' : ''}>${wait || 'Iniciar Partida ▶'}</button>`
      : `<div class="rounded-2xl bg-zinc-900 border border-white/5 py-4 text-center text-zinc-500 text-sm animate-pulse">Aguardando o host iniciar…</div>`)}`;
}

// ---------- Eventos ----------
app.addEventListener('input', e => {
  if (e.target.id === 'name') { me = e.target.value.trim().slice(0, 20); localStorage.setItem('pg-name', me); }
});
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act, v = b.dataset.v;
  if (act === 'create' || act === 'join') {
    me ||= guest;
    error = '';
    act === 'create' ? createRoom(v) : joinRoom($('#code').value, v);
  }
  else if (act === 'open') { selected = v; error = ''; history.pushState({}, ''); render(); scrollTo(0, 0); }
  else if (act === 'back') history.back();
  else if (act === 'leave') leave();
  else if (act === 'rejoin') joinRoom(view.code, view.game);
  else if (act === 'share') {
    const url = `${location.origin}${location.pathname}?jogo=${view.game}&sala=${view.code}`;
    navigator.share ? navigator.share({ title: 'Party Hub', text: `Entra na sala ${view.code}!`, url }).catch(() => {})
      : navigator.clipboard.writeText(url).then(() => alert('Link copiado!'));
  }
  else if (room) {
    const fn = hostAct[act] || GAMES[room.game].actions?.[act];
    if (fn) { fn(room, v, me); sync(); }
  }
  else if (view) hostConn?.open ? hostConn.send({ type: 'act', act, v }) : rejoin();
});
// Botão voltar do celular fecha a página do jogo em vez de sair do site
addEventListener('popstate', () => { if (!view) { selected = null; error = ''; render(); } });

// Segurar para ver (#hold): mostra #secret só enquanto o dedo estiver pressionado.
const showSecret = on => { const s = $('#secret'), c = $('#cover'); if (s) { s.hidden = !on; c.hidden = on; } };
app.addEventListener('pointerdown', e => { if (e.target.closest('#hold')) { showSecret(true); navigator.vibrate?.(30); } });
['pointerup', 'pointercancel', 'blur'].forEach(t => window.addEventListener(t, () => showSecret(false)));
app.addEventListener('contextmenu', e => { if (e.target.closest('#hold')) e.preventDefault(); });

// Qualquer elemento com data-deadline mostra os segundos restantes (vermelho nos últimos 10); data-fmt="mmss" mostra 1:59
const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
setInterval(() => document.querySelectorAll('[data-deadline]').forEach(el => {
  const sec = Math.max(0, Math.ceil((el.dataset.deadline - Date.now()) / 1000));
  el.textContent = el.dataset.fmt === 'mmss' ? mmss(sec) : sec;
  el.classList.toggle('text-red-400', sec <= 10);
}), 200);

addEventListener('DOMContentLoaded', () => {
  const jogo = new URLSearchParams(location.search).get('jogo');
  if (GAMES[jogo]) selected = jogo;
  render();
}); // depois que games/*.js se registraram
