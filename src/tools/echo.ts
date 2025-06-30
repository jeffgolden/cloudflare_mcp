// src/tools/echo.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function getEchoTools(): { tools: Record<string, Tool> } {
  const EchoInputSchema = z.object({
    message: z.string().optional().default('pong'),
  });

  const echoTool: Tool = {
    name: 'cloudflare-dns-mcp/echo',
    description: 'Simple connectivity check that returns the same payload sent by the client.',
    inputSchema: zodToJsonSchema(EchoInputSchema) as any,
    outputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
    handler: async (params: unknown) => {
      const { message } = EchoInputSchema.parse(params);
      return { message };
    },
  };

  return { tools: { 'cloudflare-dns-mcp/echo': echoTool } };
}
