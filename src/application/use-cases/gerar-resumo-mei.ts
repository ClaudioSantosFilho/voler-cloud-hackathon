import { DOCUMENTOS_HABILITACAO_MEI, proximoPasso } from '../../domain/edital/documentos.js';
import type {
  DetalharEdital,
  GerarResumoMei,
  GerarResumoMeiResult,
} from '../ports/in/consultas.js';

export class GerarResumoMeiUseCase implements GerarResumoMei {
  constructor(private readonly detalhar: DetalharEdital) {}

  async execute(input: { idPncp: string }): Promise<GerarResumoMeiResult> {
    const detalhe = await this.detalhar.execute(input);
    const { edital, aberto } = detalhe;
    return {
      ...detalhe,
      checklist: {
        prazo: edital.dataEncerramentoPropostas,
        diasUteisRestantes: edital.diasUteisRestantes,
        ...(edital.valorEstimado !== undefined ? { valorEstimado: edital.valorEstimado } : {}),
        documentos: DOCUMENTOS_HABILITACAO_MEI,
        proximoPasso: proximoPasso(edital.diasUteisRestantes, aberto),
      },
    };
  }
}
