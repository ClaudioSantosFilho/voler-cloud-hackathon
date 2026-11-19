#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createMcpServer } from './adapters/in/mcp/server.js';
import { StderrLogger } from './adapters/out/logger/stderr-logger.js';
import { ConfigError, loadConfig } from './config/env.js';

function main(): void {
  const config = loadConfig();
  const logger = new StderrLogger(config.LOG_LEVEL);
  serveStdio(createMcpServer, { onerror: (e) => logger.error(e.message, { status: 'error' }) });
  logger.info('servidor MCP iniciado', { transport: config.TRANSPORT, status: 'ok' });
}

try {
  main();
} catch (error) {
  const message = error instanceof ConfigError ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ level: 'error', message })}\n`);
  process.exit(1);
}
