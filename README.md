# Edital Match PB

Servidor MCP que recebe o CNPJ de um MEI ou pequena empresa, lê o CNAE e devolve licitações abertas na Paraíba (PNCP) compatíveis com o negócio, com prazo em dias úteis, valor estimado e o motivo de cada match.

> **Aviso legal:** o match é informativo e não substitui a leitura do edital nem a análise jurídica. Dados públicos de PNCP, BrasilAPI e IBGE; nada é gravado em disco.

## Instalação em uma linha

```bash
npm install && npm start
```

Requer Node.js 20 ou superior. Sem chave de API.

## Configurar no cliente MCP

Claude Desktop / Claude Code (`claude_desktop_config.json` ou `.mcp.json`), usando caminho relativo à pasta do projeto como `cwd`:

```json
{
  "mcpServers": {
    "edital-match-pb": { "command": "npx", "args": ["tsx", "src/main.ts"], "cwd": "." }
  }
}
```

Modo demonstração (offline, fixtures fictícias): `npm run seed:demo` ou `"args": ["tsx", "src/main.ts", "--demo"]`.

Inspector: `npx @modelcontextprotocol/inspector npx tsx src/main.ts`

HTTP (Streamable HTTP em `POST /mcp`, `GET /health`, `GET /metrics`): `TRANSPORT=http npm start` ou `docker compose up`. Em produção, use um proxy reverso (Nginx, Cloudflare) com TLS na frente.

## Tools, resources e prompt

| Primitiva                | Exemplo                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `perfil_empresa`         | `{ "cnpj": "12.345.678/0001-95" }`                              |
| `buscar_editais_abertos` | `{ "uf": "PB", "municipio": "Patos", "palavras": ["limpeza"] }` |
| `match_editais`          | `{ "cnpj": "34567890000130", "incluir_baixo_score": false }`    |
| `detalhar_edital`        | `{ "id_pncp": "08761140000194-1-000180/2026" }`                 |
| `dias_uteis_ate`         | `{ "data": "2027-02-19", "uf": "PB" }`                          |
| resource                 | `pncp://modalidades`, `ibge://municipios/PB`                    |
| prompt                   | `resumo_para_mei` com `id_pncp`                                 |

Todas as tools são somente leitura (`readOnlyHint: true`) e devolvem texto + `structuredContent`.

## Roteiro de demo (5 min)

1. `npm run seed:demo` no cliente MCP.
2. "Qual o perfil do CNPJ 12.345.678/0001-95?" → MEI de marmitas, sem CNAE secundário.
3. "Quais licitações combinam com essa empresa?" → `match_editais` com score e motivo (`marmit`, `refeic`).
4. Repita com `34567890000130` (TI) e `23456789000195` (limpeza).
5. "Detalhe o edital 10000000000303-1-000004/2026" e use o prompt `resumo_para_mei`.
6. Mostre `dias_uteis_ate` com feriados e, se a rede ajudar, troque para o modo real.

## Desenvolvimento

`npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:e2e`, `npm run test:live` (APIs reais, fora do CI). Variáveis em `.env.example`.

## Limitações

- O PNCP limita a taxa de requisições (HTTP 429): a consulta de uma UF tem orçamento de 8 s e pode voltar parcial, com aviso.
- Match por termos: pode haver falsos positivos/negativos; veja o `motivo`.
- Feriados estaduais cadastrados só para PB; municipais não são considerados.
- Fixtures de demo têm editais abertos até fev–abr/2027.
- Modo demo não está disponível na imagem Docker (fixtures ficam em `test/`).

Documentação completa: [docs/especificacao.md](docs/especificacao.md), [modelo de dados](docs/modelo-de-dados.md), [ADRs](docs/adr/).
