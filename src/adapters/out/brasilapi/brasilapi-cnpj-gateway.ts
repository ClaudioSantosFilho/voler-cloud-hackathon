import { z } from 'zod';
import type { CnpjGateway } from '../../../application/ports/out/cnpj-gateway.js';
import { normalizeCnaeCodigo, type Cnae } from '../../../domain/empresa/cnae.js';
import type { Cnpj } from '../../../domain/empresa/cnpj.js';
import type { Empresa } from '../../../domain/empresa/empresa.js';
import { NotFoundError, SourceUnavailableError } from '../../../domain/errors.js';
import type { HttpClient } from '../http/http-client.js';

const cnaeSchema = z.object({ codigo: z.union([z.number(), z.string()]), descricao: z.string() });

/** Só os campos usados. `qsa` (sócios) é ignorado de propósito (LGPD). */
export const brasilApiCnpjSchema = z.object({
  cnpj: z.string(),
  razao_social: z.string(),
  descricao_situacao_cadastral: z.string().nullish(),
  cnae_fiscal: z.union([z.number(), z.string()]),
  cnae_fiscal_descricao: z.string().nullish(),
  cnaes_secundarios: z.array(cnaeSchema).nullish(),
});

export type BrasilApiCnpj = z.infer<typeof brasilApiCnpjSchema>;

export function toEmpresa(raw: BrasilApiCnpj): Empresa {
  const secundarios: Cnae[] = (raw.cnaes_secundarios ?? [])
    .filter((c) => Number(c.codigo) > 0)
    .map((c) => ({ codigo: normalizeCnaeCodigo(c.codigo), descricao: c.descricao }));
  return {
    cnpj: raw.cnpj.replace(/\D/g, ''),
    razaoSocial: raw.razao_social,
    situacaoCadastral: raw.descricao_situacao_cadastral ?? 'DESCONHECIDA',
    cnaePrincipal: {
      codigo: normalizeCnaeCodigo(raw.cnae_fiscal),
      descricao: raw.cnae_fiscal_descricao ?? '',
    },
    cnaesSecundarios: secundarios,
  };
}

export class BrasilApiCnpjGateway implements CnpjGateway {
  readonly source = 'BrasilAPI';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async buscarEmpresa(cnpj: Cnpj): Promise<Empresa> {
    const { status, body } = await this.http.getJson(`${this.baseUrl}/cnpj/v1/${cnpj.value}`);
    if (status === 404) throw new NotFoundError(`CNPJ ${cnpj.masked()} não encontrado na Receita.`);
    if (status !== 200) throw new SourceUnavailableError(this.source, `HTTP ${status}`);
    const parsed = brasilApiCnpjSchema.safeParse(body);
    if (!parsed.success)
      throw new SourceUnavailableError(this.source, 'formato de resposta inesperado');
    return toEmpresa(parsed.data);
  }
}
