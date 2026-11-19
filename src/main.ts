#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { Metrics } from './adapters/in/mcp/metrics.js';
import { createMcpServerFactory } from './adapters/in/mcp/server.js';
import { BrasilApiCalendarioGateway } from './adapters/out/brasilapi/brasilapi-calendario-gateway.js';
import { BrasilApiCnpjGateway } from './adapters/out/brasilapi/brasilapi-cnpj-gateway.js';
import { MemoryCache } from './adapters/out/cache/memory-cache.js';
import { systemClock } from './adapters/out/clock/system-clock.js';
import { loadDemoPorts } from './adapters/out/demo/demo-ports.js';
import { HttpClient } from './adapters/out/http/http-client.js';
import { IbgeMunicipioGateway } from './adapters/out/ibge/ibge-municipio-gateway.js';
import { StderrLogger } from './adapters/out/logger/stderr-logger.js';
import { PncpEditalRepository } from './adapters/out/pncp/pncp-edital-repository.js';
import { buildUseCases } from './application/build-use-cases.js';
import { ConfigError, loadConfig, type AppConfig } from './config/env.js';

const FIXTURES_DIR = new URL('../test/fixtures/', import.meta.url);

function realPorts(config: AppConfig, logger: StderrLogger) {
  const httpFor = (source: string) =>
    new HttpClient(source, { timeoutMs: config.HTTP_TIMEOUT_MS, logger });
  const brasilApi = httpFor('BrasilAPI');
  return {
    cnpj: new BrasilApiCnpjGateway(brasilApi, config.BRASILAPI_BASE_URL),
    calendario: new BrasilApiCalendarioGateway(brasilApi, config.BRASILAPI_BASE_URL),
    municipios: new IbgeMunicipioGateway(httpFor('IBGE'), config.IBGE_BASE_URL),
    editais: new PncpEditalRepository(httpFor('PNCP'), {
      baseUrl: config.PNCP_BASE_URL,
      pageSize: config.PNCP_PAGE_SIZE,
    }),
  };
}

/** Composition root: único ponto que conhece todas as camadas. */
async function compose(config: AppConfig) {
  const logger = new StderrLogger(config.LOG_LEVEL);
  const cache = new MemoryCache();
  const metrics = new Metrics();
  const ports = config.DEMO_MODE ? await loadDemoPorts(FIXTURES_DIR) : realPorts(config, logger);
  const useCases = buildUseCases(
    { ...ports, cache, clock: systemClock },
    { editaisTtlMs: config.CACHE_TTL_MS, matchMinScore: config.MATCH_MIN_SCORE },
  );
  const factory = createMcpServerFactory({ logger, metrics, ...useCases });
  return { logger, cache, metrics, factory };
}

async function main(): Promise<void> {
  const config = loadConfig({
    ...process.env,
    ...(process.argv.includes('--demo') ? { DEMO_MODE: 'true' } : {}),
  });
  const { logger, factory } = await compose(config);
  serveStdio(factory, { onerror: (e) => logger.error(e.message, { status: 'error' }) });
  logger.info('servidor MCP iniciado', {
    transport: 'stdio',
    status: 'ok',
    demo: config.DEMO_MODE,
  });
}

main().catch((error: unknown) => {
  const message = error instanceof ConfigError ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ level: 'error', message })}\n`);
  process.exit(1);
});
