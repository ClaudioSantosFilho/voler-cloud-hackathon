import { z } from 'zod';

const intFromEnv = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const csv = z
  .string()
  .default('localhost,127.0.0.1')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  PORT: intFromEnv(3000),
  /** Interface de escuta no modo http. Em contêiner, use 0.0.0.0. */
  HOST: z.string().default('127.0.0.1'),
  PNCP_BASE_URL: z.url().default('https://pncp.gov.br/api/consulta'),
  BRASILAPI_BASE_URL: z.url().default('https://brasilapi.com.br/api'),
  IBGE_BASE_URL: z.url().default('https://servicodados.ibge.gov.br/api/v1'),
  HTTP_TIMEOUT_MS: intFromEnv(5000),
  CACHE_TTL_MS: intFromEnv(600_000),
  PNCP_PAGE_SIZE: intFromEnv(50).pipe(z.number().max(500)),
  MATCH_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.2),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_PER_MINUTE: intFromEnv(60),
  ALLOWED_HOSTS: csv,
  DEMO_MODE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
});

export type AppConfig = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** Lê e valida as variáveis de ambiente; falha cedo com mensagem legível. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new ConfigError(`Configuração inválida: ${issues}`);
}
