import type { Cache } from '../ports/out/cache.js';

/** Lê do cache ou carrega e guarda. Falhas não são cacheadas. */
export async function cached<T>(
  cache: Cache,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  cache.set(key, value, ttlMs);
  return value;
}
