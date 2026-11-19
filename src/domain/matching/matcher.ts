import type { Edital } from '../edital/edital.js';
import type { Empresa } from '../empresa/empresa.js';
import { keywordsForCnae } from './cnae-keywords.js';
import { containsTerm, normalizeText } from './text.js';

export interface Match<E extends Edital = Edital> {
  edital: E;
  /** 0 a 1 (RN05). */
  score: number;
  /** Termos que coincidiram, com o CNAE de origem (RN05). */
  motivo: string[];
}

/** RN04: o CNAE principal pesa o dobro de um secundário. */
export const PESO_PRINCIPAL = 1;
export const PESO_SECUNDARIO = 0.5;
/** Quantos termos do CNAE principal bastam para score 1. */
const TERMOS_PARA_SCORE_MAXIMO = 2;

interface Termo {
  termo: string;
  peso: number;
  origem: string;
}

function termosDaEmpresa(empresa: Empresa): Termo[] {
  const principal = keywordsForCnae(empresa.cnaePrincipal).map((termo) => ({
    termo,
    peso: PESO_PRINCIPAL,
    origem: `CNAE principal ${empresa.cnaePrincipal.codigo}`,
  }));
  const secundarios = empresa.cnaesSecundarios.flatMap((cnae) =>
    keywordsForCnae(cnae).map((termo) => ({
      termo,
      peso: PESO_SECUNDARIO,
      origem: `CNAE secundário ${cnae.codigo}`,
    })),
  );
  return [...principal, ...secundarios];
}

/** Mantém cada termo uma vez, com o maior peso (o principal vem primeiro). */
function unicos(termos: Termo[]): Termo[] {
  const vistos = new Map<string, Termo>();
  for (const t of termos) {
    const atual = vistos.get(t.termo);
    if (!atual || t.peso > atual.peso) vistos.set(t.termo, t);
  }
  return [...vistos.values()];
}

function scoreComTermos<E extends Edital>(edital: E, termos: Termo[]): Match<E> {
  const objeto = normalizeText(edital.objeto);
  const encontrados = termos.filter((t) => containsTerm(objeto, t.termo));
  const soma = encontrados.reduce((acc, t) => acc + t.peso, 0);
  const score = Math.round(Math.min(1, soma / TERMOS_PARA_SCORE_MAXIMO) * 100) / 100;
  return { edital, score, motivo: encontrados.map((t) => `${t.termo} (${t.origem})`) };
}

/** Similaridade por termos, determinística e sem LLM (ADR-004). */
export function scoreEdital<E extends Edital>(edital: E, empresa: Empresa): Match<E> {
  return scoreComTermos(edital, unicos(termosDaEmpresa(empresa)));
}

/** RN06: só devolve matches com score >= limiar, do maior para o menor score. */
export function rankMatches<E extends Edital>(
  empresa: Empresa,
  editais: E[],
  limiar: number,
): Match<E>[] {
  const termos = unicos(termosDaEmpresa(empresa));
  return editais
    .map((e) => scoreComTermos(e, termos))
    .filter((m) => m.score >= limiar)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.edital.dataEncerramentoPropostas.localeCompare(b.edital.dataEncerramentoPropostas),
    );
}
