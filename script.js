// -----------------------------------------------------------------------------
// DADOS REAIS — adicione uma nova data aqui quando houver outra graduação.
// -----------------------------------------------------------------------------
const DATAS_CONHECIDAS = [
  "31/07/2020", "17/12/2020", "05/05/2021", "04/01/2022", "07/02/2022",
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

const IMAGENS_PONTOS = [
  "img/b0.jpeg",  null,         null,          "img/b3.jpeg",  null,
  "img/a0.jpeg", "img/a1.jpeg", "img/a2.jpeg", "img/a3.jpeg", "img/a4.jpeg",
  "img/r0.jpeg", "img/r1.jpeg", "img/r2.jpeg", "img/r3.jpeg", "img/r4.jpeg",
  "img/m0.jpeg", "img/m1.jpeg", "img/m2.jpeg", "img/m3.jpeg", "img/m4.jpeg", 
  "img/p0.jpeg"
];

const CORES_FAIXA = [
  ...Array(5).fill("#d5d2ca"), ...Array(5).fill("#387aad"),
  ...Array(5).fill("#8966b2"), ...Array(5).fill("#79513d"), "#11110f"
];

const DIA = 86_400_000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function parseDate(value) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function daysBetween(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DIA));
}

function addDays(date, days) {
  return new Date(date.getTime() + Math.round(days) * DIA);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function formatMonthYear(date) {
  return `${MESES[date.getUTCMonth()]}. ${date.getUTCFullYear()}`;
}

// -----------------------------------------------------------------------------
// MODELO DE SOBREVIVÊNCIA
//
// Os intervalos concluídos são eventos. O tempo desde a última graduação é uma
// observação censurada à direita: sabemos que o próximo intervalo é maior que
// esse valor, mesmo sem saber quando terminará. Uma Weibull de dois parâmetros
// é ajustada por máxima verossimilhança, incluindo essa informação.
// -----------------------------------------------------------------------------
function fitCensoredWeibull(events, censoredDays) {
  function modelAt(logK) {
    const k = Math.exp(logK);
    const poweredTotal = events.reduce((total, value) => total + value ** k, censoredDays ** k);
    const lambda = (poweredTotal / events.length) ** (1 / k);
    const logLikelihood = events.reduce((total, value) => {
      return total + Math.log(k) - k * Math.log(lambda) + (k - 1) * Math.log(value) - (value / lambda) ** k;
    }, -((censoredDays / lambda) ** k));
    return { k, lambda, logLikelihood };
  }

  const ratio = (Math.sqrt(5) - 1) / 2;
  let low = Math.log(0.25);
  let high = Math.log(5);
  let left = high - ratio * (high - low);
  let right = low + ratio * (high - low);
  let leftModel = modelAt(left);
  let rightModel = modelAt(right);

  for (let iteration = 0; iteration < 64; iteration += 1) {
    if (leftModel.logLikelihood > rightModel.logLikelihood) {
      high = right;
      right = left;
      rightModel = leftModel;
      left = high - ratio * (high - low);
      leftModel = modelAt(left);
    } else {
      low = left;
      left = right;
      leftModel = rightModel;
      right = low + ratio * (high - low);
      rightModel = modelAt(right);
    }
  }

  return leftModel.logLikelihood > rightModel.logLikelihood ? leftModel : rightModel;
}

function mulberry32(initialSeed) {
  let seed = initialSeed >>> 0;
  return function random() {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function exponentialSample(random) {
  return -Math.log1p(-Math.max(Number.EPSILON, random()));
}

function percentile(sortedValues, probability) {
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower);
}

function simulateJourneys(model, elapsedDays, milestoneCount, simulations = 20000) {
  const random = mulberry32(20250723);
  const samples = Array.from({ length: milestoneCount }, () => []);
  const lambdaPower = model.lambda ** model.k;
  const elapsedPower = elapsedDays ** model.k;

  for (let run = 0; run < simulations; run += 1) {
    const firstTotalInterval = (elapsedPower + lambdaPower * exponentialSample(random)) ** (1 / model.k);
    let cumulativeFromLastKnown = Math.max(elapsedDays + 1, firstTotalInterval);
    samples[0].push(cumulativeFromLastKnown);

    for (let step = 1; step < milestoneCount; step += 1) {
      const nextInterval = model.lambda * exponentialSample(random) ** (1 / model.k);
      cumulativeFromLastKnown += Math.max(1, nextInterval);
      samples[step].push(cumulativeFromLastKnown);
    }
  }

  return samples.map(values => {
    values.sort((a, b) => a - b);
    return {
      low: percentile(values, 0.20),
      median: percentile(values, 0.50),
      high: percentile(values, 0.80)
    };
  });
}

// -----------------------------------------------------------------------------
// PREPARAÇÃO DOS DADOS E PREVISÃO COMPLETA
// -----------------------------------------------------------------------------
const knownDates = DATAS_CONHECIDAS.map(parseDate);
const baseDate = knownDates[0];
const lastKnownDate = knownDates[knownDates.length - 1];
const currentDate = todayUtc();
const elapsedSinceLast = daysBetween(lastKnownDate, currentDate);
const historicalIntervals = knownDates.slice(1).map((date, index) => daysBetween(knownDates[index], date));
const pendingMilestones = GRADUACOES.length - knownDates.length;
const model = fitCensoredWeibull(historicalIntervals, elapsedSinceLast);
const simulated = simulateJourneys(model, elapsedSinceLast, pendingMilestones);

const forecasts = simulated.map(result => ({
  low: addDays(lastKnownDate, result.low),
  median: addDays(lastKnownDate, result.median),
  high: addDays(lastKnownDate, result.high)
}));

const lastKnownIndex = knownDates.length - 1;
const blackBeltForecast = forecasts[forecasts.length - 1];

// -----------------------------------------------------------------------------
// CONTEÚDO DA INTERFACE
// -----------------------------------------------------------------------------
document.querySelector("#modelDate").textContent = `Modelo atualizado em ${formatDate(currentDate)}`;
document.querySelector("#currentRank").textContent = GRADUACOES[lastKnownIndex];
document.querySelector("#currentDate").textContent = `Conquistada em ${formatDate(lastKnownDate)}`;
document.querySelector("#nextDate").textContent = formatDate(forecasts[0].median);
document.querySelector("#nextWindow").textContent = `Faixa central: ${formatDate(forecasts[0].low)} — ${formatDate(forecasts[0].high)}`;
document.querySelector("#blackBeltWindow").textContent = `${formatMonthYear(blackBeltForecast.low)} — ${formatMonthYear(blackBeltForecast.high)}`;
document.querySelector("#blackBeltMedian").textContent = `Mediana estatística: ${formatDate(blackBeltForecast.median)}`;

const photoArchive = document.querySelector("#photoArchive");

const availablePhotos = knownDates
  .map((date, index) => ({
    date,
    index,
    image: IMAGENS_PONTOS[index]
  }))
  .filter(item => item.image !== null)
  .reverse();

photoArchive.innerHTML = availablePhotos.map(({ date, index, image }) => `
  <figure class="photo-entry">
    <img
      src="${image}"
      alt="${GRADUACOES[index]} — ${formatDate(date)}"
      loading="lazy"
    />

    <figcaption>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <span>${GRADUACOES[index]}</span>
      <span>${formatDate(date)}</span>
    </figcaption>
  </figure>
`).join("");

photoArchive.querySelectorAll("img").forEach(image => {
  const removeCard = () => {
    image.closest(".photo-entry")?.remove();
  };

  image.addEventListener("error", removeCard, { once: true });

  if (image.complete && image.naturalWidth === 0) {
    removeCard();
  }
});


const forecastRoadmap = document.querySelector("#forecastRoadmap");
forecastRoadmap.innerHTML = forecasts.map((forecast, position) => {
  const index = knownDates.length + position;
  const beltChange = [15, 20].includes(index) ? " belt-change" : "";
  return `
    <article class="forecast-row${beltChange}">
      <span class="number">${String(index + 1).padStart(2, "0")}</span>
      <h3>${GRADUACOES[index]}</h3>
      <span class="median">${formatDate(forecast.median)}</span>
      <span class="range">janela ${formatDate(forecast.low)} — ${formatDate(forecast.high)}</span>
    </article>
  `;
}).join("");

// -----------------------------------------------------------------------------
// GRÁFICO — o restante da página continua funcionando se o CDN estiver fora.
// -----------------------------------------------------------------------------
const canvas = document.querySelector("#jiujitsuChart");
const chartFallback = document.querySelector("#chartFallback");

if (typeof Chart === "undefined") {
  canvas.hidden = true;
  chartFallback.hidden = false;
} else {
  const completeDates = [...knownDates, ...forecasts.map(item => item.median)];
  const timelineDays = completeDates.map(date => daysBetween(baseDate, date));

  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
  new Chart(canvas, {
    type: "line",
    data: {
      labels: GRADUACOES,
      datasets: [{
        data: timelineDays,
        borderColor: "#11110f",
        borderWidth: 2,
        tension: 0.16,
        segment: {
          borderColor: context => context.p0DataIndex >= lastKnownIndex ? "#8966b2" : "#11110f",
          borderDash: context => context.p0DataIndex >= lastKnownIndex ? [7, 6] : undefined
        },
        pointBackgroundColor: context => context.dataIndex <= lastKnownIndex ? CORES_FAIXA[context.dataIndex] : "#e7e3da",
        pointBorderColor: context => context.dataIndex <= lastKnownIndex ? "#11110f" : "#8966b2",
        pointBorderWidth: 2,
        pointRadius: context => context.dataIndex <= lastKnownIndex ? 5 : 4,
        pointHoverRadius: 7,
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
          backgroundColor: "#11110f",
          titleColor: "#f1eee7",
          bodyColor: "#c6c2ba",
          padding: 13,
          callbacks: {
            title: items => GRADUACOES[items[0].dataIndex],
            label: item => {
              if (item.dataIndex <= lastKnownIndex) return `Registro real: ${formatDate(knownDates[item.dataIndex])}`;
              const forecast = forecasts[item.dataIndex - knownDates.length];
              return [`Mediana: ${formatDate(forecast.median)}`, `Janela: ${formatDate(forecast.low)} — ${formatDate(forecast.high)}`];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: "rgba(17,17,15,.3)" },
          ticks: { color: "#68665f", maxRotation: 52, minRotation: 52, autoSkip: true, maxTicksLimit: 12, font: { size: 10, weight: "600" } }
        },
        y: {
          grid: { color: "rgba(17,17,15,.11)", drawTicks: false },
          border: { display: false },
          ticks: { color: "#68665f", padding: 10, callback: value => `${Math.round(value / 365.25)}a` },
          title: { display: true, text: "TEMPO DESDE O INÍCIO", color: "#68665f", font: { size: 9, weight: "700" } }
        }
      }
    }
  });
}
