import { describe, expect, it } from 'vitest';
import {
  businessDaysBetween,
  feriadosEstaduais,
  toBrasiliaDate,
} from '../../../src/domain/calendario/dias-uteis.js';

describe('businessDaysBetween (RN07)', () => {
  it('conta só dias de semana após a data inicial até a final, inclusive', () => {
    // 2026-11-20 sexta -> 2026-11-27 sexta: seg..sex = 5
    expect(businessDaysBetween('2026-11-20', '2026-11-27', new Set())).toBe(5);
  });

  it('desconta feriado em dia útil', () => {
    expect(businessDaysBetween('2026-11-20', '2026-11-27', new Set(['2026-11-24']))).toBe(4);
  });

  it('feriado em fim de semana não altera a contagem', () => {
    expect(businessDaysBetween('2026-11-20', '2026-11-27', new Set(['2026-11-22']))).toBe(5);
  });

  it('mesma data ou data passada retorna 0', () => {
    expect(businessDaysBetween('2026-11-20', '2026-11-20', new Set())).toBe(0);
    expect(businessDaysBetween('2026-11-20', '2026-11-01', new Set())).toBe(0);
  });

  it('atravessa virada de ano', () => {
    // 2026-12-31 qui -> 2027-01-05 ter: sex 1 (feriado), seg 4, ter 5 = 2
    expect(businessDaysBetween('2026-12-31', '2027-01-05', new Set(['2027-01-01']))).toBe(2);
  });
});

describe('feriadosEstaduais', () => {
  it('inclui a fundação do estado da Paraíba (5 de agosto)', () => {
    expect(feriadosEstaduais('PB', 2026)).toContainEqual({
      data: '2026-08-05',
      nome: 'Fundação do Estado da Paraíba',
    });
  });

  it('UF sem tabela retorna lista vazia', () => {
    expect(feriadosEstaduais('XX', 2026)).toEqual([]);
  });
});

describe('toBrasiliaDate', () => {
  it('usa o fuso de Brasília (UTC-3)', () => {
    expect(toBrasiliaDate(new Date('2026-11-20T02:00:00Z'))).toBe('2026-11-19');
    expect(toBrasiliaDate(new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-20');
  });
});
