// ==============================================================================
// 1. DADOS DE ENTRADA
// ==============================================================================
const DATAS_CONHECIDAS_STR = [
    "31/07/2020", "05/10/2020", "10/12/2020", "14/02/2021", "21/04/2021",
    "27/06/2022", "27/07/2023", "27/12/2023", "09/10/2024", "15/01/2025",
    "31/01/2025", "23/07/2025",
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

// ==============================================================================
// 3. PROCESSAMENTO DOS DADOS
// ==============================================================================
const dataBase = parseDate(DATAS_CONHECIDAS_STR[0]);
const yConhecidos = DATAS_CONHECIDAS_STR.map(d => Math.ceil(Math.abs(parseDate(d) - dataBase) / (1000 * 60 * 60 * 24)));
const xConhecidos = Array.from({ length: yConhecidos.length }, (_, i) => i);

const nRecentes = 5;
const xRecentes = xConhecidos.slice(-nRecentes);
const yRecentes = yConhecidos.slice(-nRecentes);

const { slope } = linearRegression(xRecentes, yRecentes);
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
let infoBoxHTML = "<strong>Tempo estimado por faixa:</strong><br>";
for (let i = 0; i < indicesPrincipais.length - 1; i++) {
    const diff = yTodos[indicesPrincipais[i + 1]] - yTodos[indicesPrincipais[i]];
    const anos = Math.floor(diff / 365);
    const meses = Math.floor((diff % 365) / 30);
    infoBoxHTML += `${faixasPrincipais[i]} → ${faixasPrincipais[i+1]}: ~${anos}a ${meses}m<br>`;
}
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
                pointRadius: (context) => context.dataIndex < yConhecidos.length ? 6 : 5,
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