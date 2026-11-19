import { describe, expect, it } from 'vitest';
import { SourceUnavailableError } from '../../../src/domain/errors.js';
import { editaisFixture } from '../../helpers/fixtures.js';
import { connectInMemory } from '../../helpers/mcp-client.js';
import { buildTestServer } from '../../helpers/test-server.js';

const text = (r: { content: unknown }) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

describe('tool buscar_editais_abertos', () => {
  it('usa PB como padrão e devolve página com prazo e fontes', async () => {
    const client = await connectInMemory(buildTestServer({ editais: editaisFixture() }).factory());
    const result = await client.callTool({ name: 'buscar_editais_abertos', arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent as { total: number; itens: { uf: string }[] };
    expect(data.total).toBe(7);
    expect(data.itens.every((e) => e.uf === 'PB')).toBe(true);
    expect(text(result)).toMatch(/dias úteis/);
    expect(text(result)).toMatch(/Fontes: FakePNCP/);
  });

  it('aceita UF minúscula, município e palavras', async () => {
    const client = await connectInMemory(buildTestServer({ editais: editaisFixture() }).factory());
    const result = await client.callTool({
      name: 'buscar_editais_abertos',
      arguments: { uf: 'pb', municipio: 'Patos', palavras: ['limpeza'] },
    });
    expect((result.structuredContent as { total: number }).total).toBe(1);
  });

  it('resposta vazia tem mensagem amigável', async () => {
    const client = await connectInMemory(buildTestServer().factory());
    const result = await client.callTool({ name: 'buscar_editais_abertos', arguments: {} });
    expect(text(result)).toMatch(/Nenhum edital aberto/);
  });

  it('rejeita UF e data inválidas na porta de entrada', async () => {
    const client = await connectInMemory(buildTestServer().factory());
    const uf = await client.callTool({ name: 'buscar_editais_abertos', arguments: { uf: 'XX' } });
    expect(uf.isError).toBe(true);
    const data = await client.callTool({
      name: 'buscar_editais_abertos',
      arguments: { ate_data: '31/12/2026' },
    });
    expect(data.isError).toBe(true);
  });

  it('PNCP fora do ar: isError informando a fonte', async () => {
    const test = buildTestServer();
    test.editalRepository.failWith = new SourceUnavailableError('PNCP', 'timeout');
    const client = await connectInMemory(test.factory());
    const result = await client.callTool({ name: 'buscar_editais_abertos', arguments: {} });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/PNCP está indisponível/);
  });
});
