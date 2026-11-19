import { filtrarEditaisAbertos, paginar } from '../../domain/edital/filtro.js';
import type {
  BuscarEditaisAbertos,
  BuscarEditaisInput,
  BuscarEditaisResult,
} from '../ports/in/buscar-editais-abertos.js';
import type { EditaisLoader } from './editais-loader.js';
import type { PrazoService } from './prazo-service.js';

export const TAMANHO_PAGINA = 20;

export class BuscarEditaisAbertosUseCase implements BuscarEditaisAbertos {
  constructor(
    private readonly loader: EditaisLoader,
    private readonly prazos: PrazoService,
    private readonly tamanhoPagina = TAMANHO_PAGINA,
  ) {}

  async execute(input: BuscarEditaisInput): Promise<BuscarEditaisResult> {
    const uf = input.uf.toUpperCase();
    const carregados = await this.loader.carregar(uf, input.ateData);
    const filtrados = filtrarEditaisAbertos(carregados.editais, {
      ...input,
      uf,
      now: carregados.now,
    });
    const pagina = paginar(filtrados, input.pagina ?? 1, this.tamanhoPagina);
    const contador = await this.prazos.contador(
      uf,
      pagina.itens.map((e) => e.dataEncerramentoPropostas),
    );
    return {
      ...pagina,
      itens: pagina.itens.map((e) => ({
        ...e,
        diasUteisRestantes: contador.contar(e.dataEncerramentoPropostas),
      })),
      avisos: [...carregados.avisos, ...contador.avisos],
      fontes: [carregados.fonte, this.prazos.fonte],
    };
  }
}
