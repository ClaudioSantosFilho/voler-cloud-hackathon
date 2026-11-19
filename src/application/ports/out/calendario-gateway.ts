import type { Feriado } from '../../../domain/calendario/dias-uteis.js';

/** Feriados nacionais de um ano. Feriados estaduais vêm do domínio. */
export interface CalendarioGateway {
  readonly source: string;
  feriadosNacionais(ano: number): Promise<Feriado[]>;
}
