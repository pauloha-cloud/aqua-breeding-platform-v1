export const MOCK_DASHBOARD_DATA = {
  kpis: {
    activeJobs: 12,
    analyzedAnimals: 7820,
    selectionRate: 32.5,
    meanAccuracy: 88,
  },
  histogram: [
    { label: "-2.0", count: 2 },
    { label: "-1.5", count: 4 },
    { label: "-1.0", count: 12 },
    { label: "-0.5", count: 25 },
    { label: "0.0", count: 38 },
    { label: "0.5", count: 28 },
    { label: "1.0", count: 15 },
    { label: "1.5", count: 6 },
    { label: "2.0", count: 3 },
  ],
  topAnimals: [
    { id: "1345", name: "Thor", ebv: 1.95 },
    { id: "2896", name: "Estrela", ebv: 1.85 },
    { id: "1760", name: "Max", ebv: 1.78 },
    { id: "3051", name: "Brisa", ebv: 1.72 },
    { id: "2512", name: "Zeus", ebv: 1.68 },
  ],
  bottomAnimals: [
    { id: "4789", name: "Bella", ebv: -1.85 },
    { id: "5632", name: "Rex", ebv: -1.72 },
    { id: "6135", name: "Luna", ebv: -1.65 },
  ],
  recentJobs: [
    { id: "1021", description: "Análise Fazenda Luzia", status: "Concluído", date: "23 Abr 2024" },
    { id: "1020", description: "Seleção de Novilhus", status: "Em Andamento", date: "22 Abr 2024" },
    { id: "1019", description: "Teste de Eficácia Genética", status: "Concluído", date: "20 Abr 2024" },
    { id: "1018", description: "Avaliação do Rebanho", status: "Concluído", date: "18 Abr 2024" },
  ],
  aiInsights: {
    summary: "A análise mais recente indica que 32.5% dos animais têm alto potencial genético. A média de acurácia está em 88%, garantindo alta confiabilidade nos resultados.",
    riskAlert: "Atenção especial aos animais com EBV negativo.",
  }
};
