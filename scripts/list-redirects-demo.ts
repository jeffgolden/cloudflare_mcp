// scripts/list-redirects-demo.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getRedirectTools } from '../src/tools/redirects.ts';

(async () => {
  const zone = process.argv[2] || 'jeffgolden.dev';
  const client = new CloudflareClient();
  const tools = getRedirectTools(client).tools;
  const pageRules = await (tools['cloudflare-dns-mcp/list_page_rules'] as any).handler({ zone_name: zone });
  console.dir(pageRules, { depth: null });
})();
