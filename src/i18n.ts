export type Language = 'PT' | 'EN' | 'NL';

export interface Translations {
  dashboard: string;
  newJob: string;
  history: string;
  farms: string;
  animals: string;
  reports: string;
  billing: string;
  settings: string;
  searchPlaceholder: string;
  activeJobs: string;
  analyzedAnimals: string;
  selectionRate: string;
  meanAccuracy: string;
  geneticElite: string;
  ebvDistribution: string;
  frequencyByDeviation: string;
  negativeDeviation: string;
  geneticGain: string;
  systemHealth: string;
  lastAnalysisTitle: string;
  viewPdfReport: string;
  footerAuthority: string;
  logout: string;
  heroBadge: string;
  heroTitle: string;
  heroTitleHighlight: string;
  heroDescription: string;
}

export const translations: Record<Language, Translations> = {
  PT: {
    dashboard: 'Dashboard',
    newJob: 'Novo Job',
    history: 'Histórico',
    farms: 'Fazendas',
    animals: 'Animais',
    reports: 'Relatórios',
    billing: 'Billing',
    settings: 'Configurações',
    searchPlaceholder: 'PROCURAR GENOMAS...',
    activeJobs: 'Jobs Ativos',
    analyzedAnimals: 'Animais Analisados',
    selectionRate: 'Taxa de Seleção',
    meanAccuracy: 'Acurácia Média',
    geneticElite: 'Elite Selection',
    ebvDistribution: 'DISTRIBUIÇÃO EBV (MME Engine)',
    frequencyByDeviation: 'Frequência Animal por Desvio Genético',
    negativeDeviation: 'Desvio Negativo',
    geneticGain: 'Ganho Genético',
    systemHealth: 'Saúde do Sistema',
    lastAnalysisTitle: 'Conclusão Genética (Vertex AI)',
    viewPdfReport: 'Ver Relatório PDF Completo',
    footerAuthority: 'Aqua Breeding Genetic OS - Advanced Aquaculture Analysis | Powered by Vertex AI',
    logout: 'Sair da Conta',
    heroBadge: 'ECOSSISTEMA GENÉTICO AQUA',
    heroTitle: 'Avance a',
    heroTitleHighlight: 'Fronteira Genética.',
    heroDescription: 'Impulsionando a aquicultura sustentável através de melhoramento de precisão, seleção orientada por IA e insights genômicos em tempo real.',
  },
  EN: {
    dashboard: 'Dashboard',
    newJob: 'New Job',
    history: 'History',
    farms: 'Farms',
    animals: 'Animals',
    reports: 'Reports',
    billing: 'Billing',
    settings: 'Settings',
    searchPlaceholder: 'SEARCH GENOMES...',
    activeJobs: 'Active Jobs',
    analyzedAnimals: 'Analyzed Animals',
    selectionRate: 'Selection Rate',
    meanAccuracy: 'Average Accuracy',
    geneticElite: 'Elite Selection',
    ebvDistribution: 'EBV DISTRIBUTION (MME Engine)',
    frequencyByDeviation: 'Animal Frequency by Genetic Deviation',
    negativeDeviation: 'Negative Deviation',
    geneticGain: 'Genetic Gain',
    systemHealth: 'System Health',
    lastAnalysisTitle: 'Genetic Insights (Vertex AI)',
    viewPdfReport: 'View Full PDF Report',
    footerAuthority: 'Aqua Breeding Genetic OS - Advanced Aquaculture Analysis | Powered by Vertex AI',
    logout: 'Logout',
    heroBadge: 'AQUA GENETICS ECOSYSTEM',
    heroTitle: 'Advance the',
    heroTitleHighlight: 'Genetic Frontier.',
    heroDescription: 'Empowering sustainable aquaculture through precision breeding, AI-driven selection, and real-time genomic insights.',
  },
  NL: {
    dashboard: 'Dashboard',
    newJob: 'Nieuwe Taak',
    history: 'Geschiedenis',
    farms: 'Boerderijen',
    animals: 'Dieren',
    reports: 'Rapporten',
    billing: 'Facturering',
    settings: 'Instellingen',
    searchPlaceholder: 'ZOEK GENOMEN...',
    activeJobs: 'Actieve Taken',
    analyzedAnimals: 'Geanalyseerde Dieren',
    selectionRate: 'Selectiepercentage',
    meanAccuracy: 'Gem. Nauwkeurigheid',
    geneticElite: 'Elite Selectie',
    ebvDistribution: 'EBV DISTRIBUTIE (MME Engine)',
    frequencyByDeviation: 'Dierfrequentie per Genetische Afwijking',
    negativeDeviation: 'Negatieve Afwijking',
    geneticGain: 'Genetische Winst',
    systemHealth: 'Systeem Gezondheid',
    lastAnalysisTitle: 'Genetische Inzichten (Vertex AI)',
    viewPdfReport: 'Bekijk Volledig PDF-rapport',
    footerAuthority: 'Aqua Breeding Genetic OS - Advanced Aquaculture Analysis | Powered by Vertex AI',
    logout: 'Uitloggen',
    heroBadge: 'AQUA GENETISCH ECOSYSTEEM',
    heroTitle: 'Verleg de',
    heroTitleHighlight: 'Grenzen van Genetica.',
    heroDescription: 'Duurzame aquacultuur versterken met precisieveredeling, AI-gestuurde selectie en realtime genomische inzichten.',
  }
};

export const formatNumber = (num: number, lang: Language): string => {
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  };
  
  const locale = lang === 'EN' ? 'en-US' : (lang === 'PT' ? 'pt-BR' : 'nl-NL');
  return new Intl.NumberFormat(locale, options).format(num);
};

export const formatInteger = (num: number, lang: Language): string => {
  const locale = lang === 'EN' ? 'en-US' : (lang === 'PT' ? 'pt-BR' : 'nl-NL');
  return new Intl.NumberFormat(locale).format(num);
};
