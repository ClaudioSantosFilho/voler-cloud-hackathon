import { describe, expect, it } from 'vitest';
import { StderrLogger } from '../../../src/adapters/out/logger/stderr-logger.js';

describe('StderrLogger', () => {
  const fixedNow = () => new Date('2026-11-19T12:00:00Z');

  it('escreve JSON com timestamp, level e campos', () => {
    const lines: string[] = [];
    new StderrLogger('info', (l) => lines.push(l), fixedNow).info('ok', { tool: 'ping' });
    expect(JSON.parse(lines[0] ?? '')).toEqual({
      timestamp: '2026-11-19T12:00:00.000Z',
      level: 'info',
      message: 'ok',
      tool: 'ping',
    });
  });

  it('descarta níveis abaixo do mínimo', () => {
    const lines: string[] = [];
    const logger = new StderrLogger('warn', (l) => lines.push(l), fixedNow);
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(lines).toHaveLength(2);
  });
});
