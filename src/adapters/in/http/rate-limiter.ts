/** Rate limit por chave (IP) com janela deslizante. Estado só em memória. */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  /** Registra a tentativa. Retorna 0 se permitida, ou os segundos até liberar. */
  hit(key: string): number {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.ceil((this.windowMs - (now - (recent[0] ?? now))) / 1000);
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    this.evictOldest();
    return 0;
  }

  private evictOldest(): void {
    if (this.hits.size <= this.maxKeys) return;
    const oldest = this.hits.keys().next().value;
    if (oldest !== undefined) this.hits.delete(oldest);
  }
}
