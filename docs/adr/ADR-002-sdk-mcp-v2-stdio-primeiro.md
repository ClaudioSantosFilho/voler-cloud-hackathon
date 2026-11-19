# ADR-002: SDK MCP v2 e transporte stdio primeiro, Streamable HTTP depois

**Status:** aceito — 19/11/2026

## Contexto

A revisão 2026-07-28 do MCP e o SDK TypeScript v2 (`@modelcontextprotocol/server`) tratam requisições sem estado de sessão e servem clientes da era 2025 pelo mesmo servidor. Os hosts mais comuns (Claude Desktop, Claude Code, VS Code) lançam servidores locais por stdio. O HTTP só é necessário para hospedagem remota.

## Decisão

- Usar o SDK v2 (`McpServer`, `serveStdio`, `createMcpHandler`) com uma **fábrica** de servidor (`createMcpServerFactory`): uma instância por conexão stdio ou por requisição HTTP.
- Entregar stdio primeiro (etapas 1–7) e Streamable HTTP na etapa 8, em `POST /mcp`, com `GET /health` e `GET /metrics` fora do protocolo.

## Consequências

- A demo funciona sem rede exposta e sem porta aberta.
- Sem estado de sessão: o único estado compartilhado é o cache em memória.
- O HTTP exige defesas extras (rate limit, Host/Origin, limite de corpo), documentadas na seção 17.
