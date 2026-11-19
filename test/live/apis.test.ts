import { describe, expect, it } from 'vitest';
import { BrasilApiCalendarioGateway } from '../../src/adapters/out/brasilapi/brasilapi-calendario-gateway.js';
import { BrasilApiCnpjGateway } from '../../src/adapters/out/brasilapi/brasilapi-cnpj-gateway.js';
import { HttpClient } from '../../src/adapters/out/http/http-client.js';
import { IbgeMunicipioGateway } from '../../src/adapters/out/ibge/ibge-municipio-gateway.js';
import { PncpEditalRepository } from '../../src/adapters/out/pncp/pncp-edital-repository.js';
import { loadConfig } from '../../src/config/env.js';
import { Cnpj } from '../../src/domain/empresa/cnpj.js';

// Chama as APIs públicas reais. Rode com `npm run test:live` (fora do CI).
const config = loadConfig();
const http = (source: string) => new HttpClient(source, { timeoutMs: 15_000 });

describe('APIs reais', () => {
  it('PNCP: lista editais abertos na PB em até 10 s (RNF01)', async () => {
    const repo = new PncpEditalRepository(http('PNCP'), {
      baseUrl: config.PNCP_BASE_URL,
      pageSize: config.PNCP_PAGE_SIZE,
    });
    const started = Date.now();
    const dataFinal = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
    const { editais, avisos } = await repo.listarAbertos({ uf: 'PB', dataFinal });
    console.log(`PNCP: ${editais.length} editais em ${Date.now() - started} ms`, avisos);
    expect(editais.length).toBeGreaterThan(0);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it('BrasilAPI: CNPJ de órgão público e feriados', async () => {
    const empresa = await new BrasilApiCnpjGateway(
      http('BrasilAPI'),
      config.BRASILAPI_BASE_URL,
    ).buscarEmpresa(Cnpj.parse('08761140000194'));
    expect(empresa.cnaePrincipal.codigo).toMatch(/^\d{7}$/);
    const feriados = await new BrasilApiCalendarioGateway(
      http('BrasilAPI'),
      config.BRASILAPI_BASE_URL,
    ).feriadosNacionais(2026);
    expect(feriados.length).toBeGreaterThan(5);
  });

  it('IBGE: municípios da PB', async () => {
    const municipios = await new IbgeMunicipioGateway(
      http('IBGE'),
      config.IBGE_BASE_URL,
    ).listarPorUf('PB');
    expect(municipios).toHaveLength(223);
  });
});
