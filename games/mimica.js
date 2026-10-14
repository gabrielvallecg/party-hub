// Jogo: Mímica — 2 a 6 jogadores. Um jogador por vez vê a palavra em segredo e faz a mímica; os outros adivinham.
// Vez: ready (vê a palavra) → running (tempo escolhido pelo host, padrão 2:00) → scored (alguém acertou) ou timeout → próximo jogador sozinho.
// O host guarda tudo; a palavra só vai para quem está fazendo a mímica até a vez terminar.

const MIMICAS = `Cachorro, Gato, Macaco, Elefante, Galinha, Cobra, Peixe, Passarinho, Coelho, Leão, Sapo, Pinguim, Canguru,
  Cavalo, Vaca, Porco, Borboleta, Abelha, Aranha, Tubarão, Jacaré, Girafa, Caranguejo, Polvo, Avião, Carro, Bicicleta,
  Moto, Trem, Barco, Helicóptero, Foguete, Ônibus, Skate, Pular corda, Nadar, Dançar, Dormir, Cozinhar,
  Escovar os dentes, Tomar banho, Pentear o cabelo, Dirigir, Pescar, Jogar futebol, Jogar basquete, Jogar tênis,
  Lutar boxe, Surfar, Esquiar, Patinar, Escalar, Correr, Chorar, Rir, Espirrar, Bocejar, Tocar violão, Tocar bateria,
  Tocar piano, Cantar, Ler um livro, Escrever, Desenhar, Pintar parede, Tirar foto, Falar no celular,
  Digitar no computador, Jogar videogame, Varrer, Lavar louça, Passar roupa, Regar plantas, Cortar cabelo,
  Fazer a barba, Passar maquiagem, Comer pizza, Beber água, Tomar sorvete, Comer espaguete, Descascar banana,
  Chupar limão, Soprar velas, Abrir presente, Martelar prego, Jogar boliche, Arco e flecha, Mergulhar, Remar,
  Andar a cavalo, Plantar árvore, Empinar pipa, Fazer malabarismo, Mágico, Palhaço, Bombeiro, Policial, Médico,
  Dentista, Professor, Cozinheiro, Garçom, Pedreiro, Astronauta, Pirata, Ninja, Super-herói, Zumbi, Fantasma,
  Vampiro, Robô, Bailarina, Goleiro, Fotógrafo, Maestro, Guarda de trânsito, Guarda-chuva, Telefone, Óculos,
  Tesoura, Martelo, Chave, Relógio, Espelho, Microfone, Bola, Vassoura, Cadeira, Geladeira, Chuveiro, Bater na porta,
  Subir escada, Levar choque, Pisar em chiclete, Sentir frio, Sentir calor, Ter medo, Ficar com raiva, Estar apaixonado,
  Estar com fome, Estar cansado, Tropeçar, Escorregar na casca de banana, Ser picado por abelha, Tirar selfie,
  Jogar xadrez, Fazer flexão, Levantar peso, Meditar, Aplaudir, Mandar beijo, Fazer careta, Assobiar, Chutar,
  Jogar vôlei, Dar estrelinha, Plantar bananeira, Cambalhota, Lavar o carro, Passear com o cachorro, Trocar fralda,
  Ninar um bebê, Pedir carona, Buzinar, Trocar pneu, Costurar, Pular de paraquedas, Andar de montanha-russa,
  Andar na corda bamba, Fazer um bolo, Lutar caratê, Tomar café, Abrir guarda-chuva, Usar fone de ouvido,
  Mascar chiclete, Fazer bolha de sabão, Pular amarelinha, Jogar pingue-pongue, Andar de skate, Tricotar`
  .split(',').map(w => w.trim()).filter(Boolean);
const MIM_TIMES = [30, 60, 90, 120, 180], NEXT_MS = 6000; // opções de tempo (s); tela de resultado antes do próximo

const actorOf = g => g.order[g.turn % g.order.length];
const hostOrActor = (r, by) => by === r.host || by === actorOf(r.round);

function nextTurn(r) {
  const g = r.round;
  g.turn++;
  if (g.turn >= g.order.length * g.laps) return void Object.assign(g, { status: 'final', word: null });
  const left = MIMICAS.filter(w => !g.used.includes(w)); // não repete na partida
  const word = pick(left.length ? left : MIMICAS);
  g.used.push(word);
  Object.assign(g, { status: 'ready', word, guessers: [], endsAt: 0 });
}

GAMES.mimica = {
  name: 'Mímica', emoji: '🎭', badge: 'Novo', min: 2, max: 6, time: '30s a 3 min por vez',
  thumb: 'from-orange-500 via-pink-600 to-purple-800',
  desc: 'Um faz a mímica, sem falar, e os outros tentam adivinhar antes que os 2 minutos acabem. Cada acerto vale ponto!',
  rules: [
    'Na sua vez, você vê uma palavra ou ação em segredo, como "cachorro", "avião" ou "pular corda".',
    'Toque em "Estou pronto" e o cronômetro começa (o host escolhe o tempo: de 30s a 3 min).',
    'Faça a mímica sem falar! Os outros gritam os palpites.',
    'Quando alguém acertar, toque no nome dele. O tempo para e quem acertou ganha 1 ponto (dá para marcar mais de um).',
    'Se o tempo acabar sem acerto, ninguém pontua. Depois, a vez passa sozinha para o próximo jogador.',
  ],
  settings: { laps: 2, time: 120 },

  settingsView(s, isHost) {
    const chips = (act, list, cur, fmt, cols) => `<div class="grid ${cols} gap-2 mb-4">${list.map(n => isHost
      ? `<button data-act="${act}" data-v="${n}" class="rounded-xl py-2.5 font-bold border transition active:scale-95 ${n === cur ? 'bg-fuchsia-600 border-fuchsia-400' : 'bg-zinc-900 border-white/5 text-zinc-400'}">${fmt(n)}</button>`
      : `<div class="rounded-xl py-2.5 font-bold text-center border ${n === cur ? 'bg-fuchsia-600/40 border-fuchsia-400' : 'bg-zinc-900 border-white/5 text-zinc-600'}">${fmt(n)}</div>`).join('')}</div>`;
    return `
      <h2 class="${label}">Tempo para fazer a mímica</h2>
      ${chips('time', MIM_TIMES, s.time, mmss, 'grid-cols-5')}
      <h2 class="${label}">Quantas vezes cada um faz mímica?</h2>
      ${chips('laps', [1, 2, 3], s.laps, n => `${n}×`, 'grid-cols-3')}`;
  },

  actions: {
    time: (r, v, by) => { if (by === r.host && r.phase === 'lobby' && MIM_TIMES.includes(+v)) r.settings.time = +v; },
    laps: (r, v, by) => { if (by === r.host && r.phase === 'lobby' && [1, 2, 3].includes(+v)) r.settings.laps = +v; },
    ready: (r, _, by) => { // "Estou pronto": começa o cronômetro
      const g = r.round;
      if (g?.status === 'ready' && by === actorOf(g)) Object.assign(g, { status: 'running', endsAt: Date.now() + g.ms });
    },
    hit: (r, v, by) => { // quem faz a mímica marca quem acertou
      const g = r.round;
      if (!g || by !== actorOf(g) || !g.order.includes(v) || v === by || g.guessers.includes(v)) return;
      if (!['running', 'scored'].includes(g.status) || Date.now() >= g.endsAt) return;
      g.guessers.push(v);
      g.scores[v] = (g.scores[v] || 0) + 1;
      if (g.status === 'running') Object.assign(g, { status: 'scored', endsAt: Date.now() + NEXT_MS }); // 1º acerto para o tempo
    },
    next: (r, _, by) => { if (['scored', 'timeout'].includes(r.round?.status) && hostOrActor(r, by)) nextTurn(r); },
    skip: (r, _, by) => { if (by === r.host && ['ready', 'running'].includes(r.round?.status)) nextTurn(r); },
    end: (r, _, by) => { if (by === r.host && r.round && r.round.status !== 'final') Object.assign(r.round, { status: 'final', word: null }); },
    restart: (r, _, by) => {
      if (by !== r.host || r.round?.status !== 'final') return;
      Object.assign(r.round, { order: shuffle(r.round.order), turn: -1, scores: {}, used: [] });
      nextTurn(r);
    },
  },

  // Host confere o relógio: acabou o tempo → resultado; acabou a tela de resultado → próximo jogador
  tick(r) {
    const g = r.round;
    if (!g || Date.now() < g.endsAt) return;
    if (g.status === 'running') { Object.assign(g, { status: 'timeout', endsAt: Date.now() + NEXT_MS }); sync(); }
    else if (['scored', 'timeout'].includes(g.status)) { nextTurn(r); sync(); }
  },

  start(r) {
    r.round = { order: shuffle(r.players.map(p => p.name)), laps: r.settings.laps, ms: r.settings.time * 1000, turn: -1, scores: {}, used: [] };
    nextTurn(r);
  },

  stateFor(r, name) {
    const g = r.round, actor = actorOf(g), over = ['scored', 'timeout'].includes(g.status);
    return {
      order: g.order, turn: g.turn, ms: g.ms, total: g.order.length * g.laps, status: g.status, actor, scores: g.scores, guessers: g.guessers,
      word: over || name === actor ? g.word : null, // só quem faz a mímica vê; os outros só depois que a vez acaba
      msLeft: g.status === 'final' || g.status === 'ready' ? null : Math.max(0, g.endsAt - Date.now()),
    };
  },

  view(d, isHost) {
    const isActor = me === d.actor, waitBox = t => `<div class="rounded-2xl bg-zinc-900 border border-white/5 py-4 text-center text-zinc-500 text-sm">${t}</div>`;
    const ranking = [...d.order].sort((a, b) => (d.scores[b] || 0) - (d.scores[a] || 0));
    const board = `
      <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">${d.order.map(n => `
        <div class="shrink-0 flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 ${n === d.actor && d.status !== 'final' ? 'border-fuchsia-400 bg-fuchsia-600/20' : 'border-white/5 bg-zinc-900'}">
          ${avatar(n, 'w-7 h-7 text-xs')}<span class="text-sm font-semibold max-w-24 truncate">${esc(n)}</span>
          <span class="text-sm font-black tabular-nums">${d.scores[n] || 0}</span>
        </div>`).join('')}</div>`;

    const pts = n => d.scores[n] || 0, best = pts(ranking[0]), winners = ranking.filter(n => pts(n) === best);
    const place = n => ranking.findIndex(x => pts(x) === pts(n)); // empatados dividem a posição
    if (d.status === 'final') return `
      <div class="${card} text-center py-7 mb-4 bg-gradient-to-br from-orange-900/40 to-purple-900/40">
        <div class="text-6xl mb-2">${winners.length > 1 ? '🤝' : '🏆'}</div>
        <div class="text-3xl font-black">Fim de jogo!</div>
        <div class="text-zinc-300 mt-1">${winners.length > 1 ? `Empate entre ${winners.map(esc).join(', ')}` : `${esc(winners[0])} venceu!`}</div>
      </div>
      <ol class="grid gap-2 mb-4">${ranking.map(n => `
        <li class="flex items-center gap-3 rounded-2xl ${place(n) === 0 ? 'bg-amber-500/20 border border-amber-400/40' : 'bg-zinc-900 border border-white/5'} p-3">
          <span class="w-8 text-center text-2xl">${['🥇', '🥈', '🥉'][place(n)] || `<span class="text-base font-black text-zinc-500">${place(n) + 1}º</span>`}</span>
          ${avatar(n, 'w-8 h-8 text-xs')}<span class="flex-1 truncate font-semibold">${esc(n)} ${you(n)}</span>
          <span class="text-2xl font-black tabular-nums">${d.scores[n] || 0}</span>
        </li>`).join('')}</ol>
      ${bar(isHost ? `<button data-act="restart" class="${play}">🔄 Jogar de novo</button>
        <button data-act="lobby" class="w-full text-center text-sm text-zinc-400 mt-3">Voltar ao lobby</button>` : waitBox('Aguardando o host…'))}`;

    const top = `
      <div class="flex items-center justify-between mb-3 text-sm">
        <span class="rounded-full bg-zinc-800 px-3 py-1 font-semibold">Vez ${d.turn + 1} de ${d.total}</span>
        ${isHost ? `<span class="flex gap-3"><button data-act="skip" class="text-zinc-400">Pular vez</button>
          <button data-act="end" class="text-zinc-400">Encerrar</button></span>` : ''}
      </div>${board}`;
    const hold = h => `
      <div id="hold" class="hold ${card} ${h} p-6 flex flex-col items-center justify-center text-center mb-4 cursor-pointer
        bg-gradient-to-br from-zinc-900 to-zinc-800 active:!border-fuchsia-500 active:scale-[.99] transition">
        <div id="secret" hidden><div class="${label}">Faça a mímica de</div><div class="font-black text-4xl break-words">${esc(d.word || '')}</div></div>
        <div id="cover" class="text-zinc-400"><div class="text-4xl mb-1">👆</div>
          <div class="font-bold text-zinc-200">Pressione e segure</div><div class="text-sm">para ver sua palavra</div></div>
      </div>`;
    const timer = `
      <div class="text-center mb-4">
        <div class="text-7xl font-black tabular-nums leading-none" data-deadline="${d.deadline}" data-fmt="mmss">${mmss(Math.ceil(d.msLeft / 1000))}</div>
        <div class="h-2 rounded-full bg-zinc-800 overflow-hidden mt-3">
          <div class="drain h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500" style="--w:${d.msLeft / d.ms * 100}%;animation-duration:${d.msLeft}ms"></div>
        </div>
      </div>`;
    const others = d.order.filter(n => n !== d.actor);
    const pickers = `<div class="grid grid-cols-2 gap-2 mb-4">${others.map(n => {
      const got = d.guessers.includes(n);
      return `<button data-act="hit" data-v="${esc(n)}" ${got ? 'disabled' : ''} class="flex items-center gap-2 rounded-xl p-2.5 border text-left transition active:scale-95
        ${got ? 'bg-emerald-600/30 border-emerald-400' : 'bg-zinc-900 border-white/10'}">${avatar(n, 'w-8 h-8 text-xs')}
        <span class="flex-1 truncate font-semibold text-sm">${esc(n)}</span>${got ? '✅' : ''}</button>`;
    }).join('')}</div>`;

    // Tela de preparação
    if (d.status === 'ready') return top + (isActor ? `
      <div class="text-center mb-3"><div class="text-4xl">🎭</div><div class="text-xl font-black">Sua vez de fazer mímica!</div>
        <p class="text-sm text-zinc-400">Veja a palavra sem deixar ninguém espiar.</p></div>
      ${hold('h-[34dvh] min-h-48')}
      ${bar(`<button data-act="ready" class="${play}">Estou pronto ▶ (${mmss(d.ms / 1000)})</button>`)}` : `
      <div class="${card} text-center py-10">
        <div class="flex justify-center mb-3">${avatar(d.actor, 'w-16 h-16 text-2xl')}</div>
        <div class="text-xl font-black">${esc(d.actor)} vai fazer mímica</div>
        <p class="text-zinc-400 mt-2 animate-pulse">Aguardando ${esc(d.actor)} ficar pronto…</p>
        <p class="text-xs text-zinc-500 mt-3">Não espie a tela!</p>
      </div>`);

    // Cronômetro correndo
    if (d.status === 'running') return top + timer + (isActor ? `
      ${hold('h-32')}
      <h2 class="${label}">Quem acertou? Toque no nome</h2>${pickers}
      <p class="text-center text-xs text-zinc-500">Faça a mímica sem falar! 🤐</p>` : `
      <div class="${card} text-center py-8">
        <div class="text-5xl mb-2">🤔</div>
        <div class="text-2xl font-black">Adivinhe!</div>
        <p class="text-zinc-400 mt-1">${esc(d.actor)} está fazendo a mímica. Fale seu palpite em voz alta!</p>
      </div>`);

    // Fim da vez: acertou ou tempo esgotado
    const ok = d.status === 'scored';
    return top + `
      <div class="pop ${card} text-center py-7 mb-4 bg-gradient-to-br ${ok ? 'from-emerald-900/50 to-zinc-900' : 'from-red-950/60 to-zinc-900'}">
        <div class="text-5xl mb-1">${ok ? '🎉' : '⏰'}</div>
        <div class="text-2xl font-black">${ok ? 'Acertou!' : 'Tempo esgotado!'}</div>
        <div class="text-zinc-400 text-sm mt-3">A palavra era</div>
        <div class="text-3xl font-black break-words">${esc(d.word)}</div>
        ${ok ? `<div class="mt-3 text-emerald-300 font-semibold">+1 para ${d.guessers.map(esc).join(', ')}</div>` : '<div class="mt-3 text-zinc-500">Ninguém pontuou</div>'}
      </div>
      ${isActor && ok ? `<h2 class="${label}">Mais alguém acertou junto?</h2>${pickers}` : ''}
      <p class="text-center text-sm text-zinc-500 mb-2">Próximo jogador em <b data-deadline="${d.deadline}">${Math.ceil(d.msLeft / 1000)}</b>s…</p>
      ${isActor || isHost ? bar(`<button data-act="next" class="${secondary}">Próximo agora ▶</button>`) : ''}`;
  },
};
