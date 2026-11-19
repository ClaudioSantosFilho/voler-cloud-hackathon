import type { EditalComPrazo } from '../../../domain/edital/edital.js';
import type { Empresa } from '../../../domain/empresa/empresa.js';
import type { Match } from '../../../domain/matching/matcher.js';

export interface MatchEditaisInput {
  cnpj: string;
  uf?: string;
  /** RN06: inclui matches abaixo do limiar quando o usuário pede explicitamente. */
  incluirAbaixoDoLimiar?: boolean;
  limite?: number;
}

export interface MatchEditaisResult {
  empresa: Empresa;
  uf: string;
  limiar: number;
  totalAnalisados: number;
  totalCompativeis: number;
  matches: Match<EditalComPrazo>[];
  avisos: string[];
  fontes: string[];
}

export interface MatchEditais {
  execute(input: MatchEditaisInput): Promise<MatchEditaisResult>;
}
