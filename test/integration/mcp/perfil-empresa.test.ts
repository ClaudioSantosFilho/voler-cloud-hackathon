import { describe, expect, it } from 'vitest';
import { SourceUnavailableError } from '../../../src/domain/errors.js';
import { buildEmpresa } from '../../helpers/builders.js';
import { connectInMemory } from '../../helpers/mcp-client.js';
import { buildTestServer } from '../../helpers/test-server.js';

const text = (r: { content: unknown }) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

describe('tool perfil_empresa', () => {
  const empresa = buildEmpresa();

  it('retorna texto e structuredContent com a fonte', async () => {
    const client = await connectInMemory(buildTestServer({ empresas: [empresa] }).factory());
    const result = await client.callTool({
      name: 'perfil_empresa',
      arguments: { cnpj: empresa.cnpj },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ ...empresa, fonte: 'FakeCNPJ' });
    expect(text(result)).toContain('(nenhum)');
  });

  it('CNPJ inválido retorna isError com mensagem legível', async () => {
    const client = await connectInMemory(buildTestServer().factory());
    const result = await client.callTool({ name: 'perfil_empresa', arguments: { cnpj: '123' } });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/CNPJ inválido/);
  });

  it('CNPJ inexistente retorna isError', async () => {
    const client = await connectInMemory(buildTestServer().factory());
    const result = await client.callTool({
      name: 'perfil_empresa',
      arguments: { cnpj: '08761140000194' },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/não encontrado/);
  });

  it('fonte fora do ar: informa qual fonte falhou e registra métrica', async () => {
    const test = buildTestServer({ empresas: [empresa] });
    test.cnpjGateway.failWith = new SourceUnavailableError('BrasilAPI', 'HTTP 503');
    const client = await connectInMemory(test.factory());
    const result = await client.callTool({
      name: 'perfil_empresa',
      arguments: { cnpj: empresa.cnpj },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/BrasilAPI está indisponível/);
    expect(test.metrics.errorsBySource).toEqual({ BrasilAPI: 1 });
  });
});
