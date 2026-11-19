import { createMcpServerFactory } from '../../src/adapters/in/mcp/server.js';
import { Metrics } from '../../src/adapters/in/mcp/metrics.js';
import { ConsultarEmpresaUseCase } from '../../src/application/use-cases/consultar-empresa.js';
import type { Empresa } from '../../src/domain/empresa/empresa.js';
import { FakeCache, FakeCnpjGateway, silentLogger } from './fakes.js';

export interface TestServerOptions {
  empresas?: Empresa[];
}

/** Monta o servidor MCP com fakes em todas as portas de saída. */
export function buildTestServer(options: TestServerOptions = {}) {
  const cnpjGateway = new FakeCnpjGateway(options.empresas ?? []);
  const metrics = new Metrics();
  const factory = createMcpServerFactory({
    logger: silentLogger,
    metrics,
    consultarEmpresa: new ConsultarEmpresaUseCase(cnpjGateway, new FakeCache()),
  });
  return { factory, cnpjGateway, metrics };
}
