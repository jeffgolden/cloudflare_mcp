// src/tools/analytics.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CloudflareClient } from '../cloudflare-client.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function getAnalyticsTools(client: CloudflareClient): { tools: Record<string, Tool> } {
  // ----------------------------
  // zone_analytics – read-only
  const ZoneAnalyticsInputSchema = z.object({
    zone_name: z.string(),
    time_range: z.string().optional().default('24h'),
    metrics: z.array(z.string()).optional(),
  });

  const zoneAnalyticsTool: Tool = {
    name: 'cloudflare-dns-mcp/zone_analytics',
    description: 'Fetch analytics data for a zone',
    inputSchema: zodToJsonSchema(ZoneAnalyticsInputSchema) as any,
    outputSchema: {
      type: 'object',
      additionalProperties: true,
    } as any,
    handler: async (params: any) => {
      const { zone_name, time_range, metrics } = ZoneAnalyticsInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      const query: Record<string, any> = { since: time_range };
      if (metrics) query.metrics = metrics.join(',');
      return client.get(`/zones/${zoneId}/analytics/dashboard`, query);
    },
  };

  return { tools: { 'cloudflare-dns-mcp/zone_analytics': zoneAnalyticsTool } };
}
