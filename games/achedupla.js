// Jogo: Ache Sua Dupla — 5, 7 ou 9 jogadores: duplas recebem a mesma palavra; 1 impostor recebe só uma pista.
// Fases da rodada: reveal (cada um vê a sua) → discuss (sem tempo; o host abre a votação) → vote → result. O host guarda tudo;
// cada jogador só recebe a própria palavra até o resultado.

// Tema -> [palavra, pista que o impostor pode receber]
const ACHE = {
  'Personagens': [
    ['Homem-Aranha', 'solta teia'], ['Batman', 'usa capa preta'], ['Super-Homem', 'voa e é muito forte'],
    ['Mickey', 'tem orelhas redondas'], ['Bob Esponja', 'mora no fundo do mar'], ['Cinderela', 'perdeu um sapato'],
    ['Branca de Neve', 'mordeu uma maçã'], ['Pinóquio', 'o nariz cresce'], ['Shrek', 'é verde e mora num pântano'],
    ['Papai Noel', 'entrega presentes'], ['Harry Potter', 'usa varinha'], ['Saci', 'tem uma perna só'],
    ['Mario', 'pula e pega moedas'], ['Pikachu', 'é amarelo e dá choque'], ['Chapeuzinho Vermelho', 'vai à casa da avó'],
    ['Hulk', 'fica forte com raiva'], ['Peter Pan', 'nunca cresce'], ['Elsa', 'tem poder de gelo'],
    ['Chaves', 'mora num barril'], ['Mônica', 'anda com um coelho'],
  ],
  'Profissões': [
    ['Médico', 'usa jaleco branco'], ['Bombeiro', 'apaga incêndios'], ['Professor', 'passa lição'],
    ['Policial', 'usa distintivo'], ['Cozinheiro', 'trabalha no fogão'], ['Dentista', 'cuida da boca'],
    ['Piloto', 'trabalha nas nuvens'], ['Motorista', 'passa o dia dirigindo'], ['Padeiro', 'acorda de madrugada'],
    ['Pedreiro', 'usa tijolo e cimento'], ['Cabeleireiro', 'usa tesoura e secador'], ['Carteiro', 'entrega cartas'],
    ['Astronauta', 'vai ao espaço'], ['Jogador de futebol', 'trabalha num campo'], ['Cantor', 'usa microfone'],
    ['Veterinário', 'cuida de bichos'], ['Palhaço', 'faz todo mundo rir'], ['Garçom', 'anota pedidos'],
    ['Advogado', 'trabalha com leis'], ['Fotógrafo', 'usa câmera'],
  ],
  'Animais': [
    ['Leão', 'é o rei'], ['Elefante', 'tem tromba'], ['Girafa', 'tem pescoço comprido'], ['Pinguim', 'vive no gelo'],
    ['Cachorro', 'é o melhor amigo'], ['Gato', 'mia'], ['Macaco', 'adora banana'], ['Cobra', 'rasteja'],
    ['Tubarão', 'tem dentes afiados'], ['Coruja', 'fica acordada à noite'], ['Tartaruga', 'é lenta'],
    ['Canguru', 'pula e tem bolsa'], ['Vaca', 'dá leite'], ['Porco', 'gosta de lama'], ['Galinha', 'bota ovo'],
    ['Abelha', 'faz mel'], ['Golfinho', 'nada e é inteligente'], ['Zebra', 'tem listras'],
    ['Coelho', 'tem orelhas grandes'], ['Papagaio', 'repete o que você fala'],
  ],
  'Filmes': [
    ['Titanic', 'tem um navio'], ['Toy Story', 'tem brinquedos vivos'], ['O Rei Leão', 'se passa na savana'],
    ['Procurando Nemo', 'tem um peixe perdido'], ['Frozen', 'tem gelo e duas irmãs'], ['Shrek', 'tem um ogro'],
    ['Harry Potter', 'tem uma escola de magia'], ['Vingadores', 'junta vários heróis'], ['Jurassic Park', 'tem dinossauros'],
    ['Carros', 'tem corrida'], ['Os Incríveis', 'tem uma família de heróis'], ['Divertida Mente', 'tem emoções que falam'],
    ['Minions', 'tem uns amarelinhos'], ['Star Wars', 'tem guerra no espaço'], ['Esqueceram de Mim', 'tem uma criança sozinha em casa'],
    ['Moana', 'se passa no oceano'], ['Up', 'tem uma casa com balões'], ['Madagascar', 'tem bichos fugindo do zoológico'],
    ['A Era do Gelo', 'tem um mamute'], ['Homem-Aranha', 'tem um herói de teia'],
  ],
  'Objetos': [
    ['Celular', 'tem tela'], ['Guarda-chuva', 'usado na chuva'], ['Relógio', 'mostra as horas'], ['Espelho', 'mostra seu reflexo'],
    ['Tesoura', 'corta'], ['Chave', 'abre portas'], ['Óculos', 'fica no rosto'], ['Escova de dentes', 'fica no banheiro'],
    ['Travesseiro', 'fica na cama'], ['Mochila', 'vai nas costas'], ['Lâmpada', 'ilumina'], ['Garrafa', 'guarda líquido'],
    ['Caneta', 'serve para escrever'], ['Cadeira', 'serve para sentar'], ['Controle remoto', 'muda o canal'],
    ['Panela', 'vai no fogão'], ['Vela', 'a gente acende'], ['Martelo', 'bate pregos'], ['Bola', 'a gente chuta'],
    ['Fone de ouvido', 'toca música'],
  ],
};
const PAIR = [
  { text: 'text-sky-300', ring: 'border-sky-500/60', bg: 'from-sky-900/50 to-sky-950/30' },
  { text: 'text-amber-300', ring: 'border-amber-500/60', bg: 'from-amber-900/50 to-amber-950/30' },
  { text: 'text-emerald-300', ring: 'border-emerald-500/60', bg: 'from-emerald-900/50 to-emerald-950/30' },
  { text: 'text-violet-300', ring: 'border-violet-500/60', bg: 'from-violet-900/50 to-violet-950/30' },
];
const VALID = [5, 7, 9];

const isHostOf = (r, by) => by === r.host;
const pairOf = (g, name) => g.pairs.findIndex(p => p.players.includes(name));
const complete = (g, name) => { const v = g.votes[name] || {}; return name === g.impostor ? !!(v.imp && v.guess) : !!(v.imp && v.pair); };

function newRound(r) {
  const g = r.round, names = shuffle(g.players), k = (names.length - 1) / 2;
  const theme = pick(Object.keys(ACHE));
  let pool = ACHE[theme].filter(([w]) => !g.used.includes(w)); // evita repetir palavras entre rodadas
  if (pool.length < k) pool = ACHE[theme];
  const items = shuffle(pool).slice(0, k);                      // k palavras diferentes nesta rodada
  g.used.push(...items.map(([w]) => w));
  const [impostor, ...rest] = names;                            // distribuição aleatória e secreta
  const pairs = items.map(([word, hint], i) => ({ word, hint, players: [rest[2 * i], rest[2 * i + 1]] }));
  const decoys = shuffle(ACHE[theme].filter(([w]) => !items.some(([x]) => x === w))).slice(0, 6 - k).map(([w]) => w);
  Object.assign(g, {
    n: g.n + 1, phase: 'reveal', theme, impostor, pairs, hint: pick(pairs).hint,
    options: shuffle([...items.map(([w]) => w), ...decoys]), ready: [], votes: {}, result: null,
  });
}

function discuss(r) { r.round.phase = 'discuss'; }

function finish(g) {
  const tally = {};
  for (const v of Object.values(g.votes)) if (v.imp) tally[v.imp] = (tally[v.imp] || 0) + 1;
  const top = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter(n => tally[n] === top);
  const caught = top > 0 && leaders.length === 1 && leaders[0] === g.impostor; // empate não pega o impostor
  const words = g.pairs.map(p => p.word), delta = {};
  for (const name of g.players) {
    const v = g.votes[name] || {};
    if (name === g.impostor) delta[name] = (caught ? 0 : 2) + (words.includes(v.guess) ? 1 : 0);
    else {
      const partner = g.pairs[pairOf(g, name)].players.find(x => x !== name);
      delta[name] = (v.pair === partner ? 1 : 0) + (v.imp === g.impostor ? 1 : 0);
    }
    g.scores[name] = (g.scores[name] || 0) + delta[name];
  }
  Object.assign(g, { phase: 'result', result: { tally, caught, delta } });
}

function vote(r, by, key, v, ok) {
  const g = r.round;
  if (g?.phase !== 'vote' || !g.players.includes(by) || !ok(g)) return;
  (g.votes[by] ||= {})[key] = v;
  if (g.players.every(n => complete(g, n))) finish(g); // todos votaram: resultado na hora
}

GAMES.achedupla = {
  name: 'Ache Sua Dupla', emoji: '👯', badge: 'Novo', min: 5, max: 9,
  playersLabel: '5, 7 ou 9 jogadores',
  thumb: 'from-emerald-500 via-teal-600 to-indigo-800',
  img: 'games/achedupla.png',
  desc: 'Cada dupla recebe a mesma palavra em segredo, e um impostor recebe só uma pista. Converse, ache sua dupla e desmascare o impostor!',
  rules: [
    '5 jogadores = 2 duplas + 1 impostor · 7 = 3 duplas + 1 impostor · 9 = 4 duplas + 1 impostor.',
    'A cada rodada sai um tema (personagens, profissões, animais, filmes ou objetos). Cada dupla recebe a mesma palavra, e cada dupla tem uma palavra diferente.',
    'O impostor sabe que é o impostor e só recebe uma pista sobre uma das palavras.',
    'Conversem e deem pistas sem falar a palavra, sem limite de tempo. Quando todos estiverem prontos, o host abre a votação.',
    'Na votação: +1 por acertar sua dupla e +1 por acertar o impostor. O impostor ganha +2 se escapar e +1 se adivinhar uma das palavras.',
  ],
  settings: { rounds: 5 },
  startError: n => VALID.includes(n) ? '' : n > 9 ? 'Máximo 9 jogadores' : `Precisa de 5, 7 ou 9 jogadores (agora: ${n})`,

  settingsView(s, isHost, players) {
    const n = players.filter(p => p.on).length, ok = VALID.includes(n);
    const chips = (act, list, cur, fmt) => `<div class="grid grid-cols-3 gap-2 mb-4">${list.map(x => isHost
      ? `<button data-act="${act}" data-v="${x}" class="rounded-xl py-2.5 font-bold border transition active:scale-95 ${x === cur ? 'bg-fuchsia-600 border-fuchsia-400' : 'bg-zinc-900 border-white/5 text-zinc-400'}">${fmt(x)}</button>`
      : `<div class="rounded-xl py-2.5 font-bold text-center border ${x === cur ? 'bg-fuchsia-600/40 border-fuchsia-400' : 'bg-zinc-900 border-white/5 text-zinc-600'}">${fmt(x)}</div>`).join('')}</div>`;
    return `
      <div class="rounded-2xl border ${ok ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-amber-500/40 bg-amber-950/30'} p-3 mb-4 text-sm text-center">
        ${ok ? `✅ ${n} jogadores = <b>${(n - 1) / 2} duplas + 1 impostor</b>` : `⚠️ O jogo precisa de <b>5, 7 ou 9</b> jogadores. Agora: <b>${n}</b>`}
      </div>
      <h2 class="${label}">Rodadas</h2>${chips('rounds', [3, 5, 7], s.rounds, x => x)}`;
  },

  actions: {
    rounds: (r, v, by) => { if (isHostOf(r, by) && r.phase === 'lobby' && [3, 5, 7].includes(+v)) r.settings.rounds = +v; },
    ready: (r, _, by) => {
      const g = r.round;
      if (g?.phase !== 'reveal' || !g.players.includes(by) || g.ready.includes(by)) return;
      g.ready.push(by);
      if (g.ready.length === g.players.length) discuss(r);
    },
    discuss: (r, _, by) => { if (isHostOf(r, by) && r.round?.phase === 'reveal') discuss(r); },
    toVote: (r, _, by) => { if (isHostOf(r, by) && r.round?.phase === 'discuss') r.round.phase = 'vote'; },
    vpair: (r, v, by) => vote(r, by, 'pair', v, g => by !== g.impostor && v !== by && g.players.includes(v)),
    vimp: (r, v, by) => vote(r, by, 'imp', v, g => v !== by && g.players.includes(v)),
    vguess: (r, v, by) => vote(r, by, 'guess', v, g => by === g.impostor && g.options.includes(v)),
    endVote: (r, _, by) => { if (isHostOf(r, by) && r.round?.phase === 'vote') finish(r.round); },
    next: (r, _, by) => { if (isHostOf(r, by) && r.round?.phase === 'result' && r.round.n < r.round.rounds) newRound(r); },
    restart: (r, _, by) => {
      if (!isHostOf(r, by) || r.round?.phase !== 'result') return;
      Object.assign(r.round, { n: 0, scores: {}, used: [] });
      newRound(r);
    },
  },

  start(r) {
    r.round = { players: r.players.map(p => p.name), rounds: r.settings.rounds, n: 0, scores: {}, used: [] };
    newRound(r);
  },

  stateFor(r, name) {
    const g = r.round, inGame = g.players.includes(name), p = g.pairs[pairOf(g, name)];
    return {
      n: g.n, rounds: g.rounds, phase: g.phase, theme: g.theme, players: g.players, scores: g.scores, ready: g.ready,
      voted: g.players.filter(x => complete(g, x)),
      role: !inGame ? 'spectator' : name === g.impostor ? 'impostor' : 'pair',
      word: p?.word ?? null,                               // só a sua palavra
      hint: name === g.impostor ? g.hint : null,           // só o impostor recebe a pista
      options: name === g.impostor && g.phase === 'vote' ? g.options : null, // opções só na votação (incluem as palavras reais)
      myVote: g.votes[name] || {},
      result: g.phase === 'result' ? { ...g.result, impostor: g.impostor, hint: g.hint, votes: g.votes,
        pairs: g.pairs.map(({ word, players }) => ({ word, players })) } : null,
    };
  },

  view(d, isHost) {
    const top = `
      <div class="flex items-center justify-between mb-4 text-sm">
        <span class="rounded-full bg-zinc-800 px-3 py-1 font-semibold">Rodada ${d.n} de ${d.rounds}</span>
        <span class="text-zinc-400">Tema: <b class="text-white">${esc(d.theme)}</b></span>
      </div>`;
    const waitBox = t => `<div class="rounded-2xl bg-zinc-900 border border-white/5 py-4 text-center text-zinc-500 text-sm">${t}</div>`;
    const secret = d.role === 'impostor'
      ? `<div class="text-5xl mb-2">🤫</div><div class="text-red-400 font-black text-3xl">Você é o IMPOSTOR</div>
         <div class="text-zinc-300 mt-3">Tema: <b class="text-white">${esc(d.theme)}</b></div>
         <div class="text-zinc-300 mt-1">Pista de uma das palavras: <b class="text-white">${esc(d.hint)}</b></div>`
      : `<div class="${label}">Sua palavra</div><div class="font-black text-4xl break-words">${esc(d.word)}</div>
         <div class="text-zinc-400 text-sm mt-3">Alguém tem a mesma palavra. Ache sua dupla!</div>`;
    const hold = (h = 'h-[38dvh] min-h-52') => `
      <div id="hold" class="hold ${card} ${h} p-6 flex flex-col items-center justify-center text-center mb-4 cursor-pointer
        bg-gradient-to-br from-zinc-900 to-zinc-800 active:!border-fuchsia-500 active:scale-[.99] transition">
        <div id="secret" hidden>${secret}</div>
        <div id="cover" class="text-zinc-400"><div class="text-5xl mb-2">👆</div>
          <div class="font-bold text-lg text-zinc-200">Pressione e segure</div><div class="text-sm">para ver sua palavra</div></div>
      </div>`;

    if (d.role === 'spectator' && d.phase !== 'result') return top + `
      <div class="${card} text-center py-10 text-zinc-400">👀 A rodada já começou.<br>Você entra quando o host reiniciar o jogo.</div>`;

    // 1. Distribuição privada
    if (d.phase === 'reveal') {
      const ready = d.ready.includes(me);
      return top + hold() + `
        <p class="text-center text-sm text-zinc-500 mb-2">${d.ready.length} de ${d.players.length} prontos</p>
        ${bar(`${ready ? waitBox('Aguardando os outros verem a palavra…') : `<button data-act="ready" class="${play}">✓ Já vi, estou pronto</button>`}
          ${isHost ? `<button data-act="discuss" class="w-full text-center text-sm text-zinc-400 mt-3">Começar conversa agora →</button>` : ''}`)}`;
    }

    // 2. Discussão com contador
    if (d.phase === 'discuss') return top + `
      <div class="${card} text-center mb-4 py-8">
        <div class="text-5xl mb-2">💬</div>
        <div class="text-xl font-black">Hora de conversar!</div>
        <p class="text-sm text-zinc-400 mt-1">Deem pistas sem falar a palavra. Descubra quem é sua dupla e quem é o impostor.</p>
        ${isHost ? '' : '<p class="text-xs text-zinc-500 mt-3">O host abre a votação quando todos estiverem prontos.</p>'}
      </div>
      ${hold('h-44')}
      ${isHost ? bar(`<button data-act="toVote" class="${primary}">🗳️ Ir para a votação</button>`) : ''}`;

    // 3. Votação
    if (d.phase === 'vote') {
      const v = d.myVote, others = d.players.filter(n => n !== me);
      const pickList = (act, cur, list) => `<div class="grid grid-cols-2 gap-2 mb-5">${list.map(n => `
        <button data-act="${act}" data-v="${esc(n)}" class="flex items-center gap-2 rounded-xl p-2 border text-left transition active:scale-95
          ${cur === n ? 'bg-fuchsia-600/30 border-fuchsia-400' : 'bg-zinc-900 border-white/5'}">
          ${avatar(n, 'w-8 h-8 text-xs')}<span class="truncate font-semibold text-sm">${esc(n)}</span></button>`).join('')}</div>`;
      const words = list => `<div class="grid grid-cols-2 gap-2 mb-5">${list.map(w => `
        <button data-act="vguess" data-v="${esc(w)}" class="rounded-xl p-3 border font-semibold text-sm transition active:scale-95
          ${v.guess === w ? 'bg-fuchsia-600/30 border-fuchsia-400' : 'bg-zinc-900 border-white/5'}">${esc(w)}</button>`).join('')}</div>`;
      return top + `
        <p class="text-center text-sm text-zinc-500 mb-4">🗳️ ${d.voted.length} de ${d.players.length} já votaram ${d.voted.includes(me) ? '· <span class="text-emerald-400">seu voto foi registrado</span>' : ''}</p>
        ${d.role === 'impostor'
          ? `<h2 class="${label}">Qual palavra você acha que uma dupla tem?</h2>${words(d.options)}`
          : `<h2 class="${label}">Quem é sua dupla?</h2>${pickList('vpair', v.pair, others)}`}
        <h2 class="${label}">Quem é o impostor?</h2>${pickList('vimp', v.imp, others)}
        ${isHost ? bar(`<button data-act="endVote" class="${secondary}">Encerrar votação</button>`) : ''}`;
    }

    // 4. Resultado
    const R = d.result, last = d.n >= d.rounds;
    const mark = ok => ok ? '<span class="text-emerald-400">✅</span>' : '<span class="text-red-400">❌</span>';
    const partnerOf = n => R.pairs.find(p => p.players.includes(n))?.players.find(x => x !== n);
    const ranking = [...d.players].sort((a, b) => (d.scores[b] || 0) - (d.scores[a] || 0));
    return top + `
      <div class="${card} text-center py-6 mb-4 bg-gradient-to-br ${R.caught ? 'from-emerald-900/50 to-zinc-900' : 'from-red-950/60 to-zinc-900'}">
        <div class="text-5xl mb-1">${R.caught ? '🎯' : '🤫'}</div>
        <div class="text-2xl font-black">${R.caught ? 'Impostor descoberto!' : 'O impostor escapou!'}</div>
        <div class="flex items-center justify-center gap-2 mt-2">${avatar(R.impostor, 'w-8 h-8 text-sm')}
          <b class="text-red-400 text-lg">${esc(R.impostor)}</b><span class="text-zinc-400 text-sm">era o impostor</span></div>
        <div class="text-xs text-zinc-500 mt-1">Pista que ele recebeu: “${esc(R.hint)}”</div>
      </div>
      <h2 class="${label}">Duplas e palavras</h2>
      <div class="grid grid-cols-2 gap-2 mb-4">${R.pairs.map((p, i) => `
        <div class="rounded-2xl border ${PAIR[i].ring} bg-gradient-to-br ${PAIR[i].bg} p-3">
          <div class="font-black ${PAIR[i].text} break-words">${esc(p.word)}</div>
          <div class="text-xs text-zinc-300 mt-1">${p.players.map(esc).join(' & ')}</div>
        </div>`).join('')}</div>
      <h2 class="${label}">Votos da rodada</h2>
      <div class="grid gap-2 mb-4">${d.players.map(n => {
        const v = R.votes[n] || {}, imp = n === R.impostor;
        return `<div class="flex items-center gap-3 rounded-2xl bg-zinc-900 border border-white/5 p-2.5">
          ${avatar(n, 'w-8 h-8 text-xs')}
          <div class="flex-1 min-w-0 text-xs text-zinc-400 leading-relaxed">
            <div class="text-sm font-semibold text-white truncate">${esc(n)} ${imp ? '<span class="text-red-400">· impostor</span>' : ''} ${you(n)}</div>
            ${imp ? `Palavra: ${esc(v.guess || '—')} ${mark(R.pairs.some(p => p.word === v.guess))}`
              : `Dupla: ${esc(v.pair || '—')} ${mark(v.pair === partnerOf(n))}`}
            · Impostor: ${esc(v.imp || '—')} ${imp ? '' : mark(v.imp === R.impostor)}
            ${R.tally[n] ? `· <span class="text-amber-300">${R.tally[n]} voto${R.tally[n] > 1 ? 's' : ''} nele</span>` : ''}
          </div>
          <div class="text-lg font-black ${R.delta[n] ? 'text-emerald-400' : 'text-zinc-600'}">+${R.delta[n]}</div>
        </div>`;
      }).join('')}</div>
      <h2 class="${label}">${last ? '🏆 Placar final' : 'Placar'}</h2>
      <ol class="grid gap-1.5 mb-4">${ranking.map((n, i) => `
        <li class="flex items-center gap-3 rounded-xl ${i === 0 && last ? 'bg-amber-500/20 border border-amber-400/40' : 'bg-zinc-900'} px-3 py-2">
          <span class="w-6 text-center">${last ? ['🥇', '🥈', '🥉'][i] || `${i + 1}º` : `${i + 1}º`}</span>
          <span class="flex-1 truncate font-semibold">${esc(n)} ${you(n)}</span>
          <span class="font-black tabular-nums">${d.scores[n] || 0}</span>
        </li>`).join('')}</ol>
      ${isHost ? bar(last
        ? `<button data-act="restart" class="${play}">🔄 Reiniciar jogo</button>
           <button data-act="lobby" class="w-full text-center text-sm text-zinc-400 mt-3">Voltar ao lobby</button>`
        : `<button data-act="next" class="${play}">Próxima rodada ▶</button>
           <button data-act="restart" class="w-full text-center text-sm text-zinc-400 mt-3">Reiniciar jogo (zera os pontos)</button>`)
        : bar(waitBox(last ? 'Fim de jogo! Aguardando o host…' : 'Aguardando o host iniciar a próxima rodada…'))}`;
  },
};
