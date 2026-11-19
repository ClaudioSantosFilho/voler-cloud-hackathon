import type { Cache } from '../../../application/ports/out/cache.js';

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** Cache só em memória (ADR-003). Nada é persistido em disco. */
export class MemoryCache implements Cache {
  private readonly entries = new Map<string, Entry>();
  hits = 0;
  misses = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 5000,
  ) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt < this.now()) {
      this.entries.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
  }
}
