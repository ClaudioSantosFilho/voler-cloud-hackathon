import { describe, expect, it } from 'vitest';
import { Cnpj } from '../../../src/domain/empresa/cnpj.js';
import { ValidationError } from '../../../src/domain/errors.js';

describe('Cnpj (RN01)', () => {
  it('aceita CNPJ válido com ou sem máscara', () => {
    expect(Cnpj.parse('08.761.140/0001-94').value).toBe('08761140000194');
    expect(Cnpj.parse('08761140000194').value).toBe('08761140000194');
  });

  it.each([
    ['vazio', ''],
    ['curto', '0876114000019'],
    ['letras', '0876114000019A'],
    ['dígito verificador errado', '08761140000195'],
    ['todos iguais', '11111111111111'],
  ])('rejeita CNPJ %s', (_, raw) => {
    expect(() => Cnpj.parse(raw)).toThrow(ValidationError);
  });

  it('mascara para logs mantendo só os 4 primeiros dígitos', () => {
    expect(Cnpj.parse('08761140000194').masked()).toBe('0876**********');
  });

  it('isValid não lança exceção', () => {
    expect(Cnpj.isValid('08761140000194')).toBe(true);
    expect(Cnpj.isValid('123')).toBe(false);
  });
});
