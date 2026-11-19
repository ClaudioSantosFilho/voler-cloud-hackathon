import { ValidationError } from '../errors.js';

const WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_2 = [6, ...WEIGHTS_1];

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function hasValidCheckDigits(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const d1 = checkDigit(digits, WEIGHTS_1);
  const d2 = checkDigit(digits, WEIGHTS_2);
  return digits.endsWith(`${d1}${d2}`);
}

/** Value object de CNPJ (RN01): 14 dígitos com dígitos verificadores válidos. */
export class Cnpj {
  private constructor(readonly value: string) {}

  static parse(raw: string): Cnpj {
    const digits = raw.replace(/[.\-/\s]/g, '');
    if (!hasValidCheckDigits(digits)) {
      throw new ValidationError(
        `CNPJ inválido: informe 14 dígitos com dígitos verificadores corretos.`,
      );
    }
    return new Cnpj(digits);
  }

  static isValid(raw: string): boolean {
    return hasValidCheckDigits(raw.replace(/[.\-/\s]/g, ''));
  }

  /** Forma segura para logs: mantém só os 4 primeiros dígitos. */
  masked(): string {
    return maskCnpj(this.value);
  }
}

export function maskCnpj(value: string): string {
  return value.slice(0, 4).padEnd(value.length, '*');
}
