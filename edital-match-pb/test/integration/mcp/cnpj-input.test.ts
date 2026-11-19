import { describe, expect, it } from 'vitest';
import { buildEmpresa } from '../../helpers/builders.js';
import { connectInMemory } from '../../helpers/mcp-client.js';
import { buildTestServer } from '../../helpers/test-server.js';

describe('entrada de CNPJ', () => {
  it('aceita CNPJ numérico e restaura o zero à esquerda', async () => {
    const empresa = buildEmpresa({ cnpj: '08761140000194' });
    const client = await connectInMemory(buildTestServer({ empresas: [empresa] }).factory());
    const result = await client.callTool({
      name: 'perfil_empresa',
      arguments: { cnpj: 8761140000194 },
    });
    expect(result.isError).toBeFalsy();
    expect((result.structuredContent as { cnpj: string }).cnpj).toBe('08761140000194');
  });
});
