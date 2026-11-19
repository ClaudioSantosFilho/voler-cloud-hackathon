import { z } from 'zod';
import type { MunicipioGateway } from '../../../application/ports/out/municipio-gateway.js';
import { SourceUnavailableError } from '../../../domain/errors.js';
import type { Municipio } from '../../../domain/municipio.js';
import type { HttpClient } from '../http/http-client.js';

const municipiosSchema = z.array(z.object({ id: z.number(), nome: z.string() }));

export class IbgeMunicipioGateway implements MunicipioGateway {
  readonly source = 'IBGE';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async listarPorUf(uf: string): Promise<Municipio[]> {
    const url = `${this.baseUrl}/localidades/estados/${encodeURIComponent(uf)}/municipios`;
    const { status, body } = await this.http.getJson(url);
    if (status !== 200) throw new SourceUnavailableError(this.source, `HTTP ${status}`);
    const parsed = municipiosSchema.safeParse(body);
    if (!parsed.success) throw new SourceUnavailableError(this.source, 'formato inesperado');
    return parsed.data.map((m) => ({ codigoIbge: String(m.id), nome: m.nome, uf }));
  }
}
