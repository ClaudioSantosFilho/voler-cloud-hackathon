import { ValidationError } from '../../domain/errors.js';
import type { CalcularDiasUteis, CalcularDiasUteisResult } from '../ports/in/consultas.js';
import type { PrazoService } from './prazo-service.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CalcularDiasUteisUseCase implements CalcularDiasUteis {
  constructor(private readonly prazos: PrazoService) {}

  async execute(input: { data: string; uf?: string }): Promise<CalcularDiasUteisResult> {
    if (!ISO_DATE.test(input.data) || Number.isNaN(Date.parse(input.data))) {
      throw new ValidationError('Data inválida: use o formato AAAA-MM-DD.');
    }
    const uf = (input.uf ?? 'PB').toUpperCase();
    const contador = await this.prazos.contador(uf, [input.data]);
    return {
      hoje: contador.hoje,
      data: input.data,
      uf,
      diasUteis: contador.contar(input.data),
      feriadosNoPeriodo: contador.feriados
        .filter((f) => f.data > contador.hoje && f.data <= input.data)
        .sort((a, b) => a.data.localeCompare(b.data)),
      avisos: contador.avisos,
      fontes: [this.prazos.fonte],
    };
  }
}
