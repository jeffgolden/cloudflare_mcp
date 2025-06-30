// src/tools/dns-records.ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CloudflareClient } from '../cloudflare-client.js';

// Zod schema for DNSRecord type returned by Cloudflare API
// Base DNS record schema
const DNSRecordSchema = z.object({
  id: z.string(),
  zone_id: z.string(),
  zone_name: z.string(),
  type: z.string(),
  name: z.string(),
  content: z.string(),
  ttl: z.number(),
  priority: z.number().optional(),
  proxied: z.boolean().optional(),
  created_on: z.string(),
  modified_on: z.string(),
});

// Zod schema for the tool's output, which might not include metadata
const DnsRecordOutputSchema = DNSRecordSchema.omit({ created_on: true, modified_on: true }).extend({
    created_on: z.string().optional(),
    modified_on: z.string().optional(),
});

export function getDnsTools(client: CloudflareClient): { tools: Record<string, Tool> } {
  // ────────────────────────────────────────────
  // echo – demo helper
  const echoTool: Tool = {
    name: 'cloudflare-dns-mcp/echo',
    description: 'Echo test tool',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    } as any,
    outputSchema: {
      type: 'object',
      properties: { response: { type: 'string' } },
      required: ['response'],
    } as any,
    handler: async (params: { message: string }) => ({
      response: `You said: ${params.message}`,
    }),
  };

  // ────────────────────────────────────────────
  // list_dns_records – real Cloudflare implementation
  const ListDnsRecordsInputSchema = z.object({
    zone_name: z.string().optional(),
    record_type: z.string().optional(),
    name_filter: z.string().optional(),
    include_metadata: z.boolean().optional().default(false),
  });

  const listDnsRecordsTool: Tool = {
    name: 'cloudflare-dns-mcp/list_dns_records',
    description: 'List DNS records for a zone or across all zones',
    inputSchema: zodToJsonSchema(ListDnsRecordsInputSchema) as any,
    outputSchema: {
      type: 'array',
      items: zodToJsonSchema(DnsRecordOutputSchema) as any,
    } as any,
    handler: async (params: z.infer<typeof ListDnsRecordsInputSchema>) => {
      const { zone_name, record_type, name_filter, include_metadata } = ListDnsRecordsInputSchema.parse(params);

      // Helper to fetch zones (optionally filter by name)
      const zones = zone_name
        ? await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name })
        : await client.get<Array<{ id: string; name: string }>>('/zones');

      const records: Array<any> = [];
      for (const zone of zones) {
        // Build query params
        const query: Record<string, any> = {};
        if (record_type) query.type = record_type;
        if (name_filter) query.name = name_filter;

        const zoneRecords = await client.get<typeof DNSRecordSchema['_type'][]>(`/zones/${zone.id}/dns_records`, query);
        zoneRecords.forEach(r => {
          // Attach zone_name to each record (API only returns zone_id)
          records.push({ ...r, zone_name: zone.name });
        });
      }

      const output = records.map(r => {
        if (!include_metadata) {
          const { created_on, modified_on, ...rest } = r as any;
          return rest;
        }
        return r;
      });

      return output;
    },
  };

    // ────────────────────────────────────────────
  // ────────────────────────────────────────────
  // list_zones – read-only
  const ZoneSchema = z.object({ id: z.string(), name: z.string(), status: z.string() });
  const listZonesTool: Tool = {
    name: 'cloudflare-dns-mcp/list_zones',
    description: 'List all zones in the Cloudflare account',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false } as any,
    outputSchema: { type: 'array', items: zodToJsonSchema(ZoneSchema) as any } as any,
    handler: async () => {
      const zones = await client.get<Array<z.infer<typeof ZoneSchema>>>('/zones');
      return zones.map(z => ({ id: z.id, name: z.name, status: z.status }));
    },
  };

  // ────────────────────────────────────────────
  // ────────────────────────────────────────────
  // list_zone_settings – read-only
  const ListZoneSettingsInputSchema = z.object({ zone_name: z.string() });
  const listZoneSettingsTool: Tool = {
    name: 'cloudflare-dns-mcp/list_zone_settings',
    description: 'Retrieve all settings for a specific zone',
    inputSchema: zodToJsonSchema(ListZoneSettingsInputSchema) as any,
    outputSchema: { type: 'object', additionalProperties: true } as any,
    handler: async (params: z.infer<typeof ListZoneSettingsInputSchema>) => {
      const { zone_name } = ListZoneSettingsInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const settings = await client.get<any>(`/zones/${zones[0].id}/settings`);
      return settings;
    },
  };

  // ────────────────────────────────────────────
  // list_ssl_certs – read-only
  const ListSslCertsInputSchema = z.object({ zone_name: z.string() });
  const listSslCertsTool: Tool = {
    name: 'cloudflare-dns-mcp/list_ssl_certs',
    description: 'List SSL certificate packs for a zone',
    inputSchema: zodToJsonSchema(ListSslCertsInputSchema) as any,
    outputSchema: { type: 'array', items: { type: 'object', additionalProperties: true } } as any,
    handler: async (params: z.infer<typeof ListSslCertsInputSchema>) => {
      const { zone_name } = ListSslCertsInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const certs = await client.get<any[]>(`/zones/${zones[0].id}/ssl/certificate_packs`);
      return certs;
    },
  };

  // utility
// Ensure TXT record value is wrapped in double quotes; Cloudflare permits full string.
  const ensureTxtQuotes = (val: string) => (val.startsWith('"') ? val : `"${val}"`);

  // ────────────────────────────────────────────
   // update_dns_record
  const UpdateDnsRecordInputSchema = z.object({
    zone_name: z.string(),
    record_id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    content: z.string().optional(),
    ttl: z.number().optional(),
    priority: z.number().optional(),
    weight: z.number().optional(),
    port: z.number().optional(),
    target: z.string().optional(),
    proxied: z.boolean().optional(),
  });
  const updateDnsRecordTool: Tool = {
    name: 'cloudflare-dns-mcp/update_dns_record',
    description: 'Update an existing DNS record by ID',
    inputSchema: zodToJsonSchema(UpdateDnsRecordInputSchema) as any,
    outputSchema: zodToJsonSchema(DnsRecordOutputSchema) as any,
    handler: async (params: z.infer<typeof UpdateDnsRecordInputSchema>) => {
      const { zone_name, record_id, ...rest } = UpdateDnsRecordInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      // Cloudflare requires all mandatory fields; fetch current record if partial update
      const existing = await client.get<typeof DNSRecordSchema['_type']>(`/zones/${zoneId}/dns_records/${record_id}`);
      // Validate edge-cases again on update
      if ((rest.type ?? existing.type) === 'MX' && (rest.priority ?? existing.priority) === undefined) {
        throw new Error('MX record update requires "priority"');
      }
      if ((rest.type ?? existing.type) === 'SRV') {
        const required = ['priority', 'weight', 'port', 'target'];
        for (const f of required) {
          if ((rest as any)[f] === undefined && (existing as any)[f] === undefined) {
            throw new Error(`SRV record update requires "${f}"`);
          }
        }
      }
      const merged = { ...existing, ...rest } as any;
      if ((merged.type ?? existing.type) === 'TXT' && merged.content) {
        merged.content = ensureTxtQuotes(merged.content);
      }
      const payload = merged;
      const record = await client.put<typeof DNSRecordSchema['_type']>(`/zones/${zoneId}/dns_records/${record_id}`, payload);
      return { ...record, zone_name };
    },
  };

  // ────────────────────────────────────────────
  // delete_dns_record
  const DeleteDnsRecordInputSchema = z.object({ zone_name: z.string(), record_id: z.string() });
  const deleteDnsRecordTool: Tool = {
    name: 'cloudflare-dns-mcp/delete_dns_record',
    description: 'Delete a DNS record by ID',
    inputSchema: zodToJsonSchema(DeleteDnsRecordInputSchema) as any,
    outputSchema: z.object({ success: z.boolean(), id: z.string() }).parse({ success: true, id: '' }) as any,
    handler: async (params: z.infer<typeof DeleteDnsRecordInputSchema>) => {
      const { zone_name, record_id } = DeleteDnsRecordInputSchema.parse(params);
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;
      await client.delete(`/zones/${zoneId}/dns_records/${record_id}`);
      return { success: true, id: record_id };
    },
  };

  // create_dns_record
  const CreateDnsRecordInputSchema = z.object({
    zone_name: z.string(),
    type: z.string(),
    name: z.string(),
    content: z.string(),
    ttl: z.number().optional().default(1),
    priority: z.number().optional(),
    weight: z.number().optional(),
    port: z.number().optional(),
    target: z.string().optional(),
    proxied: z.boolean().optional().default(false),
  });

  const createDnsRecordTool: Tool = {
    name: 'cloudflare-dns-mcp/create_dns_record',
    description: 'Create a new DNS record in a given zone',
    inputSchema: zodToJsonSchema(CreateDnsRecordInputSchema) as any,
    outputSchema: zodToJsonSchema(DnsRecordOutputSchema) as any,
    handler: async (params: z.infer<typeof CreateDnsRecordInputSchema>) => {
      const { zone_name, ...rest } = CreateDnsRecordInputSchema.parse(params);
      // Find zone id
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zone_name });
      if (zones.length === 0) throw new Error(`Zone ${zone_name} not found`);
      const zoneId = zones[0].id;

      const quotedContent = rest.type === 'TXT' ? ensureTxtQuotes(rest.content) : rest.content;
      // validate edge-cases
      if (rest.type === 'MX' && rest.priority === undefined) {
        throw new Error('MX record requires "priority"');
      }
      if (rest.type === 'SRV') {
        const required = ['priority', 'weight', 'port', 'target'];
        for (const f of required) {
          if ((rest as any)[f] === undefined) throw new Error(`SRV record requires "${f}"`);
        }
      }

      const body: any = {
        type: rest.type,
        name: rest.name,
        content: quotedContent,
        ttl: rest.ttl,
        priority: rest.priority,
        proxied: rest.proxied,
        ...(rest.weight !== undefined && { weight: rest.weight }),
        ...(rest.port !== undefined && { port: rest.port }),
        ...(rest.target !== undefined && { target: rest.target }),
      };
      const record = await client.post<typeof DNSRecordSchema['_type']>(`/zones/${zoneId}/dns_records`, body);
      return { ...record, zone_name };
    },
  };

  return {
    tools: {
      'cloudflare-dns-mcp/echo': echoTool,
      'cloudflare-dns-mcp/list_dns_records': listDnsRecordsTool,
      // create DNS record
      'cloudflare-dns-mcp/create_dns_record': createDnsRecordTool,
      'cloudflare-dns-mcp/list_zones': listZonesTool,
      'cloudflare-dns-mcp/list_zone_settings': listZoneSettingsTool,
      'cloudflare-dns-mcp/list_ssl_certs': listSslCertsTool,
      'cloudflare-dns-mcp/update_dns_record': updateDnsRecordTool,
      'cloudflare-dns-mcp/delete_dns_record': deleteDnsRecordTool,
    },
  };
}
