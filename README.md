# Party Hub

Jogos de festa para jogar com os amigos, cada um no próprio celular. Sem app, sem cadastro e sem backend próprio: um aparelho cria a sala, os outros entram pelo código ou pelo link, e as partidas rodam direto entre os navegadores (WebRTC via PeerJS).

Precisa de internet: o PeerJS usa o servidor público de sinalização dele para os aparelhos se acharem. O celular de quem cria a sala guarda o estado da partida, então fechar ou recarregar essa página encerra o jogo.

**Jogar:** https://gabrielvallecg.github.io/party-hub/

## Jogos

- **O Impostor** (3 a 20 jogadores): todos recebem a palavra secreta, menos o impostor, que só ganha uma dica. Descubram quem é.
- **Palavras!** (4 a 12, em duplas): um dá dicas e o parceiro tenta adivinhar o máximo de palavras em 60 segundos.
- **Ache Sua Dupla** (5, 7 ou 9): as duplas recebem a mesma palavra e precisam se achar; o impostor só recebe uma pista.
- **Mímica** (2 a 6): um jogador vê a palavra e faz a mímica, os outros tentam adivinhar.

## Rodar localmente

É HTML e JavaScript puro, sem build. Sirva a pasta com qualquer servidor estático (este exemplo usa Node.js):

```bash
npx serve .
```

## Adicionar um jogo

Cada jogo é um arquivo em `games/<id>.js` que preenche `GAMES[id]` e é carregado por uma tag `<script>` no `index.html`. O cabeçalho de `games/impostor.js` documenta a estrutura de um jogo.
