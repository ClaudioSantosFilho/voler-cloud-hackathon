import { createMcpServerFactory } from '../../src/adapters/in/mcp/server.js';
import { Metrics } from '../../src/adapters/in/mcp/metrics.js';
import type { MunicipioGateway } from '../../src/application/ports/out/municipio-gateway.js';
import { buildUseCases } from '../../src/application/build-use-cases.js';
import type { Edital } from '../../src/domain/edital/edital.js';
import type { Empresa } from '../../src/domain/empresa/empresa.js';
import type { Municipio } from '../../src/domain/municipio.js';
import {
  FakeCache,
  FakeCalendario,
  FakeCnpjGateway,
  FakeEditalRepository,
  fixedClock,
  silentLogger,
} from './fakes.js';
import { NOW } from './fixtures.js';

export class FakeMunicipios implements MunicipioGateway {
  readonly source = 'FakeIBGE';
  failWith?: Error;
  constructor(private readonly municipios: Municipio[] = []) {}
  async listarPorUf(uf: string): Promise<Municipio[]> {
    if (this.failWith) throw this.failWith;
    return this.municipios.filter((m) => m.uf === uf);
  }
}

export interface TestServerOptions {
  empresas?: Empresa[];
  editais?: Edital[];
  municipios?: Municipio[];
  now?: string;
}

/** Monta o servidor MCP com fakes em todas as portas de saída. */
export function buildTestServer(options: TestServerOptions = {}) {
  const ports = {
    cnpj: new FakeCnpjGateway(options.empresas ?? []),
    editais: new FakeEditalRepository(options.editais ?? []),
    calendario: new FakeCalendario([{ data: '2027-02-09', nome: 'Carnaval' }]),
    municipios: new FakeMunicipios(options.municipios ?? []),
    cache: new FakeCache(),
    clock: fixedClock(options.now ?? NOW),
  };
  const metrics = new Metrics();
  const factory = createMcpServerFactory({
    logger: silentLogger,
    metrics,
    ...buildUseCases(ports, { matchMinScore: 0.2 }),
  });
  return {
    factory,
    metrics,
    cnpjGateway: ports.cnpj,
    editalRepository: ports.editais,
    calendario: ports.calendario,
    municipios: ports.municipios,
  };
}
