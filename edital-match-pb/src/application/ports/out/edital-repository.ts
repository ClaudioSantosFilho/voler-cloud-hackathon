import type { Edital } from '../../../domain/edital/edital.js';

export interface ConsultaAbertos {
  uf: string;
  /** YYYY-MM-DD: limite superior do encerramento das propostas. */
  dataFinal: string;
}

export interface EditaisResult {
  editais: Edital[];
  /** Falhas parciais (ex.: uma modalidade não respondeu). RNF03. */
  avisos: string[];
}

/** Fonte de editais. Implementações: PNCP real, fixtures de demo, fakes de teste. */
export interface EditalRepository {
  readonly source: string;
  listarAbertos(consulta: ConsultaAbertos): Promise<EditaisResult>;
  /** Lança NotFoundError se o edital não existir. */
  buscarPorId(idPncp: string): Promise<Edital>;
}
