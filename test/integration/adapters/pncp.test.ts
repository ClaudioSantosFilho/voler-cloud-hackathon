import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { HttpClient } from '../../../src/adapters/out/http/http-client.js';
import { PncpEditalRepository } from '../../../src/adapters/out/pncp/pncp-edital-repository.js';
import { normalizePncpDate, toEdital } from '../../../src/adapters/out/pncp/pncp-mapper.js';
import { NotFoundError, SourceUnavailableError } from '../../../src/domain/errors.js';
import recorded from '../../fixtures/recorded/pncp-proposta-pb-pregao.json' with { type: 'json' };
import { useMswServer } from '../../helpers/msw.js';

const BASE = 'https://pncp.test/api/consulta';
const PROPOSTA = `${BASE}/v1/contratacoes/proposta`;

function repo(modalidades = [6], pageSize = 50) {
  const client = new HttpClient('PNCP', { timeoutMs: 500, retries: 1, backoffMs: 1 });
  return new PncpEditalRepository(client, { baseUrl: BASE, pageSize, modalidades });
}

const item = (n: number, extra: Record<string, unknown> = {}) => ({
  ...recorded.data[0],
  numeroControlePNCP: `08761140000194-1-${String(n).padStart(6, '0')}/2026`,
  ...extra,
});

describe('PncpEditalRepository', () => {
  const server = useMswServer();

  it('mapeia a resposta gravada do PNCP (teste de contrato)', async () => {
    server.use(http.get(PROPOSTA, () => HttpResponse.json(recorded)));
    const { editais, avisos } = await repo().listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' });
    expect(avisos).toEqual([]);
    expect(editais).toHaveLength(recorded.data.length);
    expect(editais[0]).toEqual(toEdital(recorded.data[0]));
    expect(editais[0]).toMatchObject({
      uf: 'PB',
      municipioIbge: '2507507',
      dataEncerramentoPropostas: '2026-11-26T09:00:00-03:00',
      linkOficial: 'https://pncp.gov.br/app/editais/08761140000194/2026/180',
    });
  });

  it('envia os parâmetros esperados e pagina de 50 em 50', async () => {
    const urls: URL[] = [];
    server.use(
      http.get(PROPOSTA, ({ request }) => {
        const url = new URL(request.url);
        urls.push(url);
        const pagina = Number(url.searchParams.get('pagina'));
        const data = Array.from({ length: pagina === 1 ? 50 : 10 }, (_, i) =>
          item(pagina * 100 + i),
        );
        return HttpResponse.json({ data, totalPaginas: 2, totalRegistros: 60 });
      }),
    );
    const { editais } = await repo().listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' });
    expect(editais).toHaveLength(60);
    expect(urls.map((u) => u.searchParams.get('pagina'))).toEqual(['1', '2']);
    expect(Object.fromEntries(urls[0]?.searchParams ?? [])).toMatchObject({
      dataFinal: '20261231',
      codigoModalidadeContratacao: '6',
      uf: 'PB',
      tamanhoPagina: '50',
    });
  });

  it('resposta vazia (204) retorna lista vazia', async () => {
    server.use(http.get(PROPOSTA, () => new HttpResponse(null, { status: 204 })));
    await expect(repo().listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' })).resolves.toEqual({
      editais: [],
      avisos: [],
    });
  });

  it('uma modalidade falha: resposta parcial com aviso (RNF03)', async () => {
    server.use(
      http.get(PROPOSTA, ({ request }) => {
        const modalidade = new URL(request.url).searchParams.get('codigoModalidadeContratacao');
        if (modalidade === '8') return new HttpResponse(null, { status: 502 });
        return HttpResponse.json({ data: [item(1)], totalPaginas: 1 });
      }),
    );
    const { editais, avisos } = await repo([6, 8]).listarAbertos({
      uf: 'PB',
      dataFinal: '2026-12-31',
    });
    expect(editais).toHaveLength(1);
    expect(avisos[0]).toMatch(/parcial.*Dispensa de Licitação/);
  });

  it('429 (limite do PNCP) é retentado', async () => {
    let calls = 0;
    server.use(
      http.get(PROPOSTA, () =>
        ++calls === 1
          ? new HttpResponse('aguarde', { status: 429 })
          : HttpResponse.json({ data: [item(1)], totalPaginas: 1 }),
      ),
    );
    const { editais } = await repo().listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' });
    expect(editais).toHaveLength(1);
    expect(calls).toBe(2);
  });

  it('todas as modalidades falham: erro identificando o PNCP', async () => {
    server.use(http.get(PROPOSTA, () => HttpResponse.error()));
    await expect(repo([6, 8]).listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' })).rejects.toThrow(
      SourceUnavailableError,
    );
  });

  it('descarta itens sem data de encerramento ou malformados e avisa', async () => {
    server.use(
      http.get(PROPOSTA, () =>
        HttpResponse.json({
          data: [item(1), item(2, { dataEncerramentoProposta: null }), { lixo: true }],
          totalPaginas: 1,
        }),
      ),
    );
    const { editais, avisos } = await repo().listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' });
    expect(editais).toHaveLength(1);
    expect(avisos[0]).toMatch(/2 registro/);
  });

  it('formato de página inesperado conta como falha', async () => {
    server.use(http.get(PROPOSTA, () => HttpResponse.json({ foo: 1 })));
    await expect(repo().listarAbertos({ uf: 'PB', dataFinal: '2026-12-31' })).rejects.toThrow(
      /PNCP/,
    );
  });

  describe('buscarPorId', () => {
    const DETALHE = `${BASE}/v1/orgaos/08761140000194/compras/2026/180`;

    it('retorna o edital detalhado', async () => {
      server.use(http.get(DETALHE, () => HttpResponse.json(recorded.data[0])));
      const edital = await repo().buscarPorId('08761140000194-1-000180/2026');
      expect(edital.idPncp).toBe('08761140000194-1-000180/2026');
    });

    it('404 vira NotFoundError', async () => {
      server.use(http.get(DETALHE, () => HttpResponse.json({}, { status: 404 })));
      await expect(repo().buscarPorId('08761140000194-1-000180/2026')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('erro do servidor e formato inválido identificam o PNCP', async () => {
      server.use(http.get(DETALHE, () => HttpResponse.json({ x: 1 })));
      await expect(repo().buscarPorId('08761140000194-1-000180/2026')).rejects.toThrow(/PNCP/);
      server.use(http.get(DETALHE, () => HttpResponse.json({}, { status: 400 })));
      await expect(repo().buscarPorId('08761140000194-1-000180/2026')).rejects.toThrow(/HTTP 400/);
    });
  });
});

describe('normalizePncpDate', () => {
  it.each([
    ['2026-11-26T09:00:00', '2026-11-26T09:00:00-03:00'],
    ['2026-11-26T09:00:00.123', '2026-11-26T09:00:00-03:00'],
    ['2026-11-26 09:00:00', '2026-11-26T09:00:00-03:00'],
    ['2026-11-26', '2026-11-26T23:59:59-03:00'],
    ['2026-11-26T12:00:00Z', '2026-11-26T12:00:00Z'],
    ['2026-11-26T12:00:00-02:00', '2026-11-26T12:00:00-02:00'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizePncpDate(raw)).toBe(expected);
  });

  it.each([[null], [undefined], [''], ['31/12/2026'], ['2026-13-45T00:00:00']])(
    'inválida (%s) -> undefined',
    (raw) => {
      expect(normalizePncpDate(raw)).toBeUndefined();
    },
  );
});
