# Roteiro de apresentação — Edital Match PB

Duração alvo: **7 minutos** (5 de pitch + demo, 2 de folga para perguntas).
Formato: fala + demo ao vivo no Claude Desktop (ou Claude Code) em modo demonstração.

## Preparação (antes de subir no palco)

- [ ] Cliente MCP configurado com `"args": ["tsx", "src/main.ts", "--demo"]` (funciona offline).
- [ ] Conversa nova aberta no cliente; fonte grande; notificações desligadas.
- [ ] Segunda configuração pronta para o modo real (sem `--demo`), caso a rede ajude.
- [ ] Terminal com `npm test` já executado (verde) para mostrar se perguntarem.
- [ ] Plano B: prints ou gravação da demo, caso o cliente MCP falhe.

## 1. Abertura — o problema (0:00–1:00)

> "Na Paraíba, prefeituras e órgãos publicam todo dia licitações que um MEI poderia vencer: marmitas, limpeza, manutenção, TI. Mas quase nenhum MEI participa."

- O Portal Nacional de Contratações Públicas (PNCP) é público, mas não foi feito para o pequeno empreendedor.
- Buscar exige conhecer códigos de modalidade, repetir consultas e ler objetos em linguagem administrativa.
- Resultado: a oportunidade existe, mas não chega a quem poderia aproveitá-la.

## 2. A solução (1:00–2:00)

> "O Edital Match PB leva essa busca para dentro do assistente de IA que o empreendedor já usa. Ele informa o CNPJ e recebe as licitações abertas que combinam com o negócio dele, explicadas."

Três ideias para fixar:

1. **Entrada mínima:** só o CNPJ. O servidor lê o CNAE principal e os secundários.
2. **Match explicado:** cada edital vem com score de 0 a 1 e o motivo (termos que coincidiram e CNAE de origem).
3. **Linguagem simples:** prazo em dias úteis (com feriados da PB), valor estimado e um checklist de documentos para quem nunca licitou.

Diferenciais: gratuito, sem chave de API, só dados públicos (PNCP, BrasilAPI, IBGE), nada gravado em disco.

## 3. Demo ao vivo (2:00–5:00)

Falar enquanto o assistente responde; não esperar em silêncio.

| Passo | Pergunta no cliente                                   | O que destacar                                                       |
| ----- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | "Qual o perfil do CNPJ 12.345.678/0001-95?"           | `perfil_empresa`: MEI de marmitas, situação ativa, CNAE lido.        |
| 2     | "Quais licitações combinam com essa empresa?"         | `match_editais`: ranking com score e motivo (`marmit`, `refeic`).    |
| 3     | "E para o CNPJ 34567890000130?"                       | Mesmo fluxo, empresa de TI: resultado totalmente diferente.          |
| 4     | "Detalhe o edital 10000000000303-1-000004/2026"       | `detalhar_edital`: prazo, valor estimado, próximo passo.             |
| 5     | Usar o prompt `resumo_para_mei` com o mesmo `id_pncp` | Edital em linguagem simples + checklist de documentos de habilitação. |
| 6     | "Quantos dias úteis faltam até 19/02/2027 na PB?"     | `dias_uteis_ate`: considera feriados nacionais e estaduais.          |

Se sobrar tempo e a rede estiver boa: trocar para o modo real e repetir o passo 2 com dados do PNCP.

Frase de transição:

> "Tudo isso que vocês viram é determinístico. Não tem LLM decidindo o match — e isso foi uma escolha."

## 4. Como funciona por dentro (5:00–6:15)

Mostrar um slide com o fluxo: **CNPJ → BrasilAPI (CNAEs) → termos por CNAE → editais abertos no PNCP → score + motivo**.

- **Match sem LLM (ADR-004):** CNAE vira termos de busca; termos são comparados com o objeto do edital (sem acento, por radical). CNAE principal pesa 1, secundário 0,5. Determinístico, testável e explicável.
- **Arquitetura limpa (ADR-001):** Clean Architecture + Hexagonal. Um teste de arquitetura impede o domínio de importar camadas externas.
- **Servidor MCP padrão:** 6 tools somente leitura, resources e um prompt. Roda em stdio (Claude Desktop, Claude Code, VS Code) ou Streamable HTTP via Docker.
- **Qualidade:** testes unitários, integração com respostas reais gravadas do PNCP, e2e via cliente MCP; CI com audit, lint, typecheck, cobertura, build Docker e SBOM.
- **Segurança e LGPD:** somente leitura, cache só em memória, CNPJ mascarado nos logs, quadro societário descartado, rate limit e validação de `Host`/`Origin` no modo HTTP.

## 5. Fechamento (6:15–7:00)

> "O PNCP já tem as oportunidades. O MEI já usa um assistente de IA. O Edital Match PB liga os dois: do CNPJ ao edital certo, explicado em linguagem simples."

Próximos passos (escolher dois para citar):

- Expandir feriados e cobertura para outras UFs.
- Alertas de novos editais compatíveis.
- Enriquecer o mapa CNAE → termos com dados de licitações vencidas.

Encerrar com: nome do projeto, link do repositório e "obrigado".

## Perguntas prováveis

| Pergunta                                   | Resposta curta                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| "Por que não usar LLM para o match?"       | Precisamos explicar cada resultado e testá-lo. Termos por CNAE são reproduzíveis; o LLM entra só no resumo. |
| "E os falsos positivos?"                   | Todo resultado traz o motivo; o usuário vê por que entrou. Score mínimo configurável (`MATCH_MIN_SCORE`). |
| "O PNCP aguenta?"                          | Há cache de 10 min e orçamento de 8 s por consulta; se o PNCP limitar (HTTP 429), a resposta vem parcial com aviso. |
| "Guarda dados da empresa?"                 | Não. Nada vai para disco; o cache é em memória e o CNPJ é mascarado nos logs.                           |
| "Funciona fora da Paraíba?"                | A busca aceita outras UFs; os feriados estaduais estão cadastrados só para a PB por enquanto.           |
| "Substitui um advogado ou contador?"       | Não. O match é informativo e não substitui a leitura do edital nem a análise jurídica.                  |
