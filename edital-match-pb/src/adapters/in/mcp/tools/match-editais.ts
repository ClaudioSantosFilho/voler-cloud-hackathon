import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type {
  MatchEditais,
  MatchEditaisResult,
} from '../../../../application/ports/in/match-editais.js';
import {
  cnaeOutput,
  cnpjInput,
  editalOutput,
  formatEditalLinha,
  formatRodape,
  READ_ONLY,
  ufInput,
} from '../schemas.js';
import { runTool, type ToolContext } from '../tool-runner.js';

const output = z.object({
  empresa: z.object({
    cnpj: z.string(),
    razaoSocial: z.string(),
    situacaoCadastral: z.string(),
    cnaePrincipal: cnaeOutput,
    cnaesSecundarios: z.array(cnaeOutput),
  }),
  uf: z.string(),
  limiar: z.number(),
  totalAnalisados: z.number(),
  totalCompativeis: z.number(),
  matches: z.array(
    z.object({ edital: editalOutput, score: z.number(), motivo: z.array(z.string()) }),
  ),
  avisos: z.array(z.string()),
  fontes: z.array(z.string()),
});

function format(r: MatchEditaisResult): string {
  const cabecalho = `${r.empresa.razaoSocial} — CNAE principal ${r.empresa.cnaePrincipal.codigo} ${r.empresa.cnaePrincipal.descricao}`;
  const resumo = `${r.totalCompativeis} edital(is) compatível(is) entre ${r.totalAnalisados} aberto(s) em ${r.uf} (score mínimo ${r.limiar}).`;
  const itens = r.matches.map(
    (m) =>
      `${formatEditalLinha(m.edital)}\n  Score ${m.score.toFixed(2)} — motivo: ${m.motivo.join('; ') || 'nenhum termo em comum'}`,
  );
  const aviso = 'O match é informativo e não substitui a leitura do edital nem a análise jurídica.';
  return [cabecalho, resumo, ...itens, aviso, formatRodape(r.fontes, r.avisos)].join('\n\n');
}

export function registerMatchEditais(
  server: McpServer,
  useCase: MatchEditais,
  ctx: ToolContext,
): void {
  server.registerTool(
    'match_editais',
    {
      title: 'Editais compatíveis com a empresa',
      description:
        'Cruza o CNAE principal e os secundários de um CNPJ com as licitações abertas da UF (padrão PB) e devolve os editais ranqueados por score (0 a 1), com o motivo do match e o prazo em dias úteis.',
      inputSchema: z.object({
        cnpj: cnpjInput,
        uf: ufInput,
        incluir_baixo_score: z
          .boolean()
          .default(false)
          .describe('Inclui editais com score abaixo do limiar configurado'),
        limite: z.number().int().min(1).max(100).default(20),
      }),
      outputSchema: output,
      annotations: READ_ONLY,
    },
    (args) =>
      runTool(ctx, 'match_editais', async () => {
        const result = await useCase.execute({
          cnpj: args.cnpj,
          uf: args.uf,
          incluirAbaixoDoLimiar: args.incluir_baixo_score,
          limite: args.limite,
        });
        return { text: format(result), data: result };
      }),
  );
}
