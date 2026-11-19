/** Métricas simples em memória, expostas em GET /metrics no modo http. */
export class Metrics {
  readonly callsByTool: Record<string, number> = {};
  readonly errorsBySource: Record<string, number> = {};

  recordCall(tool: string): void {
    this.callsByTool[tool] = (this.callsByTool[tool] ?? 0) + 1;
  }

  recordError(source: string): void {
    this.errorsBySource[source] = (this.errorsBySource[source] ?? 0) + 1;
  }

  snapshot(cache: { hits: number; misses: number }) {
    const total = cache.hits + cache.misses;
    return {
      callsByTool: { ...this.callsByTool },
      errorsBySource: { ...this.errorsBySource },
      cache: { ...cache, hitRate: total === 0 ? 0 : cache.hits / total },
    };
  }
}
