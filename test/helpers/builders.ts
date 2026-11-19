import type { Edital } from '../../src/domain/edital/edital.js';
import type { Empresa } from '../../src/domain/empresa/empresa.js';

export function buildEdital(overrides: Partial<Edital> = {}): Edital {
  return {
    idPncp: '08761140000194-1-000180/2026',
    orgao: 'SECRETARIA DE ESTADO DA ADMINISTRACAO',
    municipioIbge: '2507507',
    municipioNome: 'João Pessoa',
    uf: 'PB',
    modalidade: { codigo: 6, nome: 'Pregão - Eletrônico' },
    objeto: 'Aquisição de material de expediente',
    valorEstimado: 10000,
    dataAbertura: '2026-11-10T08:00:00-03:00',
    dataEncerramentoPropostas: '2026-11-30T09:00:00-03:00',
    linkOficial: 'https://pncp.gov.br/app/editais/08761140000194/2026/180',
    ...overrides,
  };
}

export function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    cnpj: '08761140000194',
    razaoSocial: 'EMPRESA TESTE',
    situacaoCadastral: 'ATIVA',
    cnaePrincipal: {
      codigo: '5620104',
      descricao: 'Fornecimento de alimentos preparados preponderantemente para consumo domiciliar',
    },
    cnaesSecundarios: [],
    ...overrides,
  };
}
