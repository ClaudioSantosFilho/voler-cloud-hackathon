import type {
  ConsultaAbertos,
  EditaisResult,
  EditalRepository,
} from '../../../application/ports/out/edital-repository.js';
import { parseIdPncp, type Edital } from '../../../domain/edital/edital.js';
import { MODALIDADES } from '../../../domain/edital/modalidades.js';
import { NotFoundError, SourceUnavailableError } from '../../../domain/errors.js';
import type { HttpClient } from '../http/http-client.js';
import { pncpPaginaSchema, toEdital } from './pncp-mapper.js';

export interface PncpOptions {
  baseUrl: string;
  pageSize: number;
  /** Limite de páginas por modalidade, para respeitar o tempo de resposta (RNF01). */
  maxPaginas?: number;
  modalidades?: number[];
  concorrencia?: number;
}

interface PaginaPncp {
  editais: Edital[];
  descartados: number;
  totalPaginas: number;
}

export class PncpEditalRepository implements EditalRepository {
  readonly source = 'PNCP';

  constructor(
    private readonly http: HttpClient,
    private readonly options: PncpOptions,
  ) {}

  async listarAbertos(consulta: ConsultaAbertos): Promise<EditaisResult> {
    const modalidades = this.options.modalidades ?? MODALIDADES.map((m) => m.codigo);
    const resultados = await mapLimit(modalidades, this.options.concorrencia ?? 3, (m) =>
      this.listarModalidade(consulta, m).then(
        (r) => ({ ok: true as const, modalidade: m, ...r }),
        (error: unknown) => ({ ok: false as const, modalidade: m, error }),
      ),
    );
    const falhas = resultados.filter((r) => !r.ok);
    if (falhas.length === modalidades.length) {
      throw new SourceUnavailableError(this.source, 'nenhuma modalidade respondeu');
    }
    const editais = resultados.flatMap((r) => (r.ok ? r.editais : []));
    const descartados = resultados.reduce((n, r) => n + (r.ok ? r.descartados : 0), 0);
    return { editais: dedupe(editais), avisos: avisos(falhas, descartados) };
  }

  async buscarPorId(idPncp: string): Promise<Edital> {
    const { cnpjOrgao, ano, sequencial } = parseIdPncp(idPncp);
    const url = `${this.options.baseUrl}/v1/orgaos/${cnpjOrgao}/compras/${ano}/${sequencial}`;
    const { status, body } = await this.http.getJson(url);
    if (status === 404 || status === 204) {
      throw new NotFoundError(`Edital ${idPncp} não encontrado no PNCP.`);
    }
    if (status !== 200) throw new SourceUnavailableError(this.source, `HTTP ${status}`);
    const edital = toEdital(body);
    if (!edital) throw new SourceUnavailableError(this.source, 'formato de resposta inesperado');
    return edital;
  }

  private async listarModalidade(consulta: ConsultaAbertos, modalidade: number) {
    const primeira = await this.pagina(consulta, modalidade, 1);
    const ultima = Math.min(primeira.totalPaginas, this.options.maxPaginas ?? 20);
    const editais = [...primeira.editais];
    let descartados = primeira.descartados;
    for (let p = 2; p <= ultima; p++) {
      const pagina = await this.pagina(consulta, modalidade, p);
      editais.push(...pagina.editais);
      descartados += pagina.descartados;
    }
    return { editais, descartados };
  }

  private async pagina(
    consulta: ConsultaAbertos,
    modalidade: number,
    pagina: number,
  ): Promise<PaginaPncp> {
    const params = new URLSearchParams({
      dataFinal: consulta.dataFinal.replaceAll('-', ''),
      codigoModalidadeContratacao: String(modalidade),
      uf: consulta.uf,
      pagina: String(pagina),
      tamanhoPagina: String(this.options.pageSize),
    });
    const url = `${this.options.baseUrl}/v1/contratacoes/proposta?${params}`;
    const { status, body } = await this.http.getJson(url);
    if (status === 204) return { editais: [], descartados: 0, totalPaginas: 0 };
    if (status !== 200) throw new SourceUnavailableError(this.source, `HTTP ${status}`);
    const parsed = pncpPaginaSchema.safeParse(body);
    if (!parsed.success) throw new SourceUnavailableError(this.source, 'formato inesperado');
    const editais = parsed.data.data.map(toEdital).filter((e): e is Edital => e !== undefined);
    return {
      editais,
      descartados: parsed.data.data.length - editais.length,
      totalPaginas: parsed.data.totalPaginas,
    };
  }
}

function dedupe(editais: Edital[]): Edital[] {
  return [...new Map(editais.map((e) => [e.idPncp, e])).values()];
}

function avisos(falhas: { modalidade: number }[], descartados: number): string[] {
  const lista: string[] = [];
  if (falhas.length) {
    const nomes = falhas.map((f) => MODALIDADES.find((m) => m.codigo === f.modalidade)?.nome);
    lista.push(
      `PNCP: resultado parcial, falha ao consultar a(s) modalidade(s) ${nomes.join(', ')}.`,
    );
  }
  if (descartados) {
    lista.push(
      `PNCP: ${descartados} registro(s) ignorado(s) por dados incompletos ou datas inválidas.`,
    );
  }
  return lista;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
