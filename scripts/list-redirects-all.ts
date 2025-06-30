// scripts/list-redirects-all.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getRedirectTools } from '../src/tools/redirects.ts';

(async () => {
  const zone = 'jeffgolden.dev';
  const client = new CloudflareClient();
  const { tools } = getRedirectTools(client);
  const active = await (tools['cloudflare-dns-mcp/list_page_rules'] as any).handler({ zone_name: zone, status: 'active' });
  const disabled = await (tools['cloudflare-dns-mcp/list_page_rules'] as any).handler({ zone_name: zone, status: 'disabled' });
  console.log('Active rules:', active.length);
  console.dir(active, { depth: null });
  console.log('Disabled rules:', disabled.length);
  console.dir(disabled, { depth: null });
})();
