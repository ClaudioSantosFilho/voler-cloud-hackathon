import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type {
  DetalharEdital,
  DetalharEditalResult,
} from '../../../../application/ports/in/consultas.js';
import { editalOutput, formatData, formatRodape, formatValor, READ_ONLY } from '../schemas.js';
import { runTool, type ToolContext } from '../tool-runner.js';

export const idPncpInput = z
  .string()
  .max(40)
  .describe('Número de controle PNCP, ex.: 08761140000194-1-000180/2026');

const output = z.object({
  edital: editalOutput,
  aberto: z.boolean(),
  avisos: z.array(z.string()),
  fontes: z.array(z.string()),
});

function format({ edital: e, aberto, fontes, avisos }: DetalharEditalResult): string {
  return [
    e.objeto,
    `Órgão: ${e.orgao}`,
    `Local: ${e.municipioNome}/${e.uf} (IBGE ${e.municipioIbge})`,
    `Modalidade: ${e.modalidade.nome}`,
    `Valor estimado: ${formatValor(e.valorEstimado)}`,
    `Abertura das propostas: ${formatData(e.dataAbertura)}`,
    `Encerramento das propostas: ${formatData(e.dataEncerramentoPropostas)} — ${aberto ? `${e.diasUteisRestantes} dia(s) útil(eis) restante(s)` : 'ENCERRADO'}`,
    `Link oficial: ${e.linkOficial}`,
    formatRodape(fontes, avisos),
  ].join('\n');
}

export function registerDetalharEdital(
  server: McpServer,
  useCase: DetalharEdital,
  ctx: ToolContext,
): void {
  server.registerTool(
    'detalhar_edital',
    {
      title: 'Detalhar edital',
      description:
        'Retorna os dados completos de um edital do PNCP pelo número de controle, com prazo em dias úteis e o link oficial.',
      inputSchema: z.object({ id_pncp: idPncpInput }),
      outputSchema: output,
      annotations: READ_ONLY,
    },
    ({ id_pncp }) =>
      runTool(ctx, 'detalhar_edital', async () => {
        const result = await useCase.execute({ idPncp: id_pncp });
        return { text: format(result), data: result };
      }),
  );
}
