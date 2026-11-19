import { describe, expect, it } from 'vitest';
import { connectInMemory } from '../../helpers/mcp-client.js';
import { buildTestServer } from '../../helpers/test-server.js';

describe('tool ping', () => {
  it('responde pong com structuredContent e readOnlyHint', async () => {
    const client = await connectInMemory(buildTestServer().factory());
    const { tools } = await client.listTools();
    expect(tools.find((t) => t.name === 'ping')?.annotations?.readOnlyHint).toBe(true);

    const result = await client.callTool({ name: 'ping', arguments: {} });
    expect(result.structuredContent).toEqual({ pong: true });
  });

  it('todas as tools declaram readOnlyHint (RF10)', async () => {
    const client = await connectInMemory(buildTestServer().factory());
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
  });
});
