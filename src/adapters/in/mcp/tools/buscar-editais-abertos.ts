import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type {
  BuscarEditaisAbertos,
  BuscarEditaisResult,
} from '../../../../application/ports/in/buscar-editais-abertos.js';
import {
  dataInput,
  editalOutput,
  formatEditalLinha,
  formatRodape,
  READ_ONLY,
  ufInput,
} from '../schemas.js';
import { runTool, type ToolContext } from '../tool-runner.js';

const output = z.object({
  itens: z.array(editalOutput),
  pagina: z.number(),
  tamanhoPagina: z.number(),
  total: z.number(),
  totalPaginas: z.number(),
  avisos: z.array(z.string()),
  fontes: z.array(z.string()),
});

function format(r: BuscarEditaisResult): string {
  if (r.total === 0) return `Nenhum edital aberto encontrado.\n${formatRodape(r.fontes, r.avisos)}`;
  return [
    `${r.total} edital(is) aberto(s). Página ${r.pagina} de ${r.totalPaginas}.`,
    ...r.itens.map(formatEditalLinha),
    formatRodape(r.fontes, r.avisos),
  ].join('\n\n');
}

export function registerBuscarEditais(
  server: McpServer,
  useCase: BuscarEditaisAbertos,
  ctx: ToolContext,
): void {
  server.registerTool(
    'buscar_editais_abertos',
    {
      title: 'Buscar editais abertos',
      description:
        'Lista licitações com proposta ainda aberta no PNCP para uma UF (padrão PB), com filtros opcionais por município, palavras no objeto e data limite. Resultado paginado (20 por página).',
      inputSchema: z.object({
        uf: ufInput,
        municipio: z
          .string()
          .max(80)
          .optional()
          .describe('Nome do município ou código IBGE de 7 dígitos'),
        palavras: z
          .array(z.string().max(40))
          .max(10)
          .optional()
          .describe('Termos que devem aparecer no objeto (basta um)'),
        ate_data: dataInput.optional().describe('Encerramento das propostas até (AAAA-MM-DD)'),
        pagina: z.number().int().min(1).max(1000).default(1),
      }),
      outputSchema: output,
      annotations: READ_ONLY,
    },
    (args) =>
      runTool(ctx, 'buscar_editais_abertos', async () => {
        const result = await useCase.execute({
          uf: args.uf,
          municipio: args.municipio,
          palavras: args.palavras,
          ateData: args.ate_data,
          pagina: args.pagina,
        });
        return { text: format(result), data: result };
      }),
  );
}
