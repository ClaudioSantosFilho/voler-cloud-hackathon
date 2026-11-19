import { describe, expect, it } from 'vitest';
import { normalizeCnaeCodigo } from '../../../src/domain/empresa/cnae.js';
import { SourceUnavailableError } from '../../../src/domain/errors.js';

describe('normalizeCnaeCodigo', () => {
  it('remove pontuação e completa 7 dígitos', () => {
    expect(normalizeCnaeCodigo('5620-1/04')).toBe('5620104');
    expect(normalizeCnaeCodigo(111301)).toBe('0111301');
  });
});

describe('SourceUnavailableError', () => {
  it('identifica a fonte que falhou (RN09)', () => {
    const error = new SourceUnavailableError('PNCP', 'timeout');
    expect(error.source).toBe('PNCP');
    expect(error.message).toBe('PNCP: timeout');
  });
});
