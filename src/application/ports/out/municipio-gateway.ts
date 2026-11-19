import type { Municipio } from '../../../domain/municipio.js';

export interface MunicipioGateway {
  readonly source: string;
  listarPorUf(uf: string): Promise<Municipio[]>;
}
