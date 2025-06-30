import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getAnalyticsTools } from '../src/tools/analytics.ts';

(async () => {
  const client = new CloudflareClient();
  const { tools } = getAnalyticsTools(client);
  const data = await (tools['cloudflare-dns-mcp/zone_analytics'] as any).handler({ zone_name: process.argv[2] || 'jeffgolden.dev' });
  console.dir(data, { depth: null });
})();
