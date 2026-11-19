import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { AddressInfo } from 'node:net';
import { request, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpServer, MAX_BODY_BYTES } from '../../../src/adapters/in/http/http-server.js';
import { silentLogger } from '../../helpers/fakes.js';
import { editaisFixture } from '../../helpers/fixtures.js';
import { buildTestServer } from '../../helpers/test-server.js';

let server: Server | undefined;

async function start(rateLimitPerMinute = 100) {
  const test = buildTestServer({ editais: editaisFixture() });
  server = createHttpServer({
    factory: test.factory,
    logger: silentLogger,
    metrics: test.metrics,
    cacheStats: () => ({ hits: 3, misses: 1 }),
    allowedHosts: ['localhost', '127.0.0.1'],
    rateLimitPerMinute,
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, test };
}

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe('transporte Streamable HTTP', () => {
  it('GET /health responde só o status', async () => {
    const { base } = await start();
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('cliente MCP chama tools via POST /mcp', async () => {
    const { base } = await start();
    const client = new Client({ name: 'http-test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const result = await client.callTool({ name: 'buscar_editais_abertos', arguments: {} });
    expect((result.structuredContent as { total: number }).total).toBe(7);
    await client.close();
  });

  it('GET /metrics expõe contadores e taxa de cache hit', async () => {
    const { base } = await start();
    const res = await fetch(`${base}/metrics`);
    expect(await res.json()).toMatchObject({ cache: { hits: 3, misses: 1, hitRate: 0.75 } });
  });

  it('rejeita Host fora da allowlist (DNS rebinding)', async () => {
    const { base } = await start();
    // fetch ignora o header Host; node:http permite forjá-lo como num ataque de DNS rebinding.
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${base}/mcp`, { method: 'POST', headers: { host: 'evil.example' } });
      req.on('response', (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(403);
  });

  it('rejeita Origin fora da allowlist', async () => {
    const { base } = await start();
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });

  it('limita requisições por IP com 429 e Retry-After', async () => {
    const { base } = await start(2);
    await fetch(`${base}/metrics`);
    await fetch(`${base}/metrics`);
    const res = await fetch(`${base}/metrics`);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('rejeita corpo maior que 32 KB com 413', async () => {
    const { base } = await start();
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(MAX_BODY_BYTES + 1),
    });
    expect(res.status).toBe(413);
  });

  it('rota desconhecida retorna 404', async () => {
    const { base } = await start();
    expect((await fetch(`${base}/admin`)).status).toBe(404);
  });
});
