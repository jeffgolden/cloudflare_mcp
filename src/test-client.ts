// src/test-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { getDnsTools } from './tools/dns-records.js';
import { CloudflareClient } from './cloudflare-client.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function main() {
  // ── server ───────────────────────────────────────────
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const dnsToolsMap = getDnsTools(new CloudflareClient()).tools;
  const dnsToolList = Object.values(dnsToolsMap);
  const server = new MCPServer(
    { name: 'cloudflare-dns-mcp', version: '1.0.0' },
    { instructions: 'In-memory test', capabilities: { tools: {} } },
  );
  // Register generic MCP tool endpoints
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: dnsToolList }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const tool = dnsToolList.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    const result = await (tool as any).handler(args);
    // Wrap result in minimal CallToolResultSchema structure
    return { content: [{ type: 'text', text: JSON.stringify(result) }] } as any;
  });

  server.connect(serverTransport);

  // ── client ───────────────────────────────────────────
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);

  const res = await client.callTool({
    name: 'cloudflare-dns-mcp/echo',
    arguments: { message: 'Hello in-memory' },
  });
  console.log('Echo response:', res);

  // List zones
  const zonesRes = await client.callTool({ name: 'cloudflare-dns-mcp/list_zones', arguments: {} });
  console.log('Zones raw:', zonesRes);
  const zoneList = JSON.parse((zonesRes as any).content[0].text) as Array<{ name: string }>;
  const zoneName = 'jeffgolden.dev';
  console.log('Using zone:', zoneName);

  // Zone settings
  const settings = await client.callTool({ name: 'cloudflare-dns-mcp/list_zone_settings', arguments: { zone_name: zoneName } });
  console.log('Settings:', settings);

  // SSL certs
  const certs = await client.callTool({ name: 'cloudflare-dns-mcp/list_ssl_certs', arguments: { zone_name: zoneName } });
  console.log('SSL certs:', certs);

  // ── Demo mutating operations on jeffgolden.dev ──
  const newRec = await client.callTool({
    name: 'cloudflare-dns-mcp/create_dns_record',
    arguments: {
      zone_name: zoneName,
      type: 'TXT',
      name: '_mcp-test',
      content: 'hello-mcp',
      ttl: 120,
    },
  });
  console.log('Created record:', newRec);

  const updatedRec = await client.callTool({
    name: 'cloudflare-dns-mcp/update_dns_record',
    arguments: {
      zone_name: zoneName,
      record_id: (newRec as any).content ? JSON.parse((newRec as any).content[0].text).id : '',
      ttl: 60,
    },
  });
  console.log('Updated record:', updatedRec);

  const delResult = await client.callTool({
    name: 'cloudflare-dns-mcp/delete_dns_record',
    arguments: {
      zone_name: zoneName,
      record_id: (updatedRec as any).content ? JSON.parse((updatedRec as any).content[0].text).id : '',
    },
  });
  console.log('Delete result:', delResult);



}

main().catch(err => {
  console.error(err);
  process.exit(1);
});