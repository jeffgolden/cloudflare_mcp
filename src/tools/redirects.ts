// src/tools/redirects.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CloudflareClient } from '../cloudflare-client.js';

export function getRedirectTools(client: CloudflareClient): { tools: Record<string, Tool> } {
  // Input validation
  const CreateRedirectInputSchema = z.object({
    zone_name: z.string(),
    source_url: z.string().min(1),
    target_url: z.string().min(1),
    redirect_type: z.number().optional().default(301).refine(v => v === 301 || v === 302, {
      message: 'redirect_type must be 301 or 302',
    }),
    preserve_query_string: z.boolean().optional().default(true),
    priority: z.number().optional(),
    status: z.enum(['active', 'disabled']).optional().default('active'),
  });

  // ────────────────────────────────────────────
  // list_page_rules
  const ListPageRulesInputSchema = z.object({ zone_name: z.string(), status: z.enum(['active','disabled']).optional() });

  const listPageRulesTool: Tool = {
    name: 'cloudflare-dns-mcp/list_page_rules',
    description: 'List all page rules (redirects) for a zone',
    inputSchema: zodToJsonSchema(ListPageRulesInputSchema) as any,
    outputSchema: { type: 'array', items: { type: 'object', additionalProperties: true } } as any,
    handler: async (params: unknown) => {
      const { zone_name, status } = ListPageRulesInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      const query: any = {};
      if (status) query.status = status;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await client.get(`/zones/${zoneId}/pagerules`, query), null, 2)
          }
        ]
      };
    },
  };

  const createRedirectTool: Tool = {
    name: 'cloudflare-dns-mcp/create_redirect',
    description: 'Create a single URL redirect (Page Rule) for the given zone',
    inputSchema: zodToJsonSchema(CreateRedirectInputSchema) as any,
    outputSchema: { type: 'object', additionalProperties: true } as any,
    annotations: { destructiveHint: true },
    handler: async (params: unknown) => {
      const { zone_name, source_url, target_url, redirect_type, preserve_query_string, priority, status } = CreateRedirectInputSchema.parse(params);

      // Lookup zone id
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      // Build pagerule payload
      const pageruleBody = {
        targets: [
          {
            target: 'url',
            constraint: { operator: 'matches', value: source_url },
          },
        ],
        actions: [
          {
            id: 'forwarding_url',
            value: {
              url: target_url + (preserve_query_string ? '?$1' : ''),
              status_code: redirect_type,
            },
          },
        ],
        priority: priority ?? 1,
        status,
      };

      const created = await client.post(`/zones/${zoneId}/pagerules`, pageruleBody);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(created, null, 2)
          }
        ]
      };
    },
  };

  // ────────────────────────────────────────────
  // delete_page_rule
  const DeletePageRuleInputSchema = z.object({ zone_name: z.string(), rule_id: z.string() });

  const deletePageRuleTool: Tool = {
    name: 'cloudflare-dns-mcp/delete_page_rule',
    description: 'Delete a page rule by ID',
    inputSchema: zodToJsonSchema(DeletePageRuleInputSchema) as any,
    outputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, deleted: { type: 'boolean' } },
      required: ['id', 'deleted'],
    } as any,
    annotations: { destructiveHint: true },
    handler: async (params: unknown) => {
      const { zone_name, rule_id } = DeletePageRuleInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      await client.delete(`/zones/${zoneId}/pagerules/${rule_id}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: rule_id, deleted: true }, null, 2)
          }
        ]
      };
    },
  };

  return { tools: {
      'cloudflare-dns-mcp/list_page_rules': listPageRulesTool,
      'cloudflare-dns-mcp/create_redirect': createRedirectTool,
      'cloudflare-dns-mcp/delete_page_rule': deletePageRuleTool,
    } };
}
