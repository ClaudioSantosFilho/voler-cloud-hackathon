import { readFile } from 'node:fs/promises';
import type { CalendarioGateway } from '../../../application/ports/out/calendario-gateway.js';
import type { CnpjGateway } from '../../../application/ports/out/cnpj-gateway.js';
import type {
  EditaisResult,
  EditalRepository,
} from '../../../application/ports/out/edital-repository.js';
import type { MunicipioGateway } from '../../../application/ports/out/municipio-gateway.js';
import type { Feriado } from '../../../domain/calendario/dias-uteis.js';
import type { Edital } from '../../../domain/edital/edital.js';
import type { Cnpj } from '../../../domain/empresa/cnpj.js';
import type { Empresa } from '../../../domain/empresa/empresa.js';
import { NotFoundError } from '../../../domain/errors.js';
import type { Municipio } from '../../../domain/municipio.js';
import { brasilApiCnpjSchema, toEmpresa } from '../brasilapi/brasilapi-cnpj-gateway.js';
import { toEdital } from '../pncp/pncp-mapper.js';

const SOURCE_SUFFIX = ' (modo demonstração)';

async function readJson(dir: URL, file: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(file, dir), 'utf8'));
}

class DemoCnpj implements CnpjGateway {
  readonly source = `BrasilAPI${SOURCE_SUFFIX}`;
  constructor(private readonly empresas: Empresa[]) {}
  async buscarEmpresa(cnpj: Cnpj): Promise<Empresa> {
    const found = this.empresas.find((e) => e.cnpj === cnpj.value);
    if (!found) throw new NotFoundError(`CNPJ ${cnpj.masked()} não existe nas fixtures de demo.`);
    return found;
  }
}

class DemoEditais implements EditalRepository {
  readonly source = `PNCP${SOURCE_SUFFIX}`;
  constructor(private readonly editais: Edital[]) {}
  async listarAbertos({ uf }: { uf: string }): Promise<EditaisResult> {
    return { editais: this.editais.filter((e) => e.uf === uf), avisos: [] };
  }
  async buscarPorId(idPncp: string): Promise<Edital> {
    const found = this.editais.find((e) => e.idPncp === idPncp);
    if (!found) throw new NotFoundError(`Edital ${idPncp} não existe nas fixtures de demo.`);
    return found;
  }
}

class DemoCalendario implements CalendarioGateway {
  readonly source = `BrasilAPI${SOURCE_SUFFIX}`;
  constructor(private readonly feriados: Feriado[]) {}
  async feriadosNacionais(ano: number): Promise<Feriado[]> {
    return this.feriados.filter((f) => f.data.startsWith(`${ano}-`));
  }
}

class DemoMunicipios implements MunicipioGateway {
  readonly source = `IBGE${SOURCE_SUFFIX}`;
  constructor(private readonly municipios: Municipio[]) {}
  async listarPorUf(uf: string): Promise<Municipio[]> {
    return this.municipios.filter((m) => m.uf === uf);
  }
}

/**
 * "Seed" do modo demonstração: carrega as fixtures (respostas no formato das APIs reais)
 * em memória e passa pelos mesmos mapeadores dos adaptadores reais. Nada vai para disco.
 */
export async function loadDemoPorts(fixturesDir: URL) {
  const [empresas, editais, f2026, f2027, municipios] = await Promise.all(
    [
      'empresas.json',
      'editais-pncp.json',
      'recorded/brasilapi-feriados-2026.json',
      'recorded/brasilapi-feriados-2027.json',
      'recorded/ibge-municipios-pb.json',
    ].map((file) => readJson(fixturesDir, file)),
  );
  const asArray = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    cnpj: new DemoCnpj(asArray(empresas).map((e) => toEmpresa(brasilApiCnpjSchema.parse(e)))),
    editais: new DemoEditais(
      asArray(editais)
        .map(toEdital)
        .filter((e): e is Edital => e !== undefined),
    ),
    calendario: new DemoCalendario(
      [...asArray(f2026), ...asArray(f2027)].map((f: { date: string; name: string }) => ({
        data: f.date,
        nome: f.name,
      })),
    ),
    municipios: new DemoMunicipios(
      asArray(municipios).map((m: { id: number; nome: string }) => ({
        codigoIbge: String(m.id),
        nome: m.nome,
        uf: 'PB',
      })),
    ),
  };
}
