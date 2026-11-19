import { filtrarEditaisAbertos } from '../../domain/edital/filtro.js';
import { rankMatches } from '../../domain/matching/matcher.js';
import type { ConsultarEmpresa } from '../ports/in/consultar-empresa.js';
import type {
  MatchEditais,
  MatchEditaisInput,
  MatchEditaisResult,
} from '../ports/in/match-editais.js';
import type { EditaisLoader } from './editais-loader.js';
import type { PrazoService } from './prazo-service.js';

export const LIMITE_PADRAO = 20;

/** Orquestra empresa + editais + ranqueamento. Não faz I/O direto (SRP): tudo via portas. */
export class MatchEditaisUseCase implements MatchEditais {
  constructor(
    private readonly consultarEmpresa: ConsultarEmpresa,
    private readonly loader: EditaisLoader,
    private readonly prazos: PrazoService,
    private readonly limiarPadrao: number,
  ) {}

  async execute(input: MatchEditaisInput): Promise<MatchEditaisResult> {
    const uf = (input.uf ?? 'PB').toUpperCase();
    const [{ empresa, fonte }, carregados] = await Promise.all([
      this.consultarEmpresa.execute({ cnpj: input.cnpj }),
      this.loader.carregar(uf),
    ]);
    const abertos = filtrarEditaisAbertos(carregados.editais, { uf, now: carregados.now });
    const limiar = input.incluirAbaixoDoLimiar ? 0 : this.limiarPadrao;
    const ranqueados = rankMatches(empresa, abertos, limiar);
    const top = ranqueados.slice(0, input.limite ?? LIMITE_PADRAO);
    const contador = await this.prazos.contador(
      uf,
      top.map((m) => m.edital.dataEncerramentoPropostas),
    );
    return {
      empresa,
      uf,
      limiar,
      totalAnalisados: abertos.length,
      totalCompativeis: ranqueados.length,
      matches: top.map((m) => ({
        ...m,
        edital: {
          ...m.edital,
          diasUteisRestantes: contador.contar(m.edital.dataEncerramentoPropostas),
        },
      })),
      avisos: [
        ...avisoSituacao(empresa.situacaoCadastral),
        ...carregados.avisos,
        ...contador.avisos,
      ],
      fontes: [fonte, carregados.fonte, this.prazos.fonte],
    };
  }
}

function avisoSituacao(situacao: string): string[] {
  return situacao.toUpperCase() === 'ATIVA'
    ? []
    : [
        `Situação cadastral "${situacao}": a empresa pode não estar apta a participar de licitações.`,
      ];
}
