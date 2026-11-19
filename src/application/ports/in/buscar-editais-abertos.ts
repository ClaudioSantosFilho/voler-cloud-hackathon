import type { Pagina } from '../../../domain/edital/filtro.js';
import type { EditalComPrazo } from '../../../domain/edital/edital.js';

export interface BuscarEditaisInput {
  uf: string;
  municipio?: string;
  palavras?: string[];
  ateData?: string;
  pagina?: number;
}

export interface BuscarEditaisResult extends Pagina<EditalComPrazo> {
  avisos: string[];
  fontes: string[];
}

export interface BuscarEditaisAbertos {
  execute(input: BuscarEditaisInput): Promise<BuscarEditaisResult>;
}
