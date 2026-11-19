import { describe, expect, it } from 'vitest';
import { CNAE_KEYWORDS, keywordsForCnae } from '../../../src/domain/matching/cnae-keywords.js';
import { rankMatches, scoreEdital } from '../../../src/domain/matching/matcher.js';
import { buildEdital, buildEmpresa } from '../../helpers/builders.js';
import {
  CNPJ_LIMPEZA,
  CNPJ_MARMITAS,
  CNPJ_TI,
  editaisFixture,
  empresasFixture,
} from '../../helpers/fixtures.js';

const empresa = (cnpj: string) => {
  const found = empresasFixture().find((e) => e.cnpj === cnpj);
  if (!found) throw new Error(cnpj);
  return found;
};
const seq = (id: string) => id.slice(-11, -5);

describe('dicionário CNAE -> palavras-chave', () => {
  it('cobre ao menos 30 atividades comuns de MEI', () => {
    expect(Object.keys(CNAE_KEYWORDS).length).toBeGreaterThanOrEqual(30);
  });

  it('usa o dicionário quando o CNAE é conhecido', () => {
    expect(keywordsForCnae({ codigo: '5620104', descricao: '' })).toContain('marmit');
  });

  it('gera termos a partir da descrição quando o CNAE não está no dicionário', () => {
    const termos = keywordsForCnae({
      codigo: '9999999',
      descricao: 'Fabricação de artefatos de cerâmica e barro cozido',
    });
    expect(termos).toEqual(expect.arrayContaining(['artefa', 'cerami']));
    expect(termos).not.toContain('fabric');
  });
});

describe('scoreEdital (RN04/RN05)', () => {
  it('CNAE principal com dois termos atinge score 1 e explica o motivo', () => {
    const edital = buildEdital({ objeto: 'Fornecimento de refeições tipo marmitex' });
    const match = scoreEdital(edital, buildEmpresa());
    expect(match.score).toBe(1);
    expect(match.motivo).toEqual([
      'refeic (CNAE principal 5620104)',
      'marmit (CNAE principal 5620104)',
    ]);
  });

  it('CNAE principal pesa mais que o secundário', () => {
    const edital = buildEdital({ objeto: 'Serviço de limpeza predial' });
    const principal = buildEmpresa({
      cnaePrincipal: { codigo: '8121400', descricao: '' },
    });
    const secundario = buildEmpresa({
      cnaesSecundarios: [{ codigo: '8121400', descricao: '' }],
    });
    expect(scoreEdital(edital, principal).score).toBeGreaterThan(
      scoreEdital(edital, secundario).score,
    );
  });

  it('termo repetido em vários CNAEs conta uma vez, pelo maior peso', () => {
    const edital = buildEdital({ objeto: 'Contratação de limpeza' });
    const match = scoreEdital(
      edital,
      buildEmpresa({
        cnaePrincipal: { codigo: '8121400', descricao: '' },
        cnaesSecundarios: [{ codigo: '8129000', descricao: '' }],
      }),
    );
    expect(match.score).toBe(0.5);
    expect(match.motivo).toEqual(['limpeza (CNAE principal 8121400)']);
  });

  it('sem termos em comum: score 0 e motivo vazio', () => {
    const match = scoreEdital(buildEdital({ objeto: 'Aquisição de pneus' }), buildEmpresa());
    expect(match).toMatchObject({ score: 0, motivo: [] });
  });

  it('empresa sem CNAE secundário funciona só com o principal', () => {
    const marmitas = empresa(CNPJ_MARMITAS);
    expect(marmitas.cnaesSecundarios).toEqual([]);
    const ranked = rankMatches(marmitas, editaisFixture(), 0.2);
    expect(ranked.map((m) => seq(m.edital.idPncp))).toContain('000001');
  });
});

describe('rankMatches', () => {
  const editais = editaisFixture();

  it.each([
    [CNPJ_MARMITAS, ['000001', '000002'], ['000007', '000005']],
    [CNPJ_LIMPEZA, ['000003', '000004'], ['000001', '000007']],
    [CNPJ_TI, ['000005', '000006'], ['000003', '000007']],
  ])('empresa %s casa com os editais certos', (cnpj, esperados, ausentes) => {
    const ids = rankMatches(empresa(cnpj), editais, 0.2).map((m) => seq(m.edital.idPncp));
    expect(ids).toEqual(expect.arrayContaining(esperados));
    for (const id of ausentes) expect(ids).not.toContain(id);
  });

  it('ordena por score decrescente e respeita o limiar (RN06)', () => {
    const ranked = rankMatches(empresa(CNPJ_TI), editais, 0);
    const scores = ranked.map((m) => m.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(ranked.some((m) => m.score === 0)).toBe(true);
    expect(rankMatches(empresa(CNPJ_TI), editais, 0.2).every((m) => m.score >= 0.2)).toBe(true);
  });
});
