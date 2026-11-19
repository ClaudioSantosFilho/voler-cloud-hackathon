# Edital Match PB — Documento do projeto

Servidor MCP (Model Context Protocol) em TypeScript que recebe o CNPJ de um MEI ou pequena empresa, lê suas atividades (CNAE) e devolve licitações abertas na Paraíba compatíveis com o negócio, com prazo, valor e o motivo de cada match.

> O match é informativo e não substitui a leitura do edital nem a análise jurídica.

---

## 1. Introdução

MEIs e pequenas empresas raramente acompanham o PNCP (Portal Nacional de Contratações Públicas). Buscar licitações por modalidade, UF, município e atividade exige conhecer códigos, repetir consultas por modalidade e ler objetos de compra escritos em linguagem administrativa. Na prática, quem mais poderia se beneficiar das compras públicas de pequeno valor (dispensas, pregões de bairro) não fica sabendo delas a tempo.

O Edital Match PB centraliza essa busca dentro do assistente de IA que o empreendedor já usa (Claude Desktop, Claude Code, VS Code). A partir do CNPJ, o servidor descobre o CNAE principal e os secundários, consulta os editais com proposta aberta na Paraíba e os ranqueia por compatibilidade, explicando quais termos coincidiram e quantos dias úteis restam.

## 2. Análise dos documentos de origem

### 2.1 Documentação do MCP (versão 2026-07-28)

Fonte: <https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro> e documentação do SDK TypeScript v2 (<https://ts.sdk.modelcontextprotocol.io/v2/>).

| Ponto da documentação                                                                                                                                                              | Decisão técnica derivada                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| O MCP padroniza a conexão de aplicações de IA a dados e ferramentas; o host lança servidores locais como processo filho                                                            | **stdio é o transporte principal** (ADR-002): funciona em Claude Desktop/Code e VS Code sem rede exposta                                             |
| Transporte remoto é o Streamable HTTP, em um único endpoint                                                                                                                        | `POST /mcp` via `createMcpHandler` do SDK v2; `GET /health` e `GET /metrics` fora do protocolo                                                       |
| Primitivas do servidor: **tools** (ações chamadas pelo modelo), **resources** (dados de contexto endereçados por URI) e **prompts** (modelos de interação escolhidos pelo usuário) | 5 tools de consulta + `ping`; resources `pncp://modalidades` e `ibge://municipios/PB`; prompt `resumo_para_mei`                                      |
| Tools podem declarar `outputSchema` e devolver `structuredContent`; erros de execução vão em `isError: true`                                                                       | Toda tool devolve texto legível **e** `structuredContent` validado por Zod; erros nunca derrubam o servidor (RF09)                                   |
| `annotations.readOnlyHint` informa ao host que a tool não altera o mundo                                                                                                           | Todas as tools declaram `readOnlyHint: true` (RF10, RN08)                                                                                            |
| A revisão 2026-07-28 trata cada requisição sem estado de sessão; o handler do SDK cria uma instância por requisição a partir de uma fábrica                                        | `createMcpServerFactory` monta um `McpServer` por conexão stdio ou por requisição HTTP. Nenhum estado de sessão; só o cache compartilhado em memória |
| No transporte stdio, stdout é o canal do protocolo                                                                                                                                 | Logger escreve **somente em stderr** (RNF06)                                                                                                         |
| Recomendação de segurança: validar `Host`/`Origin` contra DNS rebinding em servidores HTTP                                                                                         | `validateHostHeader`/`validateOriginHeader` do SDK com allowlist `ALLOWED_HOSTS`                                                                     |
| `sendLoggingMessage` foi depreciado nesta revisão em favor de stderr/OpenTelemetry                                                                                                 | Não usamos logging pelo protocolo; logs estruturados em stderr                                                                                       |

### 2.2 Fontes de dados

| Fonte                  | Uso                                                                                                           | URL base                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| PNCP — API de Consulta | Editais com proposta aberta (`/v1/contratacoes/proposta`) e detalhe (`/v1/orgaos/{cnpj}/compras/{ano}/{seq}`) | <https://pncp.gov.br/api/consulta> (Swagger: <https://pncp.gov.br/api/consulta/swagger-ui/index.html>) |
| BrasilAPI — CNPJ       | Razão social, situação cadastral, CNAEs                                                                       | <https://brasilapi.com.br/api/cnpj/v1/{cnpj}>                                                          |
| BrasilAPI — Feriados   | Feriados nacionais por ano                                                                                    | <https://brasilapi.com.br/api/feriados/v1/{ano}>                                                       |
| IBGE — Localidades     | Municípios por UF                                                                                             | <https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios>                          |

Observações levantadas ao testar as APIs reais (19/11/2026):

- O endpoint de propostas do PNCP **exige** `codigoModalidadeContratacao`; é preciso consultar modalidade por modalidade.
- `tamanhoPagina=500` retorna HTTP 400; o limite atual é **50** (risco documentado na seção 26).
- Página vazia retorna **HTTP 204** sem corpo.
- Datas vêm em horário de Brasília **sem fuso** (`2026-11-26T09:00:00`).
- O PNCP aplica **limite de taxa (HTTP 429)** quando recebe rajadas de requisições.

## 3. Referências de mercado

| Alternativa                                                                                                                     | Como funciona                                                             | Limitação para o MEI                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Radares de licitação por assinatura (ex.: ConLicitação, Effecti)                                                                | Alertas por palavra-chave, painel web                                     | Pagos, exigem configurar palavras-chave manualmente, fora do assistente de IA                                                   |
| Portal PNCP                                                                                                                     | Busca oficial                                                             | Filtros técnicos (modalidade, órgão), sem relação com o CNAE da empresa                                                         |
| MCPs brasileiros existentes (listas `awesome-mcp-brasil`; repositórios como `pncp-mcp`, `licinexus-mcp`, `mcp-licitacoes-pncp`) | Expõem consultas ao PNCP e a outros dados públicos para assistentes de IA | Pela descrição pública dos repositórios, o foco é **busca** de contratações; não verificamos a fundo se algum ranqueia por CNAE |

**Diferencial do Edital Match PB:** gratuito, sem chave de API, e com **ranqueamento por CNAE explicado** (score 0–1 e lista dos termos que coincidiram, com o CNAE de origem), prazo em **dias úteis** com feriados nacionais e estaduais, e um prompt que traduz o edital em checklist para quem nunca participou de licitação.

## 4. Visão geral da solução

```
┌──────────────────────────────┐
│ Cliente MCP                  │  Claude Desktop / Claude Code / VS Code / Inspector
└──────────────┬───────────────┘
               │ stdio (principal)  ou  Streamable HTTP (POST /mcp)
┌──────────────▼───────────────┐
│ Adaptador de entrada MCP     │  src/adapters/in/mcp  (+ src/adapters/in/http)
│ tools · resources · prompts  │  validação Zod, mapeamento de erro, logs, métricas
└──────────────┬───────────────┘
               │ portas de entrada (interfaces)
┌──────────────▼───────────────┐
│ Casos de uso                 │  src/application/use-cases
│ ConsultarEmpresa, Buscar...  │  orquestram domínio + portas de saída, cache
└───────┬──────────────┬───────┘
        │ domínio puro │ portas de saída (interfaces)
┌───────▼──────┐ ┌─────▼──────────────────────────────────────────┐
│ src/domain   │ │ Adaptadores de saída                           │
│ CNPJ, Edital │ │ PNCP · BrasilAPI (CNPJ, feriados) · IBGE        │
│ matching,    │ │ MemoryCache · StderrLogger · SystemClock · Demo │
│ dias úteis   │ └────────────────────────────────────────────────┘
└──────────────┘
```

## 5. Regras de negócio

| Regra                                                              | Implementação                                     | Teste                                     |
| ------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------- |
| RN01 CNPJ com 14 dígitos e DV válidos                              | `domain/empresa/cnpj.ts` (`Cnpj.parse`)           | `test/unit/domain/cnpj.test.ts`           |
| RN02 só propostas abertas (encerramento ≥ agora)                   | `domain/edital/edital.ts` (`isPropostaAberta`)    | `edital.test.ts`, `filtro.test.ts`        |
| RN03 busca restrita à UF (padrão PB)                               | `domain/edital/filtro.ts`, `ufInput`              | `filtro.test.ts`                          |
| RN04 CNAE principal pesa mais                                      | `domain/matching/matcher.ts` (peso 1 × 0,5)       | `matcher.test.ts`                         |
| RN05 `score` 0–1 e `motivo`                                        | `matcher.ts`                                      | `matcher.test.ts`                         |
| RN06 limiar configurável, exceção explícita                        | `MATCH_MIN_SCORE`, `incluir_baixo_score`          | `match-editais.test.ts`                   |
| RN07 prazo em data e dias úteis com feriados nacionais e estaduais | `domain/calendario/dias-uteis.ts`, `PrazoService` | `dias-uteis.test.ts`, `consultas.test.ts` |
| RN08 somente leitura                                               | `HttpClient` só faz GET; `readOnlyHint`           | `ping.test.ts` (todas as tools)           |
| RN09 falha de API informa a fonte                                  | `SourceUnavailableError(source)`, `errorMessage`  | testes de adaptador e de tool             |

## 6. Requisitos funcionais

| Req. | Primitiva MCP                                                                                | Arquivo                                   |
| ---- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| RF01 | tool `perfil_empresa(cnpj)`                                                                  | `adapters/in/mcp/tools/perfil-empresa.ts` |
| RF02 | tool `buscar_editais_abertos(uf, municipio?, palavras?, ate_data?, pagina?)` — 20 por página | `tools/buscar-editais-abertos.ts`         |
| RF03 | tool `match_editais(cnpj, uf?, incluir_baixo_score?, limite?)`                               | `tools/match-editais.ts`                  |
| RF04 | tool `detalhar_edital(id_pncp)`                                                              | `tools/detalhar-edital.ts`                |
| RF05 | tool `dias_uteis_ate(data, uf?)`                                                             | `tools/dias-uteis-ate.ts`                 |
| RF06 | resource `pncp://modalidades`                                                                | `resources/referencias.ts`                |
| RF07 | resource `ibge://municipios/PB`                                                              | `resources/referencias.ts`                |
| RF08 | prompt `resumo_para_mei(id_pncp)`                                                            | `prompts/resumo-para-mei.ts`              |
| RF09 | `content` + `structuredContent`; `isError` com mensagem legível                              | `tool-runner.ts`                          |
| RF10 | `annotations.readOnlyHint: true`                                                             | `schemas.ts` (`READ_ONLY`)                |

## 7. Requisitos não funcionais

| Req.                                         | Como é atendido                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF01 desempenho (≤ 10 s por UF)             | Cache em memória (`CACHE_TTL_MS`, 10 min); consulta ao PNCP com **orçamento de 8 s**, concorrência 3 e modalidades mais acessíveis a MEI primeiro; ao estourar, devolve resultado parcial com aviso. Medido com a API real: ~8 s com aviso de parcialidade sob limite de taxa |
| RNF02 resiliência                            | `HttpClient`: timeout por chamada (`HTTP_TIMEOUT_MS`), 2 novas tentativas com backoff exponencial para 5xx, 429 e erro de rede                                                                                                                                                |
| RNF03 confiabilidade                         | Falha em uma modalidade ou página vira aviso; feriados indisponíveis viram aviso e o cálculo segue só com fins de semana                                                                                                                                                      |
| RNF04 cobertura ≥ 90% em domínio e aplicação | Limiar configurado no `vitest.config.ts`; atual ≈ 99% linhas                                                                                                                                                                                                                  |
| RNF05 portabilidade                          | Node ≥ 20 (`engines`, `.nvmrc`); desenvolvido em Windows; CI em Linux                                                                                                                                                                                                         |
| RNF06 observabilidade                        | JSON em stderr com `timestamp`, `level`, `tool`, `durationMs`, `source`, `status`, `requestId`                                                                                                                                                                                |
| RNF07 segurança                              | Sem segredos; Zod em todas as entradas (tools, prompt, env)                                                                                                                                                                                                                   |
| RNF08 demo sem configuração                  | `npm install` + `npm start`; `npm run seed:demo` funciona offline                                                                                                                                                                                                             |

## 8. Conformidade legal e regulatória

- Dados de CNPJ e de licitações são públicos. O sistema **não persiste nada em disco**; o cache é só em memória e expira.
- **LGPD:** o quadro societário (`qsa`) da BrasilAPI é descartado no adaptador (o schema Zod não o lê). Logs mascaram o CNPJ (`maskCnpj`: mantém só os 4 primeiros dígitos).
- **Lei 14.133/2021:** a tabela de modalidades segue a lei; a lista de documentos de habilitação do prompt cita os arts. 62 a 70 e é marcada como orientativa.
- **Termos de uso:** consultas somente leitura, com cache e `User-Agent` identificando o cliente, para não sobrecarregar PNCP e BrasilAPI.
- **Atribuição de fonte:** toda resposta lista `fontes` (PNCP, BrasilAPI, IBGE). No modo demonstração a fonte é marcada como "(modo demonstração)".
- **Aviso legal** no README, na tool `match_editais` e no prompt.

## 9. Arquitetura (Clean + Hexagonal)

```
src/
  domain/            cnpj, cnae, empresa, edital, filtro, modalidades, documentos,
                     matching (dicionário CNAE, matcher, texto), calendario (dias úteis)
  application/
    ports/in/        ConsultarEmpresa, BuscarEditaisAbertos, MatchEditais, DetalharEdital, ...
    ports/out/       EditalRepository, CnpjGateway, CalendarioGateway, MunicipioGateway,
                     Cache, Clock, Logger
    use-cases/       um arquivo por caso de uso + PrazoService, EditaisLoader, cached()
    build-use-cases.ts  monta os casos de uso a partir das portas
  adapters/
    in/mcp/          tools, resources, prompts, tool-runner (erros/logs/métricas)
    in/http/         Streamable HTTP, rate limit, Host/Origin, health, metrics
    out/pncp/        cliente e mapeador do PNCP
    out/brasilapi/   CNPJ e feriados
    out/ibge/        municípios
    out/http/        HttpClient (timeout, retry, User-Agent)
    out/cache/       MemoryCache
    out/logger/      StderrLogger
    out/clock/       relógio do sistema
    out/demo/        portas lidas das fixtures (modo demonstração)
  config/            env.ts (Zod)
  main.ts            composition root
```

Regra de dependência verificada automaticamente em `test/unit/architecture/dependency-rules.test.ts`: `domain` não importa nada de fora (nem pacotes, nem `node:*`); `application` só importa `domain`; `adapters` importam `application`/`domain`; só `main.ts` conhece todas as camadas.

## 10. SOLID aplicado

| Princípio                       | Exemplo no código                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — responsabilidade única  | `MatchEditaisUseCase` só orquestra: empresa vem de `ConsultarEmpresa`, editais de `EditaisLoader`, prazo de `PrazoService`, score de `rankMatches` (domínio). Nenhum HTTP. |
| **O** — aberto para extensão    | Nova fonte de editais = nova classe que implementa `EditalRepository` (ex.: `DemoEditais` em `adapters/out/demo`). Casos de uso não mudam.                                 |
| **L** — substituição            | `PncpEditalRepository`, `DemoEditais` e `FakeEditalRepository` (testes) são intercambiáveis; os mesmos casos de uso rodam com qualquer um.                                 |
| **I** — interfaces pequenas     | `CnpjGateway`, `CalendarioGateway` e `MunicipioGateway` são portas separadas, mesmo que duas usem a BrasilAPI.                                                             |
| **D** — inversão de dependência | Casos de uso recebem interfaces no construtor; só `main.ts` instancia `HttpClient`, `PncpEditalRepository` etc.                                                            |

## 11. TDD e estratégia de testes

- **Ciclo:** os testes de cada etapa foram escritos antes do código e executados em vermelho (ex.: etapa 2 falhou com "Cannot find module" antes da implementação), depois verde e refatoração. O Husky roda os testes relacionados no `pre-commit`, então um commit "vermelho" isolado é bloqueado por design; por isso cada commit traz teste e implementação juntos e o histórico mostra a ordem por etapa (`test`/`feat`/`fix`).
- **Pirâmide:** unitários de domínio e casos de uso com fakes (`test/unit`), integração dos adaptadores com `msw` e do adaptador MCP com cliente em memória (`test/integration`), e e2e que sobe `src/main.ts` via stdio e conversa pelo cliente oficial do SDK (`test/e2e`).
- **APIs reais:** `test/live` roda com `npm run test:live` (config separada, fora do CI).
- **Casos obrigatórios cobertos:** CNPJ inválido, CNPJ inexistente, API fora do ar, resposta vazia (204), paginação, editais vencidos, feriado no cálculo de dias úteis, empresa sem CNAE secundário.
- **Determinismo:** relógio é uma porta (`Clock`); testes usam `fixedClock('2026-11-19T12:00:00-03:00')`.

## 12. Qualidade de código

- TypeScript `strict` + `noUncheckedIndexedAccess`; nenhum `any`.
- ESLint (`typescript-eslint` strict) + Prettier; `complexity: 10`, `max-depth: 3`, `no-console`.
- Funções pequenas; comentários só para o "porquê".

## 13. Git, commits e Husky

- Repositório git dentro da pasta do projeto, uma branch por etapa (`feat/etapa-N-...`) mesclada com `--no-ff` na `main`.
- Conventional Commits validados por commitlint (`commit-msg`); `pre-commit` roda Prettier, ESLint e `vitest related` via lint-staged.

## 14. Ambiente de execução

Node ≥ 20, ES modules, `@modelcontextprotocol/server` 2.x (SDK v2), `zod` v4, `tsx`. Scripts: `dev`, `build`, `start`, `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`, `test:live`, `lint`, `format`, `typecheck`, `seed:demo`.

## 15. Variáveis de ambiente

Ver `.env.example`. Todas validadas com Zod em `src/config/env.ts`; valor inválido encerra o processo com mensagem clara (ex.: `Configuração inválida: MATCH_MIN_SCORE: Too big`).

| Variável                | Padrão                                    |
| ----------------------- | ----------------------------------------- |
| `TRANSPORT`             | `stdio`                                   |
| `PORT` / `HOST`         | `3000` / `127.0.0.1`                      |
| `PNCP_BASE_URL`         | `https://pncp.gov.br/api/consulta`        |
| `BRASILAPI_BASE_URL`    | `https://brasilapi.com.br/api`            |
| `IBGE_BASE_URL`         | `https://servicodados.ibge.gov.br/api/v1` |
| `HTTP_TIMEOUT_MS`       | `5000`                                    |
| `CACHE_TTL_MS`          | `600000`                                  |
| `PNCP_PAGE_SIZE`        | `50`                                      |
| `MATCH_MIN_SCORE`       | `0.2`                                     |
| `LOG_LEVEL`             | `info`                                    |
| `RATE_LIMIT_PER_MINUTE` | `60`                                      |
| `ALLOWED_HOSTS`         | `localhost,127.0.0.1`                     |
| `DEMO_MODE`             | `false`                                   |

## 16. Docker

`Dockerfile` multi-stage: build com dependências de dev → runtime `node:20-alpine` **pinado por digest**, `npm ci --omit=dev`, usuário `node` (não-root), `HEALTHCHECK` em `/health`, transporte http. `docker-compose.yml` publica só em `127.0.0.1`, com `read_only` e `no-new-privileges`. `.dockerignore` exclui `node_modules`, `.git`, `.env`, `test`.

## 17. Proteção contra DDoS e abuso (modo http)

- Rate limit por IP com janela deslizante (`RATE_LIMIT_PER_MINUTE`) → 429 + `Retry-After`.
- Corpo limitado a 32 KB (413), no `Content-Length`, no adaptador Node e no handler do SDK.
- `requestTimeout` 30 s e `headersTimeout` 10 s no servidor.
- `Host` e `Origin` validados contra `ALLOWED_HOSTS` (DNS rebinding) → 403.
- Cache evita que o servidor amplifique tráfego para PNCP/BrasilAPI.
- Em produção: proxy reverso (Nginx, Cloudflare) na frente, com TLS e rate limit de borda.

## 18. Mapeamento de rotas

| Tipo     | Identificador            | Caso de uso          | Cache                       |
| -------- | ------------------------ | -------------------- | --------------------------- |
| tool     | `perfil_empresa`         | ConsultarEmpresa     | 1 h                         |
| tool     | `buscar_editais_abertos` | BuscarEditaisAbertos | 10 min                      |
| tool     | `match_editais`          | MatchEditais         | 10 min                      |
| tool     | `detalhar_edital`        | DetalharEdital       | 10 min                      |
| tool     | `dias_uteis_ate`         | CalcularDiasUteis    | sem cache (feriados: 24 h)  |
| resource | `pncp://modalidades`     | ListarModalidades    | estático                    |
| resource | `ibge://municipios/PB`   | ListarMunicipios     | 24 h                        |
| prompt   | `resumo_para_mei`        | GerarResumoMei       | usa cache do DetalharEdital |

HTTP: `POST /mcp` (Streamable HTTP), `GET /health` (sem autenticação, só status), `GET /metrics`.

## 19. Modelo de dados

Ver [modelo-de-dados.md](modelo-de-dados.md).

## 20. Seed

- `test/fixtures/empresas.json`: 3 empresas fictícias no formato da BrasilAPI (MEI de marmitas sem CNAE secundário, MEI de limpeza, microempresa de TI), com `qsa` fictício para provar que o adaptador o descarta.
- `test/fixtures/editais-pncp.json`: 10 editais fictícios no formato do PNCP — 7 abertos na PB, 2 vencidos (2025) e 1 em PE.
- `test/fixtures/recorded/`: respostas reais gravadas (PNCP, BrasilAPI CNPJ de órgão público, feriados 2026/2027, municípios da PB) usadas nos testes de contrato.
- `npm run seed:demo` sobe o servidor em **modo demonstração**: as fixtures são carregadas em memória e passam pelos mesmos mapeadores dos adaptadores reais. Nada é escrito em disco.

## 21. Observabilidade

- Log por chamada de tool e por requisição HTTP, JSON em stderr: `timestamp`, `level`, `message`, `tool`, `durationMs`, `source`, `status`, `requestId`.
- `GET /metrics`: `callsByTool`, `errorsBySource`, `cache.{hits,misses,hitRate}`.
- Sem dados pessoais nos logs: CNPJ mascarado; mensagens de erro de validação não ecoam a entrada.

## 22. CI/CD

`.github/workflows/ci.yml` (push e pull request):

- `quality`: `npm ci`, `npm audit --audit-level=high --omit=dev`, checagem de licenças, Prettier, ESLint, typecheck, testes unitários com cobertura (≥ 90% em domínio e aplicação) e integração.
- `build`: `npm run build`, `docker build`, SBOM SPDX com Syft (`anchore/sbom-action`).
- `e2e`: sobe o servidor em stdio e roda `test/e2e`.

`.github/workflows/release.yml`: tag `v*` → testes, changelog por Conventional Commits, imagem publicada no GHCR, SBOM e GitHub Release.

> Os workflows ficam em `.github/` **dentro da pasta do projeto**. O GitHub só os executa se esta pasta for a raiz do repositório remoto.

## 23. Segurança da cadeia de suprimentos

`package-lock.json` versionado e `npm ci`; `npm audit` no CI; Dependabot para npm, Docker e Actions; imagem base pinada por digest; SBOM com Syft; licenças de produção restritas a MIT, Apache-2.0, BSD, ISC (e 0BSD/BlueOak, equivalentes permissivas).

## 24. ADRs

Ver [adr/](adr/).

## 25. Plano de entregas

| Etapa | Entrega                                            | Branch                                  |
| ----- | -------------------------------------------------- | --------------------------------------- |
| 1     | Esqueleto, tool `ping`, lint/test/typecheck, Husky | `main` (commit inicial)                 |
| 2     | Domínio: CNPJ, dias úteis, entidades               | `feat/etapa-2-dominio`                  |
| 3     | BrasilAPI (CNPJ) + `perfil_empresa`                | `feat/etapa-3-perfil-empresa`           |
| 4     | PNCP + `buscar_editais_abertos`, paginação de 50   | `feat/etapa-4-buscar-editais`           |
| 5     | `match_editais` + dicionário CNAE (36 atividades)  | `feat/etapa-5-match`                    |
| 6     | Detalhe, resources, prompt, `dias_uteis_ate`       | `feat/etapa-6-detalhe-resources-prompt` |
| 7     | e2e via cliente MCP, Inspector, modo demo          | `feat/etapa-7-e2e`                      |
| 8     | Streamable HTTP, rate limit, healthcheck, Docker   | `feat/etapa-8-http-docker`              |
| 9     | Documentação                                       | `docs/etapa-9-documentacao`             |

## 26. Riscos

| Risco                                                              | Prob.            | Impacto | Mitigação                                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APIs públicas instáveis ou fora do ar na demo                      | Média            | Alto    | Cache, resposta parcial com aviso, `npm run seed:demo` offline, vídeo de backup                                                                               |
| **Limite de taxa do PNCP (HTTP 429)** — observado nos testes reais | Alta             | Médio   | 429 com retry e backoff, concorrência 3, orçamento de tempo, cache de 10 min                                                                                  |
| Divergência do limite de página do PNCP (500 ou 50)                | Média            | Médio   | `PNCP_PAGE_SIZE` (padrão 50, verificado: 500 → HTTP 400) e teste de contrato com resposta gravada                                                             |
| Falsos positivos no match (ex.: "sistema", "obra")                 | Alta             | Médio   | Score e motivo explícitos, limiar configurável, termos genéricos removidos do dicionário                                                                      |
| Mudança de formato das respostas do PNCP                           | Baixa            | Alto    | Zod nos adaptadores; itens inválidos descartados com aviso; teste de contrato com fixtures gravadas                                                           |
| Cliente MCP do avaliador sem suporte à revisão 2026-07-28          | Média            | Alto    | SDK v2 atende clientes da era 2025 pelo mesmo servidor (`serveStdio` com `legacy: 'serve'` por padrão); testado com o Inspector; stdio como caminho principal |
| Datas de encerramento em formato inconsistente                     | Média            | Médio   | `normalizePncpDate` na fronteira (sem fuso, só data, com espaço, com offset); datas inválidas descartadas com aviso                                           |
| Fixtures do modo demo vencem com o tempo                           | Certa (fev/2027) | Baixo   | Datas abertas em 2027; atualizar `editais-pncp.json` antes da apresentação                                                                                    |
