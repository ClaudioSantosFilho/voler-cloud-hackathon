import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BrasilApiCalendarioGateway } from '../../../src/adapters/out/brasilapi/brasilapi-calendario-gateway.js';
import { HttpClient } from '../../../src/adapters/out/http/http-client.js';
import recorded from '../../fixtures/recorded/brasilapi-feriados-2026.json' with { type: 'json' };
import { useMswServer } from '../../helpers/msw.js';

const BASE = 'https://brasilapi.test/api';
const gateway = () =>
  new BrasilApiCalendarioGateway(new HttpClient('BrasilAPI', { timeoutMs: 500, retries: 0 }), BASE);

describe('BrasilApiCalendarioGateway', () => {
  const server = useMswServer();

  it('mapeia a resposta gravada de feriados', async () => {
    server.use(http.get(`${BASE}/feriados/v1/2026`, () => HttpResponse.json(recorded)));
    const feriados = await gateway().feriadosNacionais(2026);
    expect(feriados).toHaveLength(recorded.length);
    expect(feriados[0]).toEqual({ data: '2026-01-01', nome: 'Confraternização mundial' });
  });

  it('erro HTTP ou formato inválido identificam a fonte', async () => {
    server.use(http.get(`${BASE}/feriados/v1/2026`, () => HttpResponse.json({}, { status: 404 })));
    await expect(gateway().feriadosNacionais(2026)).rejects.toThrow(/BrasilAPI: HTTP 404/);
    server.use(http.get(`${BASE}/feriados/v1/2026`, () => HttpResponse.json([{ date: 'x' }])));
    await expect(gateway().feriadosNacionais(2026)).rejects.toThrow(/formato/);
  });
});
