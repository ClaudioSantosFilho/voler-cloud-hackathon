import { describe, expect, it } from 'vitest';
import { filtrarEditaisAbertos, paginar } from '../../../src/domain/edital/filtro.js';
import { containsTerm, normalizeText } from '../../../src/domain/matching/text.js';
import { NOW, editaisFixture } from '../../helpers/fixtures.js';

const now = new Date(NOW);
const ids = (list: { idPncp: string }[]) => list.map((e) => e.idPncp.slice(-11, -5));

describe('filtrarEditaisAbertos', () => {
  const editais = editaisFixture();

  it('RN02/RN03: só abertos e da UF, ordenados pelo encerramento', () => {
    const result = filtrarEditaisAbertos(editais, { now, uf: 'pb' });
    expect(ids(result)).toEqual([
      '000006',
      '000004',
      '000002',
      '000003',
      '000007',
      '000001',
      '000005',
    ]);
  });

  it('editais vencidos não aparecem', () => {
    const result = ids(filtrarEditaisAbertos(editais, { now, uf: 'PB' }));
    expect(result).not.toContain('000008');
    expect(result).not.toContain('000010');
  });

  it('filtra por município pelo nome sem acento ou pelo código IBGE', () => {
    const porNome = filtrarEditaisAbertos(editais, { now, uf: 'PB', municipio: 'joao pessoa' });
    expect(ids(porNome)).toEqual(['000003', '000001']);
    const porCodigo = filtrarEditaisAbertos(editais, { now, uf: 'PB', municipio: '2510808' });
    expect(ids(porCodigo)).toEqual(['000004']);
  });

  it('filtra por palavras no objeto', () => {
    const result = filtrarEditaisAbertos(editais, { now, uf: 'PB', palavras: ['pneu'] });
    expect(ids(result)).toEqual(['000007']);
  });

  it('filtra por data limite de encerramento', () => {
    const result = filtrarEditaisAbertos(editais, { now, uf: 'PB', ateData: '2027-02-19' });
    expect(ids(result)).toEqual(['000006', '000004']);
  });

  it('resposta vazia quando nada casa', () => {
    expect(filtrarEditaisAbertos([], { now, uf: 'PB' })).toEqual([]);
  });
});

describe('paginar', () => {
  const itens = Array.from({ length: 45 }, (_, i) => i);

  it('divide em páginas e informa totais', () => {
    expect(paginar(itens, 3, 20)).toEqual({
      itens: [40, 41, 42, 43, 44],
      pagina: 3,
      tamanhoPagina: 20,
      total: 45,
      totalPaginas: 3,
    });
  });

  it('ajusta página fora do intervalo', () => {
    expect(paginar(itens, 99, 20).pagina).toBe(3);
    expect(paginar(itens, 0, 20).pagina).toBe(1);
    expect(paginar([], 1, 20)).toMatchObject({ itens: [], totalPaginas: 1, total: 0 });
  });
});

describe('texto', () => {
  it('normaliza acentos, caixa e pontuação', () => {
    expect(normalizeText('Refeições, LANCHES!')).toBe('refeicoes lanches');
  });

  it('casa termo como início de palavra', () => {
    const t = normalizeText('Aquisição de pneus');
    expect(containsTerm(t, 'pneu')).toBe(true);
    expect(containsTerm(t, 'neus')).toBe(false);
    expect(containsTerm(t, '  ')).toBe(false);
  });
});
