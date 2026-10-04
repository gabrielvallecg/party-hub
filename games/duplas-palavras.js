// Banco de palavras do "Palavras!" — só palavras fáceis do dia a dia. Separe por vírgula; duplicatas são removidas sozinhas.
const PALAVRAS = [
  // Animais
  `Cachorro, Gato, Leão, Tigre, Elefante, Girafa, Zebra, Macaco, Urso, Panda, Jacaré, Cobra, Tartaruga, Sapo, Peixe,
  Tubarão, Baleia, Golfinho, Polvo, Caranguejo, Pinguim, Lobo, Raposa, Coelho, Rato, Papagaio, Coruja, Galinha,
  Pato, Vaca, Cavalo, Porco, Ovelha, Cabra, Camelo, Abelha, Formiga, Borboleta, Mosca, Mosquito, Barata, Aranha,
  Minhoca`,
  // Comidas e bebidas
  `Arroz, Feijão, Pão, Bolo, Pizza, Hambúrguer, Pastel, Coxinha, Sorvete, Chocolate, Pipoca, Biscoito, Queijo, Ovo,
  Leite, Café, Suco, Água, Refrigerante, Macarrão, Lasanha, Sopa, Salada, Sanduíche, Batata frita, Churrasco,
  Frango, Peixe frito, Salsicha, Cachorro-quente, Brigadeiro, Pudim, Gelatina, Mel, Manteiga, Açúcar, Sal, Pimenta,
  Ketchup, Maionese, Pirulito, Bala, Chiclete`,
  // Frutas e verduras
  `Maçã, Banana, Laranja, Limão, Uva, Morango, Melancia, Melão, Abacaxi, Manga, Mamão, Pera, Cereja, Abacate,
  Goiaba, Maracujá, Tomate, Cenoura, Batata, Cebola, Alho`,
  // Casa
  `Casa, Porta, Janela, Parede, Telhado, Escada, Cadeira, Mesa, Sofá, Cama, Travesseiro, Cobertor, Armário, Gaveta,
  Espelho, Tapete, Cortina, Lâmpada, Ventilador, Televisão, Geladeira, Fogão, Forno, Micro-ondas, Pia, Torneira,
  Chuveiro, Banheira, Privada, Toalha, Sabonete, Xampu, Escova de dentes, Pasta de dente, Pente, Vassoura`,
  // Cozinha
  `Panela, Frigideira, Prato, Copo, Xícara, Garfo, Faca, Colher, Garrafa, Jarra`,
  // Roupas e acessórios
  `Camiseta, Camisa, Calça, Bermuda, Saia, Vestido, Casaco, Pijama, Meia, Sapato, Tênis, Chinelo, Bota, Chapéu,
  Boné, Óculos, Relógio de pulso, Anel, Colar, Brinco, Pulseira, Cinto, Gravata, Bolsa, Mochila`,
  // Profissões
  `Médico, Enfermeiro, Dentista, Professor, Policial, Bombeiro, Piloto, Motorista, Cozinheiro, Garçom, Padeiro,
  Pedreiro, Pintor, Mecânico, Carteiro, Cabeleireiro, Jogador de futebol, Cantor, Ator, Palhaço, Mágico, Astronauta,
  Pescador, Fazendeiro, Juiz, Advogado, Veterinário, Fotógrafo, Jornalista`,
  // Lugares
  `Escola, Hospital, Farmácia, Mercado, Padaria, Shopping, Cinema, Igreja, Banco, Aeroporto, Praia, Piscina, Parque,
  Praça, Zoológico, Circo, Estádio, Academia, Restaurante, Hotel, Fazenda, Floresta, Deserto, Montanha, Vulcão,
  Caverna, Cachoeira, Rio, Lago, Mar, Ilha, Castelo, Ponte, Rua, Cidade, Biblioteca`,
  // Transportes
  `Carro, Moto, Bicicleta, Ônibus, Caminhão, Trem, Metrô, Avião, Helicóptero, Barco, Navio, Foguete, Submarino, Táxi`,
  // Esportes e brincadeiras
  `Futebol, Vôlei, Basquete, Natação, Corrida, Boxe, Judô, Surfe, Xadrez, Dama, Boliche, Pipa, Pião, Ioiô, Bola,
  Gol, Pênalti, Bambolê, Pular corda, Esconde-esconde, Pega-pega, Amarelinha, Dominó, Baralho, Dado, Quebra-cabeça,
  Boneca, Carrinho`,
  // Corpo
  `Cabeça, Cabelo, Olho, Orelha, Nariz, Boca, Dente, Língua, Bochecha, Pescoço, Ombro, Braço, Mão, Dedo, Unha,
  Barriga, Umbigo, Costas, Perna, Joelho, Pé`,
  // Natureza e clima
  `Sol, Lua, Estrela, Nuvem, Chuva, Raio, Trovão, Arco-íris, Neve, Vento, Fogo, Gelo, Árvore, Flor, Rosa, Girassol,
  Folha, Grama, Pedra, Areia, Terra`,
  // Música e escola
  `Violão, Guitarra, Bateria, Piano, Flauta, Pandeiro, Microfone, Música, Dança, Show, Caderno, Lápis, Caneta,
  Borracha, Régua, Tesoura, Cola, Livro`,
  // Coisas do dia a dia
  `Celular, Computador, Notebook, Fone de ouvido, Câmera, Carregador, Internet, Senha, Foto, Selfie, Dinheiro,
  Moeda, Cartão, Presente, Bilhete, Carta, Jornal, Revista, Calendário, Despertador, Lanterna, Pilha, Martelo,
  Prego, Corda, Cadeado, Escova, Perfume, Batom, Esmalte, Remédio, Termômetro, Curativo, Fralda, Chupeta, Mamadeira,
  Berço, Brinquedo, Caixa, Mala, Passaporte, Bandeira`,
  // Festas
  `Aniversário, Natal, Ano-novo, Carnaval, Páscoa, Festa junina, Casamento, Bolo de aniversário, Fogos de artifício,
  Papai Noel, Árvore de Natal, Ovo de Páscoa, Fogueira, Quadrilha`,
  // Personagens e fantasia
  `Fantasma, Vampiro, Bruxa, Fada, Dragão, Unicórnio, Sereia, Monstro, Zumbi, Múmia, Robô, Alienígena, Super-herói,
  Mago, Saci, Lobisomem, Gigante, Anão, Cavaleiro, Cowboy, Branca de Neve`,
  // Ações
  `Dançar, Cantar, Pular, Correr, Nadar, Dormir, Comer, Beber, Chorar, Rir, Gritar, Abraçar, Beijar, Cozinhar,
  Dirigir, Pescar, Ler, Escrever, Desenhar, Pintar, Estudar, Tomar banho, Escovar os dentes, Varrer, Voar, Cair,
  Sentar, Acordar, Bocejar`,
  // Sentimentos e coisas do cotidiano
  `Amor, Medo, Raiva, Alegria, Tristeza, Saudade, Fome, Sede, Sono, Preguiça, Vergonha, Sorte, Azar, Segredo,
  Mentira, Amigo, Família, Mãe, Pai, Irmão, Avó, Avô, Bebê, Vizinho, Namorado, Férias, Feriado, Fim de semana, Café
  da manhã`,
].join(',').split(',').map(w => w.trim()).filter(Boolean)
  .filter((w, i, a) => a.findIndex(x => x.toLowerCase() === w.toLowerCase()) === i); // sem duplicatas
