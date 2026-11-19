import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { HttpClient } from '../../../src/adapters/out/http/http-client.js';
import { IbgeMunicipioGateway } from '../../../src/adapters/out/ibge/ibge-municipio-gateway.js';
import recorded from '../../fixtures/recorded/ibge-municipios-pb.json' with { type: 'json' };
import { useMswServer } from '../../helpers/msw.js';

const BASE = 'https://ibge.test/api/v1';
const URL = `${BASE}/localidades/estados/PB/municipios`;
const gateway = () =>
  new IbgeMunicipioGateway(new HttpClient('IBGE', { timeoutMs: 500, retries: 0 }), BASE);

describe('IbgeMunicipioGateway', () => {
  const server = useMswServer();

  it('mapeia os 223 municípios gravados da PB', async () => {
    server.use(http.get(URL, () => HttpResponse.json(recorded)));
    const municipios = await gateway().listarPorUf('PB');
    expect(municipios).toHaveLength(223);
    expect(municipios).toContainEqual({ codigoIbge: '2507507', nome: 'João Pessoa', uf: 'PB' });
  });

  it('erros identificam o IBGE', async () => {
    server.use(http.get(URL, () => new HttpResponse(null, { status: 404 })));
    await expect(gateway().listarPorUf('PB')).rejects.toThrow(/IBGE: HTTP 404/);
    server.use(http.get(URL, () => HttpResponse.json({ nope: true })));
    await expect(gateway().listarPorUf('PB')).rejects.toThrow(/IBGE: formato/);
  });
});
