import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BrasilApiCnpjGateway } from '../../../src/adapters/out/brasilapi/brasilapi-cnpj-gateway.js';
import { HttpClient } from '../../../src/adapters/out/http/http-client.js';
import { Cnpj } from '../../../src/domain/empresa/cnpj.js';
import { NotFoundError, SourceUnavailableError } from '../../../src/domain/errors.js';
import recorded from '../../fixtures/recorded/brasilapi-cnpj-orgao.json' with { type: 'json' };
import { useMswServer } from '../../helpers/msw.js';

const BASE = 'https://brasilapi.test/api';
const URL = `${BASE}/cnpj/v1/08761140000194`;
const cnpj = Cnpj.parse('08761140000194');

function gateway() {
  const client = new HttpClient('BrasilAPI', { timeoutMs: 200, retries: 2, backoffMs: 1 });
  return new BrasilApiCnpjGateway(client, BASE);
}

describe('BrasilApiCnpjGateway', () => {
  const server = useMswServer();

  it('mapeia a resposta gravada (teste de contrato)', async () => {
    server.use(http.get(URL, () => HttpResponse.json(recorded)));
    const empresa = await gateway().buscarEmpresa(cnpj);
    expect(empresa).toEqual({
      cnpj: '08761140000194',
      razaoSocial: recorded.razao_social,
      situacaoCadastral: 'ATIVA',
      cnaePrincipal: { codigo: '8411600', descricao: 'Administração pública em geral' },
      cnaesSecundarios: [],
    });
    expect(empresa).not.toHaveProperty('qsa');
  });

  it('normaliza CNAEs secundários e ignora o placeholder código 0', async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          ...recorded,
          cnaes_secundarios: [
            { codigo: 0, descricao: '' },
            { codigo: 8121400, descricao: 'Limpeza em prédios e em domicílios' },
          ],
        }),
      ),
    );
    const empresa = await gateway().buscarEmpresa(cnpj);
    expect(empresa.cnaesSecundarios).toEqual([
      { codigo: '8121400', descricao: 'Limpeza em prédios e em domicílios' },
    ]);
  });

  it('CNPJ inexistente (404) vira NotFoundError', async () => {
    server.use(http.get(URL, () => HttpResponse.json({ message: 'not found' }, { status: 404 })));
    await expect(gateway().buscarEmpresa(cnpj)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('API fora do ar: tenta 3 vezes e identifica a fonte', async () => {
    let calls = 0;
    server.use(
      http.get(URL, () => {
        calls++;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    await expect(gateway().buscarEmpresa(cnpj)).rejects.toThrow(SourceUnavailableError);
    expect(calls).toBe(3);
  });

  it('recupera após falha transitória de rede', async () => {
    let calls = 0;
    server.use(
      http.get(URL, () => (++calls === 1 ? HttpResponse.error() : HttpResponse.json(recorded))),
    );
    await expect(gateway().buscarEmpresa(cnpj)).resolves.toMatchObject({
      situacaoCadastral: 'ATIVA',
    });
  });

  it('resposta em formato inesperado vira erro da fonte', async () => {
    server.use(http.get(URL, () => HttpResponse.json({ foo: 'bar' })));
    await expect(gateway().buscarEmpresa(cnpj)).rejects.toThrow(/BrasilAPI: formato/);
  });

  it('timeout conta como falha da fonte', async () => {
    server.use(
      http.get(URL, async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json(recorded);
      }),
    );
    await expect(gateway().buscarEmpresa(cnpj)).rejects.toThrow(/timeout/);
  });
});
