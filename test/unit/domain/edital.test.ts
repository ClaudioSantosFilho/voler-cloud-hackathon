import { describe, expect, it } from 'vitest';
import {
  isPropostaAberta,
  linkOficialPncp,
  parseIdPncp,
} from '../../../src/domain/edital/edital.js';
import { ValidationError } from '../../../src/domain/errors.js';
import { buildEdital } from '../../helpers/builders.js';

describe('isPropostaAberta (RN02)', () => {
  const now = new Date('2026-11-19T12:00:00-03:00');

  it('aberto quando o encerramento é futuro', () => {
    expect(
      isPropostaAberta(
        buildEdital({ dataEncerramentoPropostas: '2026-11-20T09:00:00-03:00' }),
        now,
      ),
    ).toBe(true);
  });

  it('aberto quando o encerramento é exatamente agora', () => {
    expect(
      isPropostaAberta(
        buildEdital({ dataEncerramentoPropostas: '2026-11-19T12:00:00-03:00' }),
        now,
      ),
    ).toBe(true);
  });

  it('vencido quando o encerramento já passou', () => {
    expect(
      isPropostaAberta(
        buildEdital({ dataEncerramentoPropostas: '2026-11-18T23:59:00-03:00' }),
        now,
      ),
    ).toBe(false);
  });
});

describe('parseIdPncp', () => {
  it('extrai cnpj do órgão, ano e sequencial', () => {
    expect(parseIdPncp('08761140000194-1-000180/2026')).toEqual({
      cnpjOrgao: '08761140000194',
      ano: 2026,
      sequencial: 180,
    });
  });

  it('rejeita formato inválido', () => {
    expect(() => parseIdPncp('abc')).toThrow(ValidationError);
  });

  it('monta o link oficial do PNCP', () => {
    expect(linkOficialPncp('08761140000194-1-000180/2026')).toBe(
      'https://pncp.gov.br/app/editais/08761140000194/2026/180',
    );
  });
});
