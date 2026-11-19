import { createMcpServerFactory } from '../../src/adapters/in/mcp/server.js';
import { Metrics } from '../../src/adapters/in/mcp/metrics.js';
import { BuscarEditaisAbertosUseCase } from '../../src/application/use-cases/buscar-editais-abertos.js';
import { ConsultarEmpresaUseCase } from '../../src/application/use-cases/consultar-empresa.js';
import { EditaisLoader } from '../../src/application/use-cases/editais-loader.js';
import { MatchEditaisUseCase } from '../../src/application/use-cases/match-editais.js';
import { PrazoService } from '../../src/application/use-cases/prazo-service.js';
import type { Edital } from '../../src/domain/edital/edital.js';
import type { Empresa } from '../../src/domain/empresa/empresa.js';
import {
  FakeCache,
  FakeCalendario,
  FakeCnpjGateway,
  FakeEditalRepository,
  fixedClock,
  silentLogger,
} from './fakes.js';
import { NOW } from './fixtures.js';

export interface TestServerOptions {
  empresas?: Empresa[];
  editais?: Edital[];
  now?: string;
}

/** Monta o servidor MCP com fakes em todas as portas de saída. */
export function buildTestServer(options: TestServerOptions = {}) {
  const cnpjGateway = new FakeCnpjGateway(options.empresas ?? []);
  const editalRepository = new FakeEditalRepository(options.editais ?? []);
  const calendario = new FakeCalendario([{ data: '2027-02-16', nome: 'Carnaval' }]);
  const cache = new FakeCache();
  const clock = fixedClock(options.now ?? NOW);
  const metrics = new Metrics();
  const loader = new EditaisLoader(editalRepository, cache, clock);
  const prazos = new PrazoService(calendario, cache, clock);
  const consultarEmpresa = new ConsultarEmpresaUseCase(cnpjGateway, cache);
  const factory = createMcpServerFactory({
    logger: silentLogger,
    metrics,
    consultarEmpresa,
    buscarEditais: new BuscarEditaisAbertosUseCase(loader, prazos),
    matchEditais: new MatchEditaisUseCase(consultarEmpresa, loader, prazos, 0.2),
  });
  return { factory, cnpjGateway, editalRepository, calendario, metrics };
}
