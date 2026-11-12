// =============================================================================
// DADOS — o único arquivo que você precisa editar.
// Ganhou um grau novo? Acrescente uma linha no fim de HISTORICO.
// =============================================================================

// Uma linha por graduação conquistada, na ordem. `foto` é opcional.
const HISTORICO = [
  { data: "31/07/2020", foto: "img/b0.jpeg" }, // Faixa branca
  { data: "17/12/2020" },                      // Branca · 1º grau
  { data: "05/05/2021" },                      // Branca · 2º grau
  { data: "04/01/2022", foto: "img/b3.jpeg" }, // Branca · 3º grau
  { data: "07/02/2022" },                      // Branca · 4º grau
  { data: "27/06/2022", foto: "img/a0.jpeg" }, // Faixa azul
  { data: "27/07/2023", foto: "img/a1.jpeg" }, // Azul · 1º grau
  { data: "27/12/2023", foto: "img/a2.jpeg" }, // Azul · 2º grau
  { data: "09/10/2024", foto: "img/a3.jpeg" }, // Azul · 3º grau
  { data: "15/01/2025", foto: "img/a4.jpeg" }, // Azul · 4º grau
  { data: "31/01/2025", foto: "img/r0.jpeg" }, // Faixa roxa
  { data: "23/07/2025", foto: "img/r1.jpeg" }, // Roxa · 1º grau
  { data: "10/11/2026", foto: "img/r2.jpeg" }, // Roxa · 2º grau
];

// `anosMinimos`: tempo mínimo na faixa antes da próxima (regra IBJJF/CBJJ
// para adultos). Use 0 se a sua academia não segue essa regra.
const FAIXAS = [
  { nome: "Branca", cor: "#d5d2ca", anosMinimos: 0 },
  { nome: "Azul",   cor: "#387aad", anosMinimos: 2 },
  { nome: "Roxa",   cor: "#8966b2", anosMinimos: 1.5 },
  { nome: "Marrom", cor: "#79513d", anosMinimos: 1 },
  { nome: "Preta",  cor: "#11110f", anosMinimos: 0 },
];

// Lista completa de marcos, da faixa branca à preta (21 no total):
// [{ nome: "Faixa branca", faixa: 0, grau: 0 }, { nome: "Branca · 1º grau", faixa: 0, grau: 1 }, ...]
// A faixa preta entra só como marco final, sem graus.
const GRADUACOES = FAIXAS.flatMap(({ nome }, faixa) => {
  const ehPreta = faixa === FAIXAS.length - 1;
  const graus = ehPreta ? [0] : [0, 1, 2, 3, 4];
  return graus.map(grau => ({
    faixa,
    grau,
    nome: grau === 0 ? `Faixa ${nome.toLowerCase()}` : `${nome} · ${grau}º grau`,
  }));
});
