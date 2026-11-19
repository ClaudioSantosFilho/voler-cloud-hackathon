import { isPropostaAberta, parseIdPncp } from '../../domain/edital/edital.js';
import type { DetalharEdital, DetalharEditalResult } from '../ports/in/consultas.js';
import type { Cache } from '../ports/out/cache.js';
import type { Clock } from '../ports/out/clock.js';
import type { EditalRepository } from '../ports/out/edital-repository.js';
import { cached } from './cached.js';
import { EDITAIS_TTL_MS } from './editais-loader.js';
import type { PrazoService } from './prazo-service.js';

export class DetalharEditalUseCase implements DetalharEdital {
  constructor(
    private readonly repository: EditalRepository,
    private readonly prazos: PrazoService,
    private readonly cache: Cache,
    private readonly clock: Clock,
    private readonly ttlMs = EDITAIS_TTL_MS,
  ) {}

  async execute(input: { idPncp: string }): Promise<DetalharEditalResult> {
    const id = input.idPncp.trim();
    parseIdPncp(id);
    const edital = await cached(this.cache, `edital:${id}`, this.ttlMs, () =>
      this.repository.buscarPorId(id),
    );
    const contador = await this.prazos.contador(edital.uf, [edital.dataEncerramentoPropostas]);
    return {
      edital: { ...edital, diasUteisRestantes: contador.contar(edital.dataEncerramentoPropostas) },
      aberto: isPropostaAberta(edital, this.clock.now()),
      avisos: contador.avisos,
      fontes: [this.repository.source, this.prazos.fonte],
    };
  }
}
