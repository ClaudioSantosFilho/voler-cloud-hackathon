# ADR-006: Husky com Conventional Commits

**Status:** aceito — 19/11/2026

## Contexto

Queremos histórico legível por etapa, changelog automático no release e impedir commits que quebrem lint ou testes.

## Decisão

Husky com `pre-commit` (lint-staged: Prettier, ESLint, `vitest related`) e `commit-msg` (commitlint `config-conventional`). Uma branch por etapa, mesclada com `--no-ff`.

## Consequências

- O changelog do release sai dos commits (`conventional-changelog`).
- Commits "vermelhos" de TDD são barrados pelo hook; cada commit leva teste e implementação juntos (ver seção 11 do documento).
