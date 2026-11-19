import type { Empresa } from '../../../domain/empresa/empresa.js';

export interface ConsultarEmpresaResult {
  empresa: Empresa;
  fonte: string;
}

export interface ConsultarEmpresa {
  execute(input: { cnpj: string }): Promise<ConsultarEmpresaResult>;
}
