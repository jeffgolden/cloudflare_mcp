// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
  } as Record<string, any>;

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

  // Build map keyed by sanitized names expected by client
  const toolsMap: Record<string, any> = {};
  for (const tool of Object.values(allTools)) {
    const safeName = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    toolsMap[safeName] = tool;
  }

  // tools/list handler
  server.setRequestHandler(
    { shape: { method: { value: 'tools/list' } }, parse: (x: any) => x } as any,
    async (_req: any) => {
      const toolsArr = Object.entries(toolsMap).map(([name, t]: any) => ({ 
        name, 
        description: t.description ?? '',
        inputSchema: t.inputSchema ?? { type: 'object' } 
      }));
      return { tools: toolsArr };
    }
  );

  // tools/call handler  
  server.setRequestHandler(
    { shape: { method: { value: 'tools/call' } }, parse: (x: any) => x } as any,
    async (request: any) => {
      const { name, arguments: args } = request.params ?? {};
      const impl = toolsMap[name];
      if (!impl) {
        throw new Error(`Unknown tool: ${name}`);
      }
      
      const result = await impl.handler(args ?? {});
      
      // Ensure all responses are in proper MCP format
      if (result && typeof result === 'object' && result.content && Array.isArray(result.content)) {
        // Already in MCP format
        return result;
      } else {
        // Convert to MCP format
        return {
          content: [
            {
              type: "text",
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    }
  );

  console.error('Cloudflare MCP Server starting...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Server running.');
}

main().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
