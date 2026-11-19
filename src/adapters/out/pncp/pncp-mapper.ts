import { z } from 'zod';
import { linkOficialPncp, type Edital } from '../../../domain/edital/edital.js';

/** Contrato mínimo da contratação no PNCP (campos usados). Campos extras são ignorados. */
export const pncpContratacaoSchema = z.object({
  numeroControlePNCP: z.string(),
  orgaoEntidade: z.object({ razaoSocial: z.string() }),
  unidadeOrgao: z.object({
    ufSigla: z.string(),
    municipioNome: z.string(),
    codigoIbge: z.union([z.string(), z.number()]),
  }),
  modalidadeId: z.number(),
  modalidadeNome: z.string(),
  objetoCompra: z.string(),
  valorTotalEstimado: z.number().nullish(),
  dataAberturaProposta: z.string().nullish(),
  dataEncerramentoProposta: z.string().nullish(),
});

export const pncpPaginaSchema = z.object({
  data: z.array(z.unknown()),
  totalPaginas: z.number(),
});

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Normaliza datas do PNCP para ISO 8601 com fuso. O PNCP envia horário de Brasília sem offset;
 * datas sem hora são tratadas como fim do dia. Retorna undefined se a data for inválida.
 */
export function normalizePncpDate(raw: string | null | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let iso: string;
  if (DATE_ONLY.test(value)) iso = `${value}T23:59:59-03:00`;
  else if (HAS_OFFSET.test(value)) iso = value;
  else iso = `${value.replace(' ', 'T').slice(0, 19)}-03:00`;
  return Number.isNaN(Date.parse(iso)) ? undefined : iso;
}

/** Converte um item do PNCP em Edital, ou undefined se faltar dado essencial. */
export function toEdital(raw: unknown): Edital | undefined {
  const parsed = pncpContratacaoSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const c = parsed.data;
  const encerramento = normalizePncpDate(c.dataEncerramentoProposta);
  if (!encerramento) return undefined;
  return {
    idPncp: c.numeroControlePNCP,
    orgao: c.orgaoEntidade.razaoSocial,
    municipioIbge: String(c.unidadeOrgao.codigoIbge),
    municipioNome: c.unidadeOrgao.municipioNome,
    uf: c.unidadeOrgao.ufSigla.toUpperCase(),
    modalidade: { codigo: c.modalidadeId, nome: c.modalidadeNome },
    objeto: c.objetoCompra.trim(),
    ...(c.valorTotalEstimado ? { valorEstimado: c.valorTotalEstimado } : {}),
    dataAbertura: normalizePncpDate(c.dataAberturaProposta) ?? encerramento,
    dataEncerramentoPropostas: encerramento,
    linkOficial: linkOficialPncp(c.numeroControlePNCP),
  };
}
