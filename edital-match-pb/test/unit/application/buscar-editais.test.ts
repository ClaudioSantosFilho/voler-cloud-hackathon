import { describe, expect, it } from 'vitest';
import { BuscarEditaisAbertosUseCase } from '../../../src/application/use-cases/buscar-editais-abertos.js';
import { EditaisLoader } from '../../../src/application/use-cases/editais-loader.js';
import { PrazoService } from '../../../src/application/use-cases/prazo-service.js';
import { SourceUnavailableError } from '../../../src/domain/errors.js';
import {
  FakeCache,
  FakeCalendario,
  FakeEditalRepository,
  fixedClock,
} from '../../helpers/fakes.js';
import { NOW, editaisFixture } from '../../helpers/fixtures.js';

function setup(feriados = [{ data: '2027-02-09', nome: 'Carnaval' }]) {
  const repo = new FakeEditalRepository(editaisFixture());
  const calendario = new FakeCalendario(feriados);
  const cache = new FakeCache();
  const clock = fixedClock(NOW);
  const useCase = new BuscarEditaisAbertosUseCase(
    new EditaisLoader(repo, cache, clock),
    new PrazoService(calendario, cache, clock),
    3,
  );
  return { repo, calendario, cache, useCase };
}

describe('BuscarEditaisAbertos (RF02)', () => {
  it('pagina os editais abertos da UF com dias úteis restantes', async () => {
    const { useCase } = setup();
    const result = await useCase.execute({ uf: 'PB' });
    expect(result).toMatchObject({ pagina: 1, total: 7, totalPaginas: 3, avisos: [] });
    expect(result.fontes).toEqual(['FakePNCP', 'FakeFeriados (feriados)']);
    expect(result.itens[0]?.idPncp).toBe('10000000000505-1-000006/2026');
    expect(result.itens[0]?.diasUteisRestantes).toBeGreaterThan(50);
  });

  it('segunda página e cache entre chamadas', async () => {
    const { useCase, repo } = setup();
    await useCase.execute({ uf: 'PB' });
    const result = await useCase.execute({ uf: 'PB', pagina: 2 });
    expect(result.pagina).toBe(2);
    expect(repo.calls).toBe(1);
  });

  it('resultado parcial traz aviso e não é cacheado (RNF03)', async () => {
    const { useCase, repo } = setup();
    repo.avisos = ['PNCP: resultado parcial'];
    const result = await useCase.execute({ uf: 'PB' });
    expect(result.avisos).toEqual(['PNCP: resultado parcial']);
    await useCase.execute({ uf: 'PB' });
    expect(repo.calls).toBe(2);
  });

  it('feriados indisponíveis: calcula sem eles e avisa', async () => {
    const { useCase, calendario } = setup();
    calendario.failWith = new SourceUnavailableError('FakeFeriados', 'HTTP 500');
    const result = await useCase.execute({ uf: 'PB' });
    expect(result.itens).toHaveLength(3);
    expect(result.avisos.join()).toMatch(/feriados nacionais de 2026 não considerados/);
  });

  it('feriado nacional reduz os dias úteis', async () => {
    const id = '10000000000303-1-000004/2026'; // encerra 2027-02-19, depois do carnaval
    const dias = async (feriados: { data: string; nome: string }[]) =>
      (await setup(feriados).useCase.execute({ uf: 'PB' })).itens.find((e) => e.idPncp === id)
        ?.diasUteisRestantes ?? 0;
    expect(await dias([{ data: '2027-02-09', nome: 'Carnaval' }])).toBe((await dias([])) - 1);
  });

  it('PNCP fora do ar propaga erro identificando a fonte', async () => {
    const { useCase, repo } = setup();
    repo.failWith = new SourceUnavailableError('PNCP', 'nenhuma modalidade respondeu');
    await expect(useCase.execute({ uf: 'PB' })).rejects.toThrow('PNCP');
  });
});
