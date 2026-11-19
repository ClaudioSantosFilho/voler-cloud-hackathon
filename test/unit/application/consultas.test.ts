import { describe, expect, it } from 'vitest';
import { buildUseCases } from '../../../src/application/build-use-cases.js';
import { NotFoundError, ValidationError } from '../../../src/domain/errors.js';
import { MODALIDADES } from '../../../src/domain/edital/modalidades.js';
import { FakeMunicipios } from '../../helpers/test-server.js';
import {
  FakeCache,
  FakeCalendario,
  FakeCnpjGateway,
  FakeEditalRepository,
  fixedClock,
} from '../../helpers/fakes.js';
import { NOW, editaisFixture } from '../../helpers/fixtures.js';

const ABERTO = '10000000000303-1-000004/2026';
const VENCIDO = '10000000000101-1-000008/2026';

function setup(now = NOW) {
  const ports = {
    cnpj: new FakeCnpjGateway(),
    editais: new FakeEditalRepository(editaisFixture()),
    calendario: new FakeCalendario([
      { data: '2026-11-20', nome: 'Consciência Negra' },
      { data: '2026-12-25', nome: 'Natal' },
    ]),
    municipios: new FakeMunicipios([{ codigoIbge: '2507507', nome: 'João Pessoa', uf: 'PB' }]),
    cache: new FakeCache(),
    clock: fixedClock(now),
  };
  return { ports, ...buildUseCases(ports, { matchMinScore: 0.2 }) };
}

describe('DetalharEdital (RF04)', () => {
  it('retorna edital com prazo, link oficial e estado aberto', async () => {
    const result = await setup().detalharEdital.execute({ idPncp: ` ${ABERTO} ` });
    expect(result.aberto).toBe(true);
    expect(result.edital.linkOficial).toBe('https://pncp.gov.br/app/editais/10000000000303/2026/4');
    expect(result.edital.diasUteisRestantes).toBeGreaterThan(0);
    expect(result.fontes).toEqual(['FakePNCP', 'FakeFeriados (feriados)']);
  });

  it('edital vencido é detalhado mas marcado como encerrado', async () => {
    const result = await setup().detalharEdital.execute({ idPncp: VENCIDO });
    expect(result.aberto).toBe(false);
    expect(result.edital.diasUteisRestantes).toBe(0);
  });

  it('id inválido e inexistente', async () => {
    const { detalharEdital } = setup();
    await expect(detalharEdital.execute({ idPncp: 'x' })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      detalharEdital.execute({ idPncp: '99999999999999-1-000001/2026' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CalcularDiasUteis (RF05/RN07)', () => {
  it('desconta feriado nacional, fim de semana e lista os feriados do período', async () => {
    // hoje 2026-11-19 (qui). Até 2026-11-27 (sex): 20 feriado, 23-27 = 5 dias úteis
    const result = await setup().calcularDiasUteis.execute({ data: '2026-11-27' });
    expect(result).toMatchObject({ hoje: '2026-11-19', uf: 'PB', diasUteis: 5 });
    expect(result.feriadosNoPeriodo).toEqual([{ data: '2026-11-20', nome: 'Consciência Negra' }]);
  });

  it('considera feriado estadual da PB (5 de agosto)', async () => {
    // hoje 2027-08-03 (ter). Até 2027-08-06 (sex): 4, 5 (feriado PB), 6 = 2
    const pb = await setup('2027-08-03T10:00:00-03:00').calcularDiasUteis.execute({
      data: '2027-08-06',
    });
    const pe = await setup('2027-08-03T10:00:00-03:00').calcularDiasUteis.execute({
      data: '2027-08-06',
      uf: 'pe',
    });
    expect(pb.diasUteis).toBe(2);
    expect(pe.diasUteis).toBe(3);
  });

  it('rejeita data em formato inválido', async () => {
    await expect(setup().calcularDiasUteis.execute({ data: '27/11/2026' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('referências (RF06/RF07)', () => {
  it('lista as modalidades do PNCP', () => {
    expect(setup().listarModalidades.execute()).toEqual(MODALIDADES);
  });

  it('lista municípios com cache e fonte', async () => {
    const { listarMunicipios, ports } = setup();
    const first = await listarMunicipios.execute({ uf: 'pb' });
    ports.municipios.failWith = new Error('não deveria chamar de novo');
    const second = await listarMunicipios.execute({ uf: 'PB' });
    expect(first).toEqual(second);
    expect(first.fonte).toBe('FakeIBGE');
  });
});

describe('GerarResumoMei (RF08)', () => {
  it('monta checklist com prazo, valor, documentos e próximo passo', async () => {
    const { checklist } = await setup().gerarResumoMei.execute({ idPncp: ABERTO });
    expect(checklist.valorEstimado).toBe(30000);
    expect(checklist.documentos).toContain('Certificado de regularidade do FGTS (CRF)');
    expect(checklist.proximoPasso).toMatch(/Baixe o edital/);
  });

  it('edital encerrado sugere acompanhar novos editais', async () => {
    const { checklist } = await setup().gerarResumoMei.execute({ idPncp: VENCIDO });
    expect(checklist.proximoPasso).toMatch(/encerrou/);
  });

  it('prazo curto pede urgência', async () => {
    const { checklist } = await setup('2027-02-11T09:00:00-03:00').gerarResumoMei.execute({
      idPncp: '10000000000505-1-000006/2026',
    });
    expect(checklist.diasUteisRestantes).toBe(1);
    expect(checklist.proximoPasso).toMatch(/Prazo muito curto/);
  });
});
