// scripts/purge-cache-demo.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getZoneManagementTools } from '../src/tools/zone-management.ts';

(async () => {
  const zone = process.argv[2] || 'jeffgolden.dev';
  const client = new CloudflareClient();
  const tools = getZoneManagementTools(client).tools;
  const resp = await (tools['cloudflare-dns-mcp/purge_cache'] as any).handler({ zone_name: zone, purge_everything: true });
  console.dir(resp, { depth: null });
})();
