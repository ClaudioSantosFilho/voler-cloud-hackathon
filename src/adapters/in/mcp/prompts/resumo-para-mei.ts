import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type {
  GerarResumoMei,
  GerarResumoMeiResult,
} from '../../../../application/ports/in/consultas.js';
import { formatData, formatValor } from '../schemas.js';
import { errorMessage } from '../tool-runner.js';

function instrucoes({ edital: e, checklist: c }: GerarResumoMeiResult): string {
  return [
    'Você está ajudando um microempreendedor individual (MEI) que nunca participou de licitação.',
    'Com os dados abaixo, escreva um checklist curto em linguagem simples, sem juridiquês, com:',
    '1) prazo final e quantos dias úteis faltam; 2) o que está sendo comprado; 3) valor estimado;',
    '4) documentos a separar; 5) o próximo passo. Termine lembrando que o edital oficial deve ser lido.',
    '',
    `Objeto: ${e.objeto}`,
    `Órgão: ${e.orgao} — ${e.municipioNome}/${e.uf}`,
    `Modalidade: ${e.modalidade.nome}`,
    `Prazo final das propostas: ${formatData(c.prazo)} (${c.diasUteisRestantes} dias úteis)`,
    `Valor estimado: ${formatValor(c.valorEstimado)}`,
    `Documentos usuais: ${c.documentos.join('; ')}`,
    `Próximo passo sugerido: ${c.proximoPasso}`,
    `Link oficial: ${e.linkOficial}`,
    'Fonte: PNCP. Este resumo é informativo e não substitui a análise jurídica do edital.',
  ].join('\n');
}

export function registerResumoParaMei(server: McpServer, useCase: GerarResumoMei): void {
  server.registerPrompt(
    'resumo_para_mei',
    {
      title: 'Resumo do edital para MEI',
      description:
        'Gera um checklist em linguagem simples (prazo, documentos, valor estimado e próximo passo) para um edital do PNCP.',
      argsSchema: z.object({
        id_pncp: z.string().max(40).describe('Número de controle PNCP do edital'),
      }),
    },
    async ({ id_pncp }) => {
      const text = await useCase
        .execute({ idPncp: id_pncp })
        .then(
          instrucoes,
          (error: unknown) =>
            `Não foi possível carregar o edital ${id_pncp}: ${errorMessage(error)}`,
        );
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    },
  );
}
