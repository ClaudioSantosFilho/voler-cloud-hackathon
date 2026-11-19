import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../../../src/adapters/in/mcp/server.js';
import { connectInMemory } from '../../helpers/mcp-client.js';

describe('tool ping', () => {
  it('responde pong com structuredContent e readOnlyHint', async () => {
    const client = await connectInMemory(createMcpServer());
    const { tools } = await client.listTools();
    expect(tools.find((t) => t.name === 'ping')?.annotations?.readOnlyHint).toBe(true);

    const result = await client.callTool({ name: 'ping', arguments: {} });
    expect(result.structuredContent).toEqual({ pong: true });
  });
});
