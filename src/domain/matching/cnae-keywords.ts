import type { Cnae } from '../empresa/cnae.js';
import { normalizeText } from './text.js';

/**
 * CNAE (7 dígitos) -> radicais/termos procurados no objeto do edital.
 * Termos já normalizados (minúsculas, sem acento). Um radical casa com o início de uma palavra
 * do objeto: "refeic" casa com "refeição" e "refeições".
 */
export const CNAE_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  // Alimentação
  '5620104': ['refeic', 'marmit', 'quentinh', 'alimentos preparados', 'lanche', 'kit lanche'],
  '5620101': ['refeic', 'marmit', 'merenda', 'alimentacao', 'quentinh'],
  '5620102': ['buffet', 'coffee break', 'coquetel', 'lanche'],
  '5611201': ['refeic', 'restaurante', 'marmit', 'self service'],
  '5611203': ['lanche', 'salgad', 'coffee break', 'sanduich'],
  '1091102': ['pao', 'paes', 'bolo', 'salgad', 'panific', 'confeit'],
  '4721102': ['pao', 'paes', 'panific', 'bolo'],
  '4724500': ['hortifrut', 'fruta', 'verdura', 'legume'],
  // Limpeza e conservação
  '8121400': ['limpeza', 'conservacao predial', 'asseio', 'higieniz', 'faxina'],
  '8129000': ['limpeza', 'higieniz', 'desinfec', 'lavagem'],
  '8130300': ['jardin', 'paisag', 'rocad', 'poda', 'capina'],
  '4789005': [
    'saneante',
    'material de limpeza',
    'desinfetante',
    'detergente',
    'produtos de limpeza',
  ],
  '8011101': ['vigilancia', 'seguranca patrimonial', 'vigia'],
  // Tecnologia da informação
  '6201501': ['software', 'sistema', 'aplicativo', 'web', 'portal'],
  '6201502': ['site', 'portal', 'web', 'design'],
  '6202300': ['software', 'licenc', 'sistema'],
  '6203100': ['software', 'licenc', 'sistema'],
  '6204000': ['consultoria em ti', 'tecnologia da informacao', 'informatica'],
  '6209100': ['suporte tecnico', 'informatica', 'tecnologia da informacao', 'help desk'],
  '9511800': ['manutencao de computador', 'computador', 'impressora', 'notebook', 'informatica'],
  '4751201': ['computador', 'notebook', 'informatica', 'impressora', 'toner', 'periferic'],
  // Comércio e confecção
  '4761003': ['papelaria', 'material de expediente', 'papel', 'caneta', 'escritorio'],
  '4781400': ['uniforme', 'fardamento', 'camis', 'vestuario'],
  '1412601': ['uniforme', 'fardamento', 'confecc', 'camis', 'costura'],
  '4744099': ['material de construcao', 'cimento', 'tinta', 'ferrag'],
  '4771701': ['medicament', 'farmac'],
  // Obras e manutenção
  '4321500': ['eletric', 'instalacao eletrica', 'iluminacao'],
  '4330404': ['pintura', 'pintor'],
  '4399103': ['alvenaria', 'reforma', 'pedreiro', 'obra'],
  '4520001': ['manutencao de veicul', 'mecanic', 'frota', 'oficina mecanica'],
  // Serviços
  '1813001': ['grafic', 'impressao', 'banner', 'folder', 'panfleto', 'cartaz'],
  '8230001': ['evento', 'cerimonial', 'sonorizacao', 'palco'],
  '4930201': ['transporte', 'frete', 'carreto', 'mudanca'],
  '8599604': ['treinamento', 'capacitacao', 'curso'],
  '7420001': ['fotograf', 'filmag', 'video'],
  '9602501': ['cabeleireir', 'estetic', 'beleza'],
};

/** Palavras genéricas de descrições CNAE que não ajudam no match. */
const STOPWORDS = new Set(
  [
    'atividades',
    'servicos',
    'comercio',
    'varejista',
    'atacadista',
    'especificadas',
    'anteriormente',
    'outros',
    'outras',
    'exceto',
    'preponderantemente',
    'consumo',
    'domiciliar',
    'fabricacao',
    'produtos',
    'geral',
    'atividade',
    'empresas',
    'prestacao',
  ].map((w) => w.slice(0, 6)),
);

function termosDaDescricao(descricao: string): string[] {
  const radicais = normalizeText(descricao)
    .split(' ')
    .filter((w) => w.length >= 6)
    .map((w) => w.slice(0, 6))
    .filter((w) => !STOPWORDS.has(w));
  return [...new Set(radicais)];
}

/** Termos de busca de um CNAE: do dicionário ou, como fallback, da própria descrição. */
export function keywordsForCnae(cnae: Cnae): readonly string[] {
  return CNAE_KEYWORDS[cnae.codigo] ?? termosDaDescricao(cnae.descricao);
}
