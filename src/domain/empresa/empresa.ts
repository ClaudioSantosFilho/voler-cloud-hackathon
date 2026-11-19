import type { Cnae } from './cnae.js';

/** Dados cadastrais relevantes. O quadro societário é ignorado de propósito (LGPD). */
export interface Empresa {
  cnpj: string;
  razaoSocial: string;
  situacaoCadastral: string;
  cnaePrincipal: Cnae;
  cnaesSecundarios: Cnae[];
}
