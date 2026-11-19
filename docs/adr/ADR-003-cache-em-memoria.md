# ADR-003: Cache apenas em memória, sem banco de dados

**Status:** aceito — 19/11/2026

## Contexto

Os dados vêm de APIs públicas e mudam ao longo do dia. O PNCP aplica limite de taxa (HTTP 429). Persistir dados de empresas aumentaria a superfície LGPD sem ganho para um servidor de consulta.

## Decisão

`MemoryCache` com TTL por chave e limite de entradas: CNPJ 1 h, editais 10 min (`CACHE_TTL_MS`), feriados e municípios 24 h. Falhas e resultados parciais não são cacheados. Nada é escrito em disco.

## Consequências

- Reinício limpa o cache; a primeira consulta de cada UF paga o custo do PNCP.
- Várias réplicas não compartilham cache. Se precisar escalar, trocar o adaptador `Cache` (ex.: Redis) sem mudar casos de uso.
