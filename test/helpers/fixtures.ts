import {
  brasilApiCnpjSchema,
  toEmpresa,
} from '../../src/adapters/out/brasilapi/brasilapi-cnpj-gateway.js';
import { toEdital } from '../../src/adapters/out/pncp/pncp-mapper.js';
import type { Edital } from '../../src/domain/edital/edital.js';
import type { Empresa } from '../../src/domain/empresa/empresa.js';
import editaisRaw from '../fixtures/editais-pncp.json' with { type: 'json' };
import empresasRaw from '../fixtures/empresas.json' with { type: 'json' };

export const editaisFixture = (): Edital[] =>
  editaisRaw.map((raw) => toEdital(raw)).filter((e): e is Edital => e !== undefined);

export const empresasFixture = (): Empresa[] =>
  empresasRaw.map((raw) => toEmpresa(brasilApiCnpjSchema.parse(raw)));

export const CNPJ_MARMITAS = '12345678000195';
export const CNPJ_LIMPEZA = '23456789000195';
export const CNPJ_TI = '34567890000130';
/** Data de referência dos testes: os editais de 2027 estão abertos, os de 2025 vencidos. */
export const NOW = '2026-11-19T12:00:00-03:00';
