import type { Modalidade } from '../../domain/edital/edital.js';
import { MODALIDADES } from '../../domain/edital/modalidades.js';
import type { Municipio } from '../../domain/municipio.js';
import type { ListarModalidades, ListarMunicipios } from '../ports/in/consultas.js';
import type { Cache } from '../ports/out/cache.js';
import type { MunicipioGateway } from '../ports/out/municipio-gateway.js';
import { cached } from './cached.js';

export const REFERENCIA_TTL_MS = 24 * 3_600_000;

export class ListarModalidadesUseCase implements ListarModalidades {
  execute(): Modalidade[] {
    return [...MODALIDADES];
  }
}

export class ListarMunicipiosUseCase implements ListarMunicipios {
  constructor(
    private readonly gateway: MunicipioGateway,
    private readonly cache: Cache,
    private readonly ttlMs = REFERENCIA_TTL_MS,
  ) {}

  async execute(input: { uf: string }): Promise<{ municipios: Municipio[]; fonte: string }> {
    const uf = input.uf.toUpperCase();
    const municipios = await cached(this.cache, `municipios:${uf}`, this.ttlMs, () =>
      this.gateway.listarPorUf(uf),
    );
    return { municipios, fonte: this.gateway.source };
  }
}
