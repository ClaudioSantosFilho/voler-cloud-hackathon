import {
  businessDaysBetween,
  feriadosEstaduais,
  toBrasiliaDate,
  type Feriado,
} from '../../domain/calendario/dias-uteis.js';
import type { Cache } from '../ports/out/cache.js';
import type { CalendarioGateway } from '../ports/out/calendario-gateway.js';
import type { Clock } from '../ports/out/clock.js';
import { cached } from './cached.js';

export const FERIADOS_TTL_MS = 24 * 3_600_000;

export interface ContadorDiasUteis {
  hoje: string;
  /** Dias úteis de hoje (exclusive) até `data` (inclusive). */
  contar(data: string): number;
  feriados: Feriado[];
  avisos: string[];
}

function anosEntre(inicio: string, datas: string[]): number[] {
  const anos = new Set([Number(inicio.slice(0, 4))]);
  for (const d of datas) anos.add(Number(d.slice(0, 4)));
  return [...anos].sort();
}

/** RN07: prazo em dias úteis com feriados nacionais (fonte externa) e estaduais (domínio). */
export class PrazoService {
  constructor(
    private readonly calendario: CalendarioGateway,
    private readonly cache: Cache,
    private readonly clock: Clock,
    private readonly ttlMs = FERIADOS_TTL_MS,
  ) {}

  get fonte(): string {
    return `${this.calendario.source} (feriados)`;
  }

  async contador(uf: string, datas: string[]): Promise<ContadorDiasUteis> {
    const hoje = toBrasiliaDate(this.clock.now());
    const avisos: string[] = [];
    const feriados: Feriado[] = [];
    for (const ano of anosEntre(hoje, datas)) {
      feriados.push(...(await this.nacionais(ano, avisos)), ...feriadosEstaduais(uf, ano));
    }
    const set = new Set(feriados.map((f) => f.data));
    return { hoje, feriados, avisos, contar: (data) => businessDaysBetween(hoje, data, set) };
  }

  private async nacionais(ano: number, avisos: string[]): Promise<Feriado[]> {
    try {
      return await cached(this.cache, `feriados:${ano}`, this.ttlMs, () =>
        this.calendario.feriadosNacionais(ano),
      );
    } catch {
      avisos.push(
        `${this.calendario.source} indisponível: feriados nacionais de ${ano} não considerados no cálculo de dias úteis.`,
      );
      return [];
    }
  }
}
