import { describe, expect, it } from 'vitest';
import { SourceUnavailableError } from '../../../src/domain/errors.js';
import { editaisFixture } from '../../helpers/fixtures.js';
import { connectInMemory } from '../../helpers/mcp-client.js';
import { buildTestServer } from '../../helpers/test-server.js';

const text = (r: { content: unknown }) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

const ID = '10000000000303-1-000004/2026';

function setup() {
  const test = buildTestServer({
    editais: editaisFixture(),
    municipios: [{ codigoIbge: '2507507', nome: 'João Pessoa', uf: 'PB' }],
  });
  return { test, client: connectInMemory(test.factory()) };
}

describe('tool detalhar_edital', () => {
  it('mostra dados, prazo e link oficial', async () => {
    const client = await setup().client;
    const result = await client.callTool({ name: 'detalhar_edital', arguments: { id_pncp: ID } });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toMatch(/Link oficial: https:\/\/pncp\.gov\.br\/app\/editais/);
    expect((result.structuredContent as { aberto: boolean }).aberto).toBe(true);
  });

  it('id inexistente: isError', async () => {
    const client = await setup().client;
    const result = await client.callTool({
      name: 'detalhar_edital',
      arguments: { id_pncp: '99999999999999-1-000001/2026' },
    });
    expect(result.isError).toBe(true);
  });
});

describe('tool dias_uteis_ate', () => {
  it('conta dias úteis e lista feriados', async () => {
    const client = await setup().client;
    const result = await client.callTool({
      name: 'dias_uteis_ate',
      arguments: { data: '2027-02-19' },
    });
    expect(text(result)).toMatch(/Carnaval/);
    expect((result.structuredContent as { diasUteis: number }).diasUteis).toBeGreaterThan(0);
  });
});

describe('resources', () => {
  it('lista e lê pncp://modalidades', async () => {
    const client = await setup().client;
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toEqual(
      expect.arrayContaining(['pncp://modalidades', 'ibge://municipios/PB']),
    );
    const read = await client.readResource({ uri: 'pncp://modalidades' });
    const body = JSON.parse((read.contents[0] as { text: string }).text);
    expect(body.modalidades).toHaveLength(13);
  });

  it('lê ibge://municipios/PB com a fonte', async () => {
    const client = await setup().client;
    const read = await client.readResource({ uri: 'ibge://municipios/PB' });
    const body = JSON.parse((read.contents[0] as { text: string }).text);
    expect(body).toEqual({
      fonte: 'FakeIBGE',
      municipios: [{ codigoIbge: '2507507', nome: 'João Pessoa', uf: 'PB' }],
    });
  });
});

describe('prompt resumo_para_mei', () => {
  it('gera mensagem com checklist e aviso legal', async () => {
    const client = await setup().client;
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('resumo_para_mei');
    const prompt = await client.getPrompt({ name: 'resumo_para_mei', arguments: { id_pncp: ID } });
    const msg = (prompt.messages[0]?.content as { text: string }).text;
    expect(msg).toMatch(/linguagem simples/);
    expect(msg).toMatch(/Documentos usuais/);
    expect(msg).toMatch(/não substitui a análise jurídica/);
  });

  it('falha da fonte vira mensagem legível', async () => {
    const { test, client } = setup();
    test.editalRepository.failWith = new SourceUnavailableError('PNCP', 'timeout');
    const prompt = await (
      await client
    ).getPrompt({ name: 'resumo_para_mei', arguments: { id_pncp: ID } });
    expect((prompt.messages[0]?.content as { text: string }).text).toMatch(
      /PNCP está indisponível/,
    );
  });
});
