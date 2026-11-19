import type { McpServer } from '@modelcontextprotocol/server';
import type {
  ListarModalidades,
  ListarMunicipios,
} from '../../../../application/ports/in/consultas.js';

const json = (uri: URL, value: unknown) => ({
  contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(value, null, 2) }],
});

export function registerReferencias(
  server: McpServer,
  modalidades: ListarModalidades,
  municipios: ListarMunicipios,
): void {
  server.registerResource(
    'modalidades',
    'pncp://modalidades',
    {
      title: 'Modalidades de contratação (PNCP)',
      description: 'Tabela de códigos de modalidade usados pelo PNCP.',
      mimeType: 'application/json',
    },
    async (uri) => json(uri, { fonte: 'PNCP', modalidades: modalidades.execute() }),
  );

  server.registerResource(
    'municipios-pb',
    'ibge://municipios/PB',
    {
      title: 'Municípios da Paraíba (IBGE)',
      description: 'Código IBGE e nome dos 223 municípios da Paraíba.',
      mimeType: 'application/json',
    },
    async (uri) => json(uri, await municipios.execute({ uf: 'PB' })),
  );
}
