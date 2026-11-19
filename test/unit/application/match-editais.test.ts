import { describe, expect, it } from 'vitest';
import { ConsultarEmpresaUseCase } from '../../../src/application/use-cases/consultar-empresa.js';
import { EditaisLoader } from '../../../src/application/use-cases/editais-loader.js';
import { MatchEditaisUseCase } from '../../../src/application/use-cases/match-editais.js';
import { PrazoService } from '../../../src/application/use-cases/prazo-service.js';
import { SourceUnavailableError, ValidationError } from '../../../src/domain/errors.js';
import {
  FakeCache,
  FakeCalendario,
  FakeCnpjGateway,
  FakeEditalRepository,
  fixedClock,
} from '../../helpers/fakes.js';
import {
  CNPJ_LIMPEZA,
  CNPJ_MARMITAS,
  NOW,
  editaisFixture,
  empresasFixture,
} from '../../helpers/fixtures.js';

function setup(empresas = empresasFixture()) {
  const cache = new FakeCache();
  const clock = fixedClock(NOW);
  const cnpj = new FakeCnpjGateway(empresas);
  const repo = new FakeEditalRepository(editaisFixture());
  const useCase = new MatchEditaisUseCase(
    new ConsultarEmpresaUseCase(cnpj, cache),
    new EditaisLoader(repo, cache, clock),
    new PrazoService(new FakeCalendario(), cache, clock),
    0.2,
  );
  return { useCase, cnpj, repo };
}

describe('MatchEditais (RF03)', () => {
  it('ranqueia editais abertos da PB com score, motivo e prazo', async () => {
    const result = await setup().useCase.execute({ cnpj: CNPJ_MARMITAS });
    expect(result).toMatchObject({ uf: 'PB', limiar: 0.2, totalAnalisados: 7, avisos: [] });
    expect(result.fontes).toEqual(['FakeCNPJ', 'FakePNCP', 'FakeFeriados (feriados)']);
    const [primeiro] = result.matches;
    expect(primeiro?.edital.idPncp).toBe('10000000000101-1-000001/2026');
    expect(primeiro?.score).toBe(1);
    expect(primeiro?.motivo.length).toBeGreaterThan(0);
    expect(primeiro?.edital.diasUteisRestantes).toBeGreaterThan(0);
  });

  it('não devolve vencidos nem de outra UF', async () => {
    const result = await setup().useCase.execute({ cnpj: CNPJ_LIMPEZA });
    const ids = result.matches.map((m) => m.edital.idPncp);
    expect(ids).not.toContain('20000000000101-1-000009/2026');
    expect(ids).not.toContain('10000000000101-1-000008/2026');
  });

  it('abaixo do limiar só quando pedido explicitamente (RN06)', async () => {
    const { useCase } = setup();
    const padrao = await useCase.execute({ cnpj: CNPJ_MARMITAS });
    const todos = await useCase.execute({ cnpj: CNPJ_MARMITAS, incluirAbaixoDoLimiar: true });
    expect(todos.limiar).toBe(0);
    expect(todos.matches.length).toBe(7);
    expect(padrao.matches.length).toBeLessThan(todos.matches.length);
  });

  it('respeita o limite de resultados', async () => {
    const result = await setup().useCase.execute({
      cnpj: CNPJ_MARMITAS,
      incluirAbaixoDoLimiar: true,
      limite: 2,
    });
    expect(result.matches).toHaveLength(2);
    expect(result.totalCompativeis).toBe(7);
  });

  it('avisa quando a empresa não está ativa', async () => {
    const empresas = empresasFixture().map((e) => ({ ...e, situacaoCadastral: 'BAIXADA' }));
    const result = await setup(empresas).useCase.execute({ cnpj: CNPJ_MARMITAS });
    expect(result.avisos[0]).toMatch(/BAIXADA/);
  });

  it('CNPJ inválido propaga ValidationError', async () => {
    await expect(setup().useCase.execute({ cnpj: '1' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('PNCP fora do ar propaga o erro da fonte', async () => {
    const { useCase, repo } = setup();
    repo.failWith = new SourceUnavailableError('PNCP', 'timeout');
    await expect(useCase.execute({ cnpj: CNPJ_MARMITAS })).rejects.toThrow('PNCP');
  });
});
