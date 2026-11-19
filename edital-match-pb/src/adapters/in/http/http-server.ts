import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { toNodeHandler } from '@modelcontextprotocol/node';
import {
  createMcpHandler,
  validateHostHeader,
  validateOriginHeader,
  type McpServer,
} from '@modelcontextprotocol/server';
import type { Logger } from '../../../application/ports/out/logger.js';
import type { Metrics } from '../mcp/metrics.js';
import { SlidingWindowRateLimiter } from './rate-limiter.js';

export const MAX_BODY_BYTES = 32 * 1024;

export interface HttpServerOptions {
  factory: () => McpServer;
  logger: Logger;
  metrics: Metrics;
  cacheStats: () => { hits: number; misses: number };
  allowedHosts: string[];
  rateLimitPerMinute: number;
  requestTimeoutMs?: number;
  now?: () => number;
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers = {}): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? 'desconhecido';
}

/** Proteção contra DNS rebinding (recomendação da spec MCP): Host e Origin na allowlist. */
function rejectBadHostOrOrigin(req: IncomingMessage, allowed: string[]): string | undefined {
  const host = validateHostHeader(req.headers.host, allowed);
  if (!host.ok) return host.message;
  if (req.headers.origin === undefined) return undefined;
  const origin = validateOriginHeader(req.headers.origin, allowed);
  return origin.ok ? undefined : origin.message;
}

function tooLarge(req: IncomingMessage): boolean {
  return Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES;
}

/** Transporte Streamable HTTP: POST /mcp, GET /health e GET /metrics. Sem estado de sessão. */
export function createHttpServer(options: HttpServerOptions): Server {
  const limiter = new SlidingWindowRateLimiter(options.rateLimitPerMinute, 60_000, options.now);
  const handler = createMcpHandler(options.factory, { maxRequestBodySize: MAX_BODY_BYTES });
  const mcp = toNodeHandler(handler, {
    maxRequestBodySize: MAX_BODY_BYTES,
    onerror: (e) => options.logger.error(e.message, { source: 'http' }),
  });

  const route = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') return sendJson(res, 200, { status: 'ok' });

    const bad = rejectBadHostOrOrigin(req, options.allowedHosts);
    if (bad) return sendJson(res, 403, { error: bad });

    const retryAfter = limiter.hit(clientIp(req));
    if (retryAfter > 0) {
      return sendJson(res, 429, { error: 'Muitas requisições' }, { 'retry-after': retryAfter });
    }
    if (tooLarge(req)) return sendJson(res, 413, { error: 'Corpo maior que 32 KB' });

    if (req.method === 'GET' && path === '/metrics') {
      return sendJson(res, 200, options.metrics.snapshot(options.cacheStats()));
    }
    if (path === '/mcp') return mcp(req, res);
    return sendJson(res, 404, { error: 'Não encontrado' });
  };

  const server = createServer((req, res) => {
    const requestId = randomUUID();
    const started = Date.now();
    res.on('finish', () =>
      options.logger.info('http', {
        requestId,
        status: String(res.statusCode),
        durationMs: Date.now() - started,
        source: 'http',
      }),
    );
    route(req, res).catch((error: unknown) => {
      options.logger.error(error instanceof Error ? error.message : 'erro http', { requestId });
      if (!res.headersSent) sendJson(res, 500, { error: 'Erro interno' });
    });
  });
  server.requestTimeout = options.requestTimeoutMs ?? 30_000;
  server.headersTimeout = 10_000;
  return server;
}
