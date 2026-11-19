import { randomUUID } from 'node:crypto';
import type { Logger } from '../../../application/ports/out/logger.js';
import { NotFoundError, SourceUnavailableError, ValidationError } from '../../../domain/errors.js';
import type { Metrics } from './metrics.js';

export interface ToolContext {
  logger: Logger;
  metrics: Metrics;
}

export interface ToolOutput<T> {
  text: string;
  data: T;
}

export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Converte erros em mensagem legível ao usuário (RF09), sem stack trace. */
export function errorMessage(error: unknown): string {
  if (error instanceof ValidationError || error instanceof NotFoundError) return error.message;
  if (error instanceof SourceUnavailableError) {
    return `A fonte ${error.source} está indisponível no momento. Tente novamente em instantes. (${error.message})`;
  }
  return 'Erro interno inesperado. Tente novamente.';
}

function errorSource(error: unknown): string {
  return error instanceof SourceUnavailableError ? error.source : 'interno';
}

/** Executa uma tool com log estruturado, métricas e mapeamento de erro (RF09, RNF06). */
export async function runTool<T extends object>(
  ctx: ToolContext,
  tool: string,
  fn: () => Promise<ToolOutput<T>>,
): Promise<ToolResult> {
  const requestId = randomUUID();
  const started = Date.now();
  ctx.metrics.recordCall(tool);
  try {
    const { text, data } = await fn();
    ctx.logger.info('tool executada', {
      tool,
      requestId,
      status: 'ok',
      durationMs: Date.now() - started,
    });
    return {
      content: [{ type: 'text', text }],
      structuredContent: { ...data } as Record<string, unknown>,
    };
  } catch (error) {
    const source = errorSource(error);
    if (!(error instanceof ValidationError)) ctx.metrics.recordError(source);
    ctx.logger.warn('tool falhou', {
      tool,
      requestId,
      source,
      status: error instanceof Error ? error.name : 'erro',
      durationMs: Date.now() - started,
    });
    return { content: [{ type: 'text', text: errorMessage(error) }], isError: true };
  }
}
