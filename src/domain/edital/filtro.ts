import { containsTerm, normalizeText } from '../matching/text.js';
import { isPropostaAberta, type Edital } from './edital.js';

export interface FiltroEditais {
  now: Date;
  uf: string;
  /** Nome do município ou código IBGE. */
  municipio?: string;
  palavras?: string[];
  /** YYYY-MM-DD: encerramento das propostas até esta data. */
  ateData?: string;
}

function matchesMunicipio(edital: Edital, municipio: string): boolean {
  if (/^\d{7}$/.test(municipio)) return edital.municipioIbge === municipio;
  return normalizeText(edital.municipioNome) === normalizeText(municipio);
}

function matchesPalavras(edital: Edital, palavras: string[]): boolean {
  const objeto = normalizeText(edital.objeto);
  return palavras.some((p) => containsTerm(objeto, p));
}

function encerraAte(edital: Edital, ateData: string): boolean {
  return edital.dataEncerramentoPropostas.slice(0, 10) <= ateData;
}

/** RN02 + RN03 + filtros opcionais. Ordena pelo encerramento mais próximo. */
export function filtrarEditaisAbertos(editais: Edital[], filtro: FiltroEditais): Edital[] {
  const uf = filtro.uf.toUpperCase();
  return editais
    .filter((e) => e.uf === uf && isPropostaAberta(e, filtro.now))
    .filter((e) => !filtro.municipio || matchesMunicipio(e, filtro.municipio))
    .filter((e) => !filtro.palavras?.length || matchesPalavras(e, filtro.palavras))
    .filter((e) => !filtro.ateData || encerraAte(e, filtro.ateData))
    .sort((a, b) => a.dataEncerramentoPropostas.localeCompare(b.dataEncerramentoPropostas));
}

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanhoPagina: number;
  total: number;
  totalPaginas: number;
}

export function paginar<T>(itens: T[], pagina: number, tamanhoPagina: number): Pagina<T> {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / tamanhoPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * tamanhoPagina;
  return {
    itens: itens.slice(inicio, inicio + tamanhoPagina),
    pagina: atual,
    tamanhoPagina,
    total: itens.length,
    totalPaginas,
  };
}
