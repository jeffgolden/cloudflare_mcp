// scripts/list-dns-demo.ts
// Lists DNS records for a supplied zone using the MCP dns tools.
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getDnsTools } from '../src/tools/dns-records.ts';

const ZONE = process.argv[2] || 'jeffgolden.dev';

(async () => {
  try {
    const client = new CloudflareClient();
    const { tools } = getDnsTools(client);
    const records = await (tools['cloudflare-dns-mcp/list_dns_records'] as any).handler({ zone_name: ZONE });
    console.dir(records, { depth: null });
  } catch (err) {
    console.error('Error listing DNS records:', err);
    process.exitCode = 1;
  }
})();
