import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CNPJ_LIMPEZA, CNPJ_MARMITAS, CNPJ_TI } from '../helpers/fixtures.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const text = (r: { content: unknown }) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

/**
 * Sobe o servidor real (src/main.ts) como processo filho via stdio, em modo demonstração
 * para não depender das APIs públicas, e conversa com ele pelo cliente oficial do SDK.
 */
describe('e2e: servidor MCP via stdio', () => {
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--import', 'tsx', 'src/main.ts', '--demo'],
      cwd: ROOT,
      env: { ...process.env, LOG_LEVEL: 'error' } as Record<string, string>,
      stderr: 'pipe',
    });
    client = new Client({ name: 'e2e', version: '1.0.0' });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client?.close();
  });

  it('lista as 6 tools, todas somente leitura', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'buscar_editais_abertos',
      'detalhar_edital',
      'dias_uteis_ate',
      'match_editais',
      'perfil_empresa',
      'ping',
    ]);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it('perfil_empresa ignora o quadro societário (LGPD)', async () => {
    const result = await client.callTool({
      name: 'perfil_empresa',
      arguments: { cnpj: '12.345.678/0001-95' },
    });
    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result)).not.toMatch(/socio|qsa/i);
  });

  it.each([
    [CNPJ_MARMITAS, 'marmit'],
    [CNPJ_LIMPEZA, 'limpeza'],
    [CNPJ_TI, 'software'],
  ])('match_editais para %s explica o motivo (%s)', async (cnpj, termo) => {
    const result = await client.callTool({ name: 'match_editais', arguments: { cnpj } });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent as { matches: { motivo: string[] }[] };
    expect(data.matches.length).toBeGreaterThan(0);
    expect(data.matches.flatMap((m) => m.motivo).join()).toContain(termo);
    expect(text(result)).toMatch(/modo demonstração/);
  });

  it('buscar_editais_abertos não traz vencidos nem outra UF', async () => {
    const result = await client.callTool({ name: 'buscar_editais_abertos', arguments: {} });
    const data = result.structuredContent as { itens: { uf: string; idPncp: string }[] };
    expect(data.itens.every((e) => e.uf === 'PB')).toBe(true);
    expect(data.itens.map((e) => e.idPncp)).not.toContain('10000000000101-1-000008/2026');
  });

  it('detalhar_edital, dias_uteis_ate, resources e prompt respondem', async () => {
    const id = '10000000000303-1-000004/2026';
    const detalhe = await client.callTool({ name: 'detalhar_edital', arguments: { id_pncp: id } });
    expect(text(detalhe)).toMatch(/pncp\.gov\.br\/app\/editais/);

    const dias = await client.callTool({
      name: 'dias_uteis_ate',
      arguments: { data: '2027-01-15' },
    });
    expect(dias.isError).toBeFalsy();

    const municipios = await client.readResource({ uri: 'ibge://municipios/PB' });
    expect(JSON.parse((municipios.contents[0] as { text: string }).text).municipios).toHaveLength(
      223,
    );

    const prompt = await client.getPrompt({ name: 'resumo_para_mei', arguments: { id_pncp: id } });
    expect((prompt.messages[0]?.content as { text: string }).text).toMatch(/checklist/);
  });

  it('erro de validação volta como isError sem derrubar o servidor', async () => {
    const bad = await client.callTool({ name: 'perfil_empresa', arguments: { cnpj: '000' } });
    expect(bad.isError).toBe(true);
    const ok = await client.callTool({ name: 'ping', arguments: {} });
    expect(ok.structuredContent).toEqual({ pong: true });
  });
});
