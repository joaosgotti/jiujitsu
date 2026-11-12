// =============================================================================
// PÁGINA — usa dados.js e modelo.js para preencher o HTML.
// Datas circulam como "número de dias desde 1970" e só viram texto na hora
// de aparecer na tela.
// =============================================================================
 
// -----------------------------------------------------------------------------
// DATAS
// -----------------------------------------------------------------------------
const DIA_MS = 86_400_000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const formatoBrasileiro = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
 
function diaDoTexto(texto) {
  const [dia, mes, ano] = texto.split("/").map(Number);
  return Date.UTC(ano, mes - 1, dia) / DIA_MS;
}
 
function hojeEmDias() {
  const agora = new Date();
  return Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()) / DIA_MS;
}
 
function formatarData(dia) {
  return formatoBrasileiro.format(new Date(Math.round(dia) * DIA_MS));
}
 
function formatarMesAno(dia) {
  const data = new Date(Math.round(dia) * DIA_MS);
  return `${MESES[data.getUTCMonth()]}. ${data.getUTCFullYear()}`;
}
 
function formatarJanela({ baixo, alto }) {
  return `${formatarData(baixo)} — ${formatarData(alto)}`;
}
 
function numeroDoMarco(indice) {
  return String(indice + 1).padStart(2, "0");
}
 
// Classe CSS que pinta o nome na cor da faixa: "faixa-roxa", "faixa-marrom"…
function classeDaFaixa(indice) {
  return `faixa-${FAIXAS[GRADUACOES[indice].faixa].nome.toLowerCase()}`;
}
 
function preencher(seletor, texto) {
  document.querySelector(seletor).textContent = texto;
}
 
// -----------------------------------------------------------------------------
// PREVISÃO
// -----------------------------------------------------------------------------
const diasConhecidos = HISTORICO.map(registro => diaDoTexto(registro.data));
const hoje = hojeEmDias();
const previsoes = preverGraduacoes(diasConhecidos, hoje); // uma por graduação futura
 
const ultimo = diasConhecidos.length - 1;   // índice da graduação mais recente
const proxima = previsoes[0];
const faixaPreta = previsoes[previsoes.length - 1];
 
// -----------------------------------------------------------------------------
// RESUMO
// -----------------------------------------------------------------------------
preencher("#modelDate", `Modelo atualizado em ${formatarData(hoje)}`);
preencher("#currentRank", GRADUACOES[ultimo].nome);
document.querySelector("#currentRank").classList.add(classeDaFaixa(ultimo));
preencher("#currentDate", `Conquistada em ${formatarData(diasConhecidos[ultimo])}`);
preencher("#nextDate", formatarData(proxima.mediana));
preencher("#nextWindow", `Faixa central: ${formatarJanela(proxima)}`);
preencher("#blackBeltWindow", `${formatarMesAno(faixaPreta.baixo)} — ${formatarMesAno(faixaPreta.alto)}`);
preencher("#blackBeltMedian", `Mediana estatística: ${formatarData(faixaPreta.mediana)}`);
 
// -----------------------------------------------------------------------------
// ARQUIVO DE FOTOS — mais recente primeiro; foto que não carrega some sozinha
// -----------------------------------------------------------------------------
function cartaoDeFoto({ foto, data, indice }) {
  const nome = GRADUACOES[indice].nome;
  return `
    <figure class="photo-entry">
      <img src="${foto}" alt="${nome} — ${data}" loading="lazy"
           onerror="this.closest('.photo-entry').remove()" />
      <figcaption>
        <span>${numeroDoMarco(indice)}</span>
        <span class="${classeDaFaixa(indice)}">${nome}</span>
        <span>${data}</span>
      </figcaption>
    </figure>`;
}
 
document.querySelector("#photoArchive").innerHTML = HISTORICO
  .map((registro, indice) => ({ ...registro, indice }))
  .filter(registro => registro.foto)
  .reverse()
  .map(cartaoDeFoto)
  .join("");
 
// -----------------------------------------------------------------------------
// CAMINHO DAQUI PARA FRENTE
// -----------------------------------------------------------------------------
function linhaDePrevisao(previsao, posicao) {
  const indice = diasConhecidos.length + posicao;
  return `
    <article class="forecast-row">
      <span class="number">${numeroDoMarco(indice)}</span>
      <h3 class="${classeDaFaixa(indice)}">${GRADUACOES[indice].nome}</h3>
      <span class="median">${formatarData(previsao.mediana)}</span>
      <span class="range">janela ${formatarJanela(previsao)}</span>
    </article>`;
}
 
document.querySelector("#forecastRoadmap").innerHTML = previsoes.map(linhaDePrevisao).join("");
 
// -----------------------------------------------------------------------------
// GRÁFICO — se o Chart.js não carregar, o resto da página continua funcionando
// -----------------------------------------------------------------------------
// Cores lidas das variáveis do style.css, para não repetir valores aqui.
const corDoCss = nome => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
const PRETO = corDoCss("--ink");
const ROXO = corDoCss("--purple");
const PAPEL = corDoCss("--paper");
const GIZ = corDoCss("--chalk");
const CINZA = corDoCss("--paper-muted");
 
const ehReal = indice => indice <= ultimo;
 
function desenharGrafico() {
  const linhaDoTempo = [...diasConhecidos, ...previsoes.map(p => p.mediana)]
    .map(dia => dia - diasConhecidos[0]);
 
  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
 
  new Chart(document.querySelector("#jiujitsuChart"), {
    type: "line",
    data: {
      labels: GRADUACOES.map(g => g.nome),
      datasets: [{
        data: linhaDoTempo,
        borderColor: PRETO,
        borderWidth: 2,
        tension: 0.16,
        // Trecho previsto: tracejado e roxo.
        segment: {
          borderColor: ctx => (ehReal(ctx.p1DataIndex) ? PRETO : ROXO),
          borderDash: ctx => (ehReal(ctx.p1DataIndex) ? undefined : [7, 6]),
        },
        // Pontos reais: círculo na cor da faixa. Previstos: losango vazado.
        pointBackgroundColor: ctx => (ehReal(ctx.dataIndex) ? FAIXAS[GRADUACOES[ctx.dataIndex].faixa].cor : PAPEL),
        pointBorderColor: ctx => (ehReal(ctx.dataIndex) ? PRETO : ROXO),
        pointStyle: ctx => (ehReal(ctx.dataIndex) ? "circle" : "rectRot"),
        pointRadius: ctx => (ehReal(ctx.dataIndex) ? 5 : 4),
        pointBorderWidth: 2,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: PRETO,
          titleColor: GIZ,
          bodyColor: "#c6c2ba",
          padding: 13,
          callbacks: {
            title: itens => GRADUACOES[itens[0].dataIndex].nome,
            label: item => {
              const i = item.dataIndex;
              if (ehReal(i)) return `Registro real: ${formatarData(diasConhecidos[i])}`;
              const previsao = previsoes[i - diasConhecidos.length];
              return [`Mediana: ${formatarData(previsao.mediana)}`, `Janela: ${formatarJanela(previsao)}`];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: "rgba(17,17,15,.3)" },
          ticks: { color: CINZA, maxRotation: 52, minRotation: 52, autoSkip: true, maxTicksLimit: 12, font: { size: 10, weight: "600" } },
        },
        y: {
          grid: { color: "rgba(17,17,15,.11)", drawTicks: false },
          border: { display: false },
          ticks: { color: CINZA, padding: 10, stepSize: DIAS_POR_ANO, callback: dias => `${Math.round(dias / DIAS_POR_ANO)}a` },
          title: { display: true, text: "TEMPO DESDE O INÍCIO", color: CINZA, font: { size: 9, weight: "700" } },
        },
      },
    },
  });
}
 
if (typeof Chart === "undefined") {
  document.querySelector("#jiujitsuChart").hidden = true;
  document.querySelector("#chartFallback").hidden = false;
} else {
  desenharGrafico();
}
