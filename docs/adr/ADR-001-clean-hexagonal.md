# ADR-001: Clean Architecture com Hexagonal

**Status:** aceito — 19/11/2026

## Contexto

O servidor depende de três APIs públicas instáveis (PNCP, BrasilAPI, IBGE) e de um protocolo novo (MCP, revisão 2026-07-28). Precisamos testar as regras de negócio (CNPJ, prazo, match) sem rede, trocar fontes de dados sem reescrever a lógica e manter um modo demonstração offline.

## Decisão

Organizar o código em `domain` (regras puras), `application` (casos de uso e portas) e `adapters` (MCP/HTTP na entrada; PNCP, BrasilAPI, IBGE, cache, logger, relógio na saída). Só `main.ts` conhece todas as camadas. Um teste automatizado (`test/unit/architecture/dependency-rules.test.ts`) lê os imports e falha se uma camada importar o que não deve.

## Consequências

- Domínio e casos de uso testados com fakes: cobertura ≈ 99% e testes rápidos.
- O modo demonstração é só outro conjunto de adaptadores de saída (`adapters/out/demo`).
- Mais arquivos e interfaces do que um script único; aceitável pelo ganho em testabilidade.
