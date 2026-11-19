import type { Cache } from '../../src/application/ports/out/cache.js';
import type { Clock } from '../../src/application/ports/out/clock.js';
import type { CnpjGateway } from '../../src/application/ports/out/cnpj-gateway.js';
import type { Logger } from '../../src/application/ports/out/logger.js';
import type { Cnpj } from '../../src/domain/empresa/cnpj.js';
import type { Empresa } from '../../src/domain/empresa/empresa.js';
import { NotFoundError } from '../../src/domain/errors.js';

export class FakeCache implements Cache {
  readonly store = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }
}

export const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });

export const silentLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} };

export class FakeCnpjGateway implements CnpjGateway {
  readonly source = 'FakeCNPJ';
  calls = 0;
  failWith?: Error;
  constructor(private readonly empresas: Empresa[] = []) {}
  async buscarEmpresa(cnpj: Cnpj): Promise<Empresa> {
    this.calls++;
    if (this.failWith) throw this.failWith;
    const found = this.empresas.find((e) => e.cnpj === cnpj.value);
    if (!found) throw new NotFoundError(`CNPJ ${cnpj.masked()} não encontrado.`);
    return found;
  }
}
