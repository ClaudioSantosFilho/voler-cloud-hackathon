import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { ConsultarEmpresa } from '../../../../application/ports/in/consultar-empresa.js';
import type { Empresa } from '../../../../domain/empresa/empresa.js';
import { cnaeOutput, READ_ONLY } from '../schemas.js';
import { runTool, type ToolContext } from '../tool-runner.js';

const output = z.object({
  cnpj: z.string(),
  razaoSocial: z.string(),
  situacaoCadastral: z.string(),
  cnaePrincipal: cnaeOutput,
  cnaesSecundarios: z.array(cnaeOutput),
  fonte: z.string(),
});

function formatEmpresa(e: Empresa, fonte: string): string {
  const secundarios = e.cnaesSecundarios.length
    ? e.cnaesSecundarios.map((c) => `  - ${c.codigo} ${c.descricao}`).join('\n')
    : '  (nenhum)';
  return [
    `${e.razaoSocial} (CNPJ ${e.cnpj})`,
    `Situação cadastral: ${e.situacaoCadastral}`,
    `CNAE principal: ${e.cnaePrincipal.codigo} ${e.cnaePrincipal.descricao}`,
    `CNAEs secundários:\n${secundarios}`,
    `Fonte: ${fonte}`,
  ].join('\n');
}

export function registerPerfilEmpresa(
  server: McpServer,
  useCase: ConsultarEmpresa,
  ctx: ToolContext,
): void {
  server.registerTool(
    'perfil_empresa',
    {
      title: 'Perfil da empresa',
      description:
        'Consulta razão social, situação cadastral e atividades (CNAE principal e secundários) de um CNPJ.',
      inputSchema: z.object({
        cnpj: z.string().max(32).describe('CNPJ com ou sem máscara, ex.: 12.345.678/0001-95'),
      }),
      outputSchema: output,
      annotations: READ_ONLY,
    },
    ({ cnpj }) =>
      runTool(ctx, 'perfil_empresa', async () => {
        const { empresa, fonte } = await useCase.execute({ cnpj });
        return { text: formatEmpresa(empresa, fonte), data: { ...empresa, fonte } };
      }),
  );
}
