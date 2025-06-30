// scripts/zone-analytics-demo.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getAnalyticsTools } from '../src/tools/analytics.ts';

const ZONE = process.argv[2] || 'jeffgolden.dev';

(async () => {
  try {
    const client = new CloudflareClient();
    const { tools } = getAnalyticsTools(client);

    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const data = await (tools['cloudflare-dns-mcp/zone_analytics'] as any).handler({
      zone_name: ZONE,
      since: start.toISOString(),
      until: end.toISOString(),
      metrics: ['requests', 'bytes'],
    });
    console.dir(data, { depth: null });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    process.exitCode = 1;
  }
})();
