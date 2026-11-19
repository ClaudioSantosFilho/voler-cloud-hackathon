import { z } from 'zod';
import type { CalendarioGateway } from '../../../application/ports/out/calendario-gateway.js';
import type { Feriado } from '../../../domain/calendario/dias-uteis.js';
import { SourceUnavailableError } from '../../../domain/errors.js';
import type { HttpClient } from '../http/http-client.js';

const feriadosSchema = z.array(
  z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string() }),
);

export class BrasilApiCalendarioGateway implements CalendarioGateway {
  readonly source = 'BrasilAPI';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async feriadosNacionais(ano: number): Promise<Feriado[]> {
    const { status, body } = await this.http.getJson(`${this.baseUrl}/feriados/v1/${ano}`);
    if (status !== 200) throw new SourceUnavailableError(this.source, `HTTP ${status}`);
    const parsed = feriadosSchema.safeParse(body);
    if (!parsed.success) throw new SourceUnavailableError(this.source, 'formato inesperado');
    return parsed.data.map((f) => ({ data: f.date, nome: f.name }));
  }
}
