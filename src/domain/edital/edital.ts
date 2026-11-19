import { ValidationError } from '../errors.js';

export interface Modalidade {
  codigo: number;
  nome: string;
}

export interface Edital {
  idPncp: string;
  orgao: string;
  municipioIbge: string;
  municipioNome: string;
  uf: string;
  modalidade: Modalidade;
  objeto: string;
  valorEstimado?: number;
  /** ISO 8601 com fuso (normalizado no adaptador). */
  dataAbertura: string;
  dataEncerramentoPropostas: string;
  linkOficial: string;
}

/** RN02: proposta aberta enquanto o encerramento for maior ou igual a agora. */
export function isPropostaAberta(edital: Edital, now: Date): boolean {
  return Date.parse(edital.dataEncerramentoPropostas) >= now.getTime();
}

export interface IdPncpParts {
  cnpjOrgao: string;
  ano: number;
  sequencial: number;
}

const ID_PNCP = /^(\d{14})-\d+-(\d{1,6})\/(\d{4})$/;

/** Número de controle PNCP: `{cnpjOrgao}-1-{sequencial}/{ano}`. */
export function parseIdPncp(id: string): IdPncpParts {
  const match = ID_PNCP.exec(id.trim());
  if (!match) {
    throw new ValidationError(
      `id_pncp inválido: use o número de controle do PNCP, ex.: 08761140000194-1-000180/2026.`,
    );
  }
  const [, cnpjOrgao = '', seq = '', ano = ''] = match;
  return { cnpjOrgao, ano: Number(ano), sequencial: Number(seq) };
}

export function linkOficialPncp(id: string): string {
  const { cnpjOrgao, ano, sequencial } = parseIdPncp(id);
  return `https://pncp.gov.br/app/editais/${cnpjOrgao}/${ano}/${sequencial}`;
}

/** Edital com o prazo em dias úteis restantes (RN07). */
export interface EditalComPrazo extends Edital {
  diasUteisRestantes: number;
}
