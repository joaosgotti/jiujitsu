// =============================================================================
// MODELO DE PREVISÃO — Weibull bayesiano com censura
//
// Cada intervalo entre duas graduações segue uma Weibull cuja escala depende
// da faixa em que você está esperando:
//
//     escala = exp(a + b · faixa)        faixa: 0 branca, 1 azul, 2 roxa, 3 marrom
//
//   a  duração típica (em log-dias) de um intervalo na faixa branca
//   b  quanto cada faixa nova alonga os intervalos (b = 0,3 → +35% por faixa)
//   k  forma da Weibull (quanto os intervalos variam entre si)
//
// Três ideias tornam a previsão melhor que um ajuste simples:
//   1. Censura: o tempo desde a última graduação entra como "o próximo
//      intervalo é pelo menos isso".
//   2. Incerteza dos parâmetros: em vez de um único (a, b, k), calculamos a
//      posterior numa grade e sorteamos parâmetros dela em cada simulação.
//      Com poucos dados, isso alarga — honestamente — as previsões distantes.
//   3. Tempo mínimo de faixa: uma troca de faixa nunca é simulada antes do
//      mínimo definido em FAIXAS (dados.js).
//
// Todas as datas aqui são números de dias. Nenhuma função mexe na página.
// =============================================================================

// Crenças antes de ver os seus dados, tiradas de levantamentos com praticantes:
//   • Gold BJJ (1.948 respostas): 2,3 anos na branca, 3,3 na azul, 3,4 na roxa
//     e 4,4 na marrom — faixas cada vez mais longas.
//   • BeltChecker (perfis verificados): começo aos 29, azul aos 32, roxa aos 35,
//     marrom aos 37, preta aos 39 — faixas finais um pouco mais curtas.
// Juntando: ~2,5 anos na branca (5 intervalos de ~6 meses) e quase nenhuma
// tendência média entre faixas. Os desvios são largos porque descrevem uma
// pessoa qualquer, não a média — seus próprios dados mandam rapidamente.
const PRIORI = {
  a:    { media: Math.log(200),  desvio: 0.5 },  // branca: ~6 meses por grau (de 2,5 a 15)
  b:    { media: 0.05,           desvio: 0.25 }, // cada faixa: de −40% a +70% no ritmo
  logK: { media: Math.log(1.5),  desvio: 0.6 },  // forma típica de tempos de espera
};

// Região da grade onde procuramos a posterior.
const GRADE = {
  a:    { de: 3,             ate: 7.5,         pontos: 61 },
  b:    { de: -1,            ate: 1.5,         pontos: 61 },
  logK: { de: Math.log(0.4), ate: Math.log(5), pontos: 41 },
};

const DIAS_POR_ANO = 365.25;
const SEMENTE = 20250723; // fixa: a página mostra sempre o mesmo resultado

// -----------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL
// Recebe os dias das graduações conhecidas e o dia de hoje.
// Devolve, para cada graduação futura, { baixo, mediana, alto } em dias
// (percentis 20, 50 e 80 das simulações).
// -----------------------------------------------------------------------------
function preverGraduacoes(diasConhecidos, hoje, simulacoes = 20000) {
  const posterior = calcularPosterior(diasConhecidos, hoje);
  const aleatorio = geradorAleatorio(SEMENTE);

  const caminhos = [];
  for (let s = 0; s < simulacoes; s += 1) {
    const parametros = sortearDaPosterior(posterior, aleatorio);
    caminhos.push(simularCaminho(parametros, diasConhecidos, hoje, aleatorio));
  }

  const quantasFaltam = GRADUACOES.length - diasConhecidos.length;
  return Array.from({ length: quantasFaltam }, (_, marco) => {
    const dias = caminhos.map(caminho => caminho[marco]).sort((x, y) => x - y);
    return {
      baixo:   percentil(dias, 0.2),
      mediana: percentil(dias, 0.5),
      alto:    percentil(dias, 0.8),
    };
  });
}

// -----------------------------------------------------------------------------
// AJUSTE: posterior de (a, b, k) avaliada numa grade
// -----------------------------------------------------------------------------
function calcularPosterior(diasConhecidos, hoje) {
  // Intervalos concluídos, cada um com a faixa em que foi vivido.
  const intervalos = diasConhecidos.slice(1).map((dia, i) => ({
    logDias: Math.log(dia - diasConhecidos[i]),
    faixa:   GRADUACOES[i].faixa,
  }));

  // Intervalo em aberto: só sabemos que vai durar mais do que isso.
  const ultimo = diasConhecidos.length - 1;
  const emAberto = {
    dias:  hoje - diasConhecidos[ultimo],
    faixa: GRADUACOES[ultimo].faixa,
  };

  const pontos = [];
  for (const a of valoresDaGrade(GRADE.a)) {
    for (const b of valoresDaGrade(GRADE.b)) {
      for (const logK of valoresDaGrade(GRADE.logK)) {
        const k = Math.exp(logK);
        const logPosterior =
          logPriori(a, PRIORI.a) + logPriori(b, PRIORI.b) + logPriori(logK, PRIORI.logK) +
          logVerossimilhanca(a, b, k, intervalos, emAberto);
        pontos.push({ a, b, k, logPosterior });
      }
    }
  }

  // Converte log-posterior em pesos, descarta o que é praticamente zero e
  // guarda o peso acumulado (permite sortear com busca binária).
  const maximo = pontos.reduce((m, p) => Math.max(m, p.logPosterior), -Infinity);
  const relevantes = [];
  let acumulado = 0;
  for (const { a, b, k, logPosterior } of pontos) {
    const peso = Math.exp(logPosterior - maximo);
    if (peso < 1e-6) continue;
    acumulado += peso;
    relevantes.push({ a, b, k, acumulado });
  }
  return relevantes;
}

function logVerossimilhanca(a, b, k, intervalos, emAberto) {
  let total = 0;

  // Intervalos concluídos: log da densidade Weibull, escrita em log-dias
  // (mesma conta de k/escala · z^(k−1) · e^(−z^k), com z = dias/escala, só que mais rápida).
  for (const { logDias, faixa } of intervalos) {
    const logEscala = a + b * faixa;
    const logZ = logDias - logEscala;
    total += Math.log(k) - logEscala + (k - 1) * logZ - Math.exp(k * logZ);
  }

  // Intervalo em aberto: probabilidade de durar mais do que já durou.
  const escala = Math.exp(a + b * emAberto.faixa);
  total -= (emAberto.dias / escala) ** k;

  return total;
}

function logPriori(valor, { media, desvio }) {
  return -0.5 * ((valor - media) / desvio) ** 2;
}

function valoresDaGrade({ de, ate, pontos }) {
  return Array.from({ length: pontos }, (_, i) => de + (i * (ate - de)) / (pontos - 1));
}

function sortearDaPosterior(pontos, aleatorio) {
  const alvo = aleatorio() * pontos[pontos.length - 1].acumulado;
  let inicio = 0;
  let fim = pontos.length - 1;
  while (inicio < fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (pontos[meio].acumulado < alvo) inicio = meio + 1;
    else fim = meio;
  }
  return pontos[inicio];
}

// -----------------------------------------------------------------------------
// SIMULAÇÃO: uma jornada completa até a faixa preta
// -----------------------------------------------------------------------------
function simularCaminho({ a, b, k }, diasConhecidos, hoje, aleatorio) {
  const dias = [...diasConhecidos];

  for (let marco = dias.length; marco < GRADUACOES.length; marco += 1) {
    const anterior = dias[marco - 1];
    const faixaAtual = GRADUACOES[marco - 1].faixa;
    const escala = Math.exp(a + b * faixaAtual);

    // A próxima graduação não pode acontecer antes deste dia...
    let naoAntesDe = marco === diasConhecidos.length ? hoje : anterior;

    // ...nem antes do tempo mínimo na faixa, se for uma troca de faixa.
    if (GRADUACOES[marco].grau === 0) {
      const inicioDaFaixa = dias[GRADUACOES.findIndex(g => g.faixa === faixaAtual)];
      const minimo = inicioDaFaixa + FAIXAS[faixaAtual].anosMinimos * DIAS_POR_ANO;
      naoAntesDe = Math.max(naoAntesDe, minimo);
    }

    dias.push(anterior + sortearWeibullAcimaDe(naoAntesDe - anterior, escala, k, aleatorio));
  }

  return dias.slice(diasConhecidos.length);
}

// Sorteia uma Weibull(escala, k) sabendo que o valor passa de `minimo`.
// Vem de P(T > t | T > minimo) = exp(-(t/escala)^k + (minimo/escala)^k).
function sortearWeibullAcimaDe(minimo, escala, k, aleatorio) {
  const exponencial = -Math.log(1 - aleatorio());
  return (minimo ** k + escala ** k * exponencial) ** (1 / k);
}

// -----------------------------------------------------------------------------
// UTILITÁRIOS
// -----------------------------------------------------------------------------
function percentil(ordenados, p) {
  const posicao = (ordenados.length - 1) * p;
  const abaixo = Math.floor(posicao);
  const acima = Math.ceil(posicao);
  return ordenados[abaixo] + (ordenados[acima] - ordenados[abaixo]) * (posicao - abaixo);
}

// Gerador mulberry32: rápido e reprodutível a partir de uma semente.
function geradorAleatorio(semente) {
  let estado = semente >>> 0;
  return function aleatorio() {
    estado += 0x6D2B79F5;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
