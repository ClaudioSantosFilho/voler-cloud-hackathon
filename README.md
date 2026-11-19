# Edital Match PB

Servidor MCP (Model Context Protocol) em TypeScript que recebe o CNPJ de um MEI ou pequena empresa, lê o CNAE principal e os secundários e devolve licitações abertas na Paraíba (PNCP) compatíveis com o negócio, com prazo em dias úteis, valor estimado e o motivo de cada match.

> **Aviso legal:** o match é informativo e não substitui a leitura do edital nem a análise jurídica. Dados públicos de PNCP, BrasilAPI e IBGE; nada é gravado em disco.

## Sumário

- [Por que existe](#por-que-existe)
- [Início rápido](#início-rápido)
- [Configurar no cliente MCP](#configurar-no-cliente-mcp)
- [Tools, resources e prompt](#tools-resources-e-prompt)
- [Como o match funciona](#como-o-match-funciona)
- [Modo demonstração](#modo-demonstração)
- [Modo HTTP e Docker](#modo-http-e-docker)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Fontes de dados](#fontes-de-dados)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [CI/CD e release](#cicd-e-release)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Observabilidade](#observabilidade)
- [Limitações](#limitações)
- [Documentação](#documentação)

## Por que existe

MEIs e pequenas empresas raramente acompanham o PNCP. A busca exige conhecer códigos de modalidade, repetir consultas e ler objetos de compra em linguagem administrativa. O Edital Match PB leva essa busca para dentro do assistente de IA que o empreendedor já usa (Claude Desktop, Claude Code, VS Code): a partir do CNPJ, ranqueia os editais abertos por compatibilidade com o CNAE e explica por quê.

Diferenciais: gratuito, sem chave de API, ranqueamento por CNAE explicado (score 0–1 com os termos que coincidiram), prazo em dias úteis com feriados nacionais e estaduais, e um prompt que traduz o edital em checklist para quem nunca licitou.

## Início rápido

```bash
npm install && npm start
```

- Execução: Node.js 20 ou superior.
- Desenvolvimento e testes: Node.js 22.12 ou superior (versão em `.nvmrc`; Vitest 5 e MSW 3 exigem).
- Nenhuma chave de API é necessária.

## Configurar no cliente MCP

Claude Desktop / Claude Code (`claude_desktop_config.json` ou `.mcp.json`), usando a pasta do projeto como `cwd`:

```json
{
  "mcpServers": {
    "edital-match-pb": { "command": "npx", "args": ["tsx", "src/main.ts"], "cwd": "." }
  }
}
```

Depois de `npm run build`, também funciona com `"command": "node", "args": ["dist/main.js"]` ou pelo binário `edital-match-pb`.

Inspector: `npx @modelcontextprotocol/inspector npx tsx src/main.ts`

## Tools, resources e prompt

| Primitiva                | Exemplo de entrada                                              | O que faz                                                         | Cache                |
| ------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `perfil_empresa`         | `{ "cnpj": "12.345.678/0001-95" }`                              | Razão social, situação cadastral e CNAEs                          | 1 h                  |
| `buscar_editais_abertos` | `{ "uf": "PB", "municipio": "Patos", "palavras": ["limpeza"] }` | Editais com proposta aberta, filtrados por município e termos     | 10 min               |
| `match_editais`          | `{ "cnpj": "34567890000130", "incluir_baixo_score": false }`    | Editais ranqueados pelo CNAE da empresa, com `score` e `motivo`   | 10 min               |
| `detalhar_edital`        | `{ "id_pncp": "08761140000194-1-000180/2026" }`                 | Detalhe do edital, prazo, valor e próximo passo                   | 10 min               |
| `dias_uteis_ate`         | `{ "data": "2027-02-19", "uf": "PB" }`                          | Dias úteis até a data, com feriados nacionais e estaduais         | feriados: 24 h       |
| `ping`                   | `{}`                                                            | Verificação de vida do servidor                                   | —                    |
| resource                 | `pncp://modalidades`, `ibge://municipios/PB`                    | Tabela de modalidades e lista de municípios                       | estático / 24 h      |
| prompt                   | `resumo_para_mei` com `id_pncp`                                 | Resume o edital em linguagem simples, com checklist de documentos | usa cache do detalhe |

Todas as tools são somente leitura (`readOnlyHint: true`), validam entrada com Zod e devolvem texto legível + `structuredContent`. Erros voltam como `isError: true` com a fonte que falhou; nunca derrubam o servidor.

## Como o match funciona

1. `perfil_empresa` busca o CNPJ na BrasilAPI e valida os dígitos verificadores.
2. Cada CNAE é traduzido em termos de busca (`src/domain/matching/cnae-keywords.ts`).
3. Os termos são comparados com o objeto do edital, normalizados (sem acento, caixa baixa, por radical).
4. CNAE principal pesa 1; secundário pesa 0,5. O resultado é um `score` de 0 a 1.
5. Editais abaixo de `MATCH_MIN_SCORE` (padrão 0,2) ficam de fora, exceto com `incluir_baixo_score: true`.
6. Cada resultado traz o `motivo`: termos coincidentes e CNAE de origem.

O match não usa LLM (ADR-004): é determinístico, testável e explicável.

## Modo demonstração

Roda offline com fixtures fictícias (`test/fixtures/`), passando pelos mesmos mapeadores dos adaptadores reais:

```bash
npm run seed:demo
```

No cliente MCP: `"args": ["tsx", "src/main.ts", "--demo"]` ou `DEMO_MODE=true`.

Fixtures: 3 empresas (MEI de marmitas, MEI de limpeza, microempresa de TI) e 10 editais (7 abertos na PB, 2 vencidos, 1 em PE).

### Roteiro de demo (5 min)

1. `npm run seed:demo` no cliente MCP.
2. "Qual o perfil do CNPJ 12.345.678/0001-95?" → MEI de marmitas, sem CNAE secundário.
3. "Quais licitações combinam com essa empresa?" → `match_editais` com score e motivo (`marmit`, `refeic`).
4. Repita com `34567890000130` (TI) e `23456789000195` (limpeza).
5. "Detalhe o edital 10000000000303-1-000004/2026" e use o prompt `resumo_para_mei`.
6. Mostre `dias_uteis_ate` com feriados e, se a rede ajudar, troque para o modo real.

## Modo HTTP e Docker

stdio é o transporte principal (ADR-002). Para uso remoto, o servidor expõe Streamable HTTP:

| Rota           | Descrição                                             |
| -------------- | ----------------------------------------------------- |
| `POST /mcp`    | Endpoint MCP (Streamable HTTP, sem estado)            |
| `GET /health`  | Status do servidor, sem autenticação                  |
| `GET /metrics` | Chamadas por tool, erros por fonte, hit rate do cache |

```bash
TRANSPORT=http npm start      # local, em 127.0.0.1:3000
docker compose up             # imagem multi-stage, usuário não-root, read-only
```

Imagens publicadas no GHCR a cada tag `v*`: `ghcr.io/<owner>/<repo>:<tag>`.

Em produção, coloque um proxy reverso (Nginx, Cloudflare) com TLS e rate limit de borda na frente.

## Variáveis de ambiente

Todas opcionais; copie `.env.example` para `.env` só se quiser sobrescrever. A configuração é validada no início e falha com mensagem legível.

| Variável                | Padrão                                    | Descrição                                                 |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------- |
| `TRANSPORT`             | `stdio`                                   | `stdio` ou `http`                                         |
| `HOST`                  | `127.0.0.1`                               | Interface de escuta no modo http (`0.0.0.0` em contêiner) |
| `PORT`                  | `3000`                                    | Porta no modo http                                        |
| `PNCP_BASE_URL`         | `https://pncp.gov.br/api/consulta`        | API de Consulta do PNCP                                   |
| `BRASILAPI_BASE_URL`    | `https://brasilapi.com.br/api`            | BrasilAPI (CNPJ e feriados)                               |
| `IBGE_BASE_URL`         | `https://servicodados.ibge.gov.br/api/v1` | IBGE Localidades                                          |
| `HTTP_TIMEOUT_MS`       | `5000`                                    | Timeout por requisição externa                            |
| `CACHE_TTL_MS`          | `600000`                                  | TTL do cache de editais                                   |
| `PNCP_PAGE_SIZE`        | `50`                                      | Tamanho de página do PNCP (máx. aceito hoje: 50)          |
| `MATCH_MIN_SCORE`       | `0.2`                                     | Score mínimo do match (0–1)                               |
| `LOG_LEVEL`             | `info`                                    | `debug`, `info`, `warn` ou `error`                        |
| `RATE_LIMIT_PER_MINUTE` | `60`                                      | Requisições por IP por minuto no modo http                |
| `ALLOWED_HOSTS`         | `localhost,127.0.0.1`                     | Hosts aceitos (proteção contra DNS rebinding)             |
| `DEMO_MODE`             | `false`                                   | Usa fixtures em vez das APIs públicas                     |

## Arquitetura

Clean Architecture + Hexagonal (ADR-001). Dependências apontam para dentro; `src/main.ts` é o único composition root.

```
src/
├── domain/            Regras puras: CNPJ, CNAE, Edital, filtro, matching, dias úteis, erros
├── application/
│   ├── ports/in/      Contratos dos casos de uso
│   ├── ports/out/     Contratos de PNCP, CNPJ, calendário, municípios, cache, clock, logger
│   └── use-cases/     Orquestração + cache (ConsultarEmpresa, MatchEditais, DetalharEdital…)
├── adapters/
│   ├── in/mcp/        Tools, resources, prompt, schemas Zod, métricas
│   ├── in/http/       Servidor HTTP, rate limiter, limites de corpo e timeout
│   └── out/           PNCP, BrasilAPI, IBGE, MemoryCache, StderrLogger, SystemClock, Demo
├── config/env.ts      Validação das variáveis de ambiente
└── main.ts            Composition root: escolhe portas reais ou demo e o transporte
```

Um teste de arquitetura (`test/unit/architecture`) impede que o domínio importe camadas externas.

Decisões registradas em [docs/adr/](docs/adr/):

| ADR | Decisão                                             |
| --- | --------------------------------------------------- |
| 001 | Clean Architecture com Hexagonal                    |
| 002 | SDK MCP v2 e stdio primeiro, Streamable HTTP depois |
| 003 | Cache apenas em memória, sem banco de dados         |
| 004 | Match por similaridade de termos, sem LLM           |
| 005 | Vitest como framework de testes                     |
| 006 | Husky com Conventional Commits                      |

## Fontes de dados

| Fonte                  | Uso                                             |
| ---------------------- | ----------------------------------------------- |
| PNCP — API de Consulta | Editais com proposta aberta e detalhe do edital |
| BrasilAPI — CNPJ       | Razão social, situação cadastral, CNAEs         |
| BrasilAPI — Feriados   | Feriados nacionais por ano                      |
| IBGE — Localidades     | Municípios por UF                               |

Feriados estaduais da PB ficam no domínio. O PNCP exige consulta por modalidade, devolve 204 em página vazia e datas sem fuso (horário de Brasília); os adaptadores tratam esses casos.

## Desenvolvimento

| Comando              | O que faz                                      |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Servidor com recarga (`tsx watch`)             |
| `npm start`          | Servidor via `tsx`                             |
| `npm run build`      | Compila para `dist/`                           |
| `npm run start:prod` | Roda `dist/main.js`                            |
| `npm run seed:demo`  | Servidor em modo demonstração                  |
| `npm run lint`       | ESLint                                         |
| `npm run format`     | Prettier (escrita); `format:check` só verifica |
| `npm run typecheck`  | `tsc --noEmit`                                 |

Git hooks (Husky, ADR-006):

- `pre-commit`: `lint-staged` roda Prettier, ESLint e os testes relacionados aos arquivos alterados.
- `commit-msg`: `commitlint` exige [Conventional Commits](https://www.conventionalcommits.org/).

## Testes

Vitest (ADR-005) com MSW para simular as APIs HTTP.

| Comando                    | Escopo                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `npm test`                 | Todos, exceto `live`                                        |
| `npm run test:unit`        | Domínio, aplicação, adaptadores, config e arquitetura       |
| `npm run test:integration` | Adaptadores contra respostas gravadas, MCP e HTTP           |
| `npm run test:e2e`         | Sobe o servidor em stdio e conversa via cliente MCP         |
| `npm run test:coverage`    | Unitários com cobertura (meta ≥ 90% em domínio e aplicação) |
| `npm run test:live`        | APIs reais (fora do CI; depende de rede)                    |

Respostas reais gravadas ficam em `test/fixtures/recorded/` e servem de teste de contrato dos mapeadores.

## CI/CD e release

- **CI** (`.github/workflows/ci.yml`, push e PR):
  - `quality`: `npm audit`, checagem de licenças, Prettier, ESLint, typecheck, cobertura e integração.
  - `build`: build, `docker build` e SBOM SPDX.
  - `e2e`: testes ponta a ponta em stdio.
- **Release** (`.github/workflows/release.yml`, tag `v*`): testes, imagem no GHCR, SBOM, changelog por Conventional Commits e GitHub Release.
- Actions de terceiros pinadas por SHA; imagem base pinada por digest; Dependabot atualiza ambos.

## Segurança e privacidade

- Somente leitura: o cliente HTTP só faz `GET`; nenhuma tool altera estado externo.
- Nada persiste em disco; o cache é só em memória (ADR-003).
- CNPJ mascarado nos logs; o quadro societário (`qsa`) da BrasilAPI é descartado.
- Mensagens de erro de validação não ecoam a entrada.
- Modo http:
  - rate limit por IP com janela deslizante (429 + `Retry-After`);
  - corpo limitado a 32 KB (413);
  - `requestTimeout` 30 s e `headersTimeout` 10 s;
  - `Host` e `Origin` validados contra `ALLOWED_HOSTS` (403).
- Contêiner: usuário `node`, sistema de arquivos read-only, `no-new-privileges`, porta publicada só em `127.0.0.1`.

## Observabilidade

- Logs JSON em stderr (stdout é o canal do protocolo no stdio): `timestamp`, `level`, `message`, `tool`, `durationMs`, `source`, `status`, `requestId`.
- `GET /metrics`: `callsByTool`, `errorsBySource`, `cache.{hits,misses,hitRate}`.
- Healthcheck do Docker usa `GET /health`.

## Limitações

- O PNCP limita a taxa de requisições (HTTP 429): a consulta de uma UF tem orçamento de 8 s e pode voltar parcial, com aviso.
- Match por termos: pode haver falsos positivos/negativos; veja o `motivo`.
- Feriados estaduais cadastrados só para PB; municipais não são considerados.
- Fixtures de demo têm editais abertos até fev–abr/2027.
- Modo demo não está disponível na imagem Docker (fixtures ficam em `test/`).

## Documentação

- [Especificação completa](docs/especificacao.md): regras de negócio, requisitos, conformidade legal (LGPD), riscos e plano de entregas.
- [Modelo de dados](docs/modelo-de-dados.md)
- [ADRs](docs/adr/)

## Licença

MIT
