// src/tools/security.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CloudflareClient } from '../cloudflare-client.js';

// Shared Cloudflare WAF rule schema (subset)
const WafRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  action: z.string(),
  expression: z.string(),
  paused: z.boolean(),
  priority: z.number().optional(),
});

export function getSecurityTools(client: CloudflareClient): { tools: Record<string, Tool> } {
  // ────────────────────────────────────────────
  // list_waf_rules
  const ListWafRulesInputSchema = z.object({
    zone_name: z.string(),
    rule_type: z.string().optional(), // Placeholder – Cloudflare uses "mode" & "action"
  });

  const listWafRulesTool: Tool = {
    name: 'cloudflare-dns-mcp/list_waf_rules',
    description: 'List Web Application Firewall (WAF) rules for a zone',
    inputSchema: zodToJsonSchema(ListWafRulesInputSchema) as any,
    outputSchema: {
      type: 'array',
      items: zodToJsonSchema(WafRuleSchema) as any,
    } as any,
    handler: async (params: z.infer<typeof ListWafRulesInputSchema>) => {
      const { zone_name, rule_type } = ListWafRulesInputSchema.parse(params);

      // Resolve zone ID
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      const query: Record<string, any> = {};
      if (rule_type) query.mode = rule_type;

      const wafRules = await client.get<Array<typeof WafRuleSchema['_type']>>(`/zones/${zoneId}/firewall/rules`, query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(wafRules, null, 2)
          }
        ]
      };
    },
  };

  // ────────────────────────────────────────────
  // create_security_rule
  const CreateSecurityRuleInputSchema = z.object({
    zone_name: z.string(),
    rule_name: z.string(),
    expression: z.string(),
    action: z.string(),
    priority: z.number().optional(),
    paused: z.boolean().optional().default(false),
  });

  const createSecurityRuleTool: Tool = {
    name: 'cloudflare-dns-mcp/create_security_rule',
    description: 'Create a custom firewall security rule for a zone',
    inputSchema: zodToJsonSchema(CreateSecurityRuleInputSchema) as any,
    outputSchema: zodToJsonSchema(WafRuleSchema) as any,
    handler: async (params: z.infer<typeof CreateSecurityRuleInputSchema>) => {
      const { zone_name, rule_name, expression, action, priority, paused } = CreateSecurityRuleInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      const body = [
        {
          description: rule_name,
          action,
          filter: { expression },
          paused,
          ...(priority !== undefined && { priority }),
        },
      ];
      // Cloudflare bulk create expects array
      const created = await client.post<Array<typeof WafRuleSchema['_type']>>(`/zones/${zoneId}/firewall/rules`, body);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(created[0], null, 2)
          }
        ]
      };
    },
  };

  // ────────────────────────────────────────────
  // update_security_rule
  const UpdateSecurityRuleInputSchema = z.object({
    zone_name: z.string(),
    rule_id: z.string(),
    description: z.string().optional(),
    expression: z.string().optional(),
    action: z.string().optional(),
    priority: z.number().optional(),
    paused: z.boolean().optional(),
  });

  const updateSecurityRuleTool: Tool = {
    name: 'cloudflare-dns-mcp/update_security_rule',
    description: 'Update an existing firewall security rule',
    inputSchema: zodToJsonSchema(UpdateSecurityRuleInputSchema) as any,
    outputSchema: zodToJsonSchema(WafRuleSchema) as any,
    annotations: { destructiveHint: true },
    handler: async (params: z.infer<typeof UpdateSecurityRuleInputSchema>) => {
      const { zone_name, rule_id, description, expression, action, priority, paused } = UpdateSecurityRuleInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      const body: any = { id: rule_id };
      if (description !== undefined) body.description = description;
      if (expression !== undefined) {
        // need to include filter id per Cloudflare API
        const existing = await client.get<any>(`/zones/${zoneId}/firewall/rules/${rule_id}`);
        const filterId = existing.filter?.id;
        body.filter = { id: filterId, expression };
      }
      if (action !== undefined) body.action = action;
      if (priority !== undefined) body.priority = priority;
      if (paused !== undefined) body.paused = paused;

      const updated = await client.put<typeof WafRuleSchema["_type"]>(`/zones/${zoneId}/firewall/rules/${rule_id}`, body);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(updated, null, 2)
          }
        ]
      };
    },
  };

  // ────────────────────────────────────────────
  // delete_security_rule
  const DeleteSecurityRuleInputSchema = z.object({
    zone_name: z.string(),
    rule_id: z.string(),
  });

  const deleteSecurityRuleTool: Tool = {
    name: 'cloudflare-dns-mcp/delete_security_rule',
    description: 'Delete a firewall security rule',
    inputSchema: zodToJsonSchema(DeleteSecurityRuleInputSchema) as any,
    outputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, deleted: { type: 'boolean' } },
      required: ['id', 'deleted'],
    } as any,
    annotations: { destructiveHint: true },
    handler: async (params: z.infer<typeof DeleteSecurityRuleInputSchema>) => {
      const { zone_name, rule_id } = DeleteSecurityRuleInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      const resp = await client.delete<{ id: string }>(`/zones/${zoneId}/firewall/rules/${rule_id}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: resp.id ?? rule_id, deleted: true }, null, 2)
          }
        ]
      };
    },
  };

  return {
    tools: {
      'cloudflare-dns-mcp/list_waf_rules': listWafRulesTool,
      'cloudflare-dns-mcp/create_security_rule': createSecurityRuleTool,
      'cloudflare-dns-mcp/update_security_rule': updateSecurityRuleTool,
      'cloudflare-dns-mcp/delete_security_rule': deleteSecurityRuleTool,
    },
  };
}
