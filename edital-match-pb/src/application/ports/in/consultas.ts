import type { Feriado } from '../../../domain/calendario/dias-uteis.js';
import type { ChecklistMei } from '../../../domain/edital/documentos.js';
import type { EditalComPrazo, Modalidade } from '../../../domain/edital/edital.js';
import type { Municipio } from '../../../domain/municipio.js';

export interface DetalharEditalResult {
  edital: EditalComPrazo;
  aberto: boolean;
  avisos: string[];
  fontes: string[];
}

export interface DetalharEdital {
  execute(input: { idPncp: string }): Promise<DetalharEditalResult>;
}

export interface CalcularDiasUteisResult {
  hoje: string;
  data: string;
  uf: string;
  diasUteis: number;
  feriadosNoPeriodo: Feriado[];
  avisos: string[];
  fontes: string[];
}

export interface CalcularDiasUteis {
  execute(input: { data: string; uf?: string }): Promise<CalcularDiasUteisResult>;
}

export interface ListarModalidades {
  execute(): Modalidade[];
}

export interface ListarMunicipios {
  execute(input: { uf: string }): Promise<{ municipios: Municipio[]; fonte: string }>;
}

export interface GerarResumoMeiResult extends DetalharEditalResult {
  checklist: ChecklistMei;
}

export interface GerarResumoMei {
  execute(input: { idPncp: string }): Promise<GerarResumoMeiResult>;
}
