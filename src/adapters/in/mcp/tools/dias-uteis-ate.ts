import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type {
  CalcularDiasUteis,
  CalcularDiasUteisResult,
} from '../../../../application/ports/in/consultas.js';
import { dataInput, formatRodape, READ_ONLY, ufInput } from '../schemas.js';
import { runTool, type ToolContext } from '../tool-runner.js';

const output = z.object({
  hoje: z.string(),
  data: z.string(),
  uf: z.string(),
  diasUteis: z.number(),
  feriadosNoPeriodo: z.array(z.object({ data: z.string(), nome: z.string() })),
  avisos: z.array(z.string()),
  fontes: z.array(z.string()),
});

function format(r: CalcularDiasUteisResult): string {
  const feriados = r.feriadosNoPeriodo.map((f) => `${f.data} ${f.nome}`).join(', ') || 'nenhum';
  return [
    `${r.diasUteis} dia(s) útil(eis) de ${r.hoje} (exclusive) até ${r.data} (inclusive) em ${r.uf}.`,
    `Feriados no período: ${feriados}.`,
    formatRodape(r.fontes, r.avisos),
  ].join('\n');
}

export function registerDiasUteisAte(
  server: McpServer,
  useCase: CalcularDiasUteis,
  ctx: ToolContext,
): void {
  server.registerTool(
    'dias_uteis_ate',
    {
      title: 'Dias úteis até uma data',
      description:
        'Conta os dias úteis de hoje até a data informada, descontando fins de semana, feriados nacionais e estaduais da UF.',
      inputSchema: z.object({ data: dataInput.describe('Data final (AAAA-MM-DD)'), uf: ufInput }),
      outputSchema: output,
      annotations: READ_ONLY,
    },
    ({ data, uf }) =>
      runTool(ctx, 'dias_uteis_ate', async () => {
        const result = await useCase.execute({ data, uf });
        return { text: format(result), data: result };
      }),
  );
}
