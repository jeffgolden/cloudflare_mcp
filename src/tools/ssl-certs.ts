import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CloudflareClient } from '../cloudflare-client.js';

// Schemas
const zoneNameSchema = z.string().min(1);

const listSslCertsParamsSchema = z.object({
  zone_name: zoneNameSchema,
});

const orderSslCertParamsSchema = z.object({
  zone_name: zoneNameSchema,
  hosts: z.array(z.string().min(1)),
});

const uploadCustomCertParamsSchema = z.object({
  zone_name: zoneNameSchema,
  certificate: z.string().min(1),
  private_key: z.string().min(1),
  bundle_method: z.enum(['ubiquitous', 'optimal', 'force']).default('ubiquitous').optional(),
});

// Helpers
function makeHelpers(client: CloudflareClient) {
  return {
    getZoneId: async (zoneName: string): Promise<string> => {
      const zones = await client.get<Array<{ id: string; name: string }>>('/zones', { name: zoneName });
      if (zones.length === 0) throw new Error(`Zone ${zoneName} not found`);
      return zones[0].id;
    },
  };
}

// Tools
function buildTools(client: CloudflareClient): Record<string, Tool> {
  const { getZoneId } = makeHelpers(client);

  const listSslCertsTool: Tool = {
    name: 'cloudflare-dns-mcp/list_ssl_certs',
    description: 'List SSL certificate packs for a zone',
    inputSchema: zodToJsonSchema(listSslCertsParamsSchema) as any,
    outputSchema: { type: 'array', items: {} } as any,
    handler: async (params: any) => {
      const { zone_name } = params as z.infer<typeof listSslCertsParamsSchema>;
      const zoneId = await getZoneId(zone_name);
      return client.get(`/zones/${zoneId}/ssl/certificate_packs`);
    },
  };

  const orderSslCertTool: Tool = {
    name: 'cloudflare-dns-mcp/order_ssl_cert',
    description: 'Order a new SSL certificate pack for the specified hosts',
    inputSchema: zodToJsonSchema(orderSslCertParamsSchema) as any,
    outputSchema: z.any(),
    handler: async (params: any) => {
      const { zone_name, hosts } = params as z.infer<typeof orderSslCertParamsSchema>;
      const zoneId = await getZoneId(zone_name);
      const body = {
        type: 'advanced',
        hosts,
        validation_method: 'txt',
      };
      const [result] = await client.post<any[]>(`/zones/${zoneId}/ssl/certificate_packs`, body);
      return result;
    },
  };

  const uploadCustomCertTool: Tool = {
    name: 'cloudflare-dns-mcp/upload_custom_certificate',
    description: 'Upload a custom SSL certificate for a zone',
    inputSchema: zodToJsonSchema(uploadCustomCertParamsSchema) as any,
    outputSchema: z.any(),
    handler: async (params: any) => {
      const { zone_name, certificate, private_key, bundle_method } = params as z.infer<typeof uploadCustomCertParamsSchema>;
      const zoneId = await getZoneId(zone_name);
      const body: any = {
        certificate,
        private_key,
      };
      if (bundle_method) body.bundle_method = bundle_method;
      return client.post(`/zones/${zoneId}/custom_certificates`, body);
    },
  };

  return {
    'cloudflare-dns-mcp/list_ssl_certs': listSslCertsTool,
    'cloudflare-dns-mcp/order_ssl_cert': orderSslCertTool,
    'cloudflare-dns-mcp/upload_custom_certificate': uploadCustomCertTool,
  };
}

export function getSslCertTools(client: CloudflareClient): { tools: Record<string, Tool> } {
  return { tools: buildTools(client) };
}
