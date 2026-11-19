import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { ConsultarEmpresa } from '../../../application/ports/in/consultar-empresa.js';
import type { Logger } from '../../../application/ports/out/logger.js';
import { Metrics } from './metrics.js';
import { registerPerfilEmpresa } from './tools/perfil-empresa.js';

export const SERVER_INFO = { name: 'edital-match-pb', version: '0.1.0' } as const;

export interface McpDeps {
  logger: Logger;
  metrics?: Metrics;
  consultarEmpresa: ConsultarEmpresa;
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
        'Encontra licitações abertas (PNCP) compatíveis com o CNAE de MEIs e pequenas empresas, com foco na Paraíba. O match é informativo e não substitui a leitura do edital.',
    });
    registerPing(server);
    registerPerfilEmpresa(server, deps.consultarEmpresa, ctx);
    return server;
  };
}
