#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createMcpServerFactory } from './adapters/in/mcp/server.js';
import { Metrics } from './adapters/in/mcp/metrics.js';
import { BrasilApiCnpjGateway } from './adapters/out/brasilapi/brasilapi-cnpj-gateway.js';
import { MemoryCache } from './adapters/out/cache/memory-cache.js';
import { HttpClient } from './adapters/out/http/http-client.js';
import { StderrLogger } from './adapters/out/logger/stderr-logger.js';
import { ConsultarEmpresaUseCase } from './application/use-cases/consultar-empresa.js';
import { ConfigError, loadConfig, type AppConfig } from './config/env.js';

/** Composition root: único ponto que conhece todas as camadas. */
function compose(config: AppConfig) {
  const logger = new StderrLogger(config.LOG_LEVEL);
  const cache = new MemoryCache();
  const metrics = new Metrics();
  const httpFor = (source: string) =>
    new HttpClient(source, { timeoutMs: config.HTTP_TIMEOUT_MS, logger });

  const cnpjGateway = new BrasilApiCnpjGateway(httpFor('BrasilAPI'), config.BRASILAPI_BASE_URL);

  const factory = createMcpServerFactory({
    logger,
    metrics,
    consultarEmpresa: new ConsultarEmpresaUseCase(cnpjGateway, cache),
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
