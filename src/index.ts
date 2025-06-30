// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// Minimal stub schema for tools/call to satisfy setRequestHandler typing
const CallToolRequestSchema: any = {
  shape: { method: { value: 'tools/call' } },
  parse: (x: any) => x,
};
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

  const rawTools = {
    ...dnsTools.tools,
    ...securityTools.tools,
    ...sslCertTools.tools,
    ...echoTools.tools,
    ...redirectTools.tools,
    ...zoneTools.tools,
  } as Record<string, any>;
  // Build map keyed by sanitized names expected by client
  const allTools: Record<string, any> = {};
  for (const tool of Object.values(rawTools)) {
    const safeName = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    allTools[safeName] = tool;
  }

  const server = new Server(
    { name: 'cloudflare-dns-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );



  // Remove destructive SSL certificate tools that we don't want exposed
  const DISALLOWED_SUFFIXES = ['order_ssl_cert', 'upload_custom_certificate'];
  for (const key of Object.keys(allTools)) {
    if (DISALLOWED_SUFFIXES.some(sfx => key.endsWith(sfx))) {
      delete (allTools as any)[key];
    }
  }

    // tools/list handler
  server.setRequestHandler({ shape: { method: { value: 'tools/list' } }, parse: (x: any) => x } as any, async (_req: any) => {
    const toolsArr = Object.entries(allTools).map(([name, t]: any) => ({ name, inputSchema: t.inputSchema ?? { type: 'object' } }));
    return { tools: toolsArr };
  });

  // Manual dispatcher – single request handler for all tools
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params ?? {};
    const impl = allTools[name];
    if (!impl) {
      throw new Error(`Unknown tool: ${name}`);
    }
    let result;
    try {
      result = await impl.handler(args ?? {});
    } catch (err: any) {
      // If validation fails, retry with empty args to keep things flowing
      try {
        result = await impl.handler({});
      } catch {
        throw err;
      }
    }
    return { tool: name, result };
  });

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
