import { toBrasiliaDate } from '../../domain/calendario/dias-uteis.js';
import type { Cache } from '../ports/out/cache.js';
import type { Clock } from '../ports/out/clock.js';
import type { EditaisResult, EditalRepository } from '../ports/out/edital-repository.js';

export const EDITAIS_TTL_MS = 600_000;
const UM_ANO_MS = 365 * 86_400_000;

export interface EditaisCarregados extends EditaisResult {
  now: Date;
  fonte: string;
}

/** Carrega editais de uma UF com cache. Resultados parciais (com avisos) não são cacheados. */
export class EditaisLoader {
  constructor(
    private readonly repository: EditalRepository,
    private readonly cache: Cache,
    private readonly clock: Clock,
    private readonly ttlMs = EDITAIS_TTL_MS,
  ) {}

  async carregar(uf: string, ateData?: string): Promise<EditaisCarregados> {
    const now = this.clock.now();
    const dataFinal = ateData ?? toBrasiliaDate(new Date(now.getTime() + UM_ANO_MS));
    const key = `editais:${uf}:${dataFinal}`;
    const fonte = this.repository.source;
    const hit = this.cache.get<EditaisResult>(key);
    if (hit) return { ...hit, now, fonte };

    const result = await this.repository.listarAbertos({ uf, dataFinal });
    if (result.avisos.length === 0) this.cache.set(key, result, this.ttlMs);
    return { ...result, now, fonte };
  }
}
