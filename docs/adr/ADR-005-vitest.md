# ADR-005: Vitest como framework de testes

**Status:** aceito — 19/11/2026

## Contexto

Projeto em TypeScript ESM. Precisamos de testes unitários rápidos, cobertura por pasta, integração com `msw` e e2e que sobe processo filho.

## Decisão

Vitest 5 com cobertura V8 e limiar de 90% só em `src/domain` e `src/application`. `msw` para simular as APIs nos testes de integração. Configuração separada (`vitest.live.config.ts`) para testes contra as APIs reais, fora do CI.

## Consequências

- ESM e TypeScript sem etapa de build nos testes.
- `vitest related` no pre-commit roda só os testes afetados.
