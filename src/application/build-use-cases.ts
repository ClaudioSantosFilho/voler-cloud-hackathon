import type { Cache } from './ports/out/cache.js';
import type { CalendarioGateway } from './ports/out/calendario-gateway.js';
import type { Clock } from './ports/out/clock.js';
import type { CnpjGateway } from './ports/out/cnpj-gateway.js';
import type { EditalRepository } from './ports/out/edital-repository.js';
import type { MunicipioGateway } from './ports/out/municipio-gateway.js';
import { BuscarEditaisAbertosUseCase } from './use-cases/buscar-editais-abertos.js';
import { CalcularDiasUteisUseCase } from './use-cases/calcular-dias-uteis.js';
import { ConsultarEmpresaUseCase } from './use-cases/consultar-empresa.js';
import { DetalharEditalUseCase } from './use-cases/detalhar-edital.js';
import { EDITAIS_TTL_MS, EditaisLoader } from './use-cases/editais-loader.js';
import { GerarResumoMeiUseCase } from './use-cases/gerar-resumo-mei.js';
import {
  ListarModalidadesUseCase,
  ListarMunicipiosUseCase,
} from './use-cases/listar-referencias.js';
import { MatchEditaisUseCase } from './use-cases/match-editais.js';
import { PrazoService } from './use-cases/prazo-service.js';

export interface OutPorts {
  cnpj: CnpjGateway;
  editais: EditalRepository;
  calendario: CalendarioGateway;
  municipios: MunicipioGateway;
  cache: Cache;
  clock: Clock;
}

export interface UseCaseSettings {
  editaisTtlMs?: number;
  matchMinScore: number;
}

/** Monta todos os casos de uso a partir das portas de saída (usado pelo main e pelos testes). */
export function buildUseCases(ports: OutPorts, settings: UseCaseSettings) {
  const { cache, clock } = ports;
  const ttl = settings.editaisTtlMs ?? EDITAIS_TTL_MS;
  const loader = new EditaisLoader(ports.editais, cache, clock, ttl);
  const prazos = new PrazoService(ports.calendario, cache, clock);
  const consultarEmpresa = new ConsultarEmpresaUseCase(ports.cnpj, cache);
  const detalharEdital = new DetalharEditalUseCase(ports.editais, prazos, cache, clock, ttl);
  return {
    consultarEmpresa,
    buscarEditais: new BuscarEditaisAbertosUseCase(loader, prazos),
    matchEditais: new MatchEditaisUseCase(consultarEmpresa, loader, prazos, settings.matchMinScore),
    detalharEdital,
    calcularDiasUteis: new CalcularDiasUteisUseCase(prazos),
    listarModalidades: new ListarModalidadesUseCase(),
    listarMunicipios: new ListarMunicipiosUseCase(ports.municipios, cache),
    gerarResumoMei: new GerarResumoMeiUseCase(detalharEdital),
  };
}
