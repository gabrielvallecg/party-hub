// Jogo: O Impostor. Modelo para novos jogos — um arquivo em games/ que preenche GAMES[id]:
//   name, emoji, thumb (gradiente da capa), img? (foto da capa), badge?, desc, rules?, time?, min, max
//   settings      opções da sala, editáveis pelo host no lobby
//   settingsView  (settings, isHost, players) => html no lobby
//   need?(settings) mínimo de jogadores calculado; ownPlayers? esconde a lista padrão de jogadores
//   startError?(n) texto se não der para iniciar com n jogadores; playersLabel? texto de nº de jogadores no hub
//   actions       { nome: (room, valor, quem) => muda room } — botões data-act="nome" data-v="valor";
//                 qualquer jogador pode apertar, então a ação confere `quem` (ex.: só o host)
//   start(room)   sorteia a rodada em room.round
//   stateFor(room, nome) => o que esse jogador pode ver (vai pela rede); msLeft vira data.deadline p/ cronômetro
//   view(data, isHost) => html da partida

// Palavras: categoria -> [palavra secreta, dica para o impostor]
const WORDS = {
  'Comida': [
    ['Pizza', 'Prato italiano'], ['Sushi', 'Culinária oriental'], ['Hambúrguer', 'Fast food'],
    ['Brigadeiro', 'Doce de festa'], ['Feijoada', 'Prato típico brasileiro'], ['Pipoca', 'Petisco'],
    ['Lasanha', 'Massa'], ['Açaí', 'Fruta brasileira'], ['Coxinha', 'Salgado'], ['Sorvete', 'Sobremesa'],
  ],
  'Objetos': [
    ['Guarda-chuva', 'Acessório'], ['Celular', 'Eletrônico'], ['Escova de dentes', 'Item de banheiro'],
    ['Relógio', 'Acessório'], ['Espelho', 'Item de casa'], ['Tesoura', 'Ferramenta'],
    ['Chave', 'Cabe no bolso'], ['Travesseiro', 'Item de quarto'], ['Mochila', 'Usado para carregar coisas'], ['Óculos', 'Usado no rosto'],
  ],
  'Animais': [
    ['Cachorro', 'Animal doméstico'], ['Gato', 'Animal doméstico'], ['Leão', 'Animal selvagem'],
    ['Elefante', 'Animal grande'], ['Pinguim', 'Ave'], ['Tubarão', 'Animal marinho'],
    ['Girafa', 'Animal da savana'], ['Macaco', 'Animal da floresta'], ['Coruja', 'Ave'], ['Polvo', 'Animal marinho'],
  ],
  'Faculdade': [
    ['Prova', 'Momento tenso'], ['TCC', 'Trabalho longo'], ['Professor', 'Pessoa'], ['Biblioteca', 'Lugar silencioso'],
    ['Cantina', 'Lugar para comer'], ['Calouro', 'Pessoa'], ['Diploma', 'Papel importante'], ['Notebook', 'Eletrônico'],
    ['Xerox', 'Serviço'], ['Seminário', 'Apresentação'], ['Chamada', 'Rotina da aula'], ['Mochila', 'Usado para carregar coisas'],
    ['Formatura', 'Comemoração'], ['Estágio', 'Trabalho'], ['Trote', 'Tradição'], ['Café', 'Bebida'],
  ],
  'Festa': [
    ['Bolo', 'Doce'], ['Balão', 'Decoração'], ['DJ', 'Pessoa'], ['Brigadeiro', 'Doce'], ['Refrigerante', 'Bebida'],
    ['Presente', 'Algo que se leva'], ['Convite', 'Papel'], ['Caixa de som', 'Eletrônico'], ['Vela', 'Algo que se acende'],
    ['Pista de dança', 'Lugar'], ['Salgadinho', 'Comida'], ['Confete', 'Decoração'], ['Fantasia', 'Roupa'],
    ['Karaokê', 'Diversão'], ['Garçom', 'Pessoa'], ['Parabéns', 'Música'],
  ],
};

GAMES.impostor = {
  name: 'O Impostor', emoji: '🕵️', badge: 'Novo', min: 3, max: 20, time: '5–10 min',
  thumb: 'from-rose-500 via-fuchsia-700 to-indigo-950',
  desc: 'Todos recebem a mesma palavra secreta, menos um. Fale, desconfie e descubra quem é o impostor antes que ele descubra a palavra!',
  rules: [
    'Todos recebem a mesma palavra secreta, menos o impostor, que só recebe uma dica.',
    'Na ordem sorteada, cada um fala uma palavra relacionada à palavra secreta.',
    'Discutam e votem em quem vocês acham que é o impostor.',
    'O host revela quem era. O impostor vence se não for descoberto!',
  ],
  settings: { category: Object.keys(WORDS)[0] },

  settingsView: (s, isHost) => isHost ? `
    <h2 class="${label}">Categoria</h2>
    <div class="grid grid-cols-2 gap-2 mb-4">
      ${Object.keys(WORDS).map(c => `<button data-act="category" data-v="${esc(c)}"
        class="rounded-2xl py-3 font-semibold border transition active:scale-95 [&:last-child:nth-child(odd)]:col-span-2 ${c === s.category ? 'bg-fuchsia-600 border-fuchsia-400' : 'bg-zinc-900 border-white/5 text-zinc-300'}">${esc(c)}</button>`).join('')}
    </div>` : `<p class="text-center text-zinc-400">Categoria: <b class="text-zinc-100">${esc(s.category)}</b></p>`,

  actions: {
    category: (r, c, by) => { if (by === r.host && WORDS[c]) r.settings.category = c; },
    reveal: (r, _, by) => { if (by === r.host && r.round) r.round.revealed = true; },
  },

  start(r) {
    const names = r.players.map(p => p.name);
    const [word, hint] = pick(WORDS[r.settings.category]);
    const impostor = pick(names);
    const order = shuffle(names);
    if (order[0] === impostor) order.push(order.shift()); // impostor nunca fala primeiro
    r.round = { category: r.settings.category, word, hint, impostor, order, revealed: false };
  },

  stateFor: ({ round: g }, name) => ({
    category: g.category, order: g.order,
    secret: !g.order.includes(name) ? null : name === g.impostor ? { impostor: true, hint: g.hint } : { word: g.word },
    reveal: g.revealed ? { impostor: g.impostor, word: g.word } : null, // a palavra nunca vai para o impostor antes da hora
  }),

  view(d, isHost) {
    const s = d.secret;
    const secret = !s ? '' : s.impostor
      ? `<div class="text-5xl mb-2">🤫</div>
         <div class="text-red-400 font-black text-3xl">Você é o IMPOSTOR</div>
         <div class="text-zinc-300 mt-3">Dica: <b class="text-white">${esc(s.hint)}</b></div>`
      : `<div class="${label}">Palavra secreta</div>
         <div class="font-black text-5xl break-words">${esc(s.word)}</div>`;
    return `
      <p class="text-center text-sm text-zinc-400 mb-3">Categoria: <b class="text-zinc-200">${esc(d.category)}</b></p>
      ${d.reveal ? `
        <div class="${card} text-center mb-5 py-8 bg-gradient-to-br from-red-950/60 to-fuchsia-950/60 !border-red-500/30">
          <div class="${label}">O impostor era</div>
          <div class="flex justify-center my-3">${avatar(d.reveal.impostor, 'w-20 h-20 text-3xl')}</div>
          <div class="text-4xl font-black text-red-400 break-words">${esc(d.reveal.impostor)}</div>
          <div class="${label} mt-6">A palavra era</div>
          <div class="text-3xl font-bold break-words">${esc(d.reveal.word)}</div>
        </div>` : s ? `
        <div id="hold" class="hold ${card} h-[42dvh] min-h-56 p-6 flex flex-col items-center justify-center text-center mb-5 cursor-pointer
          bg-gradient-to-br from-zinc-900 to-zinc-800 active:!border-fuchsia-500 active:scale-[.99] transition">
          <div id="secret" hidden>${secret}</div>
          <div id="cover" class="text-zinc-400">
            <div class="text-6xl mb-3">👆</div>
            <div class="font-bold text-lg text-zinc-200">Pressione e segure</div>
            <div class="text-sm">para ver sua palavra</div>
          </div>
        </div>` : `<div class="${card} text-center mb-5 py-10 text-zinc-400">⏳ Você entrou no meio da rodada.<br>Aguarde a próxima!</div>`}
      <h2 class="${label}">Ordem para falar</h2>
      <ol class="grid gap-2 mb-4">
        ${d.order.map((name, i) => `<li class="flex items-center gap-3 rounded-2xl p-2 pr-3 border ${name === me ? 'bg-fuchsia-950/50 border-fuchsia-500/40' : 'bg-zinc-900 border-white/5'}">
          <span class="w-6 text-center font-mono text-zinc-500">${i + 1}</span>${avatar(name)}
          <span class="truncate font-semibold flex-1">${esc(name)}</span>${you(name)}
        </li>`).join('')}
      </ol>
      ${!isHost ? '' : bar(d.reveal
        ? `<button data-act="lobby" class="${primary}">🔄 Jogar Novamente</button>`
        : `<button data-act="reveal" class="${primary}">🔍 Revelar Impostor</button>`)}`;
  },
};
