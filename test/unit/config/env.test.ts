import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../../src/config/env.js';

describe('loadConfig', () => {
  it('aplica padrões quando nada é informado', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      TRANSPORT: 'stdio',
      PORT: 3000,
      HTTP_TIMEOUT_MS: 5000,
      CACHE_TTL_MS: 600_000,
      PNCP_PAGE_SIZE: 50,
      MATCH_MIN_SCORE: 0.2,
      LOG_LEVEL: 'info',
      ALLOWED_HOSTS: ['localhost', '127.0.0.1'],
    });
  });

  it('converte números vindos como texto', () => {
    expect(loadConfig({ PORT: '8080', MATCH_MIN_SCORE: '0.5' })).toMatchObject({
      PORT: 8080,
      MATCH_MIN_SCORE: 0.5,
    });
  });

  it('falha cedo com mensagem clara para valor inválido', () => {
    expect(() => loadConfig({ TRANSPORT: 'grpc' })).toThrow(ConfigError);
    expect(() => loadConfig({ MATCH_MIN_SCORE: '2' })).toThrow(/MATCH_MIN_SCORE/);
  });
});
