export interface Cnae {
  /** 7 dígitos, sem pontuação (ex.: 5620104). */
  codigo: string;
  descricao: string;
}

export function normalizeCnaeCodigo(raw: string | number): string {
  return String(raw).replace(/\D/g, '').padStart(7, '0');
}
