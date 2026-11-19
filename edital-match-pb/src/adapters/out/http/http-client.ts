import type { Logger } from '../../../application/ports/out/logger.js';
import { SourceUnavailableError } from '../../../domain/errors.js';

export interface HttpClientOptions {
  timeoutMs: number;
  /** Tentativas extras após a primeira, só para 5xx, 429 (limite da fonte) e erros de rede (RNF02). */
  retries?: number;
  backoffMs?: number;
  logger?: Logger;
  fetchFn?: typeof fetch;
}

export interface HttpResult {
  status: number;
  body: unknown;
}

/** Identifica o cliente às APIs públicas, sem dados pessoais. */
const USER_AGENT = 'edital-match-pb/0.1 (servidor MCP de codigo aberto)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Cliente HTTP GET-only (RN08) com timeout, retry exponencial e erro identificando a fonte. */
export class HttpClient {
  private readonly retries: number;
  private readonly backoffMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(
    readonly source: string,
    private readonly options: HttpClientOptions,
  ) {
    this.retries = options.retries ?? 2;
    this.backoffMs = options.backoffMs ?? 200;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /** Retorna status e corpo JSON para 2xx/4xx; lança SourceUnavailableError para falhas finais. */
  async getJson(url: string, deadline = Infinity): Promise<HttpResult> {
    let lastError = 'erro desconhecido';
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await sleep(this.backoffMs * 2 ** (attempt - 1));
      const started = Date.now();
      const timeoutMs = Math.min(this.options.timeoutMs, deadline - started);
      if (timeoutMs <= 0) {
        lastError = 'tempo limite da consulta';
        break;
      }
      try {
        const result = await this.once(url, timeoutMs);
        this.log(result.status, started);
        if (!isRetryable(result.status)) return result;
        lastError = `HTTP ${result.status}`;
      } catch (error) {
        lastError = describe(error);
        this.log('network_error', started);
      }
    }
    throw new SourceUnavailableError(this.source, `indisponível (${lastError})`);
  }

  private async once(url: string, timeoutMs: number): Promise<HttpResult> {
    const response = await this.fetchFn(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    return { status: response.status, body: parseJson(text) };
  }

  private log(status: number | string, started: number): void {
    this.options.logger?.debug('chamada externa', {
      source: this.source,
      status: String(status),
      durationMs: Date.now() - started,
    });
  }
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describe(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return 'timeout';
  return error instanceof Error ? error.message : String(error);
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 429;
}
