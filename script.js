// Marcos confirmados: atualize somente estas duas listas quando houver uma nova graduação.
const DATAS_CONHECIDAS = [
  "31/07/2020", "17/12/2020", "05/05/2021", "21/09/2021", "07/02/2022",
  "27/06/2022", "27/07/2023", "27/12/2023", "09/10/2024", "15/01/2025",
  "31/01/2025", "23/07/2025"
];

const GRADUACOES = [
  "Faixa branca", "Branca · 1º grau", "Branca · 2º grau", "Branca · 3º grau", "Branca · 4º grau",
  "Faixa azul", "Azul · 1º grau", "Azul · 2º grau", "Azul · 3º grau", "Azul · 4º grau",
  "Faixa roxa", "Roxa · 1º grau", "Roxa · 2º grau", "Roxa · 3º grau", "Roxa · 4º grau",
  "Faixa marrom", "Marrom · 1º grau", "Marrom · 2º grau", "Marrom · 3º grau", "Marrom · 4º grau",
  "Faixa preta"
];

const CORES_FAIXA = [
  ...Array(5).fill("#e8edf5"), ...Array(5).fill("#48a9ff"),
  ...Array(5).fill("#b172e7"), ...Array(5).fill("#bd7a52"), "#d6dce7"
];

// Se quiser fotos nos tooltips, coloque-as em img/ e mantenha os nomes abaixo.
const IMAGENS_PONTOS = [
  "img/b0.jpeg", "img/b1.jpeg", "img/b2.jpeg", "img/b3.jpeg", "img/b4.jpeg",
  "img/a0.jpeg", "img/a1.jpeg", "img/a2.jpeg", "img/a3.jpeg", "img/a4.jpeg",
  "img/r0.jpeg", "img/r1.jpeg", "img/r2.jpeg", "img/r3.jpeg", "img/r4.jpeg",
  "img/m0.jpeg", "img/m1.jpeg", "img/m2.jpeg", "img/m3.jpeg", "img/m4.jpeg", "img/p0.jpeg"
];

const DIA = 86_400_000;
const parseDate = value => {
  const [dia, mes, ano] = value.split("/").map(Number);
  return new Date(ano, mes - 1, dia);
};
const formatDate = date => new Intl.DateTimeFormat("pt-BR").format(date);
const formatDuration = days => {
  const years = Math.floor(days / 365.25);
  const months = Math.round((days - years * 365.25) / 30.44);
  return `${years}a ${months}m`;
};

function weightedSlope(x, y) {
  const weights = x.map((_, index) => index + 1);
  const sum = weights.reduce((result, weight, index) => ({
    w: result.w + weight,
    wx: result.wx + weight * x[index],
    wy: result.wy + weight * y[index],
    wxx: result.wxx + weight * x[index] ** 2,
    wxy: result.wxy + weight * x[index] * y[index]
  }), { w: 0, wx: 0, wy: 0, wxx: 0, wxy: 0 });
  return (sum.w * sum.wxy - sum.wx * sum.wy) / (sum.w * sum.wxx - sum.wx ** 2);
}

const baseDate = parseDate(DATAS_CONHECIDAS[0]);
const knownDays = DATAS_CONHECIDAS.map(date => Math.round((parseDate(date) - baseDate) / DIA));
const knownIndexes = knownDays.map((_, index) => index);
const recentCount = Math.min(5, knownDays.length);
const slope = weightedSlope(knownIndexes.slice(-recentCount), knownDays.slice(-recentCount));
const allDays = [...knownDays];

for (let index = knownDays.length; index < GRADUACOES.length; index += 1) {
  allDays.push(Math.round(knownDays.at(-1) + slope * (index - knownIndexes.at(-1))));
}

const allDates = allDays.map(days => new Date(baseDate.getTime() + days * DIA));
const lastKnownIndex = knownDays.length - 1;
const blackBeltIndex = GRADUACOES.length - 1;

document.querySelector("#currentRank").textContent = GRADUACOES[lastKnownIndex];
document.querySelector("#currentDate").textContent = `Conquistada em ${formatDate(allDates[lastKnownIndex])}`;
document.querySelector("#nextRank").textContent = GRADUACOES[lastKnownIndex + 1];
document.querySelector("#nextDate").textContent = `Estimativa: ${formatDate(allDates[lastKnownIndex + 1])}`;
document.querySelector("#blackBeltDate").textContent = formatDate(allDates[blackBeltIndex]);
document.querySelector("#totalTime").textContent = `Cerca de ${formatDuration(allDays[blackBeltIndex] - allDays[0])} desde o início`;

const majorRanks = [0, 5, 10, 15, 20];
document.querySelector("#estimates").innerHTML = majorRanks.slice(0, -1).map((index, position) => {
  const following = majorRanks[position + 1];
  const duration = formatDuration(allDays[following] - allDays[index]);
  return `<div class="estimate"><span>${GRADUACOES[index]} → ${GRADUACOES[following]}</span><b>~${duration}</b></div>`;
}).join("");

const metalLine = context => {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return "rgba(169, 194, 226, .7)";
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, "rgba(166, 229, 255, .2)");
  gradient.addColorStop(.45, "rgba(240, 247, 255, .92)");
  gradient.addColorStop(1, "rgba(151, 124, 255, .3)");
  return gradient;
};

const ctx = document.querySelector("#jiujitsuChart");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: GRADUACOES,
    datasets: [{
      label: "Jornada",
      data: allDays,
      borderColor: metalLine,
      borderWidth: 2.2,
      tension: .28,
      segment: { borderDash: context => context.p0DataIndex >= lastKnownIndex ? [7, 7] : undefined },
      pointBackgroundColor: context => context.dataIndex <= lastKnownIndex ? CORES_FAIXA[context.dataIndex] : "#111a28",
      pointBorderColor: context => context.dataIndex <= lastKnownIndex ? "#f3f7ff" : CORES_FAIXA[context.dataIndex],
      pointBorderWidth: context => context.dataIndex <= lastKnownIndex ? 2 : 1.5,
      pointRadius: context => context.dataIndex <= lastKnownIndex ? 5 : 4.5,
      pointHoverRadius: 8,
      pointStyle: context => context.dataIndex <= lastKnownIndex ? "circle" : "rectRot"
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: true },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        padding: 12,
        backgroundColor: "rgba(8, 12, 20, .95)",
        titleColor: "#eff6ff",
        bodyColor: "#aebcd0",
        borderColor: "rgba(255,255,255,.18)",
        borderWidth: 1,
        callbacks: {
          title: items => GRADUACOES[items[0].dataIndex],
