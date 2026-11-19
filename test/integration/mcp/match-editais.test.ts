import { describe, expect, it } from 'vitest';
import { CNPJ_TI, editaisFixture, empresasFixture } from '../../helpers/fixtures.js';
import { connectInMemory } from '../../helpers/mcp-client.js';
import { buildTestServer } from '../../helpers/test-server.js';

const text = (r: { content: unknown }) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

describe('tool match_editais', () => {
  const setup = () =>
    connectInMemory(
      buildTestServer({ empresas: empresasFixture(), editais: editaisFixture() }).factory(),
    );

  it('retorna matches com score, motivo, aviso legal e fontes', async () => {
    const client = await setup();
    const result = await client.callTool({ name: 'match_editais', arguments: { cnpj: CNPJ_TI } });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent as {
      matches: { score: number; motivo: string[]; edital: { idPncp: string } }[];
    };
    expect(data.matches.map((m) => m.edital.idPncp)).toEqual(
      expect.arrayContaining(['10000000000404-1-000005/2026', '10000000000505-1-000006/2026']),
    );
    expect(data.matches.every((m) => m.score >= 0.2 && m.motivo.length > 0)).toBe(true);
    expect(text(result)).toMatch(/não substitui a leitura do edital/);
    expect(text(result)).toMatch(/Fontes: FakeCNPJ, FakePNCP/);
  });

  it('incluir_baixo_score devolve também os sem termos em comum', async () => {
    const client = await setup();
    const result = await client.callTool({
      name: 'match_editais',
      arguments: { cnpj: CNPJ_TI, incluir_baixo_score: true },
    });
    expect(text(result)).toMatch(/nenhum termo em comum/);
  });

  it('CNPJ inválido: isError', async () => {
    const client = await setup();
    const result = await client.callTool({ name: 'match_editais', arguments: { cnpj: 'abc' } });
    expect(result.isError).toBe(true);
  });
});
