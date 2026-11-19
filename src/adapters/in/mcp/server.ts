import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { BuscarEditaisAbertos } from '../../../application/ports/in/buscar-editais-abertos.js';
import type { ConsultarEmpresa } from '../../../application/ports/in/consultar-empresa.js';
import type {
  CalcularDiasUteis,
  DetalharEdital,
  GerarResumoMei,
  ListarModalidades,
  ListarMunicipios,
} from '../../../application/ports/in/consultas.js';
import type { MatchEditais } from '../../../application/ports/in/match-editais.js';
import type { Logger } from '../../../application/ports/out/logger.js';
import { Metrics } from './metrics.js';
import { registerResumoParaMei } from './prompts/resumo-para-mei.js';
import { registerReferencias } from './resources/referencias.js';
import { registerBuscarEditais } from './tools/buscar-editais-abertos.js';
import { registerDetalharEdital } from './tools/detalhar-edital.js';
import { registerDiasUteisAte } from './tools/dias-uteis-ate.js';
import { registerMatchEditais } from './tools/match-editais.js';
import { registerPerfilEmpresa } from './tools/perfil-empresa.js';

export const SERVER_INFO = { name: 'edital-match-pb', version: '0.1.0' } as const;

export interface McpDeps {
  logger: Logger;
  metrics?: Metrics;
  consultarEmpresa: ConsultarEmpresa;
  buscarEditais: BuscarEditaisAbertos;
  matchEditais: MatchEditais;
  detalharEdital: DetalharEdital;
  calcularDiasUteis: CalcularDiasUteis;
  listarModalidades: ListarModalidades;
  listarMunicipios: ListarMunicipios;
  gerarResumoMei: GerarResumoMei;
}

function registerPing(server: McpServer): void {
  server.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Verifica se o servidor está respondendo.',
      outputSchema: z.object({ pong: z.literal(true) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({
      content: [{ type: 'text', text: 'pong' }],
      structuredContent: { pong: true as const },
    }),
  );
}

/** Fábrica de servidor: uma instância por conexão stdio ou por requisição HTTP (sem estado de sessão). */
export function createMcpServerFactory(deps: McpDeps): () => McpServer {
  const ctx = { logger: deps.logger, metrics: deps.metrics ?? new Metrics() };
  return () => {
    const server = new McpServer(SERVER_INFO, {
      instructions:
        'Encontra licitações abertas (PNCP) compatíveis com o CNAE de MEIs e pequenas empresas, com foco na Paraíba. Fluxo sugerido: perfil_empresa -> match_editais -> detalhar_edital -> prompt resumo_para_mei. O match é informativo e não substitui a leitura do edital.',
    });
    registerPing(server);
    registerPerfilEmpresa(server, deps.consultarEmpresa, ctx);
    registerBuscarEditais(server, deps.buscarEditais, ctx);
    registerMatchEditais(server, deps.matchEditais, ctx);
    registerDetalharEdital(server, deps.detalharEdital, ctx);
    registerDiasUteisAte(server, deps.calcularDiasUteis, ctx);
    registerReferencias(server, deps.listarModalidades, deps.listarMunicipios);
    registerResumoParaMei(server, deps.gerarResumoMei);
    return server;
  };
}
