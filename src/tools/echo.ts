import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function getEchoTools() {
  const EchoInputSchema = z.object({
    message: z.string().optional().default('pong'),
  });

  const echoTool = {
    name: 'cloudflare-dns-mcp/echo',
    description: 'Simple connectivity check that returns the same payload sent by the client.',
    inputSchema: zodToJsonSchema(EchoInputSchema),
    outputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              text: { type: 'string' }
            }
          }
        }
      },
      required: ['content'],
      additionalProperties: false,
    },
    handler: async (params: unknown) => {
      const { message } = EchoInputSchema.parse(params);
      return {
        content: [
          {
            type: "text",
            text: message
          }
        ]
      };
    },
  };

  return { tools: { 'cloudflare-dns-mcp/echo': echoTool } };
}
