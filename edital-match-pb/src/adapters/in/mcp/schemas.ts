import { z } from 'zod';
import type { EditalComPrazo } from '../../../domain/edital/edital.js';

/** RF10/RN08: todas as tools são somente leitura. */
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export const ufInput = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.enum(UFS))
  .default('PB')
  .describe('Sigla da UF (padrão PB)');

export const dataInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'data inválida');

export const cnaeOutput = z.object({ codigo: z.string(), descricao: z.string() });

export const editalOutput = z.object({
  idPncp: z.string(),
  orgao: z.string(),
  municipioIbge: z.string(),
  municipioNome: z.string(),
  uf: z.string(),
  modalidade: z.object({ codigo: z.number(), nome: z.string() }),
  objeto: z.string(),
  valorEstimado: z.number().optional(),
  dataAbertura: z.string(),
  dataEncerramentoPropostas: z.string(),
  linkOficial: z.string(),
  diasUteisRestantes: z.number(),
});

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatValor(valor?: number): string {
  return valor === undefined ? 'não informado' : brl.format(valor);
}

export function formatData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano} ${iso.slice(11, 16)}`;
}

export function formatEditalLinha(e: EditalComPrazo): string {
  return [
    `• ${e.objeto}`,
    `  ${e.orgao} — ${e.municipioNome}/${e.uf} — ${e.modalidade.nome}`,
    `  Valor estimado: ${formatValor(e.valorEstimado)} | Propostas até ${formatData(e.dataEncerramentoPropostas)} (${e.diasUteisRestantes} dias úteis)`,
    `  id_pncp: ${e.idPncp} | ${e.linkOficial}`,
  ].join('\n');
}

export function formatRodape(fontes: string[], avisos: string[]): string {
  const linhas = [`Fontes: ${fontes.join(', ')}.`];
  for (const aviso of avisos) linhas.push(`Aviso: ${aviso}`);
  return linhas.join('\n');
}

/** Aceita texto ou número (alguns clientes convertem dígitos em número e perdem o zero à esquerda). */
export const cnpjInput = z
  .union([z.string().max(32), z.number().int().nonnegative()])
  .transform((v) => (typeof v === 'number' ? String(v).padStart(14, '0') : v))
  .describe('CNPJ com ou sem máscara, ex.: 12.345.678/0001-95');
