// Jogo: Palavras! — 2 a 6 duplas, 2 rodadas. Quem fala vê a palavra e dá dicas (ao vivo); o parceiro adivinha.
// Rodada 1: fala o 1º da dupla; rodada 2: os papéis se invertem. 60s por vez.
// O host guarda tudo; a palavra só é enviada para quem está falando.

// PALAVRAS vem de games/duplas-palavras.js
const MAX_SKIPS = 3; // pulos por vez

const TURN_MS = 60000;
const TEAM = [
  { text: 'text-sky-300', ring: 'border-sky-500/60', bg: 'from-sky-900/50 to-sky-950/30' },
  { text: 'text-amber-300', ring: 'border-amber-500/60', bg: 'from-amber-900/50 to-amber-950/30' },
  { text: 'text-emerald-300', ring: 'border-emerald-500/60', bg: 'from-emerald-900/50 to-emerald-950/30' },
  { text: 'text-rose-300', ring: 'border-rose-500/60', bg: 'from-rose-900/50 to-rose-950/30' },
  { text: 'text-violet-300', ring: 'border-violet-500/60', bg: 'from-violet-900/50 to-violet-950/30' },
  { text: 'text-lime-300', ring: 'border-lime-500/60', bg: 'from-lime-900/50 to-lime-950/30' },
].map((t, i) => ({ ...t, name: `Dupla ${i + 1}` }));

// settings.slots: vagas em ordem (0-1 = Dupla 1, 2-3 = Dupla 2…). Vagas de quem saiu ficam livres e
// são preenchidas por quem está sem dupla, na ordem de chegada. Quem sobra fica de fora assistindo.
function arrange(names, s) {
  const slots = Array.from({ length: s.teams * 2 }, (_, i) => names.includes(s.slots[i]) ? s.slots[i] : null);
  const bench = names.filter(n => !slots.includes(n));
  for (let i = 0; i < slots.length && bench.length; i++) if (!slots[i]) slots[i] = bench.shift();
  return { slots, bench };
}
const onlineNames = r => r.players.filter(online).map(p => p.name);
const lobbyHost = (r, by) => by === r.host && r.phase === 'lobby';

// Vez atual: dupla t, rodada rd (0 ou 1); na rodada 2 os papéis se invertem
function turnOf(teams, turn) {
  const t = turn % teams.length, rd = Math.floor(turn / teams.length), [x, y] = teams[t].players;
  return { t, rd, giver: rd ? y : x, guesser: rd ? x : y };
}

function nextWord(g) {
  const left = PALAVRAS.filter(w => !g.used.includes(w)); // nunca repete na partida
  if (!left.length) return null;
  const w = pick(left);
  g.used.push(w);
  return w;
}

function endTurn(g) {
  if (room?.round !== g || g.status !== 'running') return; // partida já acabou ou foi reiniciada
  g.word = null;
  g.last = { t: turnOf(g.teams, g.turn).t, pts: g.cur };   // bloqueia a vez e registra os pontos
  g.turn++;
  g.status = g.turn >= g.teams.length * 2 ? 'final' : 'ready';
  sync();
}

// Quem está falando, com o cronômetro correndo e dentro do tempo
const canPlay = (g, by) => g?.status === 'running' && by === turnOf(g.teams, g.turn).giver && Date.now() < g.endsAt;
const pts = n => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;

GAMES.duplas = {
  name: 'Palavras!', emoji: '🗣️', badge: 'Novo', min: 4, max: 12, time: '1 min por vez',
  thumb: 'from-sky-500 via-indigo-600 to-amber-500',
  img: 'games/duplas.png',
  desc: 'De 2 a 6 duplas, 2 rodadas. Um vê a palavra e dá dicas, o parceiro tenta adivinhar em 60 segundos. Quem acertar mais palavras vence!',
  rules: [
    'O líder escolhe quantas duplas vão jogar (2 a 6) e monta as duplas, ou sorteia.',
    'Na sua vez, quem fala inicia o cronômetro de 60s e vê uma palavra secreta. O parceiro não vê.',
    'Dê dicas falando frases, sem dizer a palavra. Acertou? Toque em ACERTO: +1 ponto e nova palavra.',
    'Palavra difícil? Toque em Pular: não ganha nem perde ponto. São no máximo 3 pulos por vez.',
    'São 2 rodadas: na segunda, quem adivinhou passa a falar. Vence a dupla com mais pontos!',
  ],
  settings: { teams: 2, slots: [], pick: null },
  need: s => s.teams * 2,
  ownPlayers: true, // as duplas já listam todo mundo

  settingsView(s, isHost, players) {
    const { slots, bench } = arrange(players.filter(p => p.on).map(p => p.name), s);
    // Líder toca num jogador (ou vaga) e depois em outro: os dois trocam de lugar
    const chip = (tok, name, sub) => {
      const cls = `flex items-center gap-2 w-full min-w-0 rounded-xl p-1.5 pr-2 text-left border transition
        ${s.pick === tok ? 'border-fuchsia-400 bg-fuchsia-600/30 scale-[1.02]' : 'border-transparent bg-black/20'} ${isHost ? 'active:scale-95' : ''}`;
      const inner = name ? `${avatar(name, 'w-7 h-7 text-xs')}<span class="min-w-0 flex-1 leading-tight">
          <span class="block truncate text-sm font-semibold">${esc(name)}</span>
          <span class="block text-[10px] text-zinc-400">${sub}${name === me ? ' · <span class="text-fuchsia-400">você</span>' : ''}</span></span>`
        : `<span class="w-7 h-7 rounded-full border-2 border-dashed border-zinc-600 shrink-0"></span><span class="text-sm text-zinc-500">Vaga livre</span>`;
      return isHost ? `<button data-act="pick" data-v="${esc(tok)}" class="${cls}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
    };
    return `
      ${isHost ? `
        <h2 class="${label}">Quantas duplas?</h2>
        <div class="grid grid-cols-5 gap-2 mb-5">
          ${[2, 3, 4, 5, 6].map(n => `<button data-act="size" data-v="${n}" class="rounded-xl py-2.5 font-black border transition active:scale-95
            ${n === s.teams ? 'bg-fuchsia-600 border-fuchsia-400' : 'bg-zinc-900 border-white/5 text-zinc-400'}">${n}</button>`).join('')}
        </div>` : ''}
      <div class="flex items-baseline justify-between mb-2">
        <h2 class="${label} !mb-0">${s.teams} duplas · ${slots.filter(Boolean).length + bench.length} na sala</h2>
        ${isHost ? `<button data-act="shuffle" class="text-sm font-semibold text-fuchsia-400 active:scale-95">🔀 Sortear duplas</button>` : ''}
      </div>
      ${isHost ? `<p class="text-xs text-zinc-500 mb-2">${s.pick == null ? 'Toque em um jogador e depois em outro para trocar de lugar.' : '👉 Agora toque onde ele vai ficar.'}</p>` : ''}
      <div class="grid grid-cols-2 gap-2 mb-4">
        ${TEAM.slice(0, s.teams).map((T, i) => `
          <div class="rounded-2xl border ${T.ring} bg-gradient-to-br ${T.bg} p-2">
            <div class="text-xs font-black uppercase ${T.text} px-1 mb-1">${T.name}</div>
            <div class="grid gap-1">${[0, 1].map(k => chip(String(i * 2 + k), slots[i * 2 + k], k ? 'fala na 2ª rodada' : 'fala na 1ª rodada')).join('')}</div>
          </div>`).join('')}
      </div>
      ${bench.length ? `
        <h2 class="${label}">Sem dupla · vão assistir</h2>
        <div class="grid grid-cols-2 gap-2 mb-4">${bench.map(n => chip('b:' + n, n, 'fora da partida')).join('')}</div>` : ''}`;
  },

  actions: {
    size: (r, v, by) => {
      const n = Number(v);
      if (!lobbyHost(r, by) || !(n >= 2 && n <= 6)) return;
      r.settings.slots = arrange(onlineNames(r), r.settings).slots.slice(0, n * 2);
      Object.assign(r.settings, { teams: n, pick: null });
    },
    shuffle: (r, _, by) => {
      if (!lobbyHost(r, by)) return;
      Object.assign(r.settings, { slots: shuffle(onlineNames(r)).slice(0, r.settings.teams * 2), pick: null });
    },
    pick: (r, tok, by) => { // 1º toque seleciona, 2º toque troca os dois de lugar
      const s = r.settings;
      if (!lobbyHost(r, by)) return;
      if (s.pick == null || s.pick === tok) return void (s.pick = s.pick === tok ? null : tok);
      const { slots, bench } = arrange(onlineNames(r), s);
      const at = t => t.startsWith('b:') ? (bench.includes(t.slice(2)) ? -1 : null) : (+t >= 0 && +t < slots.length ? +t : null);
      const nameAt = t => t.startsWith('b:') ? t.slice(2) : slots[+t];
      const [a, b] = [s.pick, tok], pa = at(a), pb = at(b);
      s.pick = null;
      if (pa === null || pb === null) return;
      const na = nameAt(a), nb = nameAt(b);
      if (pa >= 0) slots[pa] = nb ?? null;
      if (pb >= 0) slots[pb] = na ?? null;
      s.slots = slots; // quem saiu de uma vaga para o banco volta a ficar sem dupla
    },
    go: (r, _, by) => { // quem fala inicia o cronômetro da vez
      const g = r.round;
      if (g?.status !== 'ready' || by !== turnOf(g.teams, g.turn).giver) return;
      Object.assign(g, { status: 'running', endsAt: Date.now() + TURN_MS, cur: 0, curSkips: 0, word: nextWord(g) });
    },
    hit: (r, _, by) => {
      const g = r.round;
      if (!canPlay(g, by)) return;
      g.teams[turnOf(g.teams, g.turn).t].score++;
      g.cur++;
      g.word = nextWord(g) ?? (endTurn(g), null);
    },
    skip: (r, _, by) => {
      const g = r.round;
      if (!canPlay(g, by) || g.curSkips >= MAX_SKIPS) return;
      g.curSkips++;
      g.teams[turnOf(g.teams, g.turn).t].skips++;
      g.word = nextWord(g) ?? (endTurn(g), null);
    },
  },

  // Host confere o relógio a cada 1s: acabou o tempo, bloqueia a vez (mesmo se o navegador atrasar)
  tick(r) { if (r.round?.status === 'running' && Date.now() >= r.round.endsAt) endTurn(r.round); },

  start(r) {
    const { slots } = arrange(r.players.map(p => p.name), r.settings);
    const teams = [];
    for (let i = 0; i < slots.length; i += 2) teams.push({ players: [slots[i], slots[i + 1]], score: 0, skips: 0 });
    r.settings.pick = null;
    r.round = { teams, turn: 0, status: 'ready', used: [], word: null, endsAt: 0, cur: 0, curSkips: 0, last: null };
  },

  stateFor(r, name) {
    const g = r.round;
    return {
      teams: g.teams.map(({ players, score, skips }) => ({ players, score, skips })),
      turn: g.turn, status: g.status, cur: g.cur, skipsLeft: MAX_SKIPS - g.curSkips, last: g.last,
      msLeft: g.status === 'running' ? Math.max(0, g.endsAt - Date.now()) : null,
      word: g.status === 'running' && name === turnOf(g.teams, g.turn).giver ? g.word : null, // só quem fala recebe
    };
  },

  view(d, isHost) {
    const n = d.teams.length;
    const waitHost = `<div class="rounded-2xl bg-zinc-900 border border-white/5 py-4 text-center text-zinc-500 text-sm">Aguardando o host…</div>`;

    if (d.status === 'final') {
      const ranked = d.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score);
      const top = ranked[0].score, winners = ranked.filter(t => t.score === top);
      const W = winners.length === 1 ? TEAM[winners[0].i] : null;
      let place = 0;
      return `
        <div class="${card} text-center py-7 mb-4 bg-gradient-to-br ${W ? W.bg : 'from-zinc-800 to-zinc-900'}">
          <div class="text-6xl mb-2">${W ? '🏆' : '🤝'}</div>
          <div class="text-3xl font-black ${W ? W.text : ''}">${W ? `${W.name} venceu!` : 'Empate!'}</div>
          <div class="text-zinc-300 mt-1">${W ? ranked[0].players.map(esc).join(' & ') : winners.map(t => TEAM[t.i].name).join(', ')}</div>
        </div>
        <ol class="grid gap-2 mb-4">
          ${ranked.map((t, k) => {
            if (k === 0 || t.score < ranked[k - 1].score) place = k + 1; // empatados dividem a posição
            const T = TEAM[t.i];
            return `<li class="flex items-center gap-3 rounded-2xl border ${T.ring} bg-gradient-to-br ${T.bg} p-3">
              <span class="w-8 text-center text-2xl">${['🥇', '🥈', '🥉'][place - 1] || `<span class="text-base font-black text-zinc-500">${place}º</span>`}</span>
              <span class="flex-1 min-w-0">
                <span class="block text-xs font-black uppercase ${T.text}">${T.name}</span>
                <span class="block text-sm truncate">${t.players.map(esc).join(' & ')}</span>
              </span>
              <span class="text-right"><span class="block text-3xl font-black tabular-nums leading-none">${t.score}</span>
                <span class="text-[10px] text-zinc-400">${t.skips} ${t.skips === 1 ? 'pulo' : 'pulos'}</span></span>
            </li>`;
          }).join('')}
        </ol>
        ${bar(isHost ? `<button data-act="lobby" class="${primary}">🔄 Jogar Novamente</button>` : waitHost)}`;
    }

    const { t, rd, giver, guesser } = turnOf(d.teams, d.turn), T = TEAM[t];
    const role = me === giver ? 'giver' : me === guesser ? 'guesser' : '';
    const score = `
      <div class="grid ${n > 4 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-3">
        ${d.teams.map((x, i) => `
          <div class="rounded-xl border bg-gradient-to-br ${TEAM[i].bg} px-2.5 py-2 ${i === t ? TEAM[i].ring : 'border-white/5 opacity-60'}">
            <div class="flex items-baseline justify-between gap-1">
              <span class="text-[10px] font-black uppercase ${TEAM[i].text}">${TEAM[i].name}</span>
              <span class="text-xl font-black tabular-nums">${x.score}</span>
            </div>
            <div class="text-[10px] text-zinc-400 truncate">${x.players.map(esc).join(' & ')}</div>
          </div>`).join('')}
      </div>`;
    const who = `
      <div class="text-center mb-4">
        <div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rodada ${rd + 1} de 2</div>
        <div class="text-lg font-black ${T.text}">Vez da ${T.name}</div>
        <div class="text-sm text-zinc-400">🗣️ <b class="text-zinc-200">${esc(giver)}</b> fala · 🤔 <b class="text-zinc-200">${esc(guesser)}</b> adivinha</div>
      </div>`;
    const last = d.status === 'ready' && d.last ? `
      <div class="rounded-2xl bg-zinc-900 border border-white/5 p-3 mb-3 text-center text-sm">
        ⏱ Tempo esgotado! <b class="${TEAM[d.last.t].text}">${TEAM[d.last.t].name}</b> fez <b>${pts(d.last.pts)}</b> nesta vez.
      </div>` : '';

    if (d.status === 'ready') return score + last + who + (role === 'giver' ? `
      <div class="${card} text-center py-8">
        <div class="text-5xl mb-3">🗣️</div>
        <div class="text-xl font-black">Você fala!</div>
        <p class="text-zinc-400 mt-2">Quando a dupla estiver pronta, inicie o cronômetro. Sua palavra aparece na hora.</p>
      </div>
      ${bar(`<button data-act="go" class="${play}">▶ Iniciar cronômetro (60s)</button>`)}` : `
      <div class="${card} text-center py-8">
        <div class="text-5xl mb-3">${role ? '🤔' : '⏳'}</div>
        <div class="text-xl font-black">${role ? 'Você vai adivinhar!' : `${T.name} vai jogar`}</div>
        <p class="text-zinc-400 mt-2 animate-pulse">Aguardando ${esc(giver)} iniciar o cronômetro…</p>
      </div>`);

    // cronômetro correndo
    const timer = `
      <div class="text-center mb-4">
        <div class="text-7xl font-black tabular-nums leading-none" data-deadline="${d.deadline}">${Math.ceil(d.msLeft / 1000)}</div>
        <div class="h-2 rounded-full bg-zinc-800 overflow-hidden mt-3">
          <div class="drain h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" style="--w:${d.msLeft / TURN_MS * 100}%;animation-duration:${d.msLeft}ms"></div>
        </div>
      </div>`;
    if (role === 'giver') return score + timer + `
      <div class="pop ${card} text-center py-10 bg-gradient-to-br from-zinc-900 to-zinc-800 !border-emerald-500/30">
        <div class="${label}">Sua palavra</div>
        <div class="font-black text-5xl break-words">${esc(d.word || '')}</div>
        <div class="text-xs text-zinc-500 mt-3">Não fale a palavra! · ${pts(d.cur)} nesta vez</div>
      </div>
      ${bar(`<div class="grid grid-cols-3 gap-2">
        <button data-act="skip" class="${secondary} !text-base leading-tight" ${d.skipsLeft ? '' : 'disabled'}>⏭ Pular<span class="block text-xs font-semibold text-zinc-400">${d.skipsLeft ? `${d.skipsLeft} de ${MAX_SKIPS}` : 'acabaram'}</span></button>
        <button data-act="hit" class="${play} col-span-2">✅ ACERTO</button>
      </div>`)}`;
    return score + timer + `
      <div class="${card} text-center py-10">
        <div class="text-6xl mb-3">${role ? '🤔' : '👀'}</div>
        <div class="text-2xl font-black">${role ? 'Adivinhe!' : `${T.name} jogando`}</div>
        <p class="text-zinc-400 mt-2">${role ? `Ouça as dicas de ${esc(giver)} e fale a palavra.` : 'Fique de olho no placar.'}</p>
        <div class="mt-4 text-sm text-zinc-400">Acertos nesta vez: <b class="text-white text-lg">${d.cur}</b></div>
      </div>`;
  },
};
