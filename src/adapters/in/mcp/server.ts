import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

export const SERVER_INFO = { name: 'edital-match-pb', version: '0.1.0' } as const;

/** Cria uma instância do servidor MCP com tools, resources e prompts registrados. */
export function createMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO);
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
  return server;
}
