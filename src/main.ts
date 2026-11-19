#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createMcpServerFactory } from './adapters/in/mcp/server.js';
import { Metrics } from './adapters/in/mcp/metrics.js';
import { BrasilApiCalendarioGateway } from './adapters/out/brasilapi/brasilapi-calendario-gateway.js';
import { BrasilApiCnpjGateway } from './adapters/out/brasilapi/brasilapi-cnpj-gateway.js';
import { MemoryCache } from './adapters/out/cache/memory-cache.js';
import { systemClock } from './adapters/out/clock/system-clock.js';
import { HttpClient } from './adapters/out/http/http-client.js';
import { StderrLogger } from './adapters/out/logger/stderr-logger.js';
import { PncpEditalRepository } from './adapters/out/pncp/pncp-edital-repository.js';
import { BuscarEditaisAbertosUseCase } from './application/use-cases/buscar-editais-abertos.js';
import { ConsultarEmpresaUseCase } from './application/use-cases/consultar-empresa.js';
import { EditaisLoader } from './application/use-cases/editais-loader.js';
import { MatchEditaisUseCase } from './application/use-cases/match-editais.js';
import { PrazoService } from './application/use-cases/prazo-service.js';
import { ConfigError, loadConfig, type AppConfig } from './config/env.js';

/** Composition root: único ponto que conhece todas as camadas. */
function compose(config: AppConfig) {
  const logger = new StderrLogger(config.LOG_LEVEL);
  const cache = new MemoryCache();
  const metrics = new Metrics();
  const httpFor = (source: string) =>
    new HttpClient(source, { timeoutMs: config.HTTP_TIMEOUT_MS, logger });

  const brasilApi = httpFor('BrasilAPI');
  const cnpjGateway = new BrasilApiCnpjGateway(brasilApi, config.BRASILAPI_BASE_URL);
  const calendario = new BrasilApiCalendarioGateway(brasilApi, config.BRASILAPI_BASE_URL);
  const editalRepository = new PncpEditalRepository(httpFor('PNCP'), {
    baseUrl: config.PNCP_BASE_URL,
    pageSize: config.PNCP_PAGE_SIZE,
  });

  const loader = new EditaisLoader(editalRepository, cache, systemClock, config.CACHE_TTL_MS);
  const prazos = new PrazoService(calendario, cache, systemClock);

  const consultarEmpresa = new ConsultarEmpresaUseCase(cnpjGateway, cache);

  const factory = createMcpServerFactory({
    logger,
    metrics,
    consultarEmpresa,
    buscarEditais: new BuscarEditaisAbertosUseCase(loader, prazos),
    matchEditais: new MatchEditaisUseCase(consultarEmpresa, loader, prazos, config.MATCH_MIN_SCORE),
  });
  return { logger, cache, metrics, factory };
}

function main(): void {
  const config = loadConfig();
  const { logger, factory } = compose(config);
  serveStdio(factory, { onerror: (e) => logger.error(e.message, { status: 'error' }) });
  logger.info('servidor MCP iniciado', { transport: 'stdio', status: 'ok' });
}

try {
  main();
} catch (error) {
  const message = error instanceof ConfigError ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ level: 'error', message })}\n`);
  process.exit(1);
}
