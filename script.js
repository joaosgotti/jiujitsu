// ==============================================================================
// 1. DADOS DE ENTRADA
// ==============================================================================
const DATAS_CONHECIDAS_STR = [
    "31/07/2020", "17/12/2020", "05/05/2021", "21/09/2021", "07/02/2022",
    "27/06/2022", "27/07/2023", "27/12/2023", "09/10/2024", "15/01/2025",
    "31/01/2025", "23/07/2025"
];
const LABELS_FAIXAS = [
    "faixa branca", "branca 1º grau", "branca 2º grau", "branca 3º grau", "branca 4º grau",
    "faixa azul", "azul 1º grau", "azul 2º grau", "azul 3º grau", "azul 4º grau",
    "faixa roxa", "roxa 1º grau", "roxa 2º grau", "roxa 3º grau", "roxa 4º grau",
    "faixa marrom", "marrom 1º grau", "marrom 2º grau", "marrom 3º grau", "marrom 4º grau",
    "faixa preta"
];
const CORES_FAIXA = [
    ...Array(5).fill('#AAAAAA'), ...Array(5).fill('#3498DB'),
    ...Array(5).fill('#8E44AD'), ...Array(5).fill('#A0522D'), '#000000'
];

// ==============================================================================
// 2. FUNÇÕES AUXILIARES
// ==============================================================================
function parseDate(str) { const [d, m, y] = str.split('/'); return new Date(y, m - 1, d); }
function formatDate(date) { const d = String(date.getDate()).padStart(2, '0'); const m = String(date.getMonth() + 1).padStart(2, '0'); return `${d}/${m}/${date.getFullYear()}`; }
function linearRegression(x, y) {
    const n = x.length; let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0;
    for (let i = 0; i < n; i++) { sum_x += x[i]; sum_y += y[i]; sum_xy += x[i] * y[i]; sum_xx += x[i] * x[i]; }
    const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    return { slope };
}

function linearRegressionWeighted(x, y, weights) {
    let sum_w = 0, sum_wx = 0, sum_wy = 0, sum_wxx = 0, sum_wxy = 0;
    for (let i = 0; i < x.length; i++) {
        const w = weights[i];
        sum_w += w;
        sum_wx += w * x[i];
        sum_wy += w * y[i];
        sum_wxx += w * x[i] * x[i];
        sum_wxy += w * x[i] * y[i];
    }
    const slope = (sum_w * sum_wxy - sum_wx * sum_wy) / (sum_w * sum_wxx - sum_wx * sum_wx);
    return { slope };
}

// ==============================================================================
// 3. PROCESSAMENTO DOS DADOS
// ==============================================================================
const dataBase = parseDate(DATAS_CONHECIDAS_STR[0]);
const yConhecidos = DATAS_CONHECIDAS_STR.map(d => Math.ceil(Math.abs(parseDate(d) - dataBase) / (1000 * 60 * 60 * 24)));
const xConhecidos = Array.from({ length: yConhecidos.length }, (_, i) => i);

const nRecentes = 5;
const xRecentes = xConhecidos.slice(-nRecentes);
const yRecentes = yConhecidos.slice(-nRecentes);

const weights = xRecentes.map((_, i) => i + 1);
const { slope } = linearRegressionWeighted(xRecentes, yRecentes, weights);
const ultimoXConhecido = xConhecidos[xConhecidos.length - 1];
const ultimoYConhecido = yConhecidos[yConhecidos.length - 1];

const yTodos = [...yConhecidos];
for (let i = yConhecidos.length; i < LABELS_FAIXAS.length; i++) {
    const yPrevisto = ultimoYConhecido + slope * (i - ultimoXConhecido);
    yTodos.push(Math.round(yPrevisto));
}

const datasTodas = yTodos.map(days => formatDate(new Date(dataBase.getTime() + days * 24 * 60 * 60 * 1000)));

// Preenche o box de informações
const indicesPrincipais = [0, 5, 10, 15, 20];
const faixasPrincipais = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];

let infoBoxHTML = `<strong class="titulo-info">Tempo de faixa:</strong><br>`;
for (let i = 0; i < indicesPrincipais.length - 3; i++) {
    const diff = yTodos[indicesPrincipais[i + 1]] - yTodos[indicesPrincipais[i]];
    const anos = Math.floor(diff / 365);
    const meses = Math.floor((diff % 365) / 30);
    infoBoxHTML += `${faixasPrincipais[i]} → ${faixasPrincipais[i+1]}: ${anos}a ${meses}m<br>`;
}
// Tempo entre agora e marrom

const idxAgora = yConhecidos.length - 1;
const idxMarrom = indicesPrincipais[3];
const diffAgoraMarrom = yTodos[idxMarrom] - yTodos[idxAgora];
const anosAgoraMarrom = Math.floor(diffAgoraMarrom / 365);
const mesesAgoraMarrom = Math.floor((diffAgoraMarrom % 365) / 30);

const idxPreta = indicesPrincipais[4];
const diffAgoraPreta = yTodos[idxPreta] - yTodos[idxAgora];
const anosAgoraPreta = Math.floor(diffAgoraPreta / 365);
const mesesAgoraPreta = Math.floor((diffAgoraPreta % 365) / 30);

infoBoxHTML += `<br><strong class="titulo-info"> Tempo estimado para próximas faixas:</strong></br>
Para marrom: ${anosAgoraMarrom}a ${mesesAgoraMarrom}m<br>Para preta: ${anosAgoraPreta}a ${mesesAgoraPreta}m</br>`;
const diffTotal = yTodos[indicesPrincipais[indicesPrincipais.length - 1]] - yTodos[indicesPrincipais[0]];
const anosTotal = Math.floor(diffTotal / 365);
const mesesTotal = Math.floor((diffTotal % 365) / 30);
infoBoxHTML += `<br><strong class="titulo-info">Tempo total estimado: ${anosTotal} anos e ${mesesTotal} meses</strong>`;
document.getElementById('infoBox').innerHTML = infoBoxHTML;


// ==============================================================================
// 4. CRIAÇÃO DO GRÁFICO (AGORA COM UM ÚNICO DATASET)
// ==============================================================================
const ctx = document.getElementById('jiujitsuChart').getContext('2d');
const jiujitsuChart = new Chart(ctx, {
    type: 'line', data: { labels: LABELS_FAIXAS,
        datasets: [
            // O único dataset que precisamos: a jornada completa.
            {
                label: 'Jornada', // Este label não será mais mostrado
                data: yTodos,
                borderColor: 'rgba(128, 128, 128, 0.4)',
                tension: 0.1,
                pointBackgroundColor: (context) => {
                    const color = CORES_FAIXA[context.dataIndex];
                    return context.dataIndex >= yConhecidos.length ? color + '80' : color;
                },
                pointBorderColor: (context) => context.dataIndex >= yConhecidos.length ? '#777' : '#333',
                pointRadius: (context) => context.dataIndex < yConhecidos.length ? 10 : 5,
                pointHoverRadius: (context) => context.dataIndex < yConhecidos.length ? 8 : 7,
                pointStyle: (context) => context.dataIndex < yConhecidos.length ? 'circle' : 'rectRot',
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false // Esconde completamente a legenda para um visual mais limpo
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Data: ${datasTodas[context.dataIndex]}`;
                    }
                }
            }
        },
        scales: {
            x: { title: { display: true, text: 'Graduações' } },
            y: { title: { display: true, text: `Dias desde ${formatDate(dataBase)}` }, beginAtZero: true }
        }
    }
});

// Array de imagens para os pontos (apenas ponto 11 com imagem de teste)
const IMAGENS_PONTOS = [
  "img/b0.jpeg", // ponto 0
  "img/b1.jpeg", // ponto 1
  "img/b2.jpeg", // ponto 2
  "img/b3.jpeg", // ponto 3
  "img/b4.jpeg", // ponto 4
  "img/a0.jpeg", // ponto 5
  "img/a1.jpeg", // ponto 6
  "img/a2.jpeg", // ponto 7
  "img/a3.jpeg", // ponto 8
  "img/a4.jpeg", // ponto 9
  "img/r0.jpeg", // ponto 10
  "img/r1.jpeg", // ponto 11
  "img/r2.jpeg", // ponto 12
  "img/r3.jpeg", // ponto 13
  "img/r4.jpeg", // ponto 14
  "img/m0.jpeg", // ponto 15
  "img/m1.jpeg", // ponto 16
  "img/m2.jpeg", // ponto 17
  "img/m3.jpeg", // ponto 18
  "img/m4.jpeg", // ponto 19
  "img/p0.jpeg"  // ponto 20
];

// Código para mostrar a imagem ao passar o mouse sobre o ponto
const tooltipImg = document.getElementById('tooltipImg');
const canvas = document.getElementById('jiujitsuChart');

canvas.addEventListener('mousemove', function(event) {
    const points = jiujitsuChart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
    if (points.length) {
        const idx = points[0].index;
        if (IMAGENS_PONTOS[idx] && IMAGENS_PONTOS[idx].trim() !== "") {
            tooltipImg.src = IMAGENS_PONTOS[idx];
            tooltipImg.style.display = 'block';
            tooltipImg.style.left = (event.pageX + 30) + 'px';
            tooltipImg.style.top = (event.pageY + 30) + 'px';
        } else {
            tooltipImg.style.display = 'none';
        }
    } else {
        tooltipImg.style.display = 'none';
    }
});

canvas.addEventListener('mouseleave', function() {
    tooltipImg.style.display = 'none';
});

tooltipImg.onerror = function() {
    tooltipImg.style.display = 'none';
};