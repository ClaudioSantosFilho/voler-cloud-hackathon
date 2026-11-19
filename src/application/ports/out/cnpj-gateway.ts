import type { Cnpj } from '../../../domain/empresa/cnpj.js';
import type { Empresa } from '../../../domain/empresa/empresa.js';

/** Lança NotFoundError se o CNPJ não existir e SourceUnavailableError se a fonte falhar. */
export interface CnpjGateway {
  readonly source: string;
  buscarEmpresa(cnpj: Cnpj): Promise<Empresa>;
}
