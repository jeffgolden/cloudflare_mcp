// src/tools/zone-management.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CloudflareClient } from '../cloudflare-client.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function getZoneManagementTools(client: CloudflareClient): { tools: Record<string, Tool> } {
  // ────────────────────────────────────────────
  // list_zones
  const ListZonesInputSchema = z.object({
    status_filter: z.string().optional(),
    include_details: z.boolean().optional().default(false),
  });

  const listZonesTool: Tool = {
    name: 'cloudflare-dns-mcp/list_zones',
    description: 'List all zones in the account',
    inputSchema: zodToJsonSchema(ListZonesInputSchema) as any,
    outputSchema: { type: 'array', items: {} } as any,
    handler: async (params: any) => {
      const { status_filter, include_details } = ListZonesInputSchema.parse(params);
      const query: Record<string, any> = {};
      if (status_filter) query.status = status_filter;
      const zones = await client.get<any[]>('/zones', query);
      if (!include_details) return zones;
      // fetch settings for each zone in parallel (limit concurrency if desired)
      const enriched = await Promise.all(
        zones.map(async z => {
          const settings = await client.get(`/zones/${z.id}/settings`);
          return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...z, settings }, null, 2)
          }
        ]
      };
        }),
      );
      return enriched;
    },
  };

  // ────────────────────────────────────────────
  // get_zone_settings
  const GetZoneSettingsInputSchema = z.object({
    zone_name: z.string(),
  });

  const getZoneSettingsTool: Tool = {
    name: 'cloudflare-dns-mcp/get_zone_settings',
    description: 'Get full settings object for a zone',
    inputSchema: zodToJsonSchema(GetZoneSettingsInputSchema) as any,
    outputSchema: { type: 'object', additionalProperties: true } as any,
    handler: async (params: any) => {
      const { zone_name } = GetZoneSettingsInputSchema.parse(params);
      const zones = await client.get<any[]>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await client.get(`/zones/${zoneId}/settings`), null, 2)
          }
        ]
      };
    },
  };

  // ────────────────────────────────────────────
  // update_zone_settings
  const UpdateZoneSettingsInputSchema = GetZoneSettingsInputSchema.extend({
    settings: z.record(z.any()),
  });

  const updateZoneSettingsTool: Tool = {
    name: 'cloudflare-dns-mcp/update_zone_settings',
    description: 'Update settings for a zone (destructive operation)',
    inputSchema: zodToJsonSchema(UpdateZoneSettingsInputSchema) as any,
    annotations: { destructiveHint: true } as any,
    outputSchema: { type: 'object', additionalProperties: true } as any,
    handler: async (params: any) => {
      const { zone_name, settings } = UpdateZoneSettingsInputSchema.parse(params);
      const zones = await client.get<any[]>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      const items = Object.entries(settings).map(([id, value]) => ({ id, value }));
      const body = { items };
      const cfClient: any = client as any;
      if (typeof cfClient.patch === 'function') {
        return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await cfClient.patch(`/zones/${zoneId}/settings`, body), null, 2)
          }
        ]
      };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await cfClient.request("PATCH", `/zones/${zoneId}/settings`, body), null, 2)
          }
        ]
      };
    },
  };

  // ────────────────────────────────────────────
  // purge_cache
  const PurgeCacheInputSchema = z.object({
    zone_name: z.string(),
    purge_type: z.enum(['everything', 'files', 'tags', 'hosts']).optional().default('everything'),
    targets: z.array(z.string()).optional(),
  });

  const purgeCacheTool: Tool = {
    name: 'cloudflare-dns-mcp/purge_cache',
    description: 'Purge Cloudflare cache for a zone',
    inputSchema: zodToJsonSchema(PurgeCacheInputSchema) as any,
    annotations: { destructiveHint: true } as any,
    outputSchema: { type: 'object', additionalProperties: true } as any,
    handler: async (params: any) => {
      const { zone_name, purge_type, targets } = PurgeCacheInputSchema.parse(params);
      const zones = await client.get<any[]>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      let body: any = {};
      if (purge_type === 'everything') {
        body = { purge_everything: true };
      } else {
        if (!targets || targets.length === 0) {
          throw new Error('targets must be provided when purge_type is not "everything"');
        }
        body = { [`${purge_type}`]: targets };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await client.post(`/zones/${zoneId}/purge_cache`, body), null, 2)
          }
        ]
      };
    },
  };

  return {
    tools: {
      'cloudflare-dns-mcp/list_zones': listZonesTool,
      'cloudflare-dns-mcp/get_zone_settings': getZoneSettingsTool,
      'cloudflare-dns-mcp/update_zone_settings': updateZoneSettingsTool,
      'cloudflare-dns-mcp/purge_cache': purgeCacheTool,
    },
  };
}
