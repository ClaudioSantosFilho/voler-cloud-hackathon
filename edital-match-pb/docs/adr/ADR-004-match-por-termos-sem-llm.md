# ADR-004: Match por similaridade de termos, sem LLM

**Status:** aceito — 19/11/2026

## Contexto

O match precisa ser explicável ao empreendedor, reprodutível em teste e gratuito. O próprio cliente MCP já é um LLM e pode refinar a análise depois.

## Decisão

Dicionário CNAE → radicais (36 atividades comuns de MEI) com fallback para termos da descrição do CNAE. Score = soma dos pesos dos termos únicos encontrados no objeto (principal 1, secundário 0,5) ÷ 2, limitado a 1. O `motivo` lista cada termo e o CNAE de origem. Limiar `MATCH_MIN_SCORE` (padrão 0,2).

## Consequências

- Determinístico, custo zero e testável com fixtures.
- Falsos positivos com termos genéricos e falsos negativos com sinônimos fora do dicionário. Mitigação: motivo explícito, limiar configurável, `incluir_baixo_score` e evolução do dicionário.
