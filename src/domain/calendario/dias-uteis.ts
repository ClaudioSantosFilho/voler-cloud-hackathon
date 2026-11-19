export interface Feriado {
  /** YYYY-MM-DD */
  data: string;
  nome: string;
}

const DAY_MS = 86_400_000;
const BRASILIA_OFFSET_MS = -3 * 3_600_000;

/** Data civil (YYYY-MM-DD) em Brasília. Sem horário de verão desde 2019, então offset fixo. */
export function toBrasiliaDate(instant: Date): string {
  return new Date(instant.getTime() + BRASILIA_OFFSET_MS).toISOString().slice(0, 10);
}

function toUtcMidnight(isoDate: string): number {
  return Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`);
}

function isWeekend(ms: number): boolean {
  const day = new Date(ms).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * RN07: dias úteis estritamente após `from` até `to`, inclusive.
 * Exclui sábados, domingos e as datas em `holidays` (YYYY-MM-DD).
 */
export function businessDaysBetween(
  from: string,
  to: string,
  holidays: ReadonlySet<string>,
): number {
  let count = 0;
  for (let ms = toUtcMidnight(from) + DAY_MS; ms <= toUtcMidnight(to); ms += DAY_MS) {
    const iso = new Date(ms).toISOString().slice(0, 10);
    if (!isWeekend(ms) && !holidays.has(iso)) count++;
  }
  return count;
}

/**
 * Feriados estaduais fixos (MM-DD) por UF.
 * shortcut: só PB está cadastrada; para outras UFs, adicionar aqui ou criar um adaptador de fonte oficial.
 */
const ESTADUAIS: Record<string, { mmdd: string; nome: string }[]> = {
  PB: [{ mmdd: '08-05', nome: 'Fundação do Estado da Paraíba' }],
};

export function feriadosEstaduais(uf: string, ano: number): Feriado[] {
  return (ESTADUAIS[uf.toUpperCase()] ?? []).map((f) => ({
    data: `${ano}-${f.mmdd}`,
    nome: f.nome,
  }));
}
