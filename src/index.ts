// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDnsTools } from './tools/dns-records.js';
import { getSecurityTools } from './tools/security.js';
import { getSslCertTools } from './tools/ssl-certs.js';

import { getZoneManagementTools } from './tools/zone-management.js';
import { getEchoTools } from './tools/echo.js';
import { getRedirectTools } from './tools/redirects.js';
import { CloudflareClient } from './cloudflare-client.js';

dotenv.config();

async function main() {
  // Initialize Cloudflare MCP server using high-level McpServer (provides built-in handlers like tools/list)

  const cfClient = new CloudflareClient();

  const dnsTools = getDnsTools(cfClient);
  const securityTools = getSecurityTools(cfClient);
  const sslCertTools = getSslCertTools(cfClient);

  const zoneTools = getZoneManagementTools(cfClient);
  const echoTools = getEchoTools();
  const redirectTools = getRedirectTools(cfClient);

  const allTools = {
    ...dnsTools.tools,
    ...securityTools.tools,
    ...sslCertTools.tools,
    ...echoTools.tools,
    ...redirectTools.tools,
    ...zoneTools.tools,
  };

  const server = new McpServer({
    name: 'cloudflare-dns-mcp',
    version: '1.0.0',
    instructions: 'A model context protocol server for managing Cloudflare DNS records.',
  });



  // Remove destructive SSL certificate tools that we don't want exposed
  const DISALLOWED_SUFFIXES = ['order_ssl_cert', 'upload_custom_certificate'];
  for (const key of Object.keys(allTools)) {
    if (DISALLOWED_SUFFIXES.some(sfx => key.endsWith(sfx))) {
      delete (allTools as any)[key];
    }
  }

  // Register each Tool with the McpServer using object overload
  for (const tool of Object.values(allTools)) {
    const safeName = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-64);
    server.tool(
      safeName,
      {
        description: (tool as any).description ?? '',
        paramsSchema: tool.inputSchema as any,
        handler: tool.handler as any,
        annotations: (tool as any).annotations ?? {},
      } as any,
    );
  }



  // DEBUG prints

  const registeredToolNames = Object.keys(allTools).map(n => n.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-64)).join(', ');
  console.error(`Registered tools: [${registeredToolNames || 'none'}]`);

  console.error('Cloudflare MCP Server starting...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Server running.');
}

main().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
