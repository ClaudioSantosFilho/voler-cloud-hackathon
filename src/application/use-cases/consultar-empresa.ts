import { Cnpj } from '../../domain/empresa/cnpj.js';
import type { ConsultarEmpresa, ConsultarEmpresaResult } from '../ports/in/consultar-empresa.js';
import type { Cache } from '../ports/out/cache.js';
import type { CnpjGateway } from '../ports/out/cnpj-gateway.js';
import { cached } from './cached.js';

export const EMPRESA_TTL_MS = 3_600_000;

export class ConsultarEmpresaUseCase implements ConsultarEmpresa {
  constructor(
    private readonly gateway: CnpjGateway,
    private readonly cache: Cache,
    private readonly ttlMs = EMPRESA_TTL_MS,
  ) {}

  async execute(input: { cnpj: string }): Promise<ConsultarEmpresaResult> {
    const cnpj = Cnpj.parse(input.cnpj);
    const empresa = await cached(this.cache, `empresa:${cnpj.value}`, this.ttlMs, () =>
      this.gateway.buscarEmpresa(cnpj),
    );
    return { empresa, fonte: this.gateway.source };
  }
}
